import { describe, expect, it } from "vitest";
import { authErrorFromResponse } from "./authErrorFromResponse";

describe("authErrorFromResponse", () => {
    const cases: { name: string; response: Response; hint?: string; message: string }[] = [
        {
            name: "uses the API's message",
            response: new Response(JSON.stringify({ message: "User not found" }), { status: 404 }),
            message: "Failed to get user (404: User not found)",
        },
        {
            name: "joins a list of validation messages",
            response: new Response(JSON.stringify({ message: ["refresh must be a string", "refresh is required"] }), {
                status: 400,
            }),
            message: "Failed to get user (400: refresh must be a string, refresh is required)",
        },
        {
            name: "falls back to the error field",
            response: new Response(JSON.stringify({ error: "Bad Gateway" }), { status: 502 }),
            message: "Failed to get user (502: Bad Gateway)",
        },
        {
            name: "falls back to the status text when the body is not JSON",
            response: new Response("<html>nope</html>", { status: 503, statusText: "Service Unavailable" }),
            message: "Failed to get user (503: Service Unavailable)",
        },
        {
            name: "reports only the status when there is no body and no status text",
            response: new Response(null, { status: 500 }),
            message: "Failed to get user (500)",
        },
        {
            name: "appends the hint",
            response: new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
            hint: "needs users.read",
            message: "Failed to get user (403: Forbidden). needs users.read",
        },
    ];

    it.each(cases)("$name", async ({ response, hint, message }) => {
        const error = await authErrorFromResponse(response, "Failed to get user", hint);

        expect(error.message).toBe(message);
        expect(error.status).toBe(response.status);
    });
});
