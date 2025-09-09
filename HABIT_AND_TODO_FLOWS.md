# Complete Habit Creation and Todo Generation Flows

## Flow 1: Habit Creation (Initial Setup)

### 1. **API Request**

```
POST /api/habit
Authorization: Bearer <JWT_TOKEN>
{
  "name": "Take vitamins",
  "recurrenceType": "daily",
  "startDate": "2024-01-15",
  "preferredTime": "08:00",
  "timezone": "America/New_York"
}
```

### 2. **Authentication** (`src/middleware/auth.ts`)

```typescript
// Extract and verify JWT token
const token = authHeader.substring(7);
const payload = await verifyToken(token, {
    secretKey: zodEnv.CLERK_SECRET_KEY,
});
c.userId = payload.sub; // Attach userId to context
```

### 3. **Route Handler** (`src/routes/api/habit/habit.create.ts`)

```typescript
app.post("/", async (c) => {
    const safeUserId = c.userId!;
    
    // Add userId to request data
    const parsedJsonBody = createHabitSchema.safeParse({
        ...rawJsonBody,
        userId: safeUserId,
    });
```

### 4. **Schema Validation** (`src/contracts/habit/habit.contract.ts`)

```typescript
export const createHabitSchema = baseHabitSchema
    .omit({ id: true })
    .superRefine((val, ctx) => {
        if (val.recurrenceType === "weekly") {
            if (!val.weekDays?.length) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["weekDays"],
                    message:
                        "weekDays is required and must be non-empty for weekly habits",
                });
            }
        }
        // Domain validation...
    });
```

### 5. **Event Publishing** (`src/utils/flowcore.ts`)

```typescript
await FlowcorePathways.write("habit.v0/habit.created.v0", {
    data: safeHabitData,
});
```

### 6. **Event Processing** (`src/handlers/habit/habit.handler.ts`)

```typescript
export async function handleHabitCreated(event) {
    const { payload } = event;

    await db.insert(habits).values({
        id: payload.id || crypto.randomUUID(),
        userId: payload.userId,
        name: payload.name,
        recurrenceType: payload.recurrenceType,
        startDate: payload.startDate,
        timezone: payload.timezone,
        preferredTime: payload.preferredTime,
        // ... other fields
    });
}
```

### 7. **Database Storage**

```sql
INSERT INTO habits (
    id, userId, name, recurrenceType, 
    startDate, timezone, preferredTime, ...
) VALUES (...)
```

---

## Flow 2: Lazy Todo Generation (When User Requests Today's Todos)

### 1. **API Request**

```
GET /api/todo/today
Authorization: Bearer <JWT_TOKEN>
X-Timezone: America/New_York
```

### 2. **Authentication** (Same as above)

- JWT verification
- userId extraction

### 3. **Route Handler** (`src/routes/api/todo/todo.list.ts`)

```typescript
app.get("/today", async (c) => {
    const safeUserId = c.userId!;
    
    // Get user's timezone from header
    const userTimezone = c.req.header("X-Timezone") || "UTC";
    
    // Get today's date in user's timezone (YYYY-MM-DD)
    const todayDate = getCurrentDateInTimezone(userTimezone);
    
    // LAZY GENERATION: Generate missing habit todos
    try {
        await generateMissingHabitTodos(safeUserId, todayDate);
    } catch (error) {
        console.error("Failed to generate habit todos:", error);
        // Continue even if habit generation fails
    }
```

### 4. **Date Calculation** (`src/utils/timezone.ts`)

```typescript
export function getCurrentDateInTimezone(timezone: string): string {
    const now = new Date();
    // Returns "2024-01-15" format in user's timezone
    return now.toLocaleDateString("en-CA", { timeZone: timezone });
}
```

### 5. **Habit Todo Generation** (`src/services/habit-generation.ts`)

#### 5.1 **Select Due Habits**

```typescript
async function selectDueHabits(userId: string, targetDate: string) {
    // Get all active habits for user
    const allActiveHabits = await db.query.habits.findMany({
        where: and(
            eq(habits.userId, userId),
            eq(habits.isActive, true),
        ),
    });

    // Filter habits that should generate todos for targetDate
    return allActiveHabits.filter((habit) =>
        shouldGenerateForDate(habit, targetDate)
    );
}
```

#### 5.2 **Check Recurrence Rules**

```typescript
function shouldGenerateForDate(habit: Habit, targetDate: string): boolean {
    const timezone = habit.timezone || "UTC";

    // Parse dates in user's timezone
    const targetDateInTz = zonedTimeToUtc(`${targetDate} 12:00`, timezone);
    const startDateInTz = zonedTimeToUtc(`${habit.startDate} 12:00`, timezone);

    // Don't generate before start date
    if (targetDateInTz < startDateInTz) return false;

    switch (habit.recurrenceType) {
        case "daily": {
            const daysDiff = differenceInCalendarDays(
                targetDateInTz,
                startDateInTz,
            );
            return daysDiff >= 0 && daysDiff % habit.recurrenceInterval === 0;
        }

        case "weekly": {
            // Check if today is one of the selected weekdays
            const weekday = getWeekdayFromDate(targetDate, timezone);
            if (!habit.weekDays?.includes(weekday)) return false;

            // Check if it's the right week interval
            const weeksDiff = differenceInCalendarWeeks(
                targetDateInTz,
                startDateInTz,
            );
            return weeksDiff >= 0 && weeksDiff % habit.recurrenceInterval === 0;
        }
    }
}
```

#### 5.3 **Create/Get Occurrence**

