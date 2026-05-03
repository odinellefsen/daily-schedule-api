// @ts-nocheck
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import type { ZodSchema } from "zod";
import {
    type FoodItemType,
    foodItemSchema,
} from "../../../contracts/food/food-item";
import { db } from "../../../db";
import { foodItems } from "../../../db/schemas";
import { FlowcorePathways } from "../../../utils/flowcore";
import {
    createSuccessResponseSchema,
    errorResponseSchema,
} from "../_shared/responses";

const foodItemsTag = "Food Items";
const httpPostMethod = "post";
const createFoodItemPath = "/api/food-item";
const jsonContentType = "application/json";
const httpStatusOk = 200;
const httpStatusBadRequest = 400;
const httpStatusUnauthorized = 401;
const httpStatusConflict = 409;
const httpStatusInternalServerError = 500;
const foodItemCreatedSuccessMessage = "Food item created successfully";
const foodItemNameExistsMessage = "Food item with name already exists";
const invalidFoodItemDataMessage = "Invalid food item data";
const failedToCreateFoodItemMessage = "Failed to create food item";
const foodItemCreatedEventType = "food-item.v0/food-item.created.v0";
const conflictResponseDescription =
    "Conflict - Food item with name already exists";
const badRequestResponseDescription = "Bad Request";
const unauthorizedResponseDescription = "Unauthorized";
const internalServerErrorResponseDescription = "Internal Server Error";

// Request schema
const createFoodItemRequestSchema = z.object({
    foodItemName: z
        .string()
        .min(1, "Food item name min length is 1")
        .max(100, "Food item name max length is 100"),
    categoryHierarchy: z.array(z.string()).optional(),
});

// Response schemas
const successResponseSchema = createSuccessResponseSchema(foodItemSchema);

// Route definition
type MediaTypeObject = { schema: ZodSchema };
type OpenApiResponseDef = {
    description: string;
    content: Record<string, MediaTypeObject>;
};

// Force `responses` to have a string index signature so `keyof responses` includes `number`,
// which prevents `@hono/zod-openapi` from collapsing the inferred handler return type to `never`
// in some TypeScript configurations (notably Vercel’s build).
const createFoodItemResponses: Record<string, OpenApiResponseDef> = {
    [httpStatusOk]: {
        description: foodItemCreatedSuccessMessage,
        content: {
            [jsonContentType]: {
                schema: successResponseSchema,
            },
        },
    },
    [httpStatusBadRequest]: {
        description: badRequestResponseDescription,
        content: {
            [jsonContentType]: {
                schema: errorResponseSchema,
            },
        },
    },
    [httpStatusUnauthorized]: {
        description: unauthorizedResponseDescription,
        content: {
            [jsonContentType]: {
                schema: errorResponseSchema,
            },
        },
    },
    [httpStatusConflict]: {
        description: conflictResponseDescription,
        content: {
            [jsonContentType]: {
                schema: errorResponseSchema,
            },
        },
    },
    [httpStatusInternalServerError]: {
        description: internalServerErrorResponseDescription,
        content: {
            [jsonContentType]: {
                schema: errorResponseSchema,
            },
        },
    },
};

const createFoodItemRoute = createRoute({
    method: httpPostMethod,
    path: createFoodItemPath,
    tags: [foodItemsTag],
    security: [{ Bearer: [] }],
    request: {
        body: {
            content: {
                [jsonContentType]: {
                    schema: createFoodItemRequestSchema,
                },
            },
        },
    },
    responses: createFoodItemResponses,
});

export function registerCreateFoodItem(app: OpenAPIHono) {
    app.openapi(createFoodItemRoute, async (c) => {
        const safeUserId = c.userId!;
        const safeCreateFoodItemJsonBody = c.req.valid("json");

        const existingFoodItem = await db
            .select()
            .from(foodItems)
            .where(
                and(
                    eq(foodItems.name, safeCreateFoodItemJsonBody.foodItemName),
                    eq(foodItems.userId, safeUserId),
                ),
            );
        if (existingFoodItem.length > 0) {
            return c.json(
                {
                    success: false as const,
                    message: foodItemNameExistsMessage,
                },
                httpStatusConflict,
            );
        }

        const newFoodItem: FoodItemType = {
            id: crypto.randomUUID(),
            userId: safeUserId,
            name: safeCreateFoodItemJsonBody.foodItemName,
            categoryHierarchy: safeCreateFoodItemJsonBody.categoryHierarchy,
        };

        const createFoodItemEvent = foodItemSchema.safeParse(newFoodItem);
        if (!createFoodItemEvent.success) {
            return c.json(
                {
                    success: false as const,
                    message: invalidFoodItemDataMessage,
                    errors: createFoodItemEvent.error.errors,
                },
                httpStatusBadRequest,
            );
        }
        const safeCreateFoodItemEvent = createFoodItemEvent.data;

        try {
            await FlowcorePathways.write(foodItemCreatedEventType, {
                data: safeCreateFoodItemEvent,
            });
        } catch (error) {
            return c.json(
                {
                    success: false as const,
                    message: failedToCreateFoodItemMessage,
                    errors: error,
                },
                httpStatusInternalServerError,
            );
        }

        return c.json(
            {
                success: true as const,
                message: foodItemCreatedSuccessMessage,
                data: safeCreateFoodItemEvent,
            },
            httpStatusOk,
        );
    });
}
