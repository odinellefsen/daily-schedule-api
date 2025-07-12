import { UnitOfMeasurementEnum } from "../recipe";
import { categoryHelpers } from "./food-categories.contract";
import type { FoodItemType } from "./food-item.contract";

// Example food definitions showing the hierarchical category system
export const exampleFoodItems: FoodItemType[] = [
    {
        foodItemId: "apple-001",
        userId: "user-123",
        nameOfTheFoodItem: "Apple",
        category: {
            categories: ["fruits", "tree_fruits", "apples"],
            categoryPath: categoryHelpers.toPath([
                "fruits",
                "tree_fruits",
                "apples",
            ]),
            primaryCategory: "fruits",
        },
        description: "Fresh red or green apples",
        units: [
            {
                unitId: "apple-medium",
                unitName: UnitOfMeasurementEnum.PIECE,
                unitDescription: "1 medium apple (about 180g)",
                nutritionPerUnit: {
                    calories: 95,
                    protein: 0.5,
                    carbohydrates: 25,
                    fat: 0.3,
                    fiber: 4,
                    sugar: 19,
                },
                isDefault: true,
                estimatedWeight: 180,
                source: "database",
            },
            {
                unitId: "apple-slice",
                unitName: UnitOfMeasurementEnum.SLICE,
                unitDescription: "1 thin slice",
                nutritionPerUnit: {
                    calories: 8,
                    protein: 0.04,
                    carbohydrates: 2,
                    fat: 0.02,
                    fiber: 0.3,
                    sugar: 1.5,
                },
                isDefault: false,
                estimatedWeight: 15,
                source: "database",
            },
        ],
        isPublic: true,
    },
    {
        foodItemId: "bread-001",
        userId: "user-123",
        nameOfTheFoodItem: "Whole Wheat Bread",
        category: {
            categories: ["grains", "bread"],
            categoryPath: categoryHelpers.toPath(["grains", "bread"]),
            primaryCategory: "grains",
        },
        description: "Standard whole wheat sandwich bread",
        units: [
            {
                unitId: "bread-slice",
                unitName: UnitOfMeasurementEnum.SLICE,
                unitDescription: "1 slice (about 28g)",
                nutritionPerUnit: {
                    calories: 80,
                    protein: 4,
                    carbohydrates: 14,
                    fat: 1.5,
                    fiber: 3,
                    sugar: 2,
                    sodium: 160,
                },
                isDefault: true,
                estimatedWeight: 28,
                source: "package_label",
            },
        ],
        isPublic: true,
    },
    {
        foodItemId: "chicken-001",
        userId: "user-123",
        nameOfTheFoodItem: "Chicken Breast",
        category: {
            categories: ["proteins", "poultry", "chicken"],
            categoryPath: categoryHelpers.toPath([
                "proteins",
                "poultry",
                "chicken",
            ]),
            primaryCategory: "proteins",
        },
        description: "Boneless, skinless chicken breast",
        units: [
            {
                unitId: "chicken-breast",
                unitName: UnitOfMeasurementEnum.PIECE,
                unitDescription: "1 medium breast (about 150g)",
                nutritionPerUnit: {
                    calories: 248,
                    protein: 46,
                    carbohydrates: 0,
                    fat: 5.4,
                    fiber: 0,
                    sugar: 0,
                    sodium: 104,
                },
                isDefault: true,
                estimatedWeight: 150,
                source: "database",
            },
            {
                unitId: "chicken-100g",
                unitName: UnitOfMeasurementEnum.GRAM,
                unitDescription: "100 grams",
                nutritionPerUnit: {
                    calories: 165,
                    protein: 31,
                    carbohydrates: 0,
                    fat: 3.6,
                    fiber: 0,
                    sugar: 0,
                    sodium: 74,
                },
                isDefault: false,
                estimatedWeight: 100,
                source: "database",
            },
        ],
        isPublic: true,
    },
    {
        foodItemId: "spinach-001",
        userId: "user-123",
        nameOfTheFoodItem: "Fresh Spinach",
        category: {
            categories: ["vegetables", "leafy_greens", "spinach"],
            categoryPath: categoryHelpers.toPath([
                "vegetables",
                "leafy_greens",
                "spinach",
            ]),
            primaryCategory: "vegetables",
        },
        description: "Fresh baby spinach leaves",
        units: [
            {
                unitId: "spinach-cup",
                unitName: UnitOfMeasurementEnum.TABLESPOON, // Using tablespoon as closest to "cup"
                unitDescription: "1 cup fresh (about 30g)",
                nutritionPerUnit: {
                    calories: 7,
                    protein: 0.9,
                    carbohydrates: 1.1,
                    fat: 0.1,
                    fiber: 0.7,
                    sugar: 0.1,
                    sodium: 24,
                },
                isDefault: true,
                estimatedWeight: 30,
                source: "database",
            },
        ],
        isPublic: true,
    },
    {
        foodItemId: "olive-oil-001",
        userId: "user-123",
        nameOfTheFoodItem: "Extra Virgin Olive Oil",
        category: {
            categories: ["fats_oils", "cooking_oils"],
            categoryPath: categoryHelpers.toPath(["fats_oils", "cooking_oils"]),
            primaryCategory: "fats_oils",
        },
        description: "Cold-pressed extra virgin olive oil",
        units: [
            {
                unitId: "olive-oil-tbsp",
                unitName: UnitOfMeasurementEnum.TABLESPOON,
                unitDescription: "1 tablespoon (about 14g)",
                nutritionPerUnit: {
                    calories: 119,
                    protein: 0,
                    carbohydrates: 0,
                    fat: 13.5,
                    fiber: 0,
                    sugar: 0,
                    sodium: 0,
                },
                isDefault: true,
                estimatedWeight: 14,
                source: "package_label",
            },
            {
                unitId: "olive-oil-tsp",
                unitName: UnitOfMeasurementEnum.TEASPOON,
                unitDescription: "1 teaspoon (about 4.5g)",
                nutritionPerUnit: {
                    calories: 40,
                    protein: 0,
                    carbohydrates: 0,
                    fat: 4.5,
                    fiber: 0,
                    sugar: 0,
                    sodium: 0,
                },
                isDefault: false,
                estimatedWeight: 4.5,
                source: "package_label",
            },
        ],
        isPublic: true,
    },
    {
        foodItemId: "milk-001",
        userId: "user-123",
        nameOfTheFoodItem: "Whole Milk",
        category: {
            categories: ["dairy", "milk"],
            categoryPath: categoryHelpers.toPath(["dairy", "milk"]),
            primaryCategory: "dairy",
        },
        description: "Fresh whole milk (3.25% fat)",
        units: [
            {
                unitId: "milk-cup",
                unitName: UnitOfMeasurementEnum.TABLESPOON, // Using tablespoon as closest to "cup"
                unitDescription: "1 cup (240ml)",
                nutritionPerUnit: {
                    calories: 150,
                    protein: 8,
                    carbohydrates: 12,
                    fat: 8,
                    fiber: 0,
                    sugar: 12,
                    sodium: 105,
                },
                isDefault: true,
                estimatedWeight: 240,
                source: "package_label",
            },
        ],
        isPublic: true,
    },
];