```typescript
async function generateTodoForHabit(habit: Habit, targetDate: string) {
    // Create or get occurrence for this habit instance
    const occurrence = await upsertOccurrence({
        userId: habit.userId,
        habitId: habit.id,
        targetDate,
        domain: habit.domain,
        entityId: habit.entityId,
        status: "planned"
    });
```

#### 5.4 **Check for Existing Occurrence**

```typescript
async function upsertOccurrence(data) {
    // Try to find existing occurrence
    const existing = await db.query.occurrences.findFirst({
        where: and(
            eq(occurrences.userId, data.userId),
            eq(occurrences.habitId, data.habitId),
            eq(occurrences.targetDate, data.targetDate),
        ),
    });

    if (existing) return existing;

    // Create new occurrence
    const newOccurrence = {
        id: crypto.randomUUID(),
        ...data,
        status: "planned",
    };

    await db.insert(occurrences).values(newOccurrence);
    return newOccurrence;
}
```

#### 5.5 **Calculate Scheduled Time**

```typescript
// Calculate precise scheduling timestamp
const scheduledFor = calculateScheduledFor(
    targetDate, // "2024-01-15"
    habit.preferredTime, // "08:00"
    habit.timezone, // "America/New_York"
);

function calculateScheduledFor(dueDate, preferredTime, timezone) {
    const timeToUse = preferredTime || "09:00";
    const timezoneToUse = timezone || "UTC";

    // Combine date and time in user's timezone
    const dateTimeString = `${dueDate} ${timeToUse}`;

    // Convert to UTC using proper timezone handling
    return zonedTimeToUtc(dateTimeString, timezoneToUse);
}
```

#### 5.6 **Publish Todo Event**

```typescript
const todoEvent: TodoGeneratedType = {
    userId: habit.userId,
    habitId: habit.id,
    occurrenceId: occurrence.id,
    title: habit.name,
    dueDate: targetDate,
    preferredTime: habit.preferredTime,
    scheduledFor: scheduledFor.toISOString(),
    timezone: habit.timezone,
    domain: habit.domain,
    entityId: habit.entityId,
    subEntityId: habit.subEntityId,
};

await FlowcorePathways.write("todo.v0/todo.generated.v0", {
    data: todoEvent,
});
```

### 6. **Todo Creation** (`src/handlers/todo/todo.handler.ts`)

```typescript
export async function handleTodoGenerated(event) {
    const { payload } = event;
    const todoId = crypto.randomUUID();

    await db.insert(todos).values({
        id: todoId,
        userId: payload.userId,
        title: payload.title,
        description: payload.title,
        dueDate: payload.dueDate,
        preferredTime: payload.preferredTime,
        completed: false,
        scheduledFor: new Date(payload.scheduledFor),

        // Link to habit and occurrence
        habitId: payload.habitId,
        occurrenceId: payload.occurrenceId,

        // Domain context if applicable
        domain: payload.domain,
        entityId: payload.entityId,
        subEntityId: payload.subEntityId,
    })
        .onConflictDoNothing({
            // Prevent duplicate todos for same habit/date
            target: [todos.userId, todos.habitId, todos.dueDate],
        });
}
```

### 7. **Query Today's Todos** (Back in `todo.list.ts`)

```typescript
// Get today's date bounds in UTC
const { startOfDay: startOfDayUTC, endOfDay: endOfDayUTC } =
    getDayBoundsInTimezone(userTimezone);

// Query todos scheduled for today
const todaysTodos = await db
    .select()
    .from(todos)
    .where(
        and(
            eq(todos.userId, safeUserId),
            gte(todos.scheduledFor, startOfDayUTC),
            lte(todos.scheduledFor, endOfDayUTC),
        ),
    )
    .orderBy(todos.scheduledFor);
```

### 8. **Transform and Return Results**

```typescript
const transformedTodos = todaysTodos.map((todo) => {
    const scheduledTime = todo.scheduledFor
        ? new Date(todo.scheduledFor)
        : null;
    const isOverdue = scheduledTime && scheduledTime < now;

    return {
        id: todo.id,
        description: todo.description,
        scheduledFor: todo.scheduledFor?.toISOString(),
        completed: todo.completed,
        canStartNow: !scheduledTime || scheduledTime <= now,
        isOverdue,
        urgency: calculateUrgency(scheduledTime, now),
    };
});

return c.json(
    ApiResponse.success("Today's todos retrieved successfully", {
        todos: transformedTodos,
        counts: {
            total: transformedTodos.length,
            completed: transformedTodos.filter((t) => t.completed).length,
            remaining: transformedTodos.filter((t) => !t.completed).length,
            overdue: transformedTodos.filter((t) =>
                t.urgency === "overdue"
            ).length,
        },
    }),
);
```

---

## Key Points About Lazy Generation

### 🔄 **When It Happens**

- Only when user requests `/api/todo/today`
- Not on a schedule or cron job
- Ensures todos are always up-to-date when viewed

### 🛡️ **Deduplication**

1. **Occurrence Level**: `upsertOccurrence` checks for existing occurrence
2. **Todo Level**: `.onConflictDoNothing` prevents duplicate todos

### 🌍 **Timezone Handling**

1. User sends timezone in `X-Timezone` header
2. "Today" is calculated in user's timezone
3. Habit scheduling respects habit's stored timezone
4. All database timestamps are in UTC

### ⚡ **Performance**

- Only generates todos for active habits
- Only for the requested date
- Fails gracefully if generation errors occur

### 📊 **Data Flow**

```
User Request → Get Today's Date → Find Due Habits → Create Occurrences 
    → Generate Todos → Query Todos → Transform → Return Response
```

This lazy generation approach ensures:

- No unnecessary todo creation
- Always current based on habit rules
- Timezone-aware scheduling
- Efficient resource usage
