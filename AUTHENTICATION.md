# Authentication Guide

This API uses [Clerk](https://clerk.com/) for authentication with JWT tokens.
All protected endpoints require a valid JWT token in the Authorization header.

## Overview

The Daily Scheduler API implements JWT-based authentication using Clerk's
backend SDK. User data is completely isolated - each authenticated user only has
access to their own data (meals, recipes, todos, habits, and food items).

## Getting Started

### 1. Environment Setup

Ensure you have the following environment variable configured:

```bash
CLERK_SECRET_KEY=your_clerk_secret_key_here
```

### 2. Authentication Flow

1. **Client Authentication**: Users authenticate through your frontend
   application using Clerk's client-side SDK
2. **JWT Token**: Upon successful authentication, Clerk provides a JWT token
3. **API Requests**: Include this JWT token in the Authorization header for all
   API requests
4. **Token Verification**: The server verifies the token using Clerk's backend
   SDK

## Making Authenticated Requests

### Required Headers

All protected API endpoints require the following headers:

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Example Request

```bash
curl -X GET "https://your-api-domain.com/api/todo/today" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### JavaScript/TypeScript Example

```typescript
const token = "your_jwt_token_here";

const response = await fetch("/api/todo/today", {
    method: "GET",
    headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    },
});

const data = await response.json();
```

## Protected Endpoints

All API endpoints under the following routes require authentication:

- `/api/habit/*` - Habit management
- `/api/meal/*` - Meal planning and management
- `/api/recipe/*` - Recipe management
- `/api/todo/*` - Todo management
- `/api/food-item/*` - Food item management

## Authentication Middleware

The API uses two types of authentication middleware:

### 1. Required Authentication (`requireAuth`)

Used on all protected routes. Requests without valid tokens will receive a
`401 Unauthorized` response.

```typescript
// Applied to route groups
habit.use("/*", requireAuth());
meal.use("/*", requireAuth());
todo.use("/*", requireAuth());
recipe.use("/*", requireAuth());
foodItem.use("/*", requireAuth());
```

### 2. Optional Authentication (`optionalAuth`)

For routes where authentication is optional. If a valid token is provided, user
context is attached; otherwise, the request continues without user context.

## Error Responses

### Missing Authorization Header

```json
{
    "success": false,
    "message": "Authorization header with Bearer token is required",
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Code**: `401 Unauthorized`

### Invalid or Expired Token

```json
{
    "success": false,
    "message": "Invalid or expired token",
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Code**: `401 Unauthorized`

### Authentication Failed

```json
{
    "success": false,
    "message": "Authentication failed",
    "error": "Token verification error details",
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Status Code**: `401 Unauthorized`

## User Context

Once authenticated, the user's ID is available in the request context as
`c.userId`. This is used to:

- Filter data to only show the authenticated user's records
- Associate new records with the authenticated user
- Ensure data isolation between users

## Security Features

- **JWT Verification**: All tokens are verified using Clerk's backend SDK
- **Data Isolation**: Users can only access their own data
- **Secure Headers**: CORS is configured to allow Authorization headers
- **Error Handling**: Authentication errors are logged and return appropriate
  error responses

## Integration with Frontend

### Clerk React Example

```typescript
import { useAuth } from "@clerk/nextjs";

function ApiClient() {
    const { getToken } = useAuth();

    const makeAuthenticatedRequest = async (
        endpoint: string,
        options: RequestInit = {},
    ) => {
        const token = await getToken();

        return fetch(endpoint, {
            ...options,
            headers: {
                ...options.headers,
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
    };

    // Usage
    const todos = await makeAuthenticatedRequest("/api/todo/today");
}
```

### Clerk JavaScript Example

```javascript
import Clerk from "@clerk/clerk-js";

const clerk = new Clerk("your_publishable_key");
await clerk.load();

if (clerk.user) {
    const token = await clerk.session.getToken();

    const response = await fetch("/api/todo/today", {
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
}
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**:
   - Check that the Authorization header is properly formatted
   - Ensure the token is not expired
   - Verify the CLERK_SECRET_KEY environment variable is set correctly

2. **CORS Issues**:
   - The API is configured to accept Authorization headers
   - Ensure your frontend domain is properly configured in CORS settings

3. **Token Format**:
   - Token must be prefixed with "Bearer "
   - Example: `Authorization: Bearer eyJhbGciOiJSUzI1NiIs...`

### Testing Authentication

You can test authentication using curl:

```bash
# This should return 401 Unauthorized
curl -X GET "http://localhost:3000/api/todo/today"

# This should work with a valid token
curl -X GET "http://localhost:3000/api/todo/today" \
  -H "Authorization: Bearer YOUR_VALID_JWT_TOKEN"
```

## Development Setup

1. Sign up for a [Clerk account](https://clerk.com/)
2. Create a new application in your Clerk dashboard
3. Get your secret key from the API Keys section
4. Set the `CLERK_SECRET_KEY` environment variable
5. Configure your frontend application with Clerk's client SDK
6. Use the JWT tokens provided by Clerk for API requests

For more information about Clerk integration, visit the
[Clerk documentation](https://clerk.com/docs).
