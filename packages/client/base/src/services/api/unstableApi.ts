import { ApiClientError } from "@crossmint/common-sdk-base";
import { z } from "zod";

/**
 * Base of the error classes thrown by the `/api/unstable` clients in this package. Every
 * failure of a call, whatever its origin, carries the response `status` (when there was a
 * response) and the request `path`.
 * @experimental
 */
export class UnstableApiError extends Error {
    constructor(
        message: string,
        public readonly status: number | undefined,
        public readonly path: string
    ) {
        super(message);
        this.name = "UnstableApiError";
    }
}

export type UnstableApiErrorFactory = (message: string, status: number | undefined, path: string) => Error;

// The shared client throws ApiClientError for 5xx and non-JSON 4xx, and lets a rejected fetch
// (offline, DNS, CORS) through untouched; callers get one class for all of them. A rejected
// fetch has no response, so its status is undefined.
export async function sendUnstableRequest(
    path: string,
    request: () => Promise<Response>,
    toError: UnstableApiErrorFactory
): Promise<Response> {
    try {
        return await request();
    } catch (error) {
        if (error instanceof ApiClientError) {
            throw toError(error.message, error.status, path);
        }
        const message = error instanceof Error && error.message !== "" ? error.message : "The request failed.";
        throw toError(message, undefined, path);
    }
}

// `message` is a string, or a string array in the NestJS validation format.
const errorBodySchema = z.object({ message: z.union([z.string(), z.array(z.string())]) });

export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const body = errorBodySchema.safeParse(await response.json());
        if (body.success) {
            return Array.isArray(body.data.message) ? body.data.message.join("; ") : body.data.message;
        }
    } catch {
        // Not a JSON body; use the fallback.
    }
    return fallback;
}

export async function parseJsonResponse<T>(
    response: Response,
    path: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    toError: UnstableApiErrorFactory
): Promise<T> {
    if (!response.ok) {
        throw toError(
            await readErrorMessage(response, `${response.status} ${response.statusText}`),
            response.status,
            path
        );
    }
    // The shared client lets any 2xx through, so an empty or non-JSON body surfaces here.
    let body: unknown;
    try {
        body = await response.json();
    } catch {
        throw toError(`Unexpected non-JSON response from ${path}`, response.status, path);
    }
    const result = schema.safeParse(body);
    if (!result.success) {
        throw toError(`Unexpected response shape from ${path}`, response.status, path);
    }
    return result.data;
}

/** For routes that answer 204: resolves on any 2xx, throws the server message otherwise. */
export async function expectNoContent(
    response: Response,
    path: string,
    toError: UnstableApiErrorFactory
): Promise<void> {
    if (!response.ok) {
        throw toError(
            await readErrorMessage(response, `${response.status} ${response.statusText}`),
            response.status,
            path
        );
    }
}
