// Base domain adapter interface for habit system
export interface DomainAdapter<T = unknown> {
    domain: string;

    /**
     * Get the latest version number for an entity
     */
    getLatestVersion(entityId: string): Promise<number>;

    /**
     * Create a snapshot of the entity at a specific version
     * This captures the state for replay safety
     */
    snapshot(entityId: string, version: number): Promise<T>;

    /**
     * Resolve a step plan from habit payload into concrete instruction steps
     * Returns array of steps with instruction keys and offset days
     */
    resolvePlan(
        payload: unknown,
        entityId: string,
        entityVersion: number,
    ): Promise<
        Array<{
            instructionKey: {
                recipeId: string;
                recipeVersion: number;
                instructionId: string;
            };
            offsetDays: number;
            titleOverride?: string;
        }>
    >;
}

/**
 * Registry for domain adapters
 */
class DomainAdapterRegistry {
    private adapters = new Map<string, DomainAdapter>();

    register<T>(adapter: DomainAdapter<T>) {
        this.adapters.set(adapter.domain, adapter);
    }

    get(domain: string): DomainAdapter {
        const adapter = this.adapters.get(domain);
        if (!adapter) {
            throw new Error(`No adapter registered for domain: ${domain}`);
        }
        return adapter;
    }

    has(domain: string): boolean {
        return this.adapters.has(domain);
    }
}

export const domainAdapters = new DomainAdapterRegistry();
