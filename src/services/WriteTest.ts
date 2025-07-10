import type { z } from "zod";
import { MealTimingEnum, type recipeMetadataSchema } from "../contracts/recipe";
import { FlowcorePathways } from "../utils/flowcore";

export const writeTest = async (
    recipe: z.infer<typeof recipeMetadataSchema>
) => {
    await FlowcorePathways.write("recipe.v0/recipe.created.v0", {
        data: recipe,
    });

    console.log("sent a recipe created event ✅");
};

// Example usage
export const runTest = async (): Promise<void> => {
    const testRecipe = {
        id: crypto.randomUUID(),
        nameOfTheFoodRecipe: "Test Recipe",
        generalDescriptionOfTheFoodRecipe: "A test recipe",
        whenIsMealEaten: MealTimingEnum.DINNER,
    };

    await writeTest(testRecipe);

    console.log("✅ Test completed ✅");
};

runTest();
