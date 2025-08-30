import { domainAdapters } from "./base";
import { MealAdapter } from "./meal";

// Register domain adapters
domainAdapters.register(new MealAdapter());

export { domainAdapters };
export type { DomainAdapter } from "./base";
export type { MealSnapshot, MealStepPlan } from "./meal";
