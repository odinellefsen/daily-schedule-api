import {
    createPostgresPathwayState,
    PathwayRouter,
    PathwaysBuilder,
} from "@flowcore/pathways";
import { zodEnv } from "../../env";
import {
    foodItemDeletedSchema,
    foodItemSchema,
    foodItemUnitDeletedSchema,
    foodItemUnitSchema,
} from "../contracts/food/food-item";
import { mealRecipeAttachSchema, mealSchema } from "../contracts/food/meal";
import {
    recipeDeletedSchema,
    recipeIngredientsSchema,
    recipeInstructionsSchema,
    recipeSchema,
} from "../contracts/food/recipe";
import { habitsCreatedSchema } from "../contracts/habit/habit.contract";
import { todoSchema } from "../contracts/todo";
import {
    handleFoodItemCreated,
    handleFoodItemDeleted,
} from "../handlers/food-item/food-item.handler";
import {
    handleFoodItemUnitsCreated,
    handleFoodItemUnitsDeleted,
} from "../handlers/food-item/food-item-units.handler";
import { handleHabitsCreated } from "../handlers/habit/habit.handler";
import { handleMealCreated } from "../handlers/meal/meal.handler";
import { handleMealRecipeAttached } from "../handlers/meal/meal-recipes.handler";
import {
    handleRecipeCreated,
    handleRecipeDeleted,
} from "../handlers/recipe/recipe.handler";
import { handleRecipeIngredientsCreated } from "../handlers/recipe/recipe-ingredients.handler";
import { handleRecipeInstructionsCreated } from "../handlers/recipe/recipe-instructions.handler";
import { handleTodoCreated } from "../handlers/todo/todo.handler";

export const postgresUrl = zodEnv.POSTGRES_CONNECTION_STRING;
const webhookApiKey = zodEnv.FLOWCORE_WEBHOOK_API_KEY;

export const FlowcorePathways = new PathwaysBuilder({
    baseUrl: zodEnv.FLOWCORE_WEBHOOK_BASE_URL,
    tenant: zodEnv.FLOWCORE_TENANT,
    dataCore: zodEnv.FLOWCORE_DATA_CORE_NAME,
    apiKey: webhookApiKey,
})
    .withPathwayState(
        createPostgresPathwayState({
            connectionString: postgresUrl,
        }),
    )
    .register({
        flowType: "food-item.v0",
        eventType: "food-item.created.v0",
        retryDelayMs: 10000,
        schema: foodItemSchema,
    })
    .register({
        flowType: "food-item.v0",
        eventType: "food-item.deleted.v0",
        retryDelayMs: 10000,
        schema: foodItemDeletedSchema,
    })
    .register({
        flowType: "food-item.v0",
        eventType: "food-item.units.created.v0",
        retryDelayMs: 10000,
        schema: foodItemUnitSchema,
    })
    .register({
        flowType: "food-item.v0",
        eventType: "food-item.units.deleted.v0",
        retryDelayMs: 10000,
        schema: foodItemUnitDeletedSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.created.v0",
        retryDelayMs: 10000,
        schema: recipeSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.deleted.v0",
        retryDelayMs: 10000,
        schema: recipeDeletedSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe-instructions.created.v0",
        retryDelayMs: 10000,
        schema: recipeInstructionsSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe-ingredients.created.v0",
        retryDelayMs: 10000,
        schema: recipeIngredientsSchema,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal.created.v0",
        retryDelayMs: 10000,
        schema: mealSchema,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal-recipe.attached.v0",
        retryDelayMs: 10000,
        schema: mealRecipeAttachSchema,
    })
    .register({
        flowType: "todo.v0",
        eventType: "todo.created.v0",
        retryDelayMs: 10000,
        schema: todoSchema,
    })
    .register({
        flowType: "habit.v0",
        eventType: "complex-habit.created.v0",
        retryDelayMs: 10000,
        schema: habitsCreatedSchema,
    })
    .handle("food-item.v0/food-item.created.v0", handleFoodItemCreated)
    .handle("food-item.v0/food-item.deleted.v0", handleFoodItemDeleted)
    .handle(
        "food-item.v0/food-item.units.created.v0",
        handleFoodItemUnitsCreated,
    )
    .handle(
        "food-item.v0/food-item.units.deleted.v0",
        handleFoodItemUnitsDeleted,
    )
    .handle("recipe.v0/recipe.created.v0", handleRecipeCreated)
    .handle("recipe.v0/recipe.deleted.v0", handleRecipeDeleted)
    .handle(
        "recipe.v0/recipe-instructions.created.v0",
        handleRecipeInstructionsCreated,
    )
    .handle(
        "recipe.v0/recipe-ingredients.created.v0",
        handleRecipeIngredientsCreated,
    )
    .handle("meal.v0/meal.created.v0", handleMealCreated)
    .handle("meal.v0/meal-recipe.attached.v0", handleMealRecipeAttached)
    .handle("todo.v0/todo.created.v0", handleTodoCreated)
    .handle("habit.v0/complex-habit.created.v0", handleHabitsCreated);

export const pathwaysRouter = new PathwayRouter(
    FlowcorePathways,
    webhookApiKey,
);
