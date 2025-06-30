import postgres = require("postgres");

import { zodEnv } from "../../env";
import { FlowcorePathways } from "../utils/flowcore";

const sql = postgres(zodEnv.POSTGRES_CONNECTION_STRING);

FlowcorePathways.handle("recipe.v0/recipe.created.v0", async (event) => {
  console.log("received an event ✅", event);

  await sql`
      INSERT INTO recipes (id, name, description, ingredients, instructions)
      VALUES (${event.payload.id}, ${event.payload.name}, ${event.payload.description || null}, ${event.payload.ingredients}, ${event.payload.instructions})
    `;
});
