import type { AuthMaterialWithUser } from "@crossmint/common-sdk-auth";
import type { IncomingMessage, ServerResponse } from "http";

export type GenericRequest = IncomingMessage | Request;
export type GenericResponse = ServerResponse | Response;

export function isNodeRequest(request: GenericRequest): request is IncomingMessage {
    return "httpVersion" in request;
}

export function isFetchRequest(request: GenericRequest): request is Request {
    return "headers" in request && typeof request.headers.get === "function";
}

interface RequestAdapter {
    getCookieHeader: () => string | null | undefined;
    getBody: () => Promise<any>;
}

export class NodeRequestAdapter implements RequestAdapter {
    constructor(private request: IncomingMessage) {}

    getCookieHeader() {
        const cookieHeader = this.request.headers.cookie;
        // It can return undefined, and we want to unify it to null in both RequestAdapters
        if (cookieHeader == null) {
            return null;
        }
        return cookieHeader;
    }

    getBody() {
        return getNodeRequestBody(this.request);
    }
}

export class FetchRequestAdapter implements RequestAdapter {
    constructor(private request: Request) {}

    getCookieHeader() {
        return this.request.headers.get("Cookie");
    }

    getBody() {
        return this.request.json();
    }
}

export function isNodeResponse(response?: GenericResponse): response is ServerResponse {
    return response != null && "setHeader" in response;
}

export function isFetchResponse(response?: GenericResponse): response is Response {
    return response != null && "headers" in response && typeof response.headers.append === "function";
}

interface ResponseAdapter {
    setCookies: (cookies: string[]) => void;
    setAuthMaterial: (authMaterial: AuthMaterialWithUser) => GenericResponse | null;
    setError: (statusCode: number, errorResponseBody: ErrorBody) => GenericResponse;
}

export class NodeResponseAdapter implements ResponseAdapter {
    constructor(private response?: ServerResponse) {}

    setCookies(cookies: string[]) {
        if (this.response == null) {
            throw new Error("Response not found");
        }
        this.response.setHeader("Set-Cookie", cookies);
    }

    setAuthMaterial(authMaterial: AuthMaterialWithUser) {
        if (this.response == null) {
            return null;
        }
        this.response.setHeader("Content-Type", "application/json");
        this.response.write(JSON.stringify(authMaterial));
        return this.response;
    }

    setError(statusCode: number, errorResponseBody: ErrorBody) {
        if (this.response == null) {
            throw new Error("Response not found");
        }
        return setNodeResponseError(this.response, statusCode, errorResponseBody);
    }
}

export class FetchResponseAdapter implements ResponseAdapter {
    constructor(private response?: Response) {}

    setCookies(cookies: string[]) {
        if (this.response == null) {
            throw new Error("Response not found");
        }

        cookies.forEach((cookie) => this.response?.headers.append("Set-Cookie", cookie));
    }

    setAuthMaterial(authMaterial: AuthMaterialWithUser) {
        return new Response(JSON.stringify(authMaterial), {
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    setError(statusCode: number, errorResponseBody: ErrorBody) {
        return setFetchResponseError(statusCode, errorResponseBody);
    }
}

function getNodeRequestBody(req: IncomingMessage) {
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

function setNodeResponseError(response: ServerResponse, statusCode: number, errorResponseBody: ErrorBody) {
    response.statusCode = statusCode;
    response.statusMessage = errorResponseBody.error;
    response.setHeader("Content-Type", "application/json");
    response.write(JSON.stringify(errorResponseBody));
    return response;
}

function setFetchResponseError(statusCode: number, errorResponseBody: ErrorBody) {
    return new Response(JSON.stringify(errorResponseBody), {
        status: statusCode,
        statusText: errorResponseBody.error,
    });
}

type ErrorBody = {
    error: string;
    message: string;
};
