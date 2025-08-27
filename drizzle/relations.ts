import { relations } from "drizzle-orm/relations";
import {
    foodItems,
    foodItemUnits,
    mealIngredients,
    mealSteps,
    meals,
    recipeIngredients,
    recipeSteps,
    recipeStepsFoodItemUnits,
    recipes,
} from "./schema";

export const mealIngredientsRelations = relations(
    mealIngredients,
    ({ one }) => ({
        meal: one(meals, {
            fields: [mealIngredients.mealId],
            references: [meals.id],
        }),
    }),
);

export const mealsRelations = relations(meals, ({ many }) => ({
    mealIngredients: many(mealIngredients),
    mealSteps: many(mealSteps),
}));

export const mealStepsRelations = relations(mealSteps, ({ one }) => ({
    meal: one(meals, {
        fields: [mealSteps.mealId],
        references: [meals.id],
    }),
}));

export const recipeIngredientsRelations = relations(
    recipeIngredients,
    ({ one }) => ({
        recipe: one(recipes, {
            fields: [recipeIngredients.recipeId],
            references: [recipes.id],
        }),
    }),
);

export const recipesRelations = relations(recipes, ({ many }) => ({
    recipeIngredients: many(recipeIngredients),
    recipeSteps: many(recipeSteps),
}));

export const recipeStepsRelations = relations(recipeSteps, ({ one, many }) => ({
    recipe: one(recipes, {
        fields: [recipeSteps.recipeId],
        references: [recipes.id],
    }),
    recipeStepsFoodItemUnits: many(recipeStepsFoodItemUnits),
}));

export const foodItemUnitsRelations = relations(foodItemUnits, ({ one }) => ({
    foodItem: one(foodItems, {
        fields: [foodItemUnits.foodItemId],
        references: [foodItems.id],
    }),
}));

export const foodItemsRelations = relations(foodItems, ({ many }) => ({
    foodItemUnits: many(foodItemUnits),
}));

export const recipeStepsFoodItemUnitsRelations = relations(
    recipeStepsFoodItemUnits,
    ({ one }) => ({
        recipeStep: one(recipeSteps, {
            fields: [recipeStepsFoodItemUnits.recipeStepId],
            references: [recipeSteps.id],
        }),
    }),
);
