import { and, eq, inArray } from "drizzle-orm";
import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import {
    type MealRecipeAttachType,
    mealRecipeAttachSchema,
} from "../../../contracts/food/meal";
import { db } from "../../../db";
import { mealRecipes, meals, recipes } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";

// Request schema
const requestSchema = z.object({
    recipeIds: z
        .array(z.string().uuid())
        .min(1, "At least one recipe ID is required"),
});

// Response schemas
const successResponseSchema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({
        mealRecipe: mealRecipeAttachSchema,
    }),
});

const errorResponseSchema = z.object({
    success: z.literal(false),
    message: z.string(),
    errors: z.any().optional(),
});

// Route definition
const attachRecipesToMealRoute = createRoute({
    method: "post",
    path: "/api/meal/{mealId}/recipes",
    tags: ["Meals"],
    security: [{ Bearer: [] }],
    request: {
        params: z.object({
            mealId: z.string().uuid(),
        }),
        body: {
            content: {
                "application/json": {
                    schema: requestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Recipes attached to meal successfully",
            content: {
                "application/json": {
                    schema: successResponseSchema,
                },
            },
        },
        400: {
            description: "Bad Request",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        401: {
            description: "Unauthorized",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        404: {
            description: "Meal or recipes not found",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
        500: {
            description: "Internal Server Error",
            content: {
                "application/json": {
                    schema: errorResponseSchema,
                },
            },
        },
    },
});

export function registerAttachMealRecipes(app: OpenAPIHono) {
    app.openapi(attachRecipesToMealRoute, async (c) => {
        const safeUserId = c.userId!;
        const mealId = c.req.param("mealId");
        const { recipeIds } = c.req.valid("json");

        // Verify meal exists and belongs to user
        const mealFromDb = await db.query.meals.findFirst({
            where: and(eq(meals.id, mealId), eq(meals.userId, safeUserId)),
        });

        if (!mealFromDb) {
            return c.json(
                {
                    success: false as const,
                    message: "Meal not found or access denied",
                },
                404,
            );
        }

        // Verify all recipes exist and belong to user
        const recipesFromDb = await db.query.recipes.findMany({
            where: and(
                inArray(recipes.id, recipeIds),
                eq(recipes.userId, safeUserId),
            ),
        });
        if (recipesFromDb.length !== recipeIds.length) {
            const missingRecipeIds = recipeIds.filter(
                (id) => !recipesFromDb.some((r) => r.id === id),
            );
            return c.json(
                {
                    success: false as const,
                    message: "One or more recipes not found or access denied",
                    errors: `Recipes ${missingRecipeIds.join(", ")} not found or access denied`,
                },
                404,
            );
        }

        // Get current max order
        const existingRecipes = await db
            .select()
            .from(mealRecipes)
            .where(eq(mealRecipes.mealId, mealId));

        const maxOrder =
            existingRecipes.length > 0
                ? Math.max(...existingRecipes.map((r) => r.orderInMeal))
                : -1;

        // Build the recipes array with order
        const recipesToAttach = recipesFromDb.map((recipe, index) => ({
            recipeId: recipe!.id,
            orderInMeal: maxOrder + 1 + index,
        }));

        const newMealRecipe: MealRecipeAttachType = {
            mealId,
            recipes: recipesToAttach,
        };

        const attachEvent = mealRecipeAttachSchema.safeParse(newMealRecipe);
        if (!attachEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: "Invalid meal recipe data",
                    errors: attachEvent.error.errors,
                },
                400,
            );
        }

        try {
            await FlowcorePathways.write("meal.v0/meal-recipe.attached.v0", {
                data: attachEvent.data,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: "Failed to attach recipes to meal",
                    errors: error,
                },
                500,
            );
        }

        return c.json(
            {
                success: true as const,
                message: `${recipeIds.length} recipe${recipeIds.length > 1 ? "s" : ""} attached to meal successfully`,
                data: {
                    mealRecipe: attachEvent.data,
                },
            },
            201,
        );
    });
}
