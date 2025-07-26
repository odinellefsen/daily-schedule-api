import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    type MealTimingEnum,
    type RecipeArchiveType,
    recipeArchiveSchema,
} from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import { recipe } from ".";

// client side request schema
const deleteRecipeRequestSchema = z.object({
    nameOfTheRecipe: z
        .string()
        .min(1, "Recipe name min length is 1")
        .max(75, "Recipe name max length is 75"),
});

recipe.delete("/", async (c) => {
    const safeUserId = c.userId!;

    const rawRequestJsonBody = await c.req.json();
    const parsedRequestJsonBody =
        deleteRecipeRequestSchema.safeParse(rawRequestJsonBody);
    if (!parsedRequestJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe data",
                parsedRequestJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeDeleteRecipeRequestBody = parsedRequestJsonBody.data;

    const recipeFromDb = await db.query.recipes.findFirst({
        where: and(
            eq(
                recipes.nameOfTheRecipe,
                safeDeleteRecipeRequestBody.nameOfTheRecipe
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

    const recipeArchived: RecipeArchiveType = {
        id: recipeFromDb.id,
        userId: safeUserId,
        nameOfTheRecipe: recipeFromDb.nameOfTheRecipe,
        generalDescriptionOfTheRecipe:
            recipeFromDb.generalDescriptionOfTheRecipe || undefined,
        whenIsItConsumed: recipeFromDb.whenIsItConsumed
            ? recipeFromDb.whenIsItConsumed.map((val) => val as MealTimingEnum)
            : undefined,
        reasonForArchiving: "User requested deletion",
    };

    const recipeArchivedEvent = recipeArchiveSchema.safeParse(recipeArchived);
    if (!recipeArchivedEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe archived data",
                recipeArchivedEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeRecipeArchivedEvent = recipeArchivedEvent.data;

    try {
        await FlowcorePathways.write("recipe.v0/recipe.archived.v0", {
            data: safeRecipeArchivedEvent,
        });
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to archive recipe", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success(
            "Recipe archived successfully",
            safeRecipeArchivedEvent
        )
    );
});
