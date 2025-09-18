import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { habits } from "./schemas";

// Table to store offsets for sub-entities within complex habits
export const habitSubEntityOffsets = pgTable("habit_sub_entity_offsets", {
    id: uuid("id").primaryKey(),
    habitId: uuid("habit_id")
        .notNull()
        .references(() => habits.id, { onDelete: "cascade" }),

    // Sub-entity reference
    subEntityId: uuid("sub_entity_id").notNull(), // e.g., instructionId
    subEntityName: text("sub_entity_name"), // e.g., "Make dough"

    // Offset in minutes from the habit's target time
    // Negative values mean before the target time
    offsetMinutes: integer("offset_minutes").notNull().default(0),
});

export type HabitSubEntityOffset = typeof habitSubEntityOffsets.$inferSelect;
export type NewHabitSubEntityOffset = typeof habitSubEntityOffsets.$inferInsert;
