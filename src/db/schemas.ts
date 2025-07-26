import {
    boolean,
    integer,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

export const recipes = pgTable("recipes", {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
});

export const recipeSteps = pgTable("recipe_steps", {
    id: uuid("id").primaryKey(),
    recipeId: uuid("recipe_id").references(() => recipes.id),
    instruction: text("step").notNull(),
    stepNumber: integer("step_number").notNull(),
});

export const recipeStepIngredients = pgTable("recipe_steps_ingredients", {
    id: uuid("id").primaryKey(),
    recipeStepId: uuid("recipe_step_id").references(() => recipeSteps.id),
    ingredientName: text("ingredient_name").notNull(),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull(),
    notes: text("notes"),
});

export const meals = pgTable("meals", {
    id: uuid("id").primaryKey(),
    recipeId: uuid("recipe_id")
        .notNull()
        .references(() => recipes.id),
    scheduledToBeEatenAt: timestamp("scheduled_to_be_eaten_at"),
    completed: boolean("completed").notNull().default(false),
});

export const mealSteps = pgTable("meal_steps", {
    id: uuid("id").primaryKey(),
    mealId: uuid("meal_id")
        .notNull()
        .references(() => meals.id, { onDelete: "cascade" }),
    instruction: text("instruction").notNull(),
    stepNumber: integer("step_number").notNull(),
    completed: boolean("completed").notNull().default(false),
});

export const todos = pgTable("todos", {
    id: uuid("id").primaryKey(),
    description: text("description").notNull(),
    dueDate: timestamp("due_date"),
    completed: boolean("completed").notNull().default(false),
    mealStepId: uuid("meal_step_id").references(() => mealSteps.id, {
        onDelete: "set null",
    }),
});

export const foodItems = pgTable("food_items", {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    categoryHierarchy: text("category_hierarchy").notNull().array(),
    userId: uuid("user_id").notNull(),
});

export const foodItemUnits = pgTable("food_item_units", {
    id: uuid("id").primaryKey(), // same food item can have multiple units with same unit of measurement
    foodItemId: uuid("food_item_id")
        .references(() => foodItems.id)
        .notNull(),
    unitOfMeasurement: text("unit_of_measurement").notNull(),
    unitDescription: text("unit_description"),
    calories: integer("calories").notNull(),
    proteinInGrams: integer("protein_in_grams"),
    carbohydratesInGrams: integer("carbohydrates_in_grams"),
    fatInGrams: integer("fat_in_grams"),
    fiberInGrams: integer("fiber_in_grams"),
    sugarInGrams: integer("sugar_in_grams"),
    sodiumInMilligrams: integer("sodium_in_milligrams"),
    source: text("source").notNull(),
});

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;

export type MealStep = typeof mealSteps.$inferSelect;
export type NewMealStep = typeof mealSteps.$inferInsert;

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
