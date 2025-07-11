import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

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

export const recipeStepsIngredients = pgTable("recipe_steps_ingredients", {
    id: uuid("id").primaryKey(),
    recipeStepId: uuid("recipe_step_id").references(() => recipeSteps.id),
    ingredientName: text("ingredient_name").notNull(),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull(),
    notes: text("notes"),
});

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
