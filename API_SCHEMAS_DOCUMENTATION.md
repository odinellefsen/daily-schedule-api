# Daily Scheduler API - Zod Schemas Documentation

This document contains all the Zod schemas used for HTTP endpoint validation in
the Daily Scheduler API, organized by endpoint.

## Table of Contents

- [Todo Endpoints](#todo-endpoints)
- [Habit Endpoints](#habit-endpoints)
- [Recipe Endpoints](#recipe-endpoints)
- [Meal Endpoints](#meal-endpoints)
- [Food Item Endpoints](#food-item-endpoints)
- [Food Item Units Endpoints](#food-item-units-endpoints)

---

## Todo Endpoints

### POST /api/todo/ - Create Todo

```typescript
const createTodoRequestSchema = z.object({
    description: z
        .string()
        .min(1, "Description is required")
        .max(250, "Description must be less than 250 characters"),
    scheduledFor: z.string().datetime().optional(),
    relations: z
        .array(
            z.object({
                mealInstruction: z.object({
                    mealStepId: z.string().uuid(),
                    mealId: z.string().uuid(),
                    recipeId: z.string().uuid(),
                    instructionNumber: z.number().int().positive(),
                }),
            }),
        )
        .min(
            1,
            "if relations is NOT undefined, you must have at least one relation",
        )
        .max(5, "you can only have up to 5 relations")
        .optional(),
});
```

### PATCH /api/todo/complete - Complete Todo

```typescript
const completeTodoRequestSchema = z.object({
    id: z.string().uuid(),
});
```

### PATCH /api/todo/cancel - Cancel Todo

```typescript
const cancelTodoRequestSchema = z.object({
    id: z.string().uuid(),
    reasonForCancelling: z.string().min(1).optional(),
});
```

### DELETE /api/todo/ - Delete/Archive Todo

```typescript
const deleteTodoRequestSchema = z.object({
    id: z.string().uuid(),
    reasonForArchiving: z.string().min(1, "Reason for archiving is required"),
});
```

### PATCH /api/todo/relations - Update Todo Relations

```typescript
const updateRelationsRequestSchema = z.object({
    id: z.string().uuid(),
    relations: z
        .array(
            z.object({
                mealInstruction: z
                    .object({
                        mealStepId: z.string().uuid(),
                        mealId: z.string().uuid(),
                        recipeId: z.string().uuid(),
                        instructionNumber: z.number().int().positive(),
                    })
                    .optional(),
            }),
        )
        .max(5),
});
```

### GET /api/todo/today - List Today's Todos

_No request schema - query parameters only_

### GET /api/todo/ - List All Todos

_No request schema - query parameters only_

---

## Habit Endpoints

### POST /api/habit/batch - Create Batch Habits

```typescript
const weeklyHabitCreationSchema = z.object({
    userId: z.string(),
    domain: z.string(), // e.g., "meal" (currently only "meal" is supported)
    entityId: z.string().uuid(), // e.g., mealId

    // Main habit configuration (so far only weekly)
    recurrenceType: z.literal("weekly"),
    targetWeekday: z.enum([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
    ]),
    targetTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM when main event should happen
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD

    subEntities: z
        .array(
            z.object({
                subEntityId: z.string().uuid().optional(), // recipe instruction ID for meal domain
                scheduledWeekday: z.enum([
                    "monday",
                    "tuesday",
                    "wednesday",
                    "thursday",
                    "friday",
                    "saturday",
                    "sunday",
                ]),
                scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM
            }),
        )
        .min(1),
});
```

**Notes:**

- For the meal domain, `subEntityId` refers to recipe instruction IDs
- Unconfigured instructions are automatically added, scheduled 30 minutes before
  the main event
- The endpoint validates that all provided `subEntityId`s exist in the meal's
  attached recipes

---

## Recipe Endpoints

### POST /api/recipe/ - Create Recipe

```typescript
const createRecipeRequestSchema = z.object({
    nameOfTheRecipe: z
        .string()
        .min(1, "Recipe name min length is 1")
        .max(75, "Recipe name max length is 75"),
    generalDescriptionOfTheRecipe: z.string().max(250).optional(),
    whenIsItConsumed: z.array(z.nativeEnum(MealTimingEnum)).optional(),
});
```

### PATCH /api/recipe/ - Update Recipe

```typescript
const updateRecipeRequestSchema = z.object({
    nameOfTheRecipe: z
        .string()
        .min(1, "Recipe name min length is 1")
        .max(75, "Recipe name max length is 75"),
    generalDescriptionOfTheRecipe: z.string().max(250).optional(),
    whenIsItConsumed: z.array(z.nativeEnum(MealTimingEnum)).optional(),
});
```

### DELETE /api/recipe/ - Delete Recipe

```typescript
const deleteRecipeRequestSchema = z.object({
    nameOfTheRecipe: z
        .string()
        .min(1, "Recipe name min length is 1")
        .max(75, "Recipe name max length is 75"),
});
```

### GET /api/recipe/ - List Recipes

_No request schema - query parameters only_

### GET /api/recipe/:recipeId - Get Recipe by ID

_No request schema - path parameters only_

### GET /api/recipe/search - Search Recipes

_No request schema - query parameters only_

### POST /api/recipe/ingredients - Create Recipe Ingredients

```typescript
const createRecipeIngredientsRequestSchema = z.object({
    recipeId: z.string().uuid(),
    ingredients: z
        .array(
            z.object({
                ingredientText: z.string().min(1).max(150),
            }),
        )
        .min(1)
        .max(50),
});
```

### DELETE /api/recipe/ingredients - Delete Recipe Ingredients

```typescript
const deleteRecipeIngredientsRequestSchema = z.object({
    recipeId: z.string().uuid(),
});
```

### PATCH /api/recipe/ingredients - Update Recipe Ingredients

```typescript
const updateRecipeIngredientsRequestSchema = z.object({
    recipeId: z.string().uuid(),
    ingredients: z
        .array(
            z.object({
                ingredientText: z.string().min(1).max(150),
            }),
        )
        .min(1)
        .max(50),
});
```

### POST /api/recipe/instructions - Create Recipe Instructions

```typescript
const createRecipeInstructionsRequestSchema = z.object({
    recipeId: z.string().uuid(),
    stepByStepInstructions: z
        .array(
            z.object({
                stepInstruction: z.string().min(1).max(250),
                foodItemUnitsUsedInStep: z
                    .array(
                        z.object({
                            foodItemUnitId: z.string().uuid(),
                            quantityOfFoodItemUnit: z
                                .number()
                                .positive()
                                .max(1_000_000)
                                .default(1),
                        }),
                    )
                    .optional(),
            }),
        )
        .min(1)
        .max(30),
});
```

### DELETE /api/recipe/instructions - Delete Recipe Instructions

```typescript
const deleteRecipeInstructionsRequestSchema = z.object({
    recipeId: z.string().uuid(),
});
```

### PATCH /api/recipe/instructions - Update Recipe Instructions

```typescript
const updateRecipeInstructionsRequestSchema = z.object({
    recipeId: z.string().uuid(),
    stepByStepInstructions: z
        .array(
            z.object({
                instructionNumber: z.number().positive().int(),
                stepInstruction: z.string().min(1).max(250),
                foodItemUnitsUsedInStep: z
                    .array(
                        z.object({
                            foodItemUnitId: z.string().uuid(),
                            foodItemId: z.string().uuid(),
                            quantityOfFoodItemUnit: z
                                .number()
                                .positive()
                                .max(1_000_000)
                                .default(1),
                        }),
                    )
                    .optional(),
            }),
        )
        .min(1)
        .max(30),
});
```

---

## Meal Endpoints

### POST /api/meal/ - Create Meal

```typescript
const createMealRequestSchema = z.object({
    mealName: z
        .string()
        .min(1, "Meal name min length is 1")
        .max(100, "Meal name max length is 100"),
});
```

### GET /api/meal/ - List All Meals

_No request schema - query parameters only_

### GET /api/meal/:mealId - Get Meal by ID

_No request schema - path parameters only_

### POST /api/meal/:mealId/recipes - Attach Recipe(s) to Meal

```typescript
const attachRecipeRequestSchema = z.object({
    recipeIds: z.array(z.string().uuid()).min(
        1,
        "At least one recipe ID is required",
    ),
});
```

**Notes:**

- Supports attaching multiple recipes at once by providing an array of recipe
  IDs
- All recipes will be validated for existence and user ownership before
  attachment
- Recipes are automatically ordered sequentially based on the current max order
  in the meal

---

## Food Item Endpoints

### POST /api/food-item/ - Create Food Item

```typescript
const createFoodItemRequestSchema = z.object({
    foodItemName: z
        .string()
        .min(1, "Food item name min length is 1")
        .max(100, "Food item name max length is 100"),
    categoryHierarchy: z.array(z.string()).optional(),
});
```

### DELETE /api/food-item/ - Delete Food Item

```typescript
const deleteFoodItemRequestSchema = z.object({
    foodItemName: z
        .string()
        .min(1, "Food item name min length is 1")
        .max(100, "Food item name max length is 100"),
});
```

### PATCH /api/food-item/ - Update Food Item

```typescript
const updateFoodItemRequestSchema = z.object({
    foodItemName: z
        .string()
        .min(1, "Food item name min length is 1")
        .max(100, "Food item name max length is 100"),
    categoryHierarchy: z.array(z.string()).optional(),
});
```

### GET /api/food-item/ - List Food Items

_No request schema - query parameters only_

### GET /api/food-item/search - Search Food Items

_No request schema - query parameters only_

---

## Food Item Units Endpoints

### POST /api/food-item/:foodItemId/units - Create Food Item Units

```typescript
const createFoodItemUnitRequestSchema = foodItemUnitSchema
    .omit({
        foodItemId: true,
    })
    .extend({
        foodItemName: z.string().min(1, "Food item name min length is 1"),
        units: z.array(
            foodItemUnitSchema.shape.units.element.omit({
                id: true,
                source: true,
            }),
        ),
    });
```

### DELETE /api/food-item/:foodItemId/units - Delete Food Item Units

```typescript
const deleteFoodItemUnitRequestSchema = z.object({
    unitIds: z.array(z.string().uuid()),
});
```

### PATCH /api/food-item/:foodItemId/units - Update Food Item Units

```typescript
const updateFoodItemUnitRequestSchema = foodItemUnitSchema
    .omit({
        foodItemId: true,
    })
    .extend({
        foodItemName: z.string().min(1, "Food item name min length is 1"),
    });
```

### GET /api/food-item/:foodItemId/units - List Food Item Units

_No request schema - path parameters only_

### GET /api/food-item/units - List All Food Item Units

_No request schema_

---

## Common Types and Enums

### MealTimingEnum

Used in recipe schemas for `whenIsItConsumed` field:

- BREAKFAST
- LUNCH
- DINNER
- SNACK

### Weekday Enum

Used in habit schemas:

- monday
- tuesday
- wednesday
- thursday
- friday
- saturday
- sunday

### Date/Time Formats

- **YYYY-MM-DD**: Date format (e.g., "2024-01-15")
- **HH:MM**: Time format in 24-hour notation (e.g., "14:30")
- **ISO DateTime**: Full ISO 8601 datetime string (e.g.,
  "2024-01-15T14:30:00.000Z")

### UUID Format

All ID fields use UUID v4 format validated by `z.string().uuid()`

---

## Notes

1. All endpoints require authentication via middleware that sets `c.userId`
2. Most endpoints return standardized `ApiResponse` format with success/error
   status
3. Validation errors return HTTP 400 with detailed Zod error information
4. Many endpoints include additional business logic validation beyond schema
   validation
5. Some endpoints have read-only operations (GET) that don't require request
   schemas but may use query parameters
6. The API uses Flowcore for event sourcing, so many operations emit events
   after validation
