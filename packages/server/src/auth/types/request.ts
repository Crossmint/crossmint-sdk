import type { IncomingMessage, ServerResponse } from "http";

export type GenericRequest = IncomingMessage | Request;
export type GenericResponse = ServerResponse | Response;

export function isNodeRequest(request: GenericRequest): request is IncomingMessage {
    return "httpVersion" in request;
}

export function isFetchRequest(request: GenericRequest): request is Request {
    return "headers" in request && typeof request.headers.get === "function";
}

export function isNodeResponse(response: GenericResponse): response is ServerResponse {
    return "setHeader" in response;
}

export function isFetchResponse(response: GenericResponse): response is Response {
    return "headers" in response && typeof response.headers.append === "function";
}
