import type { FlowcoreEvent } from "@flowcore/pathways";
import { Hono } from "hono";
import { zodEnv } from "../../../../env";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { getPathwaysRouter } from "../../../utils/flowcore";

export const transformer = new Hono();

transformer.post("/", async (c) => {
    try {
        const event = (await c.req.json()) as FlowcoreEvent;
        const secret = c.req.header("X-Secret");

        console.log("Received event", {
            flowType: event.flowType,
            eventType: event.eventType,
            eventId: event.eventId,
            payload: event.payload,
        });

        if (secret !== zodEnv.FLOWCORE_WEBHOOK_API_KEY) {
            return c.json(
                ApiResponse.error("Secret key is incorrect or missing"),
                StatusCodes.UNAUTHORIZED,
            );
        }

        await getPathwaysRouter().processEvent(event, secret);

        return c.json(
            {
                message: "Event processed ✅",
            },
            200,
        );
    } catch (error) {
        console.error("Error processing event", { error });
        return c.json(
            {
                error: "Failed to process event",
                message: (error as Error).message,
            },
            500,
        );
    }
});

export default transformer;
