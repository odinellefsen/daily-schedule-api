import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "../../../db";
import { foodItems, foodItemUnits } from "../../../db/schemas";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";

export function registerListFoodItems(app: Hono) {
    app.get("/", async (c) => {
        const safeUserId = c.userId!;

        const userFoodItems = await db
            .select()
            .from(foodItems)
            .where(eq(foodItems.userId, safeUserId))
            .orderBy(foodItems.name);

        // Get unit counts for each food item
        const foodItemsWithUnitCounts = await Promise.all(
            userFoodItems.map(async (item) => {
                const units = await db
                    .select()
                    .from(foodItemUnits)
                    .where(eq(foodItemUnits.foodItemId, item.id));

                return {
                    id: item.id,
                    name: item.name,
                    categoryHierarchy: item.categoryHierarchy,
                    unitCount: units.length,
                    hasUnits: units.length > 0,
                };
            })
        );

        return c.json(
            ApiResponse.success(
                "Food items retrieved successfully",
                foodItemsWithUnitCounts
            )
        );
    });

    app.get("/search", async (c) => {
        const safeUserId = c.userId!;
        const query = c.req.query("q") || "";
        const category = c.req.query("category");

        const dbQuery = db
            .select()
            .from(foodItems)
            .where(eq(foodItems.userId, safeUserId));

        // Simple search by name (in a real app, you'd want full-text search)
        if (query) {
            // Note: This is a simplified search - in production you'd want proper full-text search
            const searchResults = await dbQuery;
            const filtered = searchResults.filter((item) =>
                item.name.toLowerCase().includes(query.toLowerCase())
            );

            return c.json(
                ApiResponse.success("Food items search results", filtered)
            );
        }

        const results = await dbQuery.orderBy(foodItems.name);

        return c.json(
            ApiResponse.success("Food items retrieved successfully", results)
        );
    });
}
