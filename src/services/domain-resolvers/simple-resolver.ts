import { eq } from "drizzle-orm";
import { db } from "../../db";
import { habits } from "../../db/schemas";
import type { DomainTitleResolver } from "./base";

export class SimpleTitleResolver implements DomainTitleResolver {
    async getMainEventTitle(habitId: string): Promise<string> {
        const habit = await db.query.habits.findFirst({
            where: eq(habits.id, habitId),
        });

        if (!habit || !habit.description) {
            console.warn(`Simple habit not found for ID: ${habitId}`);
            return "Habit";
        }

        return habit.description;
    }

    async getSubEntityTitle(_subEntityId: string): Promise<string> {
        return "Habit";
    }
}
