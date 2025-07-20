# Clerk Authentication Usage Examples

## Frontend Integration

### React with Clerk

```typescript
import { useAuth } from '@clerk/nextjs';

const CreateFoodItem = () => {
  const { getToken, userId } = useAuth();

  const createFoodItem = async (foodItemData: {
    foodItemName: string;
    categoryHierarchy?: string[];
  }) => {
    try {
      // Get JWT token from Clerk
      const token = await getToken();
      
      const response = await fetch('/api/food-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(foodItemData),
      });

      if (!response.ok) {
        throw new Error('Failed to create food item');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating food item:', error);
      throw error;
    }
  };

  return (
    <div>
      <button onClick={() => createFoodItem({
        foodItemName: 'Banana',
        categoryHierarchy: ['fruit', 'tropical']
      })}>
        Create Food Item
      </button>
    </div>
  );
};
```

### Vanilla JavaScript

```javascript
// Assuming you have Clerk loaded in your HTML
const clerk = window.Clerk;

async function callProtectedAPI() {
  try {
    // Get the session token
    const token = await clerk.session?.getToken();
    
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    const response = await fetch('/api/food-item', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log('API Response:', data);
  } catch (error) {
    console.error('API call failed:', error);
  }
}
```

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# Clerk Keys (get from Clerk Dashboard)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Existing environment variables
POSTGRES_CONNECTION_STRING=postgresql://...
FLOWCORE_TENANT=your-tenant
FLOWCORE_DATA_CORE_NAME=daily-schedule
FLOWCORE_WEBHOOK_API_KEY=your-webhook-key
FLOWCORE_WEBHOOK_BASE_URL=https://...
```

## Authentication Flow

1. **User signs in** via Clerk components in your frontend
2. **Frontend requests JWT** using Clerk's `getToken()` method
3. **API receives request** with `Authorization: Bearer <jwt>` header
4. **Middleware verifies JWT** using Clerk's backend SDK
5. **User ID extracted** from verified JWT and attached to context
6. **Route handlers** access authenticated user via `c.userId`

## API Routes Protected

All routes under `/api/food-item/*` are now protected and require:
- Valid Clerk JWT token in Authorization header
- User will be automatically identified from the token

### Available Endpoints

- `POST /api/food-item/` - Create food item
- `PATCH /api/food-item/` - Update food item  
- `DELETE /api/food-item/` - Archive food item

### Example Response

```json
{
  "success": true,
  "message": "Food item created successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "user_2abc123def456",
    "name": "Banana",
    "categoryHierarchy": ["fruit", "tropical"]
  }
}
```

## Error Handling

The API will return appropriate error responses:

```json
// Missing or invalid token
{
  "success": false,
  "message": "Authorization header with Bearer token is required"
}

// Expired token
{
  "success": false,
  "message": "Invalid or expired token"
}
```

## Migration from X-User-Id

**Before (manual user ID):**
```javascript
fetch('/api/food-item', {
  headers: {
    'X-User-Id': 'manually-provided-user-id',
  }
});
```

**After (Clerk JWT):**
```javascript
const token = await getToken();
fetch('/api/food-item', {
  headers: {
    'Authorization': `Bearer ${token}`,
  }
});
```

The user ID is now automatically extracted and verified from the JWT token, providing better security and eliminating the need to manually pass user identifiers. 