# Daily Scheduler API

> **"Daily schedule planner to lessen decision fatigue and streamline your day"**

## 📋 Table of Contents

1. [Project Philosophy](#project-philosophy)
2. [Architecture Overview](#architecture-overview)
3. [Domain Models](#domain-models)
4. [Event Sourcing & Flow](#event-sourcing--flow)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Complete User Journeys](#complete-user-journeys)
8. [Frontend Integration Guide](#frontend-integration-guide)
9. [Key Design Decisions](#key-design-decisions)

---

## 🎯 Project Philosophy

### Core Problem
**Decision fatigue** - The mental exhaustion from making countless daily decisions about meals, tasks, and routines.

### Solution Strategy
Create a **two-tier application**:

1. **Landing Page (Execution Mode)** - Dead simple todo list saying "do this, then this, then this"
2. **Configuration Area (Planning Mode)** - Deep control for meal planning, recipe management, food tracking

### User Experience Flow
- **Sunday:** 20 minutes planning the week in configuration area
- **Monday-Friday:** Landing page just shows actionable todos - zero decisions needed

---

## 🏗️ Architecture Overview

### Event-Driven Architecture (EDA)
- **Flowcore** as event broker for all domain coordination
- **Event Sourcing** - All changes are immutable events
- **Domain Separation** - Food, Recipe, Meal, Todo domains are loosely coupled
- **Cross-Domain Coordination** via events, not direct calls

### Core Pattern: CREATE → EVENT → HANDLER → DATABASE

```typescript
// 1. REST Endpoint validates & emits event
await FlowcorePathways.write("todo.v0/todo.created.v0", { data });

// 2. Handler receives event & persists to DB
export async function handleTodoCreated(event) {
    await db.insert(todos).values(event.payload);
}
```

### Key Principles
- **No direct domain coupling** - Domains only know about their own data
- **Event-driven coordination** - Changes propagate via Flowcore events
- **Snapshot integrity** - Meals preserve recipe versions at creation time
- **Replay safety** - Handlers never emit new events (prevents infinite loops)

---

## 📊 Domain Models

### 🥘 Food Item Domain
**Purpose:** Nutritional foundation for accurate meal planning

```typescript
// Core entities
FoodItem: { id, userId, name, categoryHierarchy }
FoodItemUnit: { id, foodItemId, unitOfMeasurement, calories, protein, carbs, fat }

// Pattern: Build precise nutritional database over time
// Example: "Medium Apple" → units: ["whole", "slice", "cup chopped"]
```

### 📜 Recipe Domain  
**Purpose:** Template instructions with versioning for historical integrity

```typescript
// Core entities
Recipe: { id, userId, nameOfTheRecipe, description, whenIsItConsumed, version }
RecipeStep: { id, recipeId, instruction, stepNumber }
RecipeIngredient: { id, recipeId, ingredientText, sortOrder }

// Versioning system: Any change bumps version number
// Events: recipe.created.v0, recipe-version.v0 (on updates)
```

### 🍽️ Meal Domain
**Purpose:** Recipe instances with complete snapshots for meal planning

```typescript
// Core entities  
Meal: { id, userId, mealName, scheduledToBeEatenAt, hasMealBeenConsumed, recipes }
MealStep: { id, mealId, recipeId, originalRecipeStepId, instruction, isStepCompleted }
MealIngredient: { id, mealId, recipeId, ingredientText, sortOrder }

// Critical: recipes field contains SNAPSHOTS at meal creation time
recipes: [
  {
    recipeId: "uuid",
    recipeName: "Pizza Dough",      // Snapshot
    recipeDescription: "...",       // Snapshot  
    recipeVersion: 3,               // Snapshot - preserves historical integrity
    scalingFactor: 1.0
  }
]
```

### ✅ Todo Domain
**Purpose:** Actionable tasks with optional cross-domain relations

```typescript
// Core entity
Todo: { 
  id, userId, description, completed, scheduledFor, completedAt,
  relations?: [
    {
      mealInstruction?: {
        mealStepId: "uuid",
        mealId: "uuid", 
        recipeId: "uuid",
        stepNumber: 2
      }
    }
  ]
}

// Most todos are standalone ("take out trash")
// Some todos relate to meal steps (dragged from meal planning)
```

---

## ⚡ Event Sourcing & Flow

### Event Naming Convention
```
{domain}.v0/{entity}.{action}.v0

Examples:
- food-item.v0/food-item.created.v0
- recipe.v0/recipe-version.v0  
- meal.v0/meal-instructions.updated.v0
- todo.v0/todo.completed.v0
```

### Critical Event Flows

#### 1. **Meal Creation = 3 Events (Complete Snapshot)**
```typescript
POST /api/meal → Emits:
1. meal.v0/meal.created.v0          // Metadata + recipe snapshots
2. meal.v0/meal-instructions.created.v0  // Flattened cooking steps  
3. meal.v0/meal-ingredients.created.v0   // Shopping list
```

#### 2. **Recipe Updates = Version Bump**
```typescript
PATCH /api/recipe → Emits:
1. recipe.v0/recipe.updated.v0      // Recipe change
2. recipe.v0/recipe-version.v0      // Version increment
```

#### 3. **Cross-Domain Coordination (Todo ↔ Meal)**
```typescript
// When todo marked complete:
PATCH /api/todo → Emits:
- todo.v0/todo.updated.v0

// Multiple handlers respond:
handleTodoUpdated()     // Updates todos table
handleTodoMealSync()    // Updates mealSteps table (if meal relation exists)
```

### Handler Pattern (Runtime Validation)
```typescript
// Handlers use runtime validation to be selective
export async function handleTodoMealSync(event: any) {
    // Only handle todos with meal relations
    if (!event.payload.relations?.[0]?.mealInstruction) {
        return; // Ignore non-meal todos
    }
    
    // Update meal step completion
    await db.update(mealSteps)
        .set({ isStepCompleted: event.payload.completed })
        .where(eq(mealSteps.id, event.payload.relations[0].mealInstruction.mealStepId));
}
```

---

## 🌐 API Reference

### Authentication
All endpoints require `Authorization: Bearer <token>` header.  
`userId` is extracted from JWT and used for data isolation.

### 📱 Landing Page APIs (Frictionless)

#### `GET /api/todo/today`
**Purpose:** Landing page todo feed - zero friction execution mode

```json
{
  "todos": [
    {
      "id": "uuid",
      "description": "Mix pizza dough", 
      "scheduledFor": "2024-01-14T16:00:00Z",
      "completed": false,
      "context": {
        "type": "meal",           // "meal" | "standalone"
        "mealName": "Sunday Pizza",
        "stepNumber": 1,
        "estimatedDuration": 15
      },
      "urgency": "now",           // "overdue" | "now" | "upcoming" | "later"
      "canStartNow": true,
      "isOverdue": false
    }
  ],
  "counts": {
    "total": 8,
    "completed": 3, 
    "remaining": 5,
    "overdue": 1
  }
}
```

### ⚙️ Configuration APIs (Deep Control)

#### Food Management
```typescript
GET /api/food-item                    // List all food items with unit counts
GET /api/food-item/search?q=apple     // Search food database
GET /api/food-item/:id/units          // Units for specific food item  
POST /api/food-item                   // Create food item
POST /api/food-item/units             // Create nutritional unit
```

#### Recipe Library  
```typescript
GET /api/recipe                       // Recipes with completeness metadata
GET /api/recipe/:id                   // Full recipe with steps & ingredients
GET /api/recipe/search?timing=DINNER  // Filter by meal timing
POST /api/recipe                      // Create recipe template
POST /api/recipe/instructions         // Add cooking steps
POST /api/recipe/ingredients          // Add ingredient list
```

#### Meal Planning
```typescript
GET /api/meal/week                    // Weekly meal plan with progress
GET /api/meal/:id                     // Full meal with cooking progress
POST /api/meal                        // Create meal (snapshots recipes)
PATCH /api/meal                       // Add/remove recipes (rebuilds all)
```

#### Todo Management
```typescript
GET /api/todo                         // All todos with relations
POST /api/todo                        // Create standalone or meal-related todo
PATCH /api/todo                       // Update completion, scheduling
```

### 🔄 Critical API Patterns

#### **Meal Creation (Complete Snapshot)**
```json
POST /api/meal
{
  "mealName": "Sunday Pizza Night",
  "scheduledToBeEatenAt": "2024-01-14T18:00:00Z", 
  "recipes": [
    {
      "recipeId": "pizza-recipe-uuid",
      "scalingFactor": 1.0
    }
  ]
}

// Response includes all 3 created datasets:
{
  "meal": { /* meal metadata with recipe snapshots */ },
  "instructions": { /* flattened cooking steps */ },
  "ingredients": { /* consolidated shopping list */ }
}
```

#### **Todo with Meal Relation**
```json
POST /api/todo
{
  "description": "Mix pizza dough",
  "scheduledFor": "2024-01-14T16:00:00Z",
  "relations": [
    {
      "mealInstruction": {
        "mealStepId": "meal-step-uuid",
        "mealId": "meal-uuid",
        "recipeId": "recipe-uuid",
        "stepNumber": 1
      }
    }
  ]
}
```

---

## 🗄️ Database Schema

### Food Domain Tables
```sql
-- Core food database for nutritional tracking
food_items (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category_hierarchy TEXT[] NOT NULL
);

-- Precise nutritional units (progressive accuracy)
food_item_units (
  id UUID PRIMARY KEY,
  food_item_id UUID REFERENCES food_items(id),
  unit_of_measurement TEXT NOT NULL,   -- "whole", "cup", "slice"
  unit_description TEXT,               -- "One medium apple"
  calories INTEGER NOT NULL,
  protein_in_grams INTEGER,
  carbohydrates_in_grams INTEGER,
  fat_in_grams INTEGER,
  fiber_in_grams INTEGER,
  sugar_in_grams INTEGER
);
```

### Recipe Domain Tables
```sql
-- Recipe templates with versioning
recipes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name_of_the_recipe TEXT NOT NULL,
  general_description_of_the_recipe TEXT,
  when_is_it_consumed TEXT[],          -- ["BREAKFAST", "LUNCH", "DINNER"]
  version INTEGER NOT NULL DEFAULT 1   -- Bumped on any change
);

-- Step-by-step cooking instructions
recipe_steps (
  id UUID PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id),
  instruction TEXT NOT NULL,
  step_number INTEGER NOT NULL
);

-- Simple text ingredient list (human-readable)
recipe_ingredients (
  id UUID PRIMARY KEY, 
  recipe_id UUID REFERENCES recipes(id),
  ingredient_text TEXT NOT NULL,       -- "2 cups flour", "1 tsp salt"
  sort_order INTEGER NOT NULL
);
```

### Meal Domain Tables (Recipe Instances)
```sql
-- Meal metadata with recipe snapshots
meals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_name TEXT NOT NULL,
  scheduled_to_be_eaten_at TIMESTAMP,
  has_meal_been_consumed BOOLEAN DEFAULT false,
  recipes TEXT NOT NULL                -- JSON array of recipe instances
);

-- Flattened cooking steps (from recipe snapshots)
meal_steps (
  id UUID PRIMARY KEY,
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL,             -- Source recipe
  original_recipe_step_id UUID NOT NULL, -- Links back to recipe template
  instruction TEXT NOT NULL,
  step_number INTEGER NOT NULL,        -- Global step order in meal
  is_step_completed BOOLEAN DEFAULT false,
  estimated_duration_minutes INTEGER,
  assigned_to_date TEXT,               -- YYYY-MM-DD format
  todo_id UUID,                        -- Links to todos table
  ingredients_used_in_step TEXT        -- JSON array of food units
);

-- Consolidated shopping list (from recipe snapshots)  
meal_ingredients (
  id UUID PRIMARY KEY,
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL,             -- Source recipe
  ingredient_text TEXT NOT NULL,       -- "2 cups flour"
  sort_order INTEGER NOT NULL
);
```

### Todo Domain Tables
```sql
-- Actionable tasks with optional cross-domain relations
todos (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP,
  completed_at TIMESTAMP,
  relations TEXT                       -- JSON array of domain relations
);
```

---

## 🔄 Complete User Journeys

### Journey 1: Weekly Meal Planning
```typescript
// 1. User creates recipes
POST /api/recipe { nameOfTheRecipe: "Pizza Dough", ... }
POST /api/recipe/ingredients { recipeId, ingredients: ["2 cups flour", ...] }
POST /api/recipe/instructions { recipeId, instructions: ["Mix ingredients", ...] }

// 2. User plans meals for the week  
POST /api/meal { 
  mealName: "Sunday Pizza", 
  scheduledToBeEatenAt: "2024-01-14T18:00:00Z",
  recipes: [{ recipeId: "pizza-uuid", scalingFactor: 1.0 }]
}

// 3. System generates complete snapshot (3 events emitted):
// - meal.created.v0 (metadata + recipe v3 snapshot)
// - meal-instructions.created.v0 (8 flattened cooking steps)  
// - meal-ingredients.created.v0 (shopping list)

// 4. User views weekly plan
GET /api/meal/week
// Shows: Sunday Pizza (0/8 steps complete, can start prep at 4pm)
```

### Journey 2: Drag Step to Todo
```typescript
// 1. User views meal details
GET /api/meal/pizza-meal-uuid
// Shows: Step 1 "Mix dough", Step 2 "Knead", etc.

// 2. User drags "Mix dough" to todo list  
POST /api/todo {
  description: "Mix pizza dough",
  scheduledFor: "2024-01-14T16:00:00Z",
  relations: [{
    mealInstruction: {
      mealStepId: "meal-step-1-uuid",
      mealId: "pizza-meal-uuid", 
      recipeId: "pizza-recipe-uuid",
      stepNumber: 1
    }
  }]
}

// 3. Todo appears on landing page
GET /api/todo/today
// Shows: "Mix pizza dough" (urgency: "now", context: "Step 1")
```

### Journey 3: Complete Todo with Cross-Domain Sync
```typescript
// 1. User marks todo complete on landing page
PATCH /api/todo {
  id: "todo-uuid",
  completed: true,
  completedAt: "2024-01-14T16:15:00Z"
}

// 2. Single event emitted:
// todo.v0/todo.updated.v0 { completed: true, relations: [...] }

// 3. Multiple handlers respond:
// - handleTodoUpdated() → Updates todos table
// - handleTodoMealSync() → Updates meal_steps.is_step_completed = true

// 4. Meal progress automatically updates
GET /api/meal/pizza-meal-uuid  
// Shows: Progress 1/8 complete, next step: "Knead dough"
```

### Journey 4: Landing Page Experience
```typescript
// Morning routine - zero decisions needed
GET /api/todo/today

// Response shows time-ordered, actionable list:
{
  "todos": [
    { 
      "description": "Mix pizza dough",
      "urgency": "now",
      "context": { "type": "meal", "stepNumber": 1 },
      "canStartNow": true
    },
    {
      "description": "Take out trash", 
      "urgency": "upcoming",
      "context": { "type": "standalone" },
      "canStartNow": false
    }
  ],
  "counts": { "remaining": 2, "overdue": 0 }
}

// User just follows the list - no planning needed
```

---

## 💻 Frontend Integration Guide

### Core Frontend Architecture Needs

#### 1. **Two-Tier UI Strategy**
```typescript
// Landing Page (Simple)
- Time-ordered todo list
- Check complete / Remove buttons
- Urgency indicators (overdue = red, now = green)
- Minimal context (just "Step 1 of Pizza")

// Configuration Area (Complex)
- Rich meal planning calendar
- Recipe builder with drag-drop
- Food database management
- Progress tracking dashboards
```

#### 2. **State Management Patterns**
```typescript
// Landing page state (minimal)
interface LandingState {
  todos: TodoItem[];
  counts: { total: number; remaining: number; overdue: number };
  loading: boolean;
}

// Configuration state (complex)
interface ConfigState {
  meals: MealWithProgress[];
  recipes: RecipeWithMetadata[];
  foodItems: FoodItemWithUnits[];
  weekPlan: WeeklyMealPlan;
}
```

#### 3. **Critical API Integration Points**

**Real-time Updates:**
- Todo completion should immediately update meal progress
- Meal changes should refresh todo lists
- Consider WebSocket for live updates

**Optimistic Updates:**
- Mark todo complete immediately (rollback on failure)
- Show meal progress changes instantly

**Error Handling:**
- Network failures during todo completion
- Validation errors during meal creation
- Conflict resolution for concurrent edits

#### 4. **Key UI Components Needed**

**Landing Page:**
```typescript
<TodoFeed />           // GET /api/todo/today
<TodoItem />           // Complete/remove actions  
<UrgencyIndicator />   // Visual priority system
<ProgressSummary />    // Simple counts display
```

**Configuration Area:**
```typescript
<WeeklyMealPlan />     // GET /api/meal/week
<MealBuilder />        // Recipe selection & scaling
<RecipeLibrary />      // GET /api/recipe with search
<FoodDatabase />       // GET /api/food-item management
<ShoppingListGen />    // From meal ingredients
<ProgressDashboard />  // Visual cooking progress
```

#### 5. **Data Flow Examples**

**Meal Planning Flow:**
```typescript
// 1. User selects recipes
const recipes = await searchRecipes({ timing: "DINNER" });

// 2. User creates meal 
const meal = await createMeal({
  mealName: "Sunday Dinner",
  recipes: [{ recipeId: "beef-stew-uuid", scalingFactor: 1.5 }]
});

// 3. UI shows immediate progress
setMealProgress({ completed: 0, total: meal.instructions.length });

// 4. User can drag steps to todo list
const todoableSteps = meal.instructions.map(step => ({
  ...step,
  draggable: true,
  onDrop: () => createTodoFromStep(step)
}));
```

**Todo Completion Flow:**
```typescript
// 1. Optimistic update
setTodoCompleted(todoId, true);

// 2. API call
try {
  await updateTodo({ id: todoId, completed: true });
  
  // 3. Refresh related data
  if (todo.relations?.mealInstruction) {
    refreshMealProgress(todo.relations.mealInstruction.mealId);
  }
} catch (error) {
  // 4. Rollback on failure
  setTodoCompleted(todoId, false);
  showError("Failed to complete todo");
}
```

### 📱 Mobile Considerations
- Landing page optimized for quick thumb interactions
- Swipe gestures for complete/remove actions
- Offline support for todo list (sync when online)
- Push notifications for scheduled todos

### 🎨 UX Principles
- **Landing page:** Absolute simplicity - no cognitive load
- **Configuration area:** Power user features with progressive disclosure
- **Visual hierarchy:** Urgency → Context → Actions
- **Feedback loops:** Immediate response to all user actions

---

## 🧠 Key Design Decisions

### 1. **Event Sourcing with Replay Safety**
**Decision:** Handlers never emit new events  
**Rationale:** Prevents infinite loops during event replay/debugging  
**Pattern:** Single event → Multiple selective handlers

### 2. **Recipe Versioning & Meal Snapshots**  
**Decision:** Meals preserve exact recipe state at creation time  
**Rationale:** Historical integrity - meals don't change when recipes are updated  
**Implementation:** JSON snapshot in `meals.recipes` field

### 3. **Progressive Food Accuracy**
**Decision:** Start with simple ingredients, add nutritional precision over time  
**Rationale:** Users shouldn't be blocked by missing nutrition data  
**Pattern:** Text ingredients → Food units → Precise tracking

### 4. **Cross-Domain Relations via Events**
**Decision:** Todo completion syncs meal progress through events, not direct calls  
**Rationale:** Loose coupling - domains don't depend on each other  
**Implementation:** Runtime validation in handlers

### 5. **Two-Tier API Strategy**
**Decision:** Simple landing page APIs vs. complex configuration APIs  
**Rationale:** Different use cases need different data shapes  
**Example:** `GET /todo/today` (simple) vs `GET /meal/week` (complex)

### 6. **User Data Isolation**
**Decision:** All queries filtered by `userId` from JWT  
**Rationale:** Complete data separation between users  
**Implementation:** Every endpoint extracts `userId` from auth token

### 7. **Optimistic UI with Event Consistency**
**Decision:** Frontend can optimistically update, backend ensures consistency  
**Rationale:** Responsive UX while maintaining data integrity  
**Pattern:** Immediate UI update → API call → Event → Handler → DB

---

## 🚀 Getting Started (Development)

### Prerequisites
```bash
# Required tools
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)
```

### Environment Setup  
```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, etc.

# Run database migrations
bun run db:migrate

# Start development server
bun run dev
```

### Testing the Full Flow
```bash
# 1. Create food item
curl -X POST localhost:3000/api/food-item \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Apple", "categoryHierarchy": ["Fruits"]}'

# 2. Add nutritional unit  
curl -X POST localhost:3000/api/food-item/units \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"foodItemId": "uuid", "unitOfMeasurement": "whole", "calories": 95}'

# 3. Create recipe
curl -X POST localhost:3000/api/recipe \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nameOfTheRecipe": "Apple Pie", "whenIsItConsumed": ["DESSERT"]}'

# 4. Plan meal (creates complete snapshot)
curl -X POST localhost:3000/api/meal \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"mealName": "Sunday Dessert", "recipes": [{"recipeId": "uuid"}]}'

# 5. Check landing page
curl localhost:3000/api/todo/today \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📚 Additional Resources

- **Flowcore Documentation:** [Event streaming patterns]
- **Drizzle ORM:** [Database query patterns]  
- **Hono Framework:** [API routing and middleware]
- **Domain-Driven Design:** [Evans - Blue Book]
- **Event Sourcing:** [Fowler - Event Sourcing patterns]

---

**Built with ❤️ to reduce decision fatigue and streamline daily life.**
