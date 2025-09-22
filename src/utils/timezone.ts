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
    // Validate input date
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid input date provided: ${date}`);
    }

    try {
        // Create a date representing the start of the day in the user's timezone
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        // Create start of day in user's timezone
        const startOfDayLocal = new Date(year, month, day, 0, 0, 0, 0);

        // Create end of day in user's timezone
        const endOfDayLocal = new Date(year, month, day, 23, 59, 59, 999);

        // Validate local dates
        if (
            Number.isNaN(startOfDayLocal.getTime()) ||
            Number.isNaN(endOfDayLocal.getTime())
        ) {
            throw new Error(
                `Invalid local dates created from year=${year}, month=${month}, day=${day}`,
            );
        }

        // Convert to UTC by using the timezone offset
        const startOfDayUTC = convertLocalTimeToUTC(startOfDayLocal, timezone);
        const endOfDayUTC = convertLocalTimeToUTC(endOfDayLocal, timezone);

        return {
            startOfDay: startOfDayUTC,
            endOfDay: endOfDayUTC,
        };
    } catch (error) {
        console.error(`Error in getDayBoundsInTimezone: ${error}`);
        console.error(`Input: timezone=${timezone}, date=${date}`);
        throw error;
    }
}

/**
 * Convert a local time to UTC, accounting for the given timezone
 * @param localDate - Date object representing local time
 * @param timezone - IANA timezone identifier
 * @returns UTC Date object
 */
function convertLocalTimeToUTC(localDate: Date, timezone: string): Date {
    // Validate input date
    if (Number.isNaN(localDate.getTime())) {
        throw new Error(`Invalid localDate provided: ${localDate}`);
    }

    try {
        // Get what this time would be in the target timezone
        const localString = localDate.toISOString().slice(0, 19); // Remove Z
        const timeInTargetTz = new Date(`${localString}Z`); // Proper UTC format

        // Validate intermediate date
        if (Number.isNaN(timeInTargetTz.getTime())) {
            throw new Error(
                `Invalid intermediate date created: ${localString}Z`,
            );
        }

        // Calculate the offset by comparing UTC time with timezone time
        const utcTime = timeInTargetTz.getTime();
        const timezoneString = timeInTargetTz.toLocaleString("sv-SE", {
            timeZone: timezone,
        });
        const timezoneTime = new Date(timezoneString).getTime();

        // Validate timezone conversion
        if (Number.isNaN(timezoneTime)) {
            throw new Error(
                `Invalid timezone conversion: ${timezoneString} for timezone ${timezone}`,
            );
        }

        const offset = utcTime - timezoneTime;
        const result = new Date(localDate.getTime() + offset);

        // Validate result
        if (Number.isNaN(result.getTime())) {
            throw new Error(
                `Invalid result date calculated with offset ${offset}`,
            );
        }

        return result;
    } catch (error) {
        console.error(`Error in convertLocalTimeToUTC: ${error}`);
        console.error(`Input: localDate=${localDate}, timezone=${timezone}`);
        throw error;
    }
}

/**
 * Get the current date in a specific timezone (without time component)
 * @param timezone - IANA timezone identifier
 * @returns Date string in YYYY-MM-DD format
 */
export function getCurrentDateInTimezone(timezone: string): string {
    const now = new Date();

    // Validate current date
    if (Number.isNaN(now.getTime())) {
        throw new Error(`Invalid current date: ${now}`);
    }

    try {
        const dateString = now.toLocaleDateString("en-CA", {
            timeZone: timezone,
        });

        // Validate the resulting date string format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            throw new Error(
                `Invalid date format returned: ${dateString}. Expected YYYY-MM-DD`,
            );
        }

        return dateString;
    } catch (error) {
        console.error(`Error in getCurrentDateInTimezone: ${error}`);
        console.error(`Input: timezone=${timezone}`);
        throw error;
    }
}
