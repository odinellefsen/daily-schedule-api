import {
    createPostgresPathwayState,
    PathwayRouter,
    PathwaysBuilder,
} from "@flowcore/pathways";
import { zodEnv } from "../../env";
import {
    foodItemSchema,
    foodItemUpdatedSchema,
} from "../contracts/food/food-item";

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
        eventType: "food-item.metadata.updated.v0",
        retryDelayMs: 10000,
        schema: foodItemUpdatedSchema,
    });

export const pathwaysRouter = new PathwayRouter(
    FlowcorePathways,
    webhookApiKey
);
