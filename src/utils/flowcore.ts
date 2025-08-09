import {
    createPostgresPathwayState,
    PathwayRouter,
    PathwaysBuilder,
} from "@flowcore/pathways";
import { zodEnv } from "../../env";
import {
    foodItemArchivedSchema,
    foodItemSchema,
    foodItemUnitDeletedSchema,
    foodItemUnitSchema,
    foodItemUnitUpdatedSchema,
    foodItemUpdatedSchema,
} from "../contracts/food/food-item";
import {
    mealArchiveSchema,
    mealIngredientsArchiveSchema,
    mealIngredientsSchema,
    mealIngredientsUpdateSchema,
    mealInstructionsArchiveSchema,
    mealInstructionsUpdateSchema,
    mealSchema,
    mealStepByStepInstructionsSchema,
    mealUpdateSchema,
} from "../contracts/food/meal";
import {
    recipeArchiveSchema,
    recipeIngredientsArchiveSchema,
    recipeIngredientsSchema,
    recipeIngredientsUpdateSchema,
    recipeInstructionsArchiveSchema,
    recipeInstructionsSchema,
    recipeInstructionsUpdateSchema,
    recipeSchema,
    recipeUpdateSchema,
} from "../contracts/food/recipe";
import { recipeVersionSchema } from "../contracts/food/recipe/recipe-version.contract";
import {
    todoArchiveSchema,
    todoCancelledSchema,
    todoCompletedSchema,
    todoRelationsUpdatedSchema,
    todoSchema,
    todoUpdateSchema,
} from "../contracts/todo";
import {
    handleFoodItemArchived,
    handleFoodItemCreated,
    handleFoodItemUpdated,
} from "../handlers/food-item/food-item.handler";
import {
    handleFoodItemUnitsCreated,
    handleFoodItemUnitsDeleted,
    handleFoodItemUnitsUpdated,
} from "../handlers/food-item/food-item-units.handler";
import {
    handleMealArchived,
    handleMealCreated,
    handleMealUpdated,
} from "../handlers/meal/meal.handler";
import {
    handleMealIngredientsArchived,
    handleMealIngredientsCreated,
    handleMealIngredientsUpdated,
} from "../handlers/meal/meal-ingredients.handler";
import {
    handleMealInstructionsArchived,
    handleMealInstructionsCreated,
    handleMealInstructionsUpdated,
} from "../handlers/meal/meal-instructions.handler";
import {
    handleRecipeArchived,
    handleRecipeCreated,
    handleRecipeUpdated,
    handleRecipeVersionUpdated,
} from "../handlers/recipe/recipe.handler";
import {
    handleRecipeIngredientsArchived,
    handleRecipeIngredientsCreated,
    handleRecipeIngredientsUpdated,
    handleRecipeIngredientsVersionUpdated,
} from "../handlers/recipe/recipe-ingredients.handler";
import {
    handleRecipeInstructionsArchived,
    handleRecipeInstructionsCreated,
    handleRecipeInstructionsUpdated,
    handleRecipeInstructionsVersionUpdated,
} from "../handlers/recipe/recipe-instructions.handler";
import {
    handleTodoArchived,
    handleTodoCancelled,
    handleTodoCompleted,
    handleTodoCreated,
    handleTodoRelationsUpdated,
} from "../handlers/todo/todo.handler";

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
        })
    )
    .register({
        flowType: "food-item.v0",
        eventType: "food-item.created.v0",
        retryDelayMs: 10000,
        schema: foodItemSchema,
    })
    .register({
        flowType: "food-item.v0",
        eventType: "food-item.updated.v0",
        retryDelayMs: 10000,
        schema: foodItemUpdatedSchema,
    })
    .register({
        flowType: "food-item.v0",
        eventType: "food-item.archived.v0",
        retryDelayMs: 10000,
        schema: foodItemArchivedSchema,
    })
    .register({
        flowType: "food-item.v0",
        eventType: "food-item.units.created.v0",
        retryDelayMs: 10000,
        schema: foodItemUnitSchema,
    })
    .register({
        flowType: "food-item.v0",
        eventType: "food-item.units.updated.v0",
        retryDelayMs: 10000,
        schema: foodItemUnitUpdatedSchema,
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
        eventType: "recipe.updated.v0",
        retryDelayMs: 10000,
        schema: recipeUpdateSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.archived.v0",
        retryDelayMs: 10000,
        schema: recipeArchiveSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe-instructions.created.v0",
        retryDelayMs: 10000,
        schema: recipeInstructionsSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe-instructions.updated.v0",
        retryDelayMs: 10000,
        schema: recipeInstructionsUpdateSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe-instructions.archived.v0",
        retryDelayMs: 10000,
        schema: recipeInstructionsArchiveSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe-ingredients.created.v0",
        retryDelayMs: 10000,
        schema: recipeIngredientsSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe-ingredients.updated.v0",
        retryDelayMs: 10000,
        schema: recipeIngredientsUpdateSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe-ingredients.archived.v0",
        retryDelayMs: 10000,
        schema: recipeIngredientsArchiveSchema,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal.created.v0",
        retryDelayMs: 10000,
        schema: mealSchema,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal.updated.v0",
        retryDelayMs: 10000,
        schema: mealUpdateSchema,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal.archived.v0",
        retryDelayMs: 10000,
        schema: mealArchiveSchema,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal-instructions.created.v0",
        retryDelayMs: 10000,
        schema: mealStepByStepInstructionsSchema,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal-instructions.updated.v0",
        retryDelayMs: 10000,
        schema: mealInstructionsUpdateSchema,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal-instructions.archived.v0",
        retryDelayMs: 10000,
        schema: mealInstructionsArchiveSchema,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal-ingredients.created.v0",
        retryDelayMs: 10000,
        schema: mealIngredientsSchema,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal-ingredients.updated.v0",
        retryDelayMs: 10000,
        schema: mealIngredientsUpdateSchema,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal-ingredients.archived.v0",
        retryDelayMs: 10000,
        schema: mealIngredientsArchiveSchema,
    })
    .register({
        flowType: "todo.v0",
        eventType: "todo.created.v0",
        retryDelayMs: 10000,
        schema: todoSchema,
    })
    .register({
        flowType: "todo.v0",
        eventType: "todo.updated.v0",
        retryDelayMs: 10000,
        schema: todoUpdateSchema,
    })
    .register({
        flowType: "todo.v0",
        eventType: "todo.completed.v0",
        retryDelayMs: 10000,
        schema: todoCompletedSchema,
    })
    .register({
        flowType: "todo.v0",
        eventType: "todo.cancelled.v0",
        retryDelayMs: 10000,
        schema: todoCancelledSchema,
    })
    .register({
        flowType: "todo.v0",
        eventType: "todo.relations.updated.v0",
        retryDelayMs: 10000,
        schema: todoRelationsUpdatedSchema,
    })
    .register({
        flowType: "todo.v0",
        eventType: "todo.archived.v0",
        retryDelayMs: 10000,
        schema: todoArchiveSchema,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe-version.v0",
        retryDelayMs: 10000,
        schema: recipeVersionSchema,
    })
    .handle("food-item.v0/food-item.created.v0", handleFoodItemCreated)
    .handle("food-item.v0/food-item.updated.v0", handleFoodItemUpdated)
    .handle("food-item.v0/food-item.archived.v0", handleFoodItemArchived)
    .handle(
        "food-item.v0/food-item.units.created.v0",
        handleFoodItemUnitsCreated
    )
    .handle(
        "food-item.v0/food-item.units.updated.v0",
        handleFoodItemUnitsUpdated
    )
    .handle(
        "food-item.v0/food-item.units.deleted.v0",
        handleFoodItemUnitsDeleted
    )
    .handle("recipe.v0/recipe.created.v0", handleRecipeCreated)
    .handle("recipe.v0/recipe.updated.v0", handleRecipeUpdated)
    .handle("recipe.v0/recipe.archived.v0", handleRecipeArchived)
    .handle(
        "recipe.v0/recipe-instructions.created.v0",
        handleRecipeInstructionsCreated
    )
    .handle(
        "recipe.v0/recipe-instructions.updated.v0",
        handleRecipeInstructionsUpdated
    )
    .handle(
        "recipe.v0/recipe-instructions.archived.v0",
        handleRecipeInstructionsArchived
    )
    .handle(
        "recipe.v0/recipe-ingredients.created.v0",
        handleRecipeIngredientsCreated
    )
    .handle(
        "recipe.v0/recipe-ingredients.updated.v0",
        handleRecipeIngredientsUpdated
    )
    .handle(
        "recipe.v0/recipe-ingredients.archived.v0",
        handleRecipeIngredientsArchived
    )
    .handle("meal.v0/meal.created.v0", handleMealCreated)
    .handle("meal.v0/meal.updated.v0", handleMealUpdated)
    .handle("meal.v0/meal.archived.v0", handleMealArchived)
    .handle(
        "meal.v0/meal-instructions.created.v0",
        handleMealInstructionsCreated
    )
    .handle(
        "meal.v0/meal-instructions.updated.v0",
        handleMealInstructionsUpdated
    )
    .handle(
        "meal.v0/meal-instructions.archived.v0",
        handleMealInstructionsArchived
    )
    .handle("meal.v0/meal-ingredients.created.v0", handleMealIngredientsCreated)
    .handle("meal.v0/meal-ingredients.updated.v0", handleMealIngredientsUpdated)
    .handle(
        "meal.v0/meal-ingredients.archived.v0",
        handleMealIngredientsArchived
    )
    .handle("todo.v0/todo.created.v0", handleTodoCreated)
    .handle("todo.v0/todo.archived.v0", handleTodoArchived)
    .handle("todo.v0/todo.completed.v0", handleTodoCompleted)
    .handle("todo.v0/todo.cancelled.v0", handleTodoCancelled)
    .handle("todo.v0/todo.relations.updated.v0", handleTodoRelationsUpdated);

// Combined handler for recipe version events
FlowcorePathways.handle("recipe.v0/recipe-version.v0", async (event) => {
    // Execute all three handlers for recipe version events
    await handleRecipeVersionUpdated(event);
    await handleRecipeInstructionsVersionUpdated(event);
    await handleRecipeIngredientsVersionUpdated(event);
});

export const pathwaysRouter = new PathwayRouter(
    FlowcorePathways,
    webhookApiKey
);
