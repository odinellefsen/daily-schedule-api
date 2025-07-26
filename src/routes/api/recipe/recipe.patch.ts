import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    MealTimingEnum,
    type RecipeUpdateType,
    recipeUpdateSchema,
} from "../../../contracts/food/recipe";
import {
    type RecipeVersionType,
    whatTriggeredVersionUpate,
} from "../../../contracts/food/recipe/recipe-version.contract";
import { db } from "../../../db";
import { recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import recipe from ".";

// client side request schema
const updateRecipeRequestSchema = z.object({
    nameOfTheRecipe: z
        .string()
        .min(1, "Recipe name min length is 1")
        .max(75, "Recipe name max length is 75"),
    generalDescriptionOfTheRecipe: z.string().max(250).optional(),
    whenIsItConsumed: z.array(z.nativeEnum(MealTimingEnum)).optional(),
});

recipe.patch("/", async (c) => {
    const safeUserId = c.userId!;

    const rawRequestJsonBody = await c.req.json();
    const parsedRequestJsonBody =
        updateRecipeRequestSchema.safeParse(rawRequestJsonBody);
    if (!parsedRequestJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe data",
                parsedRequestJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUpdateRecipeRequestBody = parsedRequestJsonBody.data;

    const recipeFromDb = await db.query.recipes.findFirst({
        where: and(
            eq(
                recipes.nameOfTheRecipe,
                safeUpdateRecipeRequestBody.nameOfTheRecipe
            ),
            eq(recipes.userId, safeUserId)
        ),
    });
    if (!recipeFromDb) {
        return c.json(
            ApiResponse.error("Recipe not found"),
            StatusCodes.NOT_FOUND
        );
    }

    const recipeVersion = recipeFromDb.version;
    const newRecipeVersion = recipeVersion + 1;

    const updatedRecipe: RecipeUpdateType = {
        id: recipeFromDb.id,
        userId: safeUserId,
        nameOfTheRecipe: safeUpdateRecipeRequestBody.nameOfTheRecipe,
        generalDescriptionOfTheRecipe:
            safeUpdateRecipeRequestBody.generalDescriptionOfTheRecipe,
        whenIsItConsumed: safeUpdateRecipeRequestBody.whenIsItConsumed,
        oldValues: {
            id: recipeFromDb.id,
            userId: recipeFromDb.userId,
            nameOfTheRecipe: recipeFromDb.nameOfTheRecipe,
            generalDescriptionOfTheRecipe:
                recipeFromDb.generalDescriptionOfTheRecipe || undefined,
            whenIsItConsumed: recipeFromDb.whenIsItConsumed
                ? recipeFromDb.whenIsItConsumed.map(
                      (val) => val as MealTimingEnum
                  )
                : undefined,
        },
    };

    const updateRecipeEvent = recipeUpdateSchema.safeParse(updatedRecipe);
    if (!updateRecipeEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe data",
                updateRecipeEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeUpdateRecipeEvent = updateRecipeEvent.data;

    try {
        await FlowcorePathways.write("recipe.v0/recipe.updated.v0", {
            data: safeUpdateRecipeEvent,
        });
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to update recipe", error),
            StatusCodes.SERVER_ERROR
        );
    }

    const recipeVersionEvent: RecipeVersionType = {
        recipeId: recipeFromDb.id,
        version: newRecipeVersion,
        whatTriggeredUpdate: whatTriggeredVersionUpate.recipeBase,
    };

    try {
        await FlowcorePathways.write("recipe.v0/recipe-version.v0", {
            data: recipeVersionEvent,
        });
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to update recipe version", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success(
            "Recipe updated successfully",
            safeUpdateRecipeEvent
        )
    );
});

export default recipe;
