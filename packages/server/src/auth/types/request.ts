import type { IncomingMessage } from "http";

export type GenericRequest = IncomingMessage | Request;

export function isNodeRequest(request: GenericRequest): request is IncomingMessage {
    return "httpVersion" in request;
}

export function isFetchRequest(request: GenericRequest): request is Request {
    return "headers" in request && typeof request.headers.get === "function";
}
