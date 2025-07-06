import type { z } from "zod";
import type { foodRecipeEventContract } from "../contracts/recipe";
import { MealTimingEnum, UnitOfMeasurementEnum } from "../contracts/recipe";
import { FlowcorePathways } from "../utils/flowcore";

export const writeTest = async (
    recipe: z.infer<typeof foodRecipeEventContract>
) => {
    await FlowcorePathways.write("recipe.v0/recipe.created.v0", {
        data: recipe,
    });

    console.log("sent an event ✅");
};

writeTest({
    id: "550e8400-e29b-41d4-a716-446655440000",
    whenIsMealEaten: MealTimingEnum.DINNER,
    nameOfTheFoodRecipe: "Classic Spaghetti Carbonara",
    generalDescriptionOfTheFoodRecipe:
        "A traditional Italian pasta dish with eggs, cheese, pancetta, and black pepper. Creamy and delicious without cream!",
    ingredientsOfTheFoodRecipe: [
        {
            id: "550e8400-e29b-41d4-a716-446655440001",
            nameOfTheIngredient: "Spaghetti",
            quantityOfTheIngredient: 400,
            unitOfMeasurementOfTheIngredientQuantity:
                UnitOfMeasurementEnum.GRAM,
        },
        {
            id: "550e8400-e29b-41d4-a716-446655440002",
            nameOfTheIngredient: "Pancetta",
            quantityOfTheIngredient: 150,
            unitOfMeasurementOfTheIngredientQuantity:
                UnitOfMeasurementEnum.GRAM,
        },
        {
            id: "550e8400-e29b-41d4-a716-446655440003",
            nameOfTheIngredient: "Eggs",
            quantityOfTheIngredient: 3,
            unitOfMeasurementOfTheIngredientQuantity:
                UnitOfMeasurementEnum.WHOLE,
        },
        {
            id: "550e8400-e29b-41d4-a716-446655440004",
            nameOfTheIngredient: "Parmesan Cheese",
            quantityOfTheIngredient: 50,
            unitOfMeasurementOfTheIngredientQuantity:
                UnitOfMeasurementEnum.GRAM,
        },
        {
            id: "550e8400-e29b-41d4-a716-446655440005",
            nameOfTheIngredient: "Black Pepper",
            quantityOfTheIngredient: 1,
            unitOfMeasurementOfTheIngredientQuantity:
                UnitOfMeasurementEnum.TEASPOON,
        },
    ],
    stepForStepInstructionsToMakeTheFoodRecipe: [
        {
            id: "550e8400-e29b-41d4-a716-446655440006",
            stepNumber: 1,
            instruction:
                "Bring a large pot of salted water to boil and cook spaghetti according to package directions until al dente.",
            ingredientsUsedInThisStep: [
                {
                    id: "550e8400-e29b-41d4-a716-446655440001",
                    nameOfTheIngredientUsedInThisStep: "Spaghetti",
                    quantityOfTheIngredientUsedInThisStep: 400,
                    unitOfMeasurementOfTheIngredientQuantityUsedInThisStep:
                        UnitOfMeasurementEnum.GRAM,
                },
            ],
        },
        {
            id: "550e8400-e29b-41d4-a716-446655440007",
            stepNumber: 2,
            instruction:
                "While pasta cooks, dice pancetta and cook in a large skillet over medium heat until crispy.",
            ingredientsUsedInThisStep: [
                {
                    id: "550e8400-e29b-41d4-a716-446655440002",
                    nameOfTheIngredientUsedInThisStep: "Pancetta",
                    quantityOfTheIngredientUsedInThisStep: 150,
                    unitOfMeasurementOfTheIngredientQuantityUsedInThisStep:
                        UnitOfMeasurementEnum.GRAM,
                },
            ],
        },
        {
            id: "550e8400-e29b-41d4-a716-446655440008",
            stepNumber: 3,
            instruction:
                "In a bowl, whisk together eggs, grated Parmesan cheese, and freshly ground black pepper.",
            ingredientsUsedInThisStep: [
                {
                    id: "550e8400-e29b-41d4-a716-446655440003",
                    nameOfTheIngredientUsedInThisStep: "Eggs",
                    quantityOfTheIngredientUsedInThisStep: 3,
                    unitOfMeasurementOfTheIngredientQuantityUsedInThisStep:
                        UnitOfMeasurementEnum.WHOLE,
                },
                {
                    id: "550e8400-e29b-41d4-a716-446655440004",
                    nameOfTheIngredientUsedInThisStep: "Parmesan Cheese",
                    quantityOfTheIngredientUsedInThisStep: 50,
                    unitOfMeasurementOfTheIngredientQuantityUsedInThisStep:
                        UnitOfMeasurementEnum.GRAM,
                },
                {
                    id: "550e8400-e29b-41d4-a716-446655440005",
                    nameOfTheIngredientUsedInThisStep: "Black Pepper",
                    quantityOfTheIngredientUsedInThisStep: 1,
                    unitOfMeasurementOfTheIngredientQuantityUsedInThisStep:
                        UnitOfMeasurementEnum.TEASPOON,
                },
            ],
        },
        {
            id: "550e8400-e29b-41d4-a716-446655440009",
            stepNumber: 4,
            instruction:
                "Drain pasta, reserving 1 cup pasta water. Add hot pasta to skillet with pancetta and toss quickly with egg mixture off heat.",
        },
    ],
});
