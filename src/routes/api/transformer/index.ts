import type { FlowcoreLegacyEvent } from "@flowcore/pathways";
import { Hono } from "hono";
import { zodEnv } from "../../../../env";
import { pathwaysRouter } from "../../../utils/flowcore";

export const transformer = new Hono();

transformer.get("/", async (c) => {
  const event = (await c.req.json()) as FlowcoreLegacyEvent;
  const secret = c.req.header("X-Secret");

  if (secret !== zodEnv.FLOWCORE_WEBHOOK_API_KEY) {
    return c.json(
      {
        error: "Unauthorized",
        message: "The secret key is incorrect",
      },
      401,
    );
  }

  pathwaysRouter.processEvent(event, secret);

  return c.json(
    {
      message: "Event processed ✅",
    },
    200,
  );
});

export default transformer;
