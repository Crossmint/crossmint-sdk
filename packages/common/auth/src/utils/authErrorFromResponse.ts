import { CrossmintAuthenticationError } from "../types/errors";

/**
 * Build a `CrossmintAuthenticationError` from a failed Crossmint API response. The error keeps the HTTP status
 * and the API's own message, so the caller sees why the request failed. `hint` is appended to the message.
 */
export async function authErrorFromResponse(
    response: Response,
    action: string,
    hint?: string
): Promise<CrossmintAuthenticationError> {
    const details = (await readApiErrorMessage(response)) ?? response.statusText;
    const status = details ? `${response.status}: ${details}` : `${response.status}`;
    const message = hint ? `${action} (${status}). ${hint}` : `${action} (${status})`;
    return new CrossmintAuthenticationError(message, { status: response.status });
}

async function readApiErrorMessage(response: Response): Promise<string | undefined> {
    try {
        const body = JSON.parse(await response.text());
        const message = body?.message ?? body?.error;
        if (typeof message === "string") {
            return message;
        }
        if (Array.isArray(message)) {
            return message.join(", ");
        }
    } catch (_) {
        // The body is missing or not JSON: fall back to the status text.
    }
    return undefined;
}
