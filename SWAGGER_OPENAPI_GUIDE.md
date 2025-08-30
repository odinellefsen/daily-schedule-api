# OpenAPI/Swagger Documentation Guide

This document explains how OpenAPI/Swagger documentation has been integrated
into the Daily Scheduler API and how to use it.

## Overview

The API now includes comprehensive OpenAPI 3.0 documentation with an interactive
Swagger UI interface. This provides:

- **Interactive API exploration** via Swagger UI
- **Type-safe request/response validation** using Zod schemas
- **Comprehensive API documentation** with examples and descriptions
- **Automatic schema generation** from TypeScript types

## Access Points

### Swagger UI (Interactive Documentation)

```
http://localhost:3005/docs
```

- Interactive interface to explore and test API endpoints
- Try out requests directly from the browser
- View request/response schemas and examples

### OpenAPI Specification (JSON)

```
http://localhost:3005/openapi.json
```

- Raw OpenAPI 3.0 specification in JSON format
- Can be imported into other tools (Postman, Insomnia, etc.)
- Used for code generation and validation

## What's Been Implemented

### 1. Core Setup

- **@hono/zod-openapi**: Integrated OpenAPI support with Hono framework
- **@hono/swagger-ui**: Added Swagger UI for interactive documentation
- **OpenAPI Configuration**: Centralized configuration in
  `src/config/openapi.ts`

### 2. Schema Definitions

- **Zod to OpenAPI conversion**: All Zod schemas now include OpenAPI metadata
- **Type-safe validation**: Request/response validation with proper error
  handling
- **Reusable schemas**: Common patterns for success/error responses

### 3. Documented Endpoints

#### Currently Documented:

- **Habit Creation**: `POST /api/habit/text` and `POST /api/habit/meal`
- **API Health**: `GET /api/`

#### Schema Examples:

- **Request Bodies**: Properly typed with validation and examples
- **Response Types**: Success and error responses with proper status codes
- **Authentication**: Bearer token authentication documented

### 4. Authentication

- **Security Scheme**: Bearer JWT authentication
- **Protected Endpoints**: All habit routes require authentication
- **Error Responses**: Proper 401/403 responses for auth failures

## Usage Examples

### Creating a Text Habit

```bash
curl -X POST http://localhost:3005/api/habit/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Morning meditation",
    "description": "10 minutes of mindfulness meditation every morning",
    "recurrenceType": "daily",
    "recurrenceInterval": 1,
    "startDate": "2024-01-15",
    "timezone": "America/New_York",
    "preferredTime": "08:00"
  }'
```

### Expected Response

```json
{
    "ok": true,
    "message": "Text habit created successfully",
    "data": {
        "name": "Morning meditation",
        "recurrenceType": "daily"
    }
}
```

## File Structure

### Configuration Files

- `src/config/openapi.ts` - Main OpenAPI configuration
- `src/utils/openapi-schemas.ts` - Reusable schema definitions

### Contract Updates

- `src/contracts/habit/habit.contract.ts` - Enhanced with OpenAPI metadata

### Route Updates

- `src/routes/api/index.ts` - Root API routes with OpenAPI
- `src/routes/api/habit/` - Habit routes with full documentation

## Development Guidelines

### Adding New Endpoints

1. **Use createRoute()** for defining OpenAPI routes:

```typescript
const createItemRoute = createRoute({
    method: "post",
    path: "/items",
    tags: ["Items"],
    summary: "Create a new item",
    description: "Creates a new item with the provided data",
    security: [{ BearerAuth: [] }],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createItemSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: "Item created successfully",
            content: {
                "application/json": {
                    schema: itemSuccessResponseSchema,
                },
            },
        },
        400: {
            description: "Invalid request data",
            content: {
                "application/json": {
                    schema: ErrorResponseSchema,
                },
            },
        },
    },
});
```

2. **Update Zod schemas** with OpenAPI metadata:

```typescript
const itemSchema = z.object({
    name: z.string().min(1).max(100).openapi({
        description: "Name of the item",
        example: "My awesome item",
    }),
    description: z.string().optional().openapi({
        description: "Optional description",
        example: "This is a great item for daily use",
    }),
}).openapi({
    title: "Item",
    description: "A user item",
});
```

3. **Implement the handler** with proper response types:

```typescript
app.openapi(createItemRoute, async (c) => {
    const requestData = c.req.valid("json");

    try {
        // Your business logic here
        return c.json({
            ok: true as const,
            message: "Item created successfully",
            data: {/* your response data */},
        }, 201);
    } catch (error) {
        return c.json({
            ok: false as const,
            message: "Failed to create item",
            errors: [{
                path: "",
                message: String(error),
                code: "server_error",
            }],
        }, 500);
    }
});
```

### Response Format Standards

All API responses follow this format:

**Success Response:**

```typescript
{
  ok: true,
  message: string,
  data?: any,
  pagination?: PaginationInfo
}
```

**Error Response:**

```typescript
{
  ok: false,
  message: string,
  errors?: Array<{
    path: string,
    message: string,
    code: string
  }>
}
```

## Next Steps

### Immediate Tasks

1. **Document remaining endpoints**: Meals, Recipes, Food Items, Todos
2. **Add more schema examples**: Comprehensive examples for all request/response
   types
3. **Enhance error handling**: More specific error codes and messages

### Future Enhancements

1. **API Versioning**: Support for multiple API versions
2. **Response Caching**: Cache OpenAPI spec for better performance
3. **Custom Themes**: Branded Swagger UI theme
4. **Code Generation**: Auto-generate client SDKs from OpenAPI spec

## Troubleshooting

### Common Issues

1. **Server not starting**: Check for TypeScript compilation errors
2. **Swagger UI not loading**: Verify the server is running on port 3005
3. **Authentication errors**: Ensure Bearer tokens are properly formatted

### Development Tips

- **Use Swagger UI** to test endpoints during development
- **Validate schemas** before deploying to catch validation errors early
- **Keep documentation up-to-date** when modifying API endpoints
- **Test with real data** to ensure examples in documentation work correctly

## Conclusion

The OpenAPI/Swagger integration provides a robust foundation for API
documentation and testing. It ensures type safety, improves developer
experience, and makes the API more accessible to consumers.

For questions or issues, refer to the Hono OpenAPI documentation:
https://hono.dev/snippets/openapi
