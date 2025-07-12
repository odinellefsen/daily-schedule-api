import {
    createPostgresPathwayState,
    PathwayRouter,
    PathwaysBuilder,
} from "@flowcore/pathways";
import { zodEnv } from "../../env";
import {
    mealConsumptionIntentSchema,
    mealPlanModificationIntentSchema,
    mealPlanningIntentSchema,
    mealPreparationCompletionIntentSchema,
    mealStepAssignmentIntentSchema,
} from "../contracts/meal";
import { recipeInstructionsSchema } from "../contracts/recipe/recipe.instructions.contract";
import { recipeCreateSchema as recipeMetadataSchema } from "../contracts/recipe/recipe-entity.contract";
import { recipeIngredientsSchema } from "../contracts/recipe/recipe-ingredients.contract";
import {
    handlerMealConsumptionCompleted,
    handlerMealPlanModificationRequested,
    handlerMealPlanningIntentInitiated,
    handlerMealPreparationCompleted,
    handlerMealStepAssignmentRequested,
} from "../services/MealHandlers";
import {
    handlerRecipeCreated,
    handlerRecipeDeleted,
    handlerRecipeIngredientsCreated,
    handlerRecipeIngredientsUpdated,
    handlerRecipeInstructionsCreated,
    handlerRecipeInstructionsUpdated,
    handlerRecipeMetadataUpdated,
} from "../services/RecipeHandlers";

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
    // Recipe pathways
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.created.v0",
        schema: recipeMetadataSchema,
        writable: true,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.metadata.updated.v0",
        schema: recipeMetadataSchema,
        writable: true,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.ingredients.created.v0",
        schema: recipeIngredientsSchema,
        writable: true,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.ingredients.updated.v0",
        schema: recipeIngredientsSchema,
        writable: true,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.instructions.created.v0",
        schema: recipeInstructionsSchema,
        writable: true,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.instructions.updated.v0",
        schema: recipeInstructionsSchema,
        writable: true,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.deleted.v0",
        schema: recipeMetadataSchema,
        writable: true,
    })
    // Meal intent-driven pathways
    .register({
        flowType: "meal.v0",
        eventType: "meal.planning.initiated.v0",
        schema: mealPlanningIntentSchema,
        writable: true,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal.step.assignment.requested.v0",
        schema: mealStepAssignmentIntentSchema,
        writable: true,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal.preparation.completed.v0",
        schema: mealPreparationCompletionIntentSchema,
        writable: true,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal.consumption.completed.v0",
        schema: mealConsumptionIntentSchema,
        writable: true,
    })
    .register({
        flowType: "meal.v0",
        eventType: "meal.plan.modification.requested.v0",
        schema: mealPlanModificationIntentSchema,
        writable: true,
    });

// Recipe handlers
FlowcorePathways.handle("recipe.v0/recipe.created.v0", handlerRecipeCreated);
FlowcorePathways.handle(
    "recipe.v0/recipe.metadata.updated.v0",
    handlerRecipeMetadataUpdated
);
FlowcorePathways.handle(
    "recipe.v0/recipe.ingredients.created.v0",
    handlerRecipeIngredientsCreated
);
FlowcorePathways.handle(
    "recipe.v0/recipe.ingredients.updated.v0",
    handlerRecipeIngredientsUpdated
);
FlowcorePathways.handle(
    "recipe.v0/recipe.instructions.created.v0",
    handlerRecipeInstructionsCreated
);
FlowcorePathways.handle(
    "recipe.v0/recipe.instructions.updated.v0",
    handlerRecipeInstructionsUpdated
);
FlowcorePathways.handle("recipe.v0/recipe.deleted.v0", handlerRecipeDeleted);

// Meal intent-driven handlers
FlowcorePathways.handle(
    "meal.v0/meal.planning.initiated.v0",
    handlerMealPlanningIntentInitiated
);
FlowcorePathways.handle(
    "meal.v0/meal.step.assignment.requested.v0",
    handlerMealStepAssignmentRequested
);
FlowcorePathways.handle(
    "meal.v0/meal.preparation.completed.v0",
    handlerMealPreparationCompleted
);
FlowcorePathways.handle(
    "meal.v0/meal.consumption.completed.v0",
    handlerMealConsumptionCompleted
);
FlowcorePathways.handle(
    "meal.v0/meal.plan.modification.requested.v0",
    handlerMealPlanModificationRequested
);

export const pathwaysRouter = new PathwayRouter(
    FlowcorePathways,
    webhookApiKey
);
