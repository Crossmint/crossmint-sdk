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

export function getNodeRequestBody(req: IncomingMessage) {
    // For express.js
    if ("body" in req) {
        return Promise.resolve(req.body);
    }

    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", (chunk) => {
            body += chunk.toString();
        });

        req.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch (_) {
                // If it fails to parse the body as JSON, just return the body as a string
                resolve(body);
            }
        });

        req.on("error", (error) => {
            reject(error);
        });
    });
}

export function setNodeResponseError(response: ServerResponse, statusCode: number, errorResponseBody: ErrorBody) {
    response.statusCode = statusCode;
    response.statusMessage = errorResponseBody.error;
    response.setHeader("Content-Type", "application/json");
    response.write(JSON.stringify(errorResponseBody));
    return response;
}

export function setFetchResponseError(statusCode: number, errorResponseBody: ErrorBody) {
    return new Response(JSON.stringify(errorResponseBody), {
        status: statusCode,
        statusText: errorResponseBody.error,
    });
}

type ErrorBody = {
    error: string;
    message: string;
};