// Example category usage scenarios
export const categoryExamples = [
    {
        description: "Single level category",
        categories: ["fruits"],
        displayName: "Fruits",
        useCase: "Broad categorization",
    },
    {
        description: "Two level category",
        categories: ["fruits", "citrus"],
        displayName: "Fruits → Citrus",
        useCase: "More specific grouping",
    },
    {
        description: "Three level category",
        categories: ["fruits", "citrus", "oranges"],
        displayName: "Fruits → Citrus → Oranges",
        useCase: "Very specific categorization",
    },
    {
        description: "Four level category",
        categories: ["proteins", "meat", "beef", "ground_beef"],
        displayName: "Proteins → Meat → Beef → Ground Beef",
        useCase: "Extremely specific for detailed tracking",
    },
];

// Example queries/filters using the category system
export const categoryQueries = [
    {
        query: "All fruits",
        filter: (item: FoodItemType) =>
            item.category?.primaryCategory === "fruits",
        description: "Filter by primary category",
    },
    {
        query: "All citrus fruits",
        filter: (item: FoodItemType) =>
            item.category?.categories.includes("citrus") &&
            item.category?.primaryCategory === "fruits",
        description: "Filter by specific subcategory",
    },
    {
        query: "All meat proteins",
        filter: (item: FoodItemType) =>
            item.category?.categories.includes("meat") &&
            item.category?.primaryCategory === "proteins",
        description: "Filter by secondary category level",
    },
    {
        query: "Search 'oil' in any category level",
        filter: (item: FoodItemType) =>
            item.category?.categories.some((cat) =>
                cat.toLowerCase().includes("oil")
            ),
        description: "Search across all category levels",
    },
];
