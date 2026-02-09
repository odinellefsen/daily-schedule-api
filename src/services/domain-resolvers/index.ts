import type { DomainTitleResolver } from "./base";
import { MealTitleResolver } from "./meal-resolver";
import { SimpleTitleResolver } from "./simple-resolver";

/**
 * Registry of all domain title resolvers
 * Add new domains here as they are implemented
 */
const RESOLVERS: Record<string, DomainTitleResolver> = {
    meal: new MealTitleResolver(),
    simple: new SimpleTitleResolver(),
    // Future domains:
    // gym: new GymTitleResolver(),
    // school: new SchoolTitleResolver(),
};

/**
 * Get the title resolver for a specific domain
 * @param domain - The domain name (e.g., "meal", "gym", "school")
 * @throws Error if no resolver exists for the domain
 */
export function getTitleResolver(domain: string): DomainTitleResolver {
    const resolver = RESOLVERS[domain];
    if (!resolver) {
        throw new Error(
            `No title resolver found for domain: ${domain}. Available domains: ${Object.keys(RESOLVERS).join(", ")}`,
        );
    }
    return resolver;
}

export type { DomainTitleResolver } from "./base";
