import { and, eq, isNull } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { habits } from "../../../db/schemas";
import { ApiResponse } from "../../../utils/api-responses";

export function registerListHabits(app: Hono) {
    app.get("/", async (c) => {
        const safeUserId = c.userId!;

        const userHabits = await db.query.habits.findMany({
            where: eq(habits.userId, safeUserId),
            orderBy: [habits.domain, habits.entityName, habits.name],
        });

        // Group habits by type and domain
        const groupedHabits = {
            textHabits: [] as any[],
            domainHabits: {} as Record<string, any>,
        };

        for (const habit of userHabits) {
            const habitData = {
                id: habit.id,
                name: habit.name,
                description: habit.description,
                isActive: habit.isActive,
                recurrenceType: habit.recurrenceType,
                recurrenceInterval: habit.recurrenceInterval,
                startDate: habit.startDate,
                timezone: habit.timezone,
                weekDays: habit.weekDays,
                preferredTime: habit.preferredTime,
            };

            if (!habit.domain) {
                // Text-based habit
                groupedHabits.textHabits.push(habitData);
            } else {
                // Domain-linked habit
                if (!groupedHabits.domainHabits[habit.domain]) {
                    groupedHabits.domainHabits[habit.domain] = {};
                }

                const entityKey = habit.entityId || "unknown";
                if (!groupedHabits.domainHabits[habit.domain][entityKey]) {
                    groupedHabits.domainHabits[habit.domain][entityKey] = {
                        domain: habit.domain,
                        entityId: habit.entityId,
                        entityName: habit.entityName,
                        habits: [],
                    };
                }

                groupedHabits.domainHabits[habit.domain][entityKey].habits.push(
                    {
                        ...habitData,
                        subEntityId: habit.subEntityId,
                        subEntityName: habit.subEntityName,
                    },
                );
            }
        }

        // Flatten domain habits for easier consumption
        const domainHabitsFlattened = Object.values(
            groupedHabits.domainHabits,
        ).flatMap((domain) => Object.values(domain));

        return c.json(
            ApiResponse.success("Habits retrieved successfully", {
                textHabits: groupedHabits.textHabits,
                domainHabits: domainHabitsFlattened,
                totalCount: userHabits.length,
            }),
        );
    });

    app.get("/active", async (c) => {
        const safeUserId = c.userId!;

        const activeHabits = await db.query.habits.findMany({
            where: and(
                eq(habits.userId, safeUserId),
                eq(habits.isActive, true),
            ),
            orderBy: [habits.domain, habits.entityName, habits.name],
        });

        // Same grouping logic as above but only for active habits
        const groupedHabits = {
            textHabits: [] as any[],
            domainHabits: {} as Record<string, any>,
        };

        for (const habit of activeHabits) {
            const habitData = {
                id: habit.id,
                name: habit.name,
                description: habit.description,
                recurrenceType: habit.recurrenceType,
                recurrenceInterval: habit.recurrenceInterval,
                startDate: habit.startDate,
                timezone: habit.timezone,
                weekDays: habit.weekDays,
                preferredTime: habit.preferredTime,
            };

            if (!habit.domain) {
                groupedHabits.textHabits.push(habitData);
            } else {
                if (!groupedHabits.domainHabits[habit.domain]) {
                    groupedHabits.domainHabits[habit.domain] = {};
                }

                const entityKey = habit.entityId || "unknown";
                if (!groupedHabits.domainHabits[habit.domain][entityKey]) {
                    groupedHabits.domainHabits[habit.domain][entityKey] = {
                        domain: habit.domain,
                        entityId: habit.entityId,
                        entityName: habit.entityName,
                        habits: [],
                    };
                }

                groupedHabits.domainHabits[habit.domain][entityKey].habits.push(
                    {
                        ...habitData,
                        subEntityId: habit.subEntityId,
                        subEntityName: habit.subEntityName,
                    },
                );
            }
        }

        const domainHabitsFlattened = Object.values(
            groupedHabits.domainHabits,
        ).flatMap((domain) => Object.values(domain));

        return c.json(
            ApiResponse.success("Active habits retrieved successfully", {
                textHabits: groupedHabits.textHabits,
                domainHabits: domainHabitsFlattened,
                totalCount: activeHabits.length,
            }),
        );
    });

    app.get("/text", async (c) => {
        const safeUserId = c.userId!;

        const textHabits = await db.query.habits.findMany({
            where: and(eq(habits.userId, safeUserId), isNull(habits.domain)),
            orderBy: habits.name,
        });

        const transformedHabits = textHabits.map((habit) => ({
            id: habit.id,
            name: habit.name,
            description: habit.description,
            isActive: habit.isActive,
            recurrenceType: habit.recurrenceType,
            recurrenceInterval: habit.recurrenceInterval,
            startDate: habit.startDate,
            timezone: habit.timezone,
            weekDays: habit.weekDays,
            preferredTime: habit.preferredTime,
        }));

        return c.json(
            ApiResponse.success(
                "Text habits retrieved successfully",
                transformedHabits,
            ),
        );
    });

    app.get("/domain/:domain", async (c) => {
        const safeUserId = c.userId!;
        const domain = c.req.param("domain");

        const domainHabits = await db.query.habits.findMany({
            where: and(
                eq(habits.userId, safeUserId),
                eq(habits.domain, domain),
            ),
            orderBy: [habits.entityName, habits.name],
        });

        // Group by entity
        const entitiesMap: Record<string, any> = {};

        for (const habit of domainHabits) {
            const entityKey = habit.entityId || "unknown";
            if (!entitiesMap[entityKey]) {
                entitiesMap[entityKey] = {
                    domain: habit.domain,
                    entityId: habit.entityId,
                    entityName: habit.entityName,
                    habits: [],
                };
            }

            entitiesMap[entityKey].habits.push({
                id: habit.id,
                name: habit.name,
                description: habit.description,
                isActive: habit.isActive,
                subEntityId: habit.subEntityId,
                subEntityName: habit.subEntityName,
                recurrenceType: habit.recurrenceType,
                recurrenceInterval: habit.recurrenceInterval,
                startDate: habit.startDate,
                timezone: habit.timezone,
                weekDays: habit.weekDays,
                preferredTime: habit.preferredTime,
            });
        }

        return c.json(
            ApiResponse.success(
                `Habits for ${domain} domain retrieved successfully`,
                Object.values(entitiesMap),
            ),
        );
    });

    app.get("/entity/:domain/:entityId", async (c) => {
        const safeUserId = c.userId!;
        const domain = c.req.param("domain");
        const entityId = c.req.param("entityId");

        const entityHabits = await db.query.habits.findMany({
            where: and(
                eq(habits.userId, safeUserId),
                eq(habits.domain, domain),
                eq(habits.entityId, entityId),
            ),
            orderBy: habits.name,
        });

        if (!entityHabits.length) {
            return c.json(
                ApiResponse.success("No habits found for this entity", []),
            );
        }

        const transformedHabits = entityHabits.map((habit) => ({
            id: habit.id,
            name: habit.name,
            description: habit.description,
            isActive: habit.isActive,
            subEntityId: habit.subEntityId,
            subEntityName: habit.subEntityName,
            recurrenceType: habit.recurrenceType,
            recurrenceInterval: habit.recurrenceInterval,
            startDate: habit.startDate,
            timezone: habit.timezone,
            weekDays: habit.weekDays,
            preferredTime: habit.preferredTime,
        }));

        return c.json(
            ApiResponse.success(
                `Habits for ${entityHabits[0].entityName || entityId}`,
                {
                    domain: domain,
                    entityId: entityId,
                    entityName: entityHabits[0].entityName,
                    habits: transformedHabits,
                },
            ),
        );
    });
}
