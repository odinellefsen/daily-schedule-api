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
    .handle("recipe.v0/recipe-version.v0", handleRecipeVersionUpdated)
    .handle(
        "recipe.v0/recipe-version.v0",
        handleRecipeInstructionsVersionUpdated
    )
    .handle(
        "recipe.v0/recipe-version.v0",
        handleRecipeIngredientsVersionUpdated
    );

export const pathwaysRouter = new PathwayRouter(
    FlowcorePathways,
    webhookApiKey
);
