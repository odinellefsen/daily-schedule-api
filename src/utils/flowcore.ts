import {
    createPostgresPathwayState,
    PathwayRouter,
    PathwaysBuilder,
} from "@flowcore/pathways";
import { zodEnv } from "../../env";
import { baseFoodRecipeEventSchema } from "../contracts/recipe";
import {
    handlerRecipeCreated,
    handlerRecipeDeleted,
    handlerRecipeUpdated,
} from "../services/HandleTest";

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
        flowType: "recipe.v0",
        eventType: "recipe.created.v0",
        schema: baseFoodRecipeEventSchema,
        writable: true,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.deleted.v0",
        schema: baseFoodRecipeEventSchema,
        writable: true,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.metadata.updated.v0",
        schema: baseFoodRecipeEventSchema,
        writable: true,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.ingredients.updated.v0",
        schema: baseFoodRecipeEventSchema,
        writable: true,
    })
    .register({
        flowType: "recipe.v0",
        eventType: "recipe.instructions.updated.v0",
        schema: baseFoodRecipeEventSchema,
        writable: true,
    });

FlowcorePathways.handle("recipe.v0/recipe.created.v0", handlerRecipeCreated);
FlowcorePathways.handle("recipe.v0/recipe.deleted.v0", handlerRecipeDeleted);
FlowcorePathways.handle(
    "recipe.v0/recipe.metadata.updated.v0",
    handlerRecipeUpdated
);
FlowcorePathways.handle(
    "recipe.v0/recipe.ingredients.updated.v0",
    handlerRecipeUpdated
);
FlowcorePathways.handle(
    "recipe.v0/recipe.instructions.updated.v0",
    handlerRecipeUpdated
);

export const pathwaysRouter = new PathwayRouter(
    FlowcorePathways,
    webhookApiKey
);
