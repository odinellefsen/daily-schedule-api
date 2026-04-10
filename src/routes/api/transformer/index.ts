import type { FlowcoreEvent } from "@flowcore/pathways";
import { Hono } from "hono";
import { zodEnv } from "../../../../env";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { getPathwaysRouter } from "../../../utils/flowcore";

export const transformer = new Hono();
const eventProcessedMessage = "Event processed ✅";

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

        if (secret !== zodEnv.TRANSFORMER_SECRET) {
            return c.json(
                ApiResponse.error("Secret key is incorrect or missing"),
                StatusCodes.UNAUTHORIZED,
            );
        }

        const router = await getPathwaysRouter();
        await router.processEvent(event, secret);

        return c.json(
            {
                message: eventProcessedMessage,
            },
            StatusCodes.OK,
        );
    } catch (error) {
        console.error("Error processing event", { error });
        return c.json(
            {
                error: "Failed to process event",
                message: (error as Error).message,
            },
            StatusCodes.SERVER_ERROR,
        );
    }
});

export default transformer;
