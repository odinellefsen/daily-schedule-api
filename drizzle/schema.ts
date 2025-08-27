import {
    boolean,
    doublePrecision,
    foreignKey,
    integer,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

export const meals = pgTable("meals", {
    id: uuid().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    mealName: text("meal_name").notNull(),
    scheduledToBeEatenAt: timestamp("scheduled_to_be_eaten_at", {
        mode: "string",
    }),
    hasMealBeenConsumed: boolean("has_meal_been_consumed")
        .default(false)
        .notNull(),
    recipes: text().notNull(),
});

export const mealIngredients = pgTable(
    "meal_ingredients",
    {
        id: uuid().primaryKey().notNull(),
        mealId: uuid("meal_id").notNull(),
        recipeId: uuid("recipe_id"),
        ingredientText: text("ingredient_text").notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.mealId],
            foreignColumns: [meals.id],
            name: "meal_ingredients_meal_id_meals_id_fk",
        }).onDelete("cascade"),
    ],
);

export const mealSteps = pgTable(
    "meal_steps",
    {
        id: uuid().primaryKey().notNull(),
        mealId: uuid("meal_id").notNull(),
        recipeId: uuid("recipe_id").notNull(),
        originalRecipeStepId: uuid("original_recipe_step_id").notNull(),
        instruction: text().notNull(),
        stepNumber: integer("step_number").notNull(),
        isStepCompleted: boolean("is_step_completed").default(false).notNull(),
        estimatedDurationMinutes: integer("estimated_duration_minutes"),
        assignedToDate: text("assigned_to_date"),
        todoId: uuid("todo_id"),
        ingredientsUsedInStep: text("ingredients_used_in_step"),
    },
    (table) => [
        foreignKey({
            columns: [table.mealId],
            foreignColumns: [meals.id],
            name: "meal_steps_meal_id_meals_id_fk",
        }).onDelete("cascade"),
    ],
);

export const recipeIngredients = pgTable(
    "recipe_ingredients",
    {
        id: uuid().primaryKey().notNull(),
        recipeId: uuid("recipe_id").notNull(),
        ingredientText: text("ingredient_text").notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.recipeId],
            foreignColumns: [recipes.id],
            name: "recipe_ingredients_recipe_id_recipes_id_fk",
        }),
    ],
);

export const recipeSteps = pgTable(
    "recipe_steps",
    {
        id: uuid().primaryKey().notNull(),
        recipeId: uuid("recipe_id"),
        step: text().notNull(),
        stepNumber: integer("step_number").notNull(),
    },
    (table) => [
        foreignKey({
            columns: [table.recipeId],
            foreignColumns: [recipes.id],
            name: "recipe_steps_recipe_id_recipes_id_fk",
        }),
    ],
);

export const foodItems = pgTable("food_items", {
    id: uuid().primaryKey().notNull(),
    name: text().notNull(),
    categoryHierarchy: text("category_hierarchy").array(),
    userId: text("user_id").notNull(),
});

export const foodItemUnits = pgTable("food_item_units", {
    id: uuid().primaryKey().notNull(),
    foodItemId: uuid("food_item_id").notNull(),
    unitOfMeasurement: text("unit_of_measurement").notNull(),
    unitDescription: text("unit_description"),
    calories: integer().notNull(),
    proteinInGrams: integer("protein_in_grams"),
    carbohydratesInGrams: integer("carbohydrates_in_grams"),
    fatInGrams: integer("fat_in_grams"),
    fiberInGrams: integer("fiber_in_grams"),
    sugarInGrams: integer("sugar_in_grams"),
    sodiumInMilligrams: integer("sodium_in_milligrams"),
    source: text().notNull(),
});

export const recipes = pgTable("recipes", {
    id: uuid().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    nameOfTheRecipe: text("name_of_the_recipe").notNull(),
    generalDescriptionOfTheRecipe: text("general_description_of_the_recipe"),
    whenIsItConsumed: text("when_is_it_consumed").array(),
    version: integer().default(1).notNull(),
});

export const todos = pgTable("todos", {
    id: uuid().primaryKey().notNull(),
    userId: text("user_id").notNull(),
    description: text().notNull(),
    completed: boolean().default(false).notNull(),
    scheduledFor: timestamp("scheduled_for", { mode: "string" }),
    completedAt: timestamp("completed_at", { mode: "string" }),
    relations: text(),
});

export const recipeStepsFoodItemUnits = pgTable(
    "recipe_steps_food_item_units",
    {
        id: uuid().primaryKey().notNull(),
        foodItemUnitId: uuid("food_item_unit_id").array().notNull(),
        recipeStepId: uuid("recipe_step_id"),
        quantity: doublePrecision().notNull(),
    },
);
