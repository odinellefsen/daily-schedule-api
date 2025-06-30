import type { FlowcoreEvent } from "@flowcore/pathways";
import postgres from "postgres";
import type z from "zod";
import { zodEnv } from "../../env";
import type { recipeSchema } from "../contracts/recipe";

const sql = postgres(zodEnv.POSTGRES_CONNECTION_STRING);

export async function handlerRecipeCreated(
  event: Omit<FlowcoreEvent, "payload"> & {
    payload: z.infer<typeof recipeSchema>;
  },
) {
  console.log("received an event ✅", event);

  await sql`
      INSERT INTO recipes (id, name, description, ingredients, instructions)
      VALUES (${event.payload.id}, ${event.payload.name}, ${event.payload.description || null}, ${event.payload.ingredients}, ${event.payload.instructions})
  `;
}
