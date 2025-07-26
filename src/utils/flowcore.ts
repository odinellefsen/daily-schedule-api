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
    handleFoodItemArchived,
    handleFoodItemCreated,
    handleFoodItemUpdated,
} from "../handlers/food-item/food-item.handler";
import {
    handleFoodItemUnitsCreated,
    handleFoodItemUnitsDeleted,
    handleFoodItemUnitsUpdated,
} from "../handlers/food-item/food-item-units.handler";

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
    );

export const pathwaysRouter = new PathwayRouter(
    FlowcorePathways,
    webhookApiKey
);
