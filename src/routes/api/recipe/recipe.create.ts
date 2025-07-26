import { and, eq } from "drizzle-orm";
import z from "zod";
import {
    MealTimingEnum,
    type RecipeMetadataType,
    recipeSchema,
} from "../../../contracts/food/recipe";
import { db } from "../../../db";
import { recipes } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { FlowcorePathways } from "../../../utils/flowcore";
import recipe from ".";

// client side request schema
const createRecipeRequestSchema = z.object({
    nameOfTheRecipe: z
        .string()
        .min(1, "Recipe name min length is 1")
        .max(75, "Recipe name max length is 75"),
    generalDescriptionOfTheRecipe: z.string().max(250).optional(),
    whenIsItConsumed: z.array(z.nativeEnum(MealTimingEnum)).optional(),
});

recipe.post("/", async (c) => {
    const safeUserId = c.userId!;

    const rawJsonBody = await c.req.json();
    const parsedJsonBody = createRecipeRequestSchema.safeParse(rawJsonBody);
    if (!parsedJsonBody.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe data",
                parsedJsonBody.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateRecipeJsonBody = parsedJsonBody.data;

    const existingRecipe = await db
        .select()
        .from(recipes)
        .where(
            and(
                eq(
                    recipes.nameOfTheRecipe,
                    safeCreateRecipeJsonBody.nameOfTheRecipe
                ),
                eq(recipes.userId, safeUserId)
            )
        );
    if (existingRecipe.length > 0) {
        return c.json(
            ApiResponse.error("Recipe with name already exists"),
            StatusCodes.CONFLICT
        );
    }

    const newRecipe: RecipeMetadataType = {
        id: crypto.randomUUID(),
        userId: safeUserId,
        nameOfTheRecipe: safeCreateRecipeJsonBody.nameOfTheRecipe,
        generalDescriptionOfTheRecipe:
            safeCreateRecipeJsonBody.generalDescriptionOfTheRecipe,
        whenIsItConsumed: safeCreateRecipeJsonBody.whenIsItConsumed,
    };

    const createRecipeEvent = recipeSchema.safeParse(newRecipe);
    if (!createRecipeEvent.success) {
        return c.json(
            ApiResponse.error(
                "Invalid recipe data",
                createRecipeEvent.error.errors
            ),
            StatusCodes.BAD_REQUEST
        );
    }
    const safeCreateRecipeEvent = createRecipeEvent.data;

    try {
        await FlowcorePathways.write("recipe.v0/recipe.created.v0", {
            data: safeCreateRecipeEvent,
        });
    } catch (error) {
        return c.json(
            ApiResponse.error("Failed to create recipe", error),
            StatusCodes.SERVER_ERROR
        );
    }

    return c.json(
        ApiResponse.success(
            "Recipe created successfully",
            safeCreateRecipeEvent
        )
    );
});

export default recipe;
