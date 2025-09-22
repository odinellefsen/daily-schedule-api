import {
    boolean,
    doublePrecision,
    integer,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";
import type { mealSteps } from "../../drizzle/schema";

export const recipes = pgTable("recipes", {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull(),
    nameOfTheRecipe: text("name_of_the_recipe").notNull(),
    generalDescriptionOfTheRecipe: text("general_description_of_the_recipe"),
    whenIsItConsumed: text("when_is_it_consumed").array(),
    version: integer("version").notNull().default(1),
});

export const recipeInstructions = pgTable("recipe_instructions", {
    id: uuid("id").primaryKey(),
    recipeId: uuid("recipe_id").references(() => recipes.id),
    instruction: text("instruction").notNull(),
    instructionNumber: integer("instruction_number").notNull(),
});

export const recipeInstructionFoodItemUnits = pgTable(
    "recipe_instructions_food_item_units",
    {
        id: uuid("id").primaryKey(),
        recipeInstructionId: uuid("recipe_instruction_id").references(
            () => recipeInstructions.id,
        ),
        foodItemUnitId: uuid("food_item_unit_id").notNull(),
        quantity: doublePrecision("quantity").notNull(),
    },
);

export const recipeIngredients = pgTable("recipe_ingredients", {
    id: uuid("id").primaryKey(),
    recipeId: uuid("recipe_id")
        .references(() => recipes.id)
        .notNull(),
    ingredientText: text("ingredient_text").notNull(),
});

export const meals = pgTable("meals", {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull(),
    mealName: text("meal_name").notNull(),
    scheduledToBeEatenAt: timestamp("scheduled_to_be_eaten_at"),
    hasMealBeenConsumed: boolean("has_meal_been_consumed")
        .notNull()
        .default(false),
    recipes: text("recipes").notNull(), // JSON array of recipe instances
});

export const mealIngredients = pgTable("meal_ingredients", {
    id: uuid("id").primaryKey(),
    mealId: uuid("meal_id")
        .notNull()
        .references(() => meals.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id"), // if the meal ingredient is from a recipe instance, we store the recipe id here.
    ingredientText: text("ingredient_text").notNull(),
});

export const mealInstructions = pgTable("meal_instructions", {
    id: uuid("id").primaryKey(),
    mealId: uuid("meal_id")
        .notNull()
        .references(() => meals.id, { onDelete: "cascade" }),
    originalRecipeId: uuid("original_recipe_id"), // if the meal step is from a recipe instance, we store the recipe id here.
    originalRecipeInstructionId: uuid("original_recipe_step_id"), // if the meal step is from a recipe instance, we store the original recipe step id here.
    instruction: text("instruction").notNull(),
    instructionNumber: integer("instruction_number").notNull(),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    foodItemUnitsUsedInStep: text("ingredients_used_in_step"), // JSON array
});

export const todos = pgTable("todos", {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(), // Unified title field
    description: text("description"), // Optional description
    completed: boolean("completed").notNull().default(false),
    scheduledFor: timestamp("scheduled_for"), // Precise scheduling timestamp
    dueDate: text("due_date"), // YYYY-MM-DD for habit todos
    preferredTime: text("preferred_time"), // HH:MM for habit todos
    completedAt: timestamp("completed_at"),

    // Simplified habit system fields
    habitId: uuid("habit_id").references(() => habits.id),
    instanceId: uuid("instance_id"), // Groups related todos together

    // Domain-agnostic reference (simplified)
    domain: text("domain"), // e.g., "meal", "workout", null for text habits
    entityId: uuid("entity_id"), // e.g., mealId, workoutId
    subEntityId: uuid("sub_entity_id"), // e.g., instructionId, exerciseId

    // Legacy relations field for manual todos
    relations: text("relations"), // JSON array of relations

    // Event sourcing
    eventId: text("event_id"), // Flowcore event ID
});

export const foodItems = pgTable("food_items", {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    categoryHierarchy: text("category_hierarchy").notNull().array(),
    userId: text("user_id").notNull(),
});

export const foodItemUnits = pgTable("food_item_units", {
    id: uuid("id").primaryKey(), // same food item can have multiple units with same unit of measurement
    foodItemId: uuid("food_item_id")
        .references(() => foodItems.id)
        .notNull(),
    unitOfMeasurement: text("unit_of_measurement").notNull(),
    unitDescription: text("unit_description"),
    calories: integer("calories").notNull(),
    proteinInGrams: integer("protein_in_grams"),
    carbohydratesInGrams: integer("carbohydrates_in_grams"),
    fatInGrams: integer("fat_in_grams"),
    fiberInGrams: integer("fiber_in_grams"),
    sugarInGrams: integer("sugar_in_grams"),
    sodiumInMilligrams: integer("sodium_in_milligrams"),
    source: text("source").notNull(),
});

export const habits = pgTable("habits", {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull(),
    domain: text("domain").notNull(), // e.g., "meal", "workout"
    entityId: uuid("entity_id").notNull(), // e.g., mealId, workoutId
    recurrenceType: text("recurrence_type").notNull(), // "weekly" only for now
    targetWeekday: text("target_weekday").notNull(), // when main event happens
    startDate: text("start_date").notNull(), // YYYY-MM-DD
    timezone: text("timezone"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const habitTriggers = pgTable("habit_triggers", {
    id: uuid("id").primaryKey(),
    habitId: uuid("habit_id")
        .references(() => habits.id, { onDelete: "cascade" })
        .notNull(),
    triggerSubEntityId: uuid("trigger_sub_entity_id"), // null if main event is trigger
    triggerWeekday: text("trigger_weekday").notNull(), // earliest day to start generation
});

export const habitSubEntities = pgTable("habit_subentities", {
    id: uuid("id").primaryKey(),
    habitId: uuid("habit_id")
        .references(() => habits.id, { onDelete: "cascade" })
        .notNull(),
    entityId: uuid("entity_id"),
    subEntityId: uuid("sub_entity_id"), // reference to sub entity (e.g., instructionId)
    scheduledWeekday: text("scheduled_weekday").notNull(),
    scheduledTime: text("scheduled_time"), // HH:MM
});

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;

export type MealStep = typeof mealSteps.$inferSelect;
export type NewMealStep = typeof mealSteps.$inferInsert;

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;

export type HabitTrigger = typeof habitTriggers.$inferSelect;
export type NewHabitTrigger = typeof habitTriggers.$inferInsert;

export type HabitSubEntity = typeof habitSubEntities.$inferSelect;
export type NewHabitSubEntity = typeof habitSubEntities.$inferInsert;
