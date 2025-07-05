import { foodRecipeEventContract } from "./recipe";

// Example 1: Simple pasta recipe
const simplePastaRecipe = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    nameOfTheFoodRecipe: "Creamy Garlic Pasta",
    generalDescriptionOfTheFoodRecipe:
        "A quick and delicious pasta dish with garlic and cream sauce",
    ingredientsOfTheFoodRecipe: [
        {
            nameOfTheIngredient: "pasta",
            quantityOfTheIngredient: 200,
            unitOfMeasurementOfTheIngredient: "Gram",
        },
        {
            nameOfTheIngredient: "garlic",
            quantityOfTheIngredient: 3,
            unitOfMeasurementOfTheIngredient: "Tablespoon",
        },
        {
            nameOfTheIngredient: "cream",
            quantityOfTheIngredient: 150,
            unitOfMeasurementOfTheIngredient: "Milliliter",
        },
    ],
    stepForStepInstructionsToMakeTheFoodRecipe: [
        {
            stepNumber: 1,
            instruction:
                "Boil water in large pot and cook pasta according to package directions",
            ingredientsUsedInThisStep: [
                {
                    nameOfTheIngredientUsedInThisStep: "pasta",
                    quantityOfTheIngredientUsedInThisStep: 200,
                },
            ],
        },
        {
            stepNumber: 2,
            instruction:
                "Heat oil in pan and sauté minced garlic until fragrant",
            ingredientsUsedInThisStep: [
                {
                    nameOfTheIngredientUsedInThisStep: "garlic",
                    quantityOfTheIngredientUsedInThisStep: 3,
                },
            ],
        },
        {
            stepNumber: 3,
            instruction:
                "Add cream to pan and simmer for 2 minutes, then toss with drained pasta",
            ingredientsUsedInThisStep: [
                {
                    nameOfTheIngredientUsedInThisStep: "cream",
                    quantityOfTheIngredientUsedInThisStep: 150,
                },
            ],
        },
    ],
};

// Example 2: Minimal recipe (only required fields)
const minimalRecipe = {
    id: "987f6543-e21b-34c5-d678-901234567890",
    nameOfTheFoodRecipe: "Toast",
    generalDescriptionOfTheFoodRecipe: "Simple buttered toast",
};

// Example 3: Recipe with optional quantities
const flexibleRecipe = {
    id: "456a7890-b12c-45d6-e789-012345678901",
    nameOfTheFoodRecipe: "Seasoned Salad",
    generalDescriptionOfTheFoodRecipe: "Fresh salad with flexible seasoning",
    ingredientsOfTheFoodRecipe: [
        {
            nameOfTheIngredient: "lettuce",
            quantityOfTheIngredient: 1,
            unitOfMeasurementOfTheIngredient: "Handful",
        },
        {
            nameOfTheIngredient: "salt",
            unitOfMeasurementOfTheIngredient: "Pinch",
        },
    ],
    stepForStepInstructionsToMakeTheFoodRecipe: [
        {
            stepNumber: 1,
            instruction:
                "Wash and chop lettuce, then season with salt to taste",
            ingredientsUsedInThisStep: [
                {
                    nameOfTheIngredientUsedInThisStep: "lettuce",
                    quantityOfTheIngredientUsedInThisStep: 1,
                },
                {
                    nameOfTheIngredientUsedInThisStep: "salt",
                },
            ],
        },
    ],
};

// Validation function
function validateRecipe(recipe: any, recipeName: string) {
    try {
        const validatedRecipe = foodRecipeEventContract.parse(recipe);
        console.log(`✅ ${recipeName} is valid!`);
        return validatedRecipe;
    } catch (error) {
        console.error(`❌ ${recipeName} validation failed:`, error);
        return null;
    }
}

// Export examples and validation function
export { simplePastaRecipe, minimalRecipe, flexibleRecipe, validateRecipe };

// Example usage:
validateRecipe(simplePastaRecipe, "Simple Pasta Recipe");
validateRecipe(minimalRecipe, "Minimal Recipe");
validateRecipe(flexibleRecipe, "Flexible Recipe");
