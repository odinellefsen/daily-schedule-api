import {
    boolean,
    doublePrecision,
    integer,
    pgTable,
    text,
    timestamp,
    unique,
    uuid,
} from "drizzle-orm/pg-core";

export const recipes = pgTable("recipes", {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull(),
    nameOfTheRecipe: text("name_of_the_recipe").notNull(),
    generalDescriptionOfTheRecipe: text("general_description_of_the_recipe"),
    whenIsItConsumed: text("when_is_it_consumed").array(),
    version: integer("version").notNull().default(1),
});

export const recipeSteps = pgTable("recipe_steps", {
    id: uuid("id").primaryKey(),
    recipeId: uuid("recipe_id").references(() => recipes.id),
    instruction: text("step").notNull(),
    stepNumber: integer("step_number").notNull(),
});

export const recipeStepFoodItemUnits = pgTable("recipe_steps_food_item_units", {
    id: uuid("id").primaryKey(),
    recipeStepId: uuid("recipe_step_id").references(() => recipeSteps.id),
    foodItemUnitId: uuid("food_item_unit_id").notNull(),
    quantity: doublePrecision("quantity").notNull(),
});

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

export const mealSteps = pgTable("meal_steps", {
    id: uuid("id").primaryKey(),
    mealId: uuid("meal_id")
        .notNull()
        .references(() => meals.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id"), // if the meal step is from a recipe instance, we store the recipe id here.
    originalRecipeStepId: uuid("original_recipe_step_id"), // if the meal step is from a recipe instance, we store the original recipe step id here.
    instruction: text("instruction").notNull(),
    stepNumber: integer("step_number").notNull(),
    isStepCompleted: boolean("is_step_completed").notNull().default(false),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    assignedToDate: text("assigned_to_date"), // YYYY-MM-DD format
    todoId: uuid("todo_id"),
    foodItemUnitsUsedInStep: text("ingredients_used_in_step"), // JSON array
});

export const todos = pgTable(
    "todos",
    {
        id: uuid("id").primaryKey(),
        userId: text("user_id").notNull(),
        description: text("description").notNull(), // Legacy field for manual todos
        title: text("title"), // New field for habit-generated todos
        completed: boolean("completed").notNull().default(false),
        scheduledFor: timestamp("scheduled_for"), // Legacy datetime field
        dueDate: text("due_date"), // YYYY-MM-DD for habit todos
        preferredTime: text("preferred_time"), // HH:MM for habit todos
        completedAt: timestamp("completed_at"),

        // Habit system fields
        habitId: uuid("habit_id").references(() => habits.id),
        occurrenceId: uuid("occurrence_id").references(() => occurrences.id),
        idempotencyKey: text("idempotency_key").unique(), // For preventing duplicates

        // Domain relation for habit todos
        relation: text("relation"), // JSON: { domain, entityId, version }
        instructionKey: text("instruction_key"), // JSON: { recipeId, recipeVersion, instructionId }
        snapshot: text("snapshot"), // JSON: domain-specific snapshot

        // Legacy relations field for manual todos
        relations: text("relations"), // JSON array of relations

        // Event sourcing
        eventId: text("event_id"), // Flowcore event ID
    },
    (table) => ({
        // Unique constraint for habit todos to prevent duplicates
        uniqueHabitTodo: unique().on(
            table.userId,
            table.habitId,
            table.dueDate,
            table.instructionKey,
        ),
    }),
);

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
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    recurrenceType: text("recurrence_type").notNull(),
    recurrenceInterval: integer("recurrence_interval").notNull(),
    startDate: text("start_date").notNull(), // YYYY-MM-DD
    timezone: text("timezone"),
    weekDays: text("week_days").array(),
    monthlyDay: integer("monthly_day"),
    preferredTime: text("preferred_time"),
    relationTemplate: text("relation_template"),
});

export const occurrences = pgTable(
    "occurrences",
    {
        id: uuid("id").primaryKey(),
        userId: text("user_id").notNull(),
        domain: text("domain").notNull(), // "meal"
        entityId: uuid("entity_id").notNull(), // mealId
        version: integer("version").notNull(), // meal version chosen at generation
        targetDate: text("target_date").notNull(), // YYYY-MM-DD - the event/serving date
        habitId: uuid("habit_id").references(() => habits.id),
        status: text("status").notNull().default("planned"), // planned, active, completed, cancelled
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => ({
        // Ensure unique occurrence per user/domain/entity/version/date
        uniqueOccurrence: unique().on(
            table.userId,
            table.domain,
            table.entityId,
            table.version,
            table.targetDate,
        ),
    }),
);

export const occurrenceSteps = pgTable(
    "occurrence_steps",
    {
        id: uuid("id").primaryKey(),
        occurrenceId: uuid("occurrence_id")
            .notNull()
            .references(() => occurrences.id, { onDelete: "cascade" }),
        recipeId: uuid("recipe_id").notNull(),
        recipeVersion: integer("recipe_version").notNull(),
        instructionId: uuid("instruction_id").notNull(),
        title: text("title").notNull(), // snapshot of instruction text
        dueDate: text("due_date").notNull(), // YYYY-MM-DD - supports offsets
        todoId: uuid("todo_id"), // references todos.id when todo is created
        completedAt: timestamp("completed_at"),
        completedBy: text("completed_by"),
    },
    (table) => ({
        // Ensure unique step per occurrence and instruction
        uniqueStep: unique().on(
            table.occurrenceId,
            table.recipeId,
            table.recipeVersion,
            table.instructionId,
        ),
    }),
);

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

export type Occurrence = typeof occurrences.$inferSelect;
export type NewOccurrence = typeof occurrences.$inferInsert;

export type OccurrenceStep = typeof occurrenceSteps.$inferSelect;
export type NewOccurrenceStep = typeof occurrenceSteps.$inferInsert;
