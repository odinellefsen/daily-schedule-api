/**
 * Base interface for domain-specific title resolvers
 * Each domain (meal, gym, school, etc.) implements this to provide
 * titles for habits and their sub-entities
 */
export interface DomainTitleResolver {
	/**
	 * Get the title for the main event (e.g., "Eat: Chicken Parmesan")
	 * @param entityId - The main entity ID (e.g., mealId)
	 */
	getMainEventTitle(entityId: string): Promise<string>;

	/**
	 * Get the title for a sub-entity (e.g., "Marinate chicken with herbs")
	 * @param subEntityId - The sub-entity ID (e.g., recipe instruction ID)
	 */
	getSubEntityTitle(subEntityId: string): Promise<string>;
}

