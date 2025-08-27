/**
 * Timezone utility functions for handling user timezone conversions
 *
 * APPROACH:
 * - Database stores all timestamps in UTC
 * - API endpoints receive user timezone via 'X-Timezone' header
 * - Date range queries (like "today") are calculated in user timezone, then converted to UTC
 * - Time comparisons for urgency/overdue use UTC directly since all times are UTC
 */

/**
 * Get the start and end of a day in a specific timezone, returned as UTC timestamps
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
 * @param date - Optional date to get the day bounds for (defaults to current date)
 * @returns Object with startOfDay and endOfDay as UTC Date objects
 */
export function getDayBoundsInTimezone(timezone: string, date = new Date()) {
    // Create a date representing the start of the day in the user's timezone
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Create start of day in user's timezone
    const startOfDayLocal = new Date(year, month, day, 0, 0, 0, 0);

    // Create end of day in user's timezone
    const endOfDayLocal = new Date(year, month, day, 23, 59, 59, 999);

    // Convert to UTC by using the timezone offset
    const startOfDayUTC = convertLocalTimeToUTC(startOfDayLocal, timezone);
    const endOfDayUTC = convertLocalTimeToUTC(endOfDayLocal, timezone);

    return {
        startOfDay: startOfDayUTC,
        endOfDay: endOfDayUTC,
    };
}

/**
 * Convert a local time to UTC, accounting for the given timezone
 * @param localDate - Date object representing local time
 * @param timezone - IANA timezone identifier
 * @returns UTC Date object
 */
function convertLocalTimeToUTC(localDate: Date, timezone: string): Date {
    // Get what this time would be in the target timezone
    const localString = localDate.toISOString().slice(0, 19); // Remove Z
    const timeInTargetTz = new Date(`${localString} UTC`);

    // Calculate the offset by comparing UTC time with timezone time
    const utcTime = timeInTargetTz.getTime();
    const timezoneTime = new Date(
        timeInTargetTz.toLocaleString("sv-SE", { timeZone: timezone }),
    ).getTime();
    const offset = utcTime - timezoneTime;

    return new Date(localDate.getTime() + offset);
}

/**
 * Get the current date in a specific timezone (without time component)
 * @param timezone - IANA timezone identifier
 * @returns Date string in YYYY-MM-DD format
 */
export function getCurrentDateInTimezone(timezone: string): string {
    const now = new Date();
    return now.toLocaleDateString("en-CA", { timeZone: timezone });
}
