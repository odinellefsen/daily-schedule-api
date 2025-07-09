import type { FlowcoreEvent } from "@flowcore/pathways";
import { eq } from "drizzle-orm";
import type z from "zod";
import type {
    recipeIngredientsSchema,
    recipeInstructionsSchema,
    recipeMetadataSchema,
} from "../contracts/recipe";
import { db } from "../db";
import { recipes } from "../db/schema";

export async function handlerRecipeCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeMetadataSchema>;
    }
) {
    console.log("received a recipe created event ✅", event);

    await db.insert(recipes).values({
        id: event.payload.id,
        name: event.payload.nameOfTheFoodRecipe,
        description: event.payload.generalDescriptionOfTheFoodRecipe || null,
    });
}

export async function handlerRecipeMetadataUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeMetadataSchema>;
    }
) {
    console.log("received a recipe metadata updated event ✅", event);

    await db
        .update(recipes)
        .set({
            name: event.payload.nameOfTheFoodRecipe,
            description:
                event.payload.generalDescriptionOfTheFoodRecipe || null,
        })
        .where(eq(recipes.id, event.payload.id));
}

export async function handlerRecipeIngredientsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeIngredientsSchema>;
    }
) {
    console.log("received a recipe ingredients created event ✅", event);

    // TODO: Implement ingredients storage in database
    // This will require creating a recipe_ingredients table
    console.log(
        "Ingredients to be stored:",
        event.payload.ingredientsOfTheFoodRecipe
    );
}

export async function handlerRecipeIngredientsUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeIngredientsSchema>;
    }
) {
    console.log("received a recipe ingredients updated event ✅", event);

    // TODO: Implement ingredients update in database
    // This will require creating a recipe_ingredients table
    console.log(
        "Ingredients to be updated:",
        event.payload.ingredientsOfTheFoodRecipe
    );
}

export async function handlerRecipeInstructionsCreated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeInstructionsSchema>;
    }
) {
    console.log("received a recipe instructions created event ✅", event);

    // TODO: Implement instructions storage in database
    // This will require creating a recipe_instructions table
    console.log(
        "Instructions to be stored:",
        event.payload.stepByStepInstructionsToMakeTheFoodRecipe
    );
}

export async function handlerRecipeInstructionsUpdated(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeInstructionsSchema>;
    }
) {
    console.log("received a recipe instructions updated event ✅", event);

    // TODO: Implement instructions update in database
    // This will require creating a recipe_instructions table
    console.log(
        "Instructions to be updated:",
        event.payload.stepByStepInstructionsToMakeTheFoodRecipe
    );
}

export async function handlerRecipeDeleted(
    event: Omit<FlowcoreEvent, "payload"> & {
        payload: z.infer<typeof recipeMetadataSchema>;
    }
) {
    console.log("received a recipe deleted event ✅", event);

    await db.delete(recipes).where(eq(recipes.id, event.payload.id));
}
