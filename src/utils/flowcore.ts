import type { PathwayRouter as FlowcorePathwayRouter } from "@flowcore/pathways";
import { getEnv } from "../../env";
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
import {
    habitDeletedSchema,
    habitsCreatedSchema,
    simpleHabitCreatedSchema,
} from "../contracts/habit/habit.contract";
import {
    todoCancelledSchema,
    todoGeneratedSchema,
    todoSchema,
} from "../contracts/todo";
import { todoCompletedSchema } from "../contracts/todo/todo.completed";
import {
    handleFoodItemCreated,
    handleFoodItemDeleted,
} from "../handlers/food-item/food-item.handler";
import {
    handleFoodItemUnitsCreated,
    handleFoodItemUnitsDeleted,
} from "../handlers/food-item/food-item-units.handler";
import {
    handleHabitDeleted,
    handleHabitsCreated,
    handleSimpleHabitCreated,
} from "../handlers/habit/habit.handler";
import { handleMealCreated } from "../handlers/meal/meal.handler";
import { handleMealRecipeAttached } from "../handlers/meal/meal-recipes.handler";
import {
    handleRecipeCreated,
    handleRecipeDeleted,
} from "../handlers/recipe/recipe.handler";
import { handleRecipeIngredientsCreated } from "../handlers/recipe/recipe-ingredients.handler";
import { handleRecipeInstructionsCreated } from "../handlers/recipe/recipe-instructions.handler";
import { handleTodoCancelled } from "../handlers/todo/todo.cancelled";
import { handleTodoCompleted } from "../handlers/todo/todo.completed";
import { handleTodoGenerated } from "../handlers/todo/todo.generated";
import { handleTodoCreated } from "../handlers/todo/todo.handler";

type FlowcoreModule = typeof import("@flowcore/pathways");

let flowcoreModulePromise: Promise<FlowcoreModule> | undefined;

async function loadFlowcoreModule(): Promise<FlowcoreModule> {
    // Load lazily via dynamic import so Node/CJS runtimes (like Vercel)
    // don't try to `require()` ESM-only transitive deps at cold start.
    flowcoreModulePromise ??= import("@flowcore/pathways");
    return flowcoreModulePromise;
}

async function buildFlowcorePathways(config: {
    baseUrl: string;
    tenant: string;
    dataCore: string;
    apiKey: string;
    postgresUrl: string;
}) {
    const { createPostgresPathwayState, PathwaysBuilder } =
        await loadFlowcoreModule();

    return new PathwaysBuilder({
        baseUrl: config.baseUrl,
        tenant: config.tenant,
        dataCore: config.dataCore,
        apiKey: config.apiKey,
    })
        .withPathwayState(
            createPostgresPathwayState({
                connectionString: config.postgresUrl,
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
            flowType: "habit.v0",
            eventType: "complex-habit.created.v0",
            retryDelayMs: 10000,
            schema: habitsCreatedSchema,
        })
        .register({
            flowType: "habit.v0",
            eventType: "simple-habit.created.v0",
            retryDelayMs: 10000,
            // Flowcore register typing currently expects ZodObject; this schema is a discriminated union.
            schema: simpleHabitCreatedSchema as never,
        })
        .register({
            flowType: "habit.v0",
            eventType: "habit.deleted.v0",
            retryDelayMs: 10000,
            schema: habitDeletedSchema,
        })
        .register({
            flowType: "todo.v0",
            eventType: "todo.created.v0",
            retryDelayMs: 10000,
            schema: todoSchema,
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
            eventType: "todo.generated.v0",
            retryDelayMs: 10000,
            schema: todoGeneratedSchema,
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
        .handle("todo.v0/todo.generated.v0", handleTodoGenerated)
        .handle("habit.v0/complex-habit.created.v0", handleHabitsCreated)
        .handle("habit.v0/simple-habit.created.v0", handleSimpleHabitCreated)
        .handle("habit.v0/habit.deleted.v0", handleHabitDeleted)
        .handle("todo.v0/todo.completed.v0", handleTodoCompleted)
        .handle("todo.v0/todo.cancelled.v0", handleTodoCancelled);
}

export type FlowcorePathwaysType = Awaited<
    ReturnType<typeof buildFlowcorePathways>
>;

type FlowcoreCache = {
    webhookApiKey: string;
    pathways: FlowcorePathwaysType;
    router: FlowcorePathwayRouter;
};

let cachedPromise: Promise<FlowcoreCache> | undefined;

async function initFlowcore(): Promise<FlowcoreCache> {
    if (cachedPromise) return cachedPromise;

    cachedPromise = (async () => {
        const env = getEnv();
        const webhookApiKey = env.FLOWCORE_WEBHOOK_API_KEY;

        const pathways = await buildFlowcorePathways({
            baseUrl: env.FLOWCORE_WEBHOOK_BASE_URL,
            tenant: env.FLOWCORE_TENANT,
            dataCore: env.FLOWCORE_DATA_CORE_NAME,
            apiKey: webhookApiKey,
            postgresUrl: env.POSTGRES_CONNECTION_STRING,
        });

        const { PathwayRouter } = await loadFlowcoreModule();
        const router = new PathwayRouter(pathways, webhookApiKey);

        return { webhookApiKey, pathways, router };
    })();

    return cachedPromise;
}

export async function getFlowcorePathways() {
    return (await initFlowcore()).pathways;
}

export async function getPathwaysRouter() {
    return (await initFlowcore()).router;
}

// Keep existing import shape for all route handlers that call `FlowcorePathways.write(...)`.
export const FlowcorePathways = {
    async write(...args: Parameters<FlowcorePathwaysType["write"]>) {
        const pathways = await getFlowcorePathways();
        return pathways.write(...args);
    },
};
