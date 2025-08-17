# Daily Scheduler API - Client Integration Guide

> **"Daily schedule planner to lessen decision fatigue and streamline your
> day"**

## 📋 Table of Contents

1. [Application Philosophy](#application-philosophy)
2. [User Experience Flow](#user-experience-flow)
3. [API Overview](#api-overview)
4. [Landing Page APIs](#landing-page-apis)
5. [Configuration APIs](#configuration-apis)
6. [Complete User Journeys](#complete-user-journeys)
7. [Authentication](#authentication)
8. [API Reference](#api-reference)

---

## 🎯 Application Philosophy

### The Core Problem

**Decision fatigue** - The mental exhaustion from making countless daily
decisions about what to cook, when to cook it, what ingredients to buy, and how
to organize meal preparation.

### The Solution

A **two-tier application** designed to eliminate daily decision-making:

#### 🎯 **Landing Page (Execution Mode)**

- **Purpose:** Zero-friction todo execution
- **Experience:** "Just tell me what to do right now"
- **Design:** Dead simple list - complete tasks, no decisions needed
- **Usage:** Monday-Friday morning routine

#### ⚙️ **Configuration Area (Planning Mode)**

- **Purpose:** Deep meal planning and recipe management
- **Experience:** "Set up everything so the landing page is perfect"
- **Design:** Rich interfaces for meal planning, recipe building, food tracking
- **Usage:** Sunday planning session (20 minutes weekly)

### Key Philosophy

> **"Spend 20 minutes on Sunday planning, then have zero decisions
> Monday-Friday"**

The complexity of meal planning, recipe management, and nutritional tracking
happens in the configuration area so that the landing page can be absolutely
frictionless.

---

## 🔄 User Experience Flow

### Weekly Cycle

```
Sunday (Planning):
- Review upcoming week in meal planner
- Select recipes for each day  
- System generates complete shopping list
- Drag meal steps to specific days/times
- 20 minutes total = week fully planned

Monday-Friday (Execution):
- Open landing page = instant todo list
- "Mix pizza dough at 4pm"
- "Preheat oven at 6pm" 
- "Take out trash"
- Just follow the list, no thinking required
```

### The Magic

**Complex meal preparation becomes simple, time-ordered tasks.** Instead of
"make pizza tonight," you get:

1. 2:00pm - Shop for ingredients
2. 4:00pm - Mix pizza dough
3. 5:00pm - Prepare pizza sauce
4. 6:00pm - Preheat oven
5. 6:30pm - Assemble and bake pizza

---

## 🌐 API Overview

### Two-Tier API Design

#### **Landing Page APIs** (Simple & Fast)

- Designed for immediate consumption
- Minimal data, maximum actionability
- Time-ordered, priority-aware
- Mobile-optimized responses

#### **Configuration APIs** (Rich & Detailed)

- Designed for deep management
- Complete datasets with metadata
- Search, filtering, relationships
- Desktop-optimized workflows

### Core Domains

#### 🥘 **Food Items**

Nutritional building blocks with progressive accuracy

- Create food database (apples, flour, etc.)
- Add nutritional units (whole apple = 95 calories)
- Search and manage food library

#### 📜 **Recipes**

Template instructions with versioning

- Create step-by-step cooking instructions
- Manage ingredient lists
- Version tracking for historical integrity

#### 🍽️ **Meals**

Recipe instances for specific dates

- Combine multiple recipes into planned meals
- Generate shopping lists and cooking timelines
- Track preparation progress

#### ✅ **Todos**

Actionable tasks (standalone or meal-related)

- Simple tasks ("take out trash")
- Meal-derived tasks ("mix pizza dough")
- Time-based scheduling and completion tracking

---

## 📱 Landing Page APIs

### Primary Endpoint: Today's Todo Feed

#### `GET /api/todo/today`

**Purpose:** The main landing page feed - shows exactly what to do right now

```typescript
// Response
{
  "todos": [
    {
      "id": "uuid",
      "description": "Mix pizza dough",
      "scheduledFor": "2024-01-14T16:00:00Z", 
      "completed": false,
      "context": {
        "type": "meal",           // "meal" | "standalone"
        "mealName": "Sunday Pizza Night",
        "stepNumber": 1,
        "estimatedDuration": 15   // minutes
      },
      "urgency": "now",           // "overdue" | "now" | "upcoming" | "later"
      "canStartNow": true,
      "isOverdue": false
    },
    {
      "id": "uuid2",
      "description": "Take out trash",
      "scheduledFor": "2024-01-14T17:00:00Z",
      "completed": false, 
      "context": {
        "type": "standalone"
      },
      "urgency": "upcoming",
      "canStartNow": false,
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

**UI Implementation:**

- Sort by urgency: overdue (red) → now (green) → upcoming (yellow) → later
  (gray)
- Show meal context as badge: "Step 1 of Sunday Pizza"
- Disable actions for `canStartNow: false`
- Simple complete/remove buttons

### Todo Actions

#### `PATCH /api/todo`

**Purpose:** Mark todos complete or update scheduling

```typescript
// Mark complete
{
  "id": "uuid",
  "completed": true,
  "completedAt": "2024-01-14T16:15:00Z"
}

// Reschedule
{
  "id": "uuid", 
  "scheduledFor": "2024-01-14T18:00:00Z"
}
```

#### `DELETE /api/todo`

**Purpose:** Remove todos

```typescript
{
  "id": "uuid",
  "reasonForArchiving": "No longer needed"
}
```

---

## ⚙️ Configuration APIs

### Meal Planning (Core Workflow)

#### `GET /api/meal/week`

**Purpose:** Weekly meal planning interface - the heart of the configuration
area

```typescript
// Response
{
  "weekPlan": [
    {
      "date": "2024-01-14",
      "dayName": "Sunday",
      "meals": [
        {
          "mealId": "uuid",
          "mealName": "Sunday Pizza Night",
          "scheduledToBeEatenAt": "2024-01-14T18:00:00Z",
          "hasMealBeenConsumed": false,
          "recipes": [
            {
              "recipeName": "Pizza Dough",
              "recipeVersion": 3,
            }
          ],
          "progress": {
            "completed": 2,
            "total": 8,
            "percentage": 25
          },
          "nextStep": "Mix pizza dough",
          "canStartPrep": "2024-01-14T16:00:00Z"  // 2 hours before meal
        }
      ],
      "totalMeals": 1,
      "completedMeals": 0
    }
    // ... more days
  ],
  "summary": {
    "totalMeals": 7,
    "completedMeals": 2,
    "daysWithMeals": 5
  }
}
```

**UI Implementation:**

- Calendar view with meal cards
- Progress bars for cooking status
- Drag-and-drop for rescheduling
- "Start Prep" buttons based on `canStartPrep`

#### `POST /api/meal`

**Purpose:** Create new meal plan - this generates the entire cooking workflow

```typescript
// Request
{
  "mealName": "Sunday Pizza Night",
  "scheduledToBeEatenAt": "2024-01-14T18:00:00Z",
  "recipes": [
    {
      "recipeId": "pizza-recipe-uuid",
    },
    {
      "recipeId": "salad-recipe-uuid", 
    }
  ]
}

// Response includes complete meal data
{
  "meal": { /* meal metadata */ },
  "instructions": { /* all cooking steps */ },
  "ingredients": { /* shopping list */ }
}
```

**What Happens:** System creates complete cooking timeline from recipes,
generates shopping list, flattens all steps into sequential order.

#### `GET /api/meal/{id}`

**Purpose:** Detailed meal view for step management

```typescript
// Response
{
  "id": "meal-uuid",
  "mealName": "Sunday Pizza Night", 
  "scheduledToBeEatenAt": "2024-01-14T18:00:00Z",
  "recipes": [/* recipe snapshots */],
  "steps": [
    {
      "id": "step-uuid",
      "recipeId": "pizza-recipe-uuid",
      "instruction": "Mix flour and water",
      "stepNumber": 1,
      "isStepCompleted": false,
      "estimatedDurationMinutes": 10,
      "assignedToDate": null,  // Can be assigned to specific day
      "todoId": null,          // Set when dragged to todo list
      "ingredientsUsedInStep": [
        {
          "foodItemId": "flour-uuid",
          "quantity": 2,
          "unit": "cups"
        }
      ]
    }
    // ... more steps
  ],
  "progress": {
    "completed": 1,
    "total": 8, 
    "percentage": 12.5
  },
  "nextStep": "Knead dough for 10 minutes",
  "estimatedTimeRemaining": 45  // minutes
}
```

**UI Implementation:**

- Step-by-step checklist
- Drag steps to calendar/todo list
- Progress visualization
- Timer integration for `estimatedDurationMinutes`

### Recipe Management

#### `GET /api/recipe`

**Purpose:** Recipe library management

```typescript
// Response
[
  {
    "id": "recipe-uuid",
    "nameOfTheRecipe": "Pizza Dough",
    "generalDescriptionOfTheRecipe": "Classic pizza dough recipe",
    "whenIsItConsumed": ["DINNER"],
    "version": 3,
    "stepCount": 5,
    "ingredientCount": 4,
    "hasSteps": true,
    "hasIngredients": true,
    "completeness": "complete", // "complete" | "incomplete"
  },
];
```

#### `GET /api/recipe/{id}`

**Purpose:** Full recipe details for editing

```typescript
// Response
{
  "id": "recipe-uuid",
  "nameOfTheRecipe": "Pizza Dough",
  "generalDescriptionOfTheRecipe": "Classic pizza dough recipe",
  "whenIsItConsumed": ["DINNER"], 
  "version": 3,
  "steps": [
    {
      "id": "step-uuid",
      "instruction": "Mix flour and water", 
      "stepNumber": 1
    }
  ],
  "ingredients": [
    {
      "id": "ingredient-uuid",
      "ingredientText": "2 cups all-purpose flour",
    }
  ],
  "metadata": {
    "stepCount": 5,
    "ingredientCount": 4,
    "estimatedTotalTime": 120  // minutes
  }
}
```

#### `POST /api/recipe`

**Purpose:** Create new recipe template

```typescript
// Request
{
  "nameOfTheRecipe": "Pizza Dough",
  "generalDescriptionOfTheRecipe": "Classic pizza dough recipe", 
  "whenIsItConsumed": ["DINNER"]
}
```

#### `POST /api/recipe/instructions`

**Purpose:** Add cooking steps to recipe

```typescript
// Request
{
  "recipeId": "recipe-uuid",
  "instructions": [
    {
      "instruction": "Mix flour and water",
      "stepNumber": 1,
      "estimatedDurationMinutes": 5
    },
    {
      "instruction": "Knead dough",
      "stepNumber": 2,
      "estimatedDurationMinutes": 10
    }
  ]
}
```

#### `POST /api/recipe/ingredients`

**Purpose:** Add ingredient list to recipe

```typescript
// Request
{
  "recipeId": "recipe-uuid", 
  "ingredients": [
    {
      "ingredientText": "2 cups all-purpose flour",
    },
    {
      "ingredientText": "1 tsp salt",
    }
  ]
}
```

### Food Database Management

#### `GET /api/food-item`

**Purpose:** Manage nutritional food database

```typescript
// Response
[
  {
    "id": "food-uuid",
    "name": "Medium Sized Apple",
    "categoryHierarchy": ["Fruits", "Tree Fruits"],
    "unitCount": 3,
    "hasUnits": true,
  },
];
```

#### `GET /api/food-item/{id}/units`

**Purpose:** Nutritional units for specific food

```typescript
// Response
[
  {
    "id": "unit-uuid",
    "foodItemName": "Medium Sized Apple",
    "unitOfMeasurement": "whole",
    "unitDescription": "One whole medium apple",
    "calories": 95,
    "proteinInGrams": 0,
    "carbohydratesInGrams": 25,
    "fatInGrams": 0,
  },
  {
    "id": "unit-uuid2",
    "unitOfMeasurement": "slice",
    "calories": 12,
    // ... more nutrition data
  },
];
```

#### `POST /api/food-item`

**Purpose:** Add new food to database

```typescript
// Request
{
  "name": "Medium Sized Apple",
  "categoryHierarchy": ["Fruits", "Tree Fruits"]
}
```

### Todo Management

#### `GET /api/todo`

**Purpose:** Full todo management (configuration area)

```typescript
// Response
[
  {
    "id": "todo-uuid",
    "description": "Mix pizza dough",
    "completed": false,
    "scheduledFor": "2024-01-14T16:00:00Z",
    "relations": [
      {
        "mealInstruction": {
          "mealStepId": "step-uuid",
          "mealId": "meal-uuid",
          "recipeId": "recipe-uuid",
          "stepNumber": 1,
        },
      },
    ],
  },
];
```

#### `POST /api/todo`

**Purpose:** Create todos (standalone or from meal steps)

```typescript
// Standalone todo
{
  "description": "Take out trash",
  "scheduledFor": "2024-01-14T17:00:00Z"
}

// Meal-related todo (when dragging step to todo list)
{
  "description": "Mix pizza dough",
  "scheduledFor": "2024-01-14T16:00:00Z",
  "relations": [
    {
      "mealInstruction": {
        "mealStepId": "step-uuid",
        "mealId": "meal-uuid", 
        "recipeId": "recipe-uuid",
        "stepNumber": 1
      }
    }
  ]
}
```

---

## 🔄 Complete User Journeys

### Journey 1: Sunday Planning Session

```typescript
// 1. Review upcoming week
GET /api/meal/week
// Shows: This week has 3 meals planned, 4 days need meals

// 2. Browse recipe library
GET /api/recipe/search?timing=DINNER
// Shows: Pizza, Pasta, Stir Fry recipes

// 3. Plan Sunday dinner
POST /api/meal {
  mealName: "Sunday Pizza Night",
  scheduledToBeEatenAt: "2024-01-14T18:00:00Z",
}
// System creates 8 cooking steps, shopping list

// 4. Organize cooking timeline
GET /api/meal/pizza-meal-uuid
// Shows: 8 steps, drag "Mix dough" to 4pm, "Bake" to 6:30pm

// 5. Create specific todos
POST /api/todo {
  description: "Mix pizza dough",
  scheduledFor: "2024-01-14T16:00:00Z",
  relations: [{ mealInstruction: { mealStepId: "step-1-uuid" }}]
}
```

**Result:** Week is planned, landing page will show time-ordered cooking tasks

### Journey 2: Monday Morning Execution

```typescript
// 1. Open landing page
GET /api/todo/today
// Shows: "Mix pizza dough" (4pm), "Take out trash" (5pm)

// 2. 4pm - Complete cooking task
PATCH /api/todo {
  id: "pizza-dough-todo-uuid",
  completed: true,
  completedAt: "2024-01-14T16:15:00Z"
}
// System automatically updates meal progress: 1/8 steps complete

// 3. Check next task
GET /api/todo/today  
// Shows: "Prepare pizza sauce" is now the next cooking task
```

**Result:** Zero decision-making, just follow the list

### Journey 3: Meal Progress Tracking

```typescript
// Check cooking progress
GET / api / meal / pizza - meal - uuid;
// Shows: Progress 3/8 complete (37%), next step: "Preheat oven"

// Steps completed automatically sync when todos marked done
// No manual tracking needed
```

### Journey 4: Recipe Building

```typescript
// 1. Create recipe template
POST /api/recipe {
  nameOfTheRecipe: "Homemade Pizza",
  generalDescriptionOfTheRecipe: "Classic pizza from scratch",
  whenIsItConsumed: ["DINNER"]
}

// 2. Add cooking steps
POST /api/recipe/instructions {
  recipeId: "new-recipe-uuid",
  instructions: [
    { instruction: "Mix flour and water", stepNumber: 1, estimatedDurationMinutes: 5 },
    { instruction: "Knead dough", stepNumber: 2, estimatedDurationMinutes: 10 },
    { instruction: "Let rise", stepNumber: 3, estimatedDurationMinutes: 60 },
    { instruction: "Preheat oven", stepNumber: 4, estimatedDurationMinutes: 15 },
    { instruction: "Shape and bake", stepNumber: 5, estimatedDurationMinutes: 20 }
  ]
}

// 3. Add ingredient list
POST /api/recipe/ingredients {
  recipeId: "new-recipe-uuid",
  ingredients: [
    { ingredientText: "2 cups all-purpose flour" },
    { ingredientText: "1 tsp salt" },
    { ingredientText: "1 cup warm water" }
  ]
}
```

**Result:** Recipe ready for meal planning, will generate proper cooking
timeline

---

## 🔐 Authentication

All API endpoints require authentication:

```typescript
// Headers for all requests
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
```

User data is completely isolated - each user only sees their own meals, recipes,
todos, and food items.

---

## 📚 API Reference Summary

### Landing Page (Execution Mode)

- `GET /api/todo/today` - Main todo feed
- `PATCH /api/todo` - Complete/reschedule todos
- `DELETE /api/todo` - Remove todos

### Configuration (Planning Mode)

**Meal Planning:**

- `GET /api/meal/week` - Weekly meal calendar
- `GET /api/meal/{id}` - Detailed meal view
- `POST /api/meal` - Create meal plan
- `PATCH /api/meal` - Modify meal

**Recipe Management:**

- `GET /api/recipe` - Recipe library
- `GET /api/recipe/{id}` - Recipe details
- `POST /api/recipe` - Create recipe
- `POST /api/recipe/instructions` - Add cooking steps
- `POST /api/recipe/ingredients` - Add ingredient list

**Todo Management:**

- `GET /api/todo` - All todos with relations
- `POST /api/todo` - Create standalone or meal-related todos

**Food Database:**

- `GET /api/food-item` - Food library
- `GET /api/food-item/{id}/units` - Nutritional units
- `POST /api/food-item` - Add food item
- `POST /api/food-item/units` - Add nutritional data

---

## 🎯 Frontend Implementation Tips

### Landing Page

- **Keep it simple:** Large buttons, clear urgency indicators
- **Real-time feel:** Optimistic updates, immediate feedback
- **Mobile-first:** Thumb-friendly tap targets
- **Minimal cognitive load:** No decisions, just "do this next"

### Configuration Area

- **Progressive disclosure:** Advanced features hidden until needed
- **Drag-and-drop:** Steps to calendar, recipes to meals
- **Rich feedback:** Progress bars, completion states, error handling
- **Desktop-optimized:** Multiple panels, detailed forms

### Key Integrations

- **Cross-domain updates:** Todo completion updates meal progress
- **Smart scheduling:** Suggest prep times based on meal timing
- **Contextual actions:** "Add to todo" buttons on meal steps
- **Error resilience:** Graceful degradation, offline support

---

**Built with ❤️ to eliminate daily decision fatigue through intelligent meal
planning.**
