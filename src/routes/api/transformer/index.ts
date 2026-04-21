import type { FlowcoreEvent } from "@flowcore/pathways";
import { Hono } from "hono";
import { zodEnv } from "../../../../env";
import { ApiResponse, StatusCodes } from "../../../utils/api-responses";
import { getPathwaysRouter } from "../../../utils/flowcore";

export const transformer = new Hono();
const eventProcessedMessage = "Event processed ✅";
const transformerPostRoutePath = "/";
const receivedEventLogMessage = "Received event";
const transformerSecretHeaderName = "X-Secret";
const invalidSecretMessage = "Secret key is incorrect or missing";
const eventProcessingFailedMessage = "Failed to process event";
const processingEventErrorLogMessage = "Error processing event";
const eventProcessedResponse = { message: eventProcessedMessage };
const errorResponseErrorKey = "error";
const errorResponseMessageKey = "message";
const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

transformer.post(transformerPostRoutePath, async (c) => {
    try {
        const event = (await c.req.json()) as FlowcoreEvent;
        const secret = c.req.header(transformerSecretHeaderName);

        console.log(receivedEventLogMessage, {
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

        return c.json(eventProcessedResponse, StatusCodes.OK);
    } catch (error) {
        console.error(processingEventErrorLogMessage, { error });
        return c.json(
            {
                [errorResponseErrorKey]: eventProcessingFailedMessage,
                [errorResponseMessageKey]: getErrorMessage(error),
            },
            StatusCodes.SERVER_ERROR,
        );
    }
});

export default transformer;
