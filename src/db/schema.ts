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

export const mealStepsIngredients = pgTable("meal_steps_ingredients", {
    id: uuid("id").primaryKey(),
    mealStepId: uuid("meal_step_id").references(() => mealSteps.id, {
        onDelete: "cascade",
    }),
    ingredientName: text("ingredient_name").notNull(),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull(),
    notes: text("notes"),
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

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;

export type MealStep = typeof mealSteps.$inferSelect;
export type NewMealStep = typeof mealSteps.$inferInsert;

export type MealStepsIngredient = typeof mealStepsIngredients.$inferSelect;
export type NewMealStepsIngredient = typeof mealStepsIngredients.$inferInsert;

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
