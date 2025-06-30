import {
  createPostgresPathwayState,
  PathwayRouter,
  PathwaysBuilder,
} from "@flowcore/pathways";
import { zodEnv } from "../../env";
import { recipeSchema } from "../contracts/recipe";
import "../services/HandleTest";

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
    flowType: "recipe.v0",
    eventType: "recipe.created.v0",
    schema: recipeSchema,
  });

export const pathwaysRouter = new PathwayRouter(
  FlowcorePathways,
  webhookApiKey,
);
