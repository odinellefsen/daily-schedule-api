import type { z } from "zod";
import type { recipeSchema } from "../contracts/recipe";
import { FlowcorePathways } from "../utils/flowcore";

export const writeTest = async (data: z.infer<typeof recipeSchema>) => {
  await FlowcorePathways.write("recipe.v0/recipe.created.v0", {
    data,
  });

  console.log("sent an event ✅");
};

writeTest({
  id: "1",
  name: "Test Recipe",
  description: "Test Description",
  ingredients: ["Test Ingredient"],
  instructions: ["Test Instruction"],
});
