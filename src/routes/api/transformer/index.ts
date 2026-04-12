import type { FlowcoreEvent } from "@flowcore/pathways";
import { Hono } from "hono";
import { zodEnv } from "../../../../env";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { getPathwaysRouter } from "../../../utils/flowcore";

export const transformer = new Hono();
const eventProcessedMessage = "Event processed ✅";
const transformerPostRoutePath = "/";
const transformerSecretHeaderName = "X-Secret";
const invalidSecretMessage = "Secret key is incorrect or missing";
const eventProcessingFailedMessage = "Failed to process event";
const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

transformer.post(transformerPostRoutePath, async (c) => {
    try {
        const event = (await c.req.json()) as FlowcoreEvent;
        const secret = c.req.header(transformerSecretHeaderName);

        console.log("Received event", {
            flowType: event.flowType,
            eventType: event.eventType,
            eventId: event.eventId,
            payload: event.payload,
        });

        if (secret !== zodEnv.TRANSFORMER_SECRET) {
            return c.json(
                ApiResponse.error(invalidSecretMessage),
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
                error: eventProcessingFailedMessage,
                message: getErrorMessage(error),
            },
            StatusCodes.SERVER_ERROR,
        );
    }
});

export default transformer;
