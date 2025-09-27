# Daily Scheduler API - Response Schemas Documentation

This document contains all the response schemas returned by HTTP endpoints in
the Daily Scheduler API, organized by endpoint.

## Table of Contents

- [Response Format Overview](#response-format-overview)
- [Todo Endpoints](#todo-endpoints)
- [Habit Endpoints](#habit-endpoints)
- [Recipe Endpoints](#recipe-endpoints)
- [Meal Endpoints](#meal-endpoints)
- [Food Item Endpoints](#food-item-endpoints)
- [Food Item Units Endpoints](#food-item-units-endpoints)

---

## Response Format Overview

All API endpoints return responses in a standardized format:

### Success Response

```typescript
{
  success: true,
  message: string,
  data?: any // Optional, present when there's data to return
}
```

### Error Response

```typescript
{
  success: false,
  message: string,
  errors?: any // Optional, present when there are validation or other errors
}
```

---

## Todo Endpoints

### POST /api/todo/ - Create Todo

**Success Response (201):**

```typescript
{
  success: true,
  message: "Todo created successfully",
  data: {
    id: string, // UUID
    userId: string,
    description: string,
    completed: boolean,
    scheduledFor?: string, // ISO datetime
    completedAt?: string, // ISO datetime
    relations?: Array<{
      mealInstruction: {
        mealStepId: string, // UUID
        mealId: string, // UUID
        recipeId: string, // UUID
        instructionNumber: number
      }
    }>
  }
}
```

### PATCH /api/todo/complete - Complete Todo

**Success Response (200):**

```typescript
{
  success: true,
  message: "Todo completed successfully",
  data: {
    id: string, // UUID
    userId: string,
    completedAt: string // ISO datetime
  }
}
```

### PATCH /api/todo/cancel - Cancel Todo

**Success Response (200):**

```typescript
{
  success: true,
  message: "Todo cancelled successfully",
  data: {
    id: string, // UUID
    userId: string,
    cancelledAt: string, // ISO datetime
    reasonForCancelling?: string
  }
}
```

### DELETE /api/todo/ - Delete/Archive Todo

**Success Response (200):**

```typescript
{
  success: true,
  message: "Todo archived successfully",
  data: {
    id: string, // UUID
    userId: string,
    description: string,
    completed: boolean,
    scheduledFor?: string, // ISO datetime
    completedAt?: string, // ISO datetime
    relations?: Array<{
      mealInstruction: {
        mealStepId: string, // UUID
        mealId: string, // UUID
        recipeId: string, // UUID
        instructionNumber: number
      }
    }>,
    reasonForArchiving: string
  }
}
```

### PATCH /api/todo/relations - Update Todo Relations

**Success Response (200):**

```typescript
{
  success: true,
  message: "Todo relations updated successfully",
  data: {
    id: string, // UUID
    userId: string,
    relations: Array<{
      mealInstruction?: {
        mealStepId: string, // UUID
        mealId: string, // UUID
        recipeId: string, // UUID
        instructionNumber: number
      }
    }>
  }
}
```

### GET /api/todo/today - List Today's Todos

**Success Response (200):**

```typescript
{
  success: true,
  message: "Today's todos retrieved successfully",
  data: {
    todos: Array<{
      id: string, // UUID
      description: string,
      scheduledFor?: string, // ISO datetime
      completed: boolean,
      context: {
        type: "meal" | "standalone",
        mealName?: string,
        instructionNumber?: number,
        estimatedDuration?: number | null
      },
      canStartNow: boolean,
      isOverdue: boolean,
      urgency: "overdue" | "now" | "upcoming" | "later"
    }>,
    counts: {
      total: number,
      completed: number,
      remaining: number,
      overdue: number
    }
  }
}
```

### GET /api/todo/ - List All Todos

**Success Response (200):**

```typescript
{
  success: true,
  message: "Todos retrieved successfully",
  data: Array<{
    id: string, // UUID
    description: string,
    completed: boolean,
    scheduledFor?: string, // ISO datetime
    completedAt?: string, // ISO datetime
    relations?: Array<{
      mealInstruction: {
        mealStepId: string, // UUID
        mealId: string, // UUID
        recipeId: string, // UUID
        instructionNumber: number
      }
    }> | null
  }>
}
```

---

## Habit Endpoints

### POST /api/habit/batch - Create Batch Habits

**Success Response (201):**

```typescript
{
  success: true,
  message: "Batch habits created successfully",
  data: {
    domain: string,
    subEntityCount: number
  }
}
```

---

## Recipe Endpoints

### POST /api/recipe/ - Create Recipe

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipe created successfully",
  data: {
    id: string, // UUID
    userId: string,
    nameOfTheRecipe: string,
    generalDescriptionOfTheRecipe?: string,
    whenIsItConsumed?: Array<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">
  }
}
```

### PATCH /api/recipe/ - Update Recipe

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipe updated successfully",
  data: {
    id: string, // UUID
    userId: string,
    nameOfTheRecipe: string,
    generalDescriptionOfTheRecipe?: string,
    whenIsItConsumed?: Array<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">,
    oldValues: {
      id: string, // UUID
      userId: string,
      nameOfTheRecipe: string,
      generalDescriptionOfTheRecipe?: string,
      whenIsItConsumed?: Array<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">
    }
  }
}
```

### DELETE /api/recipe/ - Delete Recipe

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipe archived successfully",
  data: {
    id: string, // UUID
    userId: string,
    nameOfTheRecipe: string,
    generalDescriptionOfTheRecipe?: string,
    whenIsItConsumed?: Array<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">,
    reasonForArchiving: string
  }
}
```

### GET /api/recipe/ - List Recipes

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipes retrieved successfully",
  data: Array<{
    id: string, // UUID
    nameOfTheRecipe: string,
    generalDescriptionOfTheRecipe?: string,
    whenIsItConsumed?: Array<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">,
    version: number,
    stepCount: number,
    ingredientCount: number,
    hasSteps: boolean,
    hasIngredients: boolean,
    completeness: "complete" | "incomplete"
  }>
}
```

### GET /api/recipe/:recipeId - Get Recipe by ID

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipe retrieved successfully",
  data: {
    id: string, // UUID
    nameOfTheRecipe: string,
    generalDescriptionOfTheRecipe?: string,
    whenIsItConsumed?: Array<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">,
    version: number,
    steps: Array<{
      id: string, // UUID
      instruction: string,
      instructionNumber: number
    }>,
    ingredients: Array<{
      id: string, // UUID
      ingredientText: string
    }>,
    metadata: {
      stepCount: number,
      ingredientCount: number,
      estimatedTotalTime: number | null
    }
  }
}
```

### GET /api/recipe/search - Search Recipes

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipe search results",
  data: Array<{
    id: string, // UUID
    nameOfTheRecipe: string,
    generalDescriptionOfTheRecipe?: string,
    whenIsItConsumed?: Array<"BREAKFAST" | "LUNCH" | "DINNER" | "SNACK">,
    version: number
  }>
}
```

### POST /api/recipe/ingredients - Create Recipe Ingredients

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipe ingredients created successfully",
  data: {
    recipeId: string, // UUID
    ingredients: Array<{
      id: string, // UUID
      ingredientText: string
    }>
  }
}
```

### DELETE /api/recipe/ingredients - Delete Recipe Ingredients

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipe ingredients archived successfully",
  data: {
    recipeId: string, // UUID
    ingredients: Array<{
      id: string, // UUID
      ingredientText: string
    }>,
    reasonForArchiving: string
  }
}
```

### PATCH /api/recipe/ingredients - Update Recipe Ingredients

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipe ingredients updated successfully",
  data: {
    recipeId: string, // UUID
    ingredients: Array<{
      id: string, // UUID
      ingredientText: string
    }>,
    oldValues: {
      recipeId: string, // UUID
      ingredients: Array<{
        id: string, // UUID
        ingredientText: string
      }>
    }
  }
}
```

### POST /api/recipe/instructions - Create Recipe Instructions

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipe instructions created successfully",
  data: {
    recipeId: string, // UUID
    stepByStepInstructions: Array<{
      id: string, // UUID
      instructionNumber: number,
      stepInstruction: string,
      foodItemUnitsUsedInStep?: Array<{
        foodItemUnitId: string, // UUID
        quantityOfFoodItemUnit: number
      }>
    }>
  }
}
```

### DELETE /api/recipe/instructions - Delete Recipe Instructions

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipe instructions archived successfully",
  data: {
    recipeId: string, // UUID
    stepByStepInstructions: Array<{
      id: string, // UUID
      instructionNumber: number,
      stepInstruction: string,
      foodItemUnitsUsedInStep: Array<{
        foodItemUnitId: string, // UUID
        quantityOfFoodItemUnit: number
      }>
    }>,
    reasonForArchiving: string
  }
}
```

### PATCH /api/recipe/instructions - Update Recipe Instructions

**Success Response (200):**

```typescript
{
  success: true,
  message: "Recipe instructions updated successfully",
  data: {
    recipeId: string, // UUID
    stepByStepInstructions: Array<{
      id: string, // UUID
      instructionNumber: number,
      stepInstruction: string,
      foodItemUnitsUsedInStep?: Array<{
        foodItemUnitId: string, // UUID
        quantityOfFoodItemUnit: number
      }>
    }>,
    oldValues: {
      recipeId: string, // UUID
      stepByStepInstructions: Array<{
        id: string, // UUID
        instructionNumber: number,
        stepInstruction: string,
        foodItemUnitsUsedInStep: Array<{
          foodItemUnitId: string, // UUID
          quantityOfFoodItemUnit: number
        }>
      }>
    }
  }
}
```

---

## Meal Endpoints

### POST /api/meal/ - Create Meal

**Success Response (200):**

```typescript
{
  success: true,
  message: "Meal created successfully",
  data: {
    meal: {
      id: string, // UUID
      userId: string,
      mealName: string,
      scheduledToBeEatenAt?: string, // ISO datetime
      hasMealBeenConsumed: boolean,
      recipes: Array<{
        recipeId: string, // UUID
        recipeName: string,
        recipeDescription: string,
        recipeVersion: number
      }>
    },
    instructions: {
      mealId: string, // UUID
      stepByStepInstructions: Array<{
        id: string, // UUID
        recipeId?: string, // UUID
        originalRecipeInstructionId?: string, // UUID
        isStepCompleted: boolean,
        instructionNumber: number,
        stepInstruction: string,
        estimatedDurationMinutes?: number,
        assignedToDate?: string, // YYYY-MM-DD
        foodItemUnitsUsedInStep?: Array<{
          foodItemUnitId: string, // UUID
          foodItemId: string, // UUID
          quantityOfFoodItemUnit: number
        }>
      }>
    },
    ingredients: {
      mealId: string, // UUID
      ingredients: Array<{
        id: string, // UUID
        recipeId: string, // UUID
        ingredientText: string
      }>
    }
  }
}
```

### DELETE /api/meal/ - Delete Meal

**Success Response (200):**

```typescript
{
  success: true,
  message: "Meal archived successfully",
  data: {
    id: string, // UUID
    userId: string,
    mealName: string,
    scheduledToBeEatenAt?: string, // ISO datetime
    hasMealBeenConsumed: boolean,
    recipes: Array<{
      recipeId: string, // UUID
      recipeName: string,
      recipeDescription: string,
      recipeVersion: number
    }>,
    reasonForArchiving: string
  }
}
```

### GET /api/meal/week - List Weekly Meals

**Success Response (200):**

```typescript
{
  success: true,
  message: "Weekly meal plan retrieved successfully",
  data: {
    weekPlan: Array<{
      date: string, // YYYY-MM-DD or "unscheduled"
      dayName: string,
      meals: Array<{
        mealId: string, // UUID
        mealName: string,
        scheduledToBeEatenAt?: string, // ISO datetime
        hasMealBeenConsumed: boolean,
        recipes: Array<{
          recipeName: string,
          recipeVersion: number
        }>,
        canStartPrep?: string | null // ISO datetime
      }>,
      totalMeals: number,
      completedMeals: number,
      totalCookingSteps: number,
      completedCookingSteps: number
    }>,
    summary: {
      totalMeals: number,
      completedMeals: number,
      daysWithMeals: number
    }
  }
}
```

### GET /api/meal/ - List All Meals

**Success Response (200):**

```typescript
{
  success: true,
  message: "Meals retrieved successfully",
  data: Array<{
    id: string, // UUID
    mealName: string,
    scheduledToBeEatenAt?: string, // ISO datetime
    hasMealBeenConsumed: boolean,
    recipes: Array<{
      recipeId: string, // UUID
      recipeName: string,
      recipeDescription: string,
      recipeVersion: number
    }>
  }>
}
```

### GET /api/meal/:mealId - Get Meal by ID

**Success Response (200):**

```typescript
{
  success: true,
  message: "Meal retrieved successfully",
  data: {
    id: string, // UUID
    mealName: string,
    scheduledToBeEatenAt?: string, // ISO datetime
    hasMealBeenConsumed: boolean,
    recipes: Array<{
      recipeId: string, // UUID
      recipeName: string,
      recipeDescription: string,
      recipeVersion: number
    }>,
    steps: Array<{
      id: string, // UUID
      recipeId?: string, // UUID
      originalRecipeInstructionId?: string, // UUID
      instruction: string,
      instructionNumber: number,
      estimatedDurationMinutes?: number,
      foodItemUnitsUsedInStep?: Array<{
        foodItemUnitId: string, // UUID
        foodItemId: string, // UUID
        quantityOfFoodItemUnit: number
      }> | null
    }>,
    progress: {
      completed: number,
      total: number,
      percentage: number
    },
    estimatedTimeRemaining: number
  }
}
```

### GET /api/meal/:mealId/progress/:date - Get Meal Progress for Date

**Success Response (200):**

```typescript
{
  success: true,
  message: "Progress for meal on {date}",
  data: {
    // Progress data structure from meal-progress service
    mealId: string, // UUID
    progress: {
      percentComplete: number,
      nextInstruction?: any,
      estimatedTimeRemaining?: number
    }
  }
}
```

### GET /api/meal/progress/:date - Get All Meals Progress for Date

**Success Response (200):**

```typescript
{
  success: true,
  message: "Progress for all meals on {date}",
  data: {
    date: string, // YYYY-MM-DD
    meals: Array<{
      mealId: string, // UUID
      progress: {
        percentComplete: number,
        nextInstruction?: any,
        estimatedTimeRemaining?: number
      }
    }>,
    summary: {
      totalMeals: number,
      completedMeals: number,
      inProgressMeals: number,
      notStartedMeals: number
    }
  }
}
```

### GET /api/meal/progress/today - Get Today's Meal Progress

**Success Response (200):**

```typescript
{
  success: true,
  message: "Progress for today's meals",
  data: {
    date: string, // YYYY-MM-DD
    meals: Array<{
      mealId: string, // UUID
      progress: {
        percentComplete: number,
        nextInstruction?: any,
        estimatedTimeRemaining?: number
      }
    }>,
    summary: {
      totalMeals: number,
      completedMeals: number,
      inProgressMeals: number,
      nextTasks: Array<{
        mealId: string, // UUID
        nextInstruction: any,
        estimatedTimeRemaining?: number
      }>
    }
  }
}
```

### POST /api/meal/ingredients - Create Meal Ingredients

**Success Response (200):**

```typescript
{
  success: true,
  message: "Meal ingredients created successfully",
  data: {
    mealId: string, // UUID
    ingredients: Array<{
      id: string, // UUID
      ingredientText: string
    }>
  }
}
```

### DELETE /api/meal/ingredients - Delete Meal Ingredients

**Success Response (200):**

```typescript
{
  success: true,
  message: "Meal ingredients archived successfully",
  data: {
    mealId: string, // UUID
    ingredients: Array<{
      id: string, // UUID
      recipeId?: string, // UUID
      ingredientText: string
    }>,
    reasonForArchiving: string
  }
}
```

### PATCH /api/meal/ingredients - Update Meal Ingredients

**Success Response (200):**

```typescript
{
  success: true,
  message: "Meal ingredients updated successfully",
  data: {
    mealId: string, // UUID
    ingredients: Array<{
      id: string, // UUID
      recipeId: string, // UUID
      ingredientText: string
    }>,
    oldValues: {
      mealId: string, // UUID
      ingredients: Array<{
        id: string, // UUID
        recipeId?: string, // UUID
        ingredientText: string
      }>
    }
  }
}
```

### POST /api/meal/instructions - Create Meal Instructions

**Success Response (200):**

```typescript
{
  success: true,
  message: "Meal instructions created successfully",
  data: {
    mealId: string, // UUID
    stepByStepInstructions: Array<{
      id: string, // UUID
      stepInstruction: string,
      foodItemUnitsUsedInStep?: Array<{
        foodItemUnitId: string, // UUID
        foodItemId: string, // UUID
        quantityOfFoodItemUnit: number
      }>,
      isStepCompleted: boolean,
      instructionNumber: number
    }>
  }
}
```

### DELETE /api/meal/instructions - Delete Meal Instructions

**Success Response (200):**

```typescript
{
  success: true,
  message: "Meal instructions archived successfully",
  data: {
    mealId: string, // UUID
    stepByStepInstructions: Array<{
      id: string, // UUID
      recipeId?: string, // UUID
      originalRecipeInstructionId?: string, // UUID
      isStepCompleted: boolean,
      instructionNumber: number,
      stepInstruction: string,
      estimatedDurationMinutes?: number,
      foodItemUnitsUsedInStep?: Array<{
        foodItemUnitId: string, // UUID
        foodItemId: string, // UUID
        quantityOfFoodItemUnit: number
      }>
    }>,
    reasonForArchiving: string
  }
}
```

### PATCH /api/meal/instructions - Update Meal Instructions

**Success Response (200):**

```typescript
{
  success: true,
  message: "Meal instructions updated successfully",
  data: {
    mealId: string, // UUID
    stepByStepInstructions: Array<{
      id: string, // UUID
      recipeId: string, // UUID
      originalRecipeInstructionId: string, // UUID
      isStepCompleted: boolean,
      instructionNumber: number,
      stepInstruction: string,
      estimatedDurationMinutes?: number,
      foodItemUnitsUsedInStep?: Array<{
        foodItemUnitId: string, // UUID
        foodItemId: string, // UUID
        quantityOfFoodItemUnit: number
      }>
    }>,
    oldValues: {
      mealId: string, // UUID
      stepByStepInstructions: Array<{
        id: string, // UUID
        recipeId?: string, // UUID
        originalRecipeInstructionId?: string, // UUID
        isStepCompleted: boolean,
        instructionNumber: number,
        stepInstruction: string,
        estimatedDurationMinutes?: number,
        foodItemUnitsUsedInStep?: Array<{
          foodItemUnitId: string, // UUID
          foodItemId: string, // UUID
          quantityOfFoodItemUnit: number
        }>
      }>
    }
  }
}
```

---

## Food Item Endpoints

### POST /api/food-item/ - Create Food Item

**Success Response (200):**

```typescript
{
  success: true,
  message: "Food item created successfully",
  data: {
    id: string, // UUID
    userId: string,
    name: string,
    categoryHierarchy?: Array<string>
  }
}
```

### DELETE /api/food-item/ - Delete Food Item

**Success Response (200):**

```typescript
{
  success: true,
  message: "Food item archived successfully",
  data: {
    id: string, // UUID
    userId: string,
    name: string,
    categoryHierarchy?: Array<string>,
    reasonForArchiving: string
  }
}
```

### PATCH /api/food-item/ - Update Food Item

**Success Response (200):**

```typescript
{
  success: true,
  message: "Food item updated successfully",
  data: {
    id: string, // UUID
    userId: string,
    name: string,
    categoryHierarchy?: Array<string>,
    oldValues: {
      id: string, // UUID
      userId: string,
      name: string,
      categoryHierarchy?: Array<string>
    }
  }
}
```

### GET /api/food-item/ - List Food Items

**Success Response (200):**

```typescript
{
  success: true,
  message: "Food items retrieved successfully",
  data: Array<{
    id: string, // UUID
    name: string,
    categoryHierarchy?: Array<string>,
    unitCount: number,
    hasUnits: boolean
  }>
}
```

### GET /api/food-item/search - Search Food Items

**Success Response (200):**

```typescript
{
  success: true,
  message: "Food items search results" | "Food items retrieved successfully",
  data: Array<{
    id: string, // UUID
    name: string,
    categoryHierarchy?: Array<string>
  }>
}
```

---

## Food Item Units Endpoints

### POST /api/food-item/:foodItemId/units - Create Food Item Units

**Success Response (200):**

```typescript
{
  success: true,
  message: "Food item units created successfully",
  data: {
    foodItemId: string, // UUID
    units: Array<{
      id: string, // UUID
      unitOfMeasurement: "GRAM" | "KILOGRAM" | "OUNCE" | "POUND" | "CUP" | "TABLESPOON" | "TEASPOON" | "LITER" | "MILLILITER" | "FLUID_OUNCE" | "PINT" | "QUART" | "GALLON" | "PIECE" | "SLICE" | "WHOLE" | "CLOVE" | "BULB" | "STALK" | "BUNCH" | "HEAD" | "LEAF" | "SPRIG" | "PINCH" | "DASH" | "DROP",
      unitDescription?: string,
      nutritionPerOfThisUnit: {
        calories: number,
        proteinInGrams?: number,
        carbohydratesInGrams?: number,
        fatInGrams?: number,
        fiberInGrams?: number,
        sugarInGrams?: number,
        sodiumInMilligrams?: number
      },
      source: "user_measured" | "package_label" | "database" | "estimated"
    }>
  }
}
```

### DELETE /api/food-item/:foodItemId/units - Delete Food Item Units

**Success Response (200):**

```typescript
{
  success: true,
  message: "Food item units deleted",
  data: {
    foodItemId: string, // UUID
    units: Array<{
      id: string, // UUID
      unitOfMeasurement: "GRAM" | "KILOGRAM" | "OUNCE" | "POUND" | "CUP" | "TABLESPOON" | "TEASPOON" | "LITER" | "MILLILITER" | "FLUID_OUNCE" | "PINT" | "QUART" | "GALLON" | "PIECE" | "SLICE" | "WHOLE" | "CLOVE" | "BULB" | "STALK" | "BUNCH" | "HEAD" | "LEAF" | "SPRIG" | "PINCH" | "DASH" | "DROP",
      unitDescription?: string,
      nutritionPerOfThisUnit: {
        calories: number,
        proteinInGrams: number,
        carbohydratesInGrams: number,
        fatInGrams: number,
        fiberInGrams: number,
        sugarInGrams: number,
        sodiumInMilligrams: number
      },
      source: "user_measured" | "package_label" | "database" | "estimated"
    }>
  }
}
```

### PATCH /api/food-item/:foodItemId/units - Update Food Item Units

**Success Response (200):**

```typescript
{
  success: true,
  message: "Food item units updated successfully",
  data: {
    foodItemId: string, // UUID
    units: Array<{
      id: string, // UUID
      unitOfMeasurement: "GRAM" | "KILOGRAM" | "OUNCE" | "POUND" | "CUP" | "TABLESPOON" | "TEASPOON" | "LITER" | "MILLILITER" | "FLUID_OUNCE" | "PINT" | "QUART" | "GALLON" | "PIECE" | "SLICE" | "WHOLE" | "CLOVE" | "BULB" | "STALK" | "BUNCH" | "HEAD" | "LEAF" | "SPRIG" | "PINCH" | "DASH" | "DROP",
      unitDescription?: string,
      nutritionPerOfThisUnit: {
        calories: number,
        proteinInGrams?: number,
        carbohydratesInGrams?: number,
        fatInGrams?: number,
        fiberInGrams?: number,
        sugarInGrams?: number,
        sodiumInMilligrams?: number
      },
      source: "user_measured" | "package_label" | "database" | "estimated"
    }>,
    oldValues: {
      foodItemId: string, // UUID
      units: Array<{
        id: string, // UUID
        unitOfMeasurement: "GRAM" | "KILOGRAM" | "OUNCE" | "POUND" | "CUP" | "TABLESPOON" | "TEASPOON" | "LITER" | "MILLILITER" | "FLUID_OUNCE" | "PINT" | "QUART" | "GALLON" | "PIECE" | "SLICE" | "WHOLE" | "CLOVE" | "BULB" | "STALK" | "BUNCH" | "HEAD" | "LEAF" | "SPRIG" | "PINCH" | "DASH" | "DROP",
        unitDescription?: string,
        source: "user_measured" | "package_label" | "database" | "estimated",
        nutritionPerOfThisUnit: {
          calories: number,
          proteinInGrams?: number,
          carbohydratesInGrams?: number,
          fatInGrams?: number,
          fiberInGrams?: number,
          sugarInGrams?: number,
          sodiumInMilligrams?: number
        }
      }>
    }
  }
}
```

### GET /api/food-item/:foodItemId/units - List Food Item Units

**Success Response (200):**

```typescript
{
  success: true,
  message: "Food item units retrieved successfully",
  data: Array<{
    id: string, // UUID
    foodItemId: string, // UUID
    foodItemName: string,
    unitOfMeasurement: "GRAM" | "KILOGRAM" | "OUNCE" | "POUND" | "CUP" | "TABLESPOON" | "TEASPOON" | "LITER" | "MILLILITER" | "FLUID_OUNCE" | "PINT" | "QUART" | "GALLON" | "PIECE" | "SLICE" | "WHOLE" | "CLOVE" | "BULB" | "STALK" | "BUNCH" | "HEAD" | "LEAF" | "SPRIG" | "PINCH" | "DASH" | "DROP",
    unitDescription?: string,
    calories: number,
    proteinInGrams?: number,
    carbohydratesInGrams?: number,
    fatInGrams?: number,
    fiberInGrams?: number,
    sugarInGrams?: number
  }>
}
```

### GET /api/food-item/units - List All Food Item Units

**Success Response (200):**

```typescript
{
  success: true,
  message: "All food item units retrieved successfully",
  data: Array<{
    unitId: string, // UUID
    unitOfMeasurement: "GRAM" | "KILOGRAM" | "OUNCE" | "POUND" | "CUP" | "TABLESPOON" | "TEASPOON" | "LITER" | "MILLILITER" | "FLUID_OUNCE" | "PINT" | "QUART" | "GALLON" | "PIECE" | "SLICE" | "WHOLE" | "CLOVE" | "BULB" | "STALK" | "BUNCH" | "HEAD" | "LEAF" | "SPRIG" | "PINCH" | "DASH" | "DROP",
    unitDescription?: string,
    calories: number,
    proteinInGrams?: number,
    carbohydratesInGrams?: number,
    fatInGrams?: number,
    fiberInGrams?: number,
    sugarInGrams?: number,
    foodItemId: string, // UUID
    foodItemName: string,
    categoryHierarchy?: Array<string>
  }>
}
```

---

## Common Types and Enums

### MealTimingEnum

- `BREAKFAST`
- `LUNCH`
- `DINNER`
- `SNACK`

### UnitOfMeasurementEnum

- **Weight:** `GRAM`, `KILOGRAM`, `OUNCE`, `POUND`
- **Volume:** `CUP`, `TABLESPOON`, `TEASPOON`, `LITER`, `MILLILITER`,
  `FLUID_OUNCE`, `PINT`, `QUART`, `GALLON`
- **Count:** `PIECE`, `SLICE`, `WHOLE`, `CLOVE`, `BULB`, `STALK`, `BUNCH`,
  `HEAD`, `LEAF`, `SPRIG`
- **Seasoning:** `PINCH`, `DASH`, `DROP`

### Weekday Enum

- `monday`
- `tuesday`
- `wednesday`
- `thursday`
- `friday`
- `saturday`
- `sunday`

### Date/Time Formats

- **YYYY-MM-DD**: Date format (e.g., "2024-01-15")
- **HH:MM**: Time format in 24-hour notation (e.g., "14:30")
- **ISO DateTime**: Full ISO 8601 datetime string (e.g.,
  "2024-01-15T14:30:00.000Z")

### UUID Format

All ID fields use UUID v4 format

---

## Error Responses

All endpoints can return error responses with the following structure:

### Validation Error (400)

```typescript
{
  success: false,
  message: "Invalid {resource} data",
  errors: Array<{
    code: string,
    expected: string,
    received: string,
    path: Array<string | number>,
    message: string
  }>
}
```

### Not Found (404)

```typescript
{
  success: false,
  message: "{Resource} not found" | "{Resource} not found or access denied"
}
```

### Conflict (409)

```typescript
{
  success: false,
  message: "{Resource} with name already exists"
}
```

### Server Error (500)

```typescript
{
  success: false,
  message: "Failed to {action} {resource}",
  errors?: any // Optional error details
}
```

---

## Notes

1. All endpoints require authentication via middleware that sets `c.userId`
2. All timestamps are returned in ISO 8601 format (UTC)
3. Optional fields may be `undefined` or `null` depending on the context
4. Array fields are never `null` - they're either present as arrays or
   `undefined`
5. The API uses event sourcing, so many operations return the full event data
   that was emitted
6. Some endpoints include additional computed fields (like counts, progress,
   metadata) that are not part of the core schemas
7. Error responses follow consistent patterns but may include additional
   context-specific information
