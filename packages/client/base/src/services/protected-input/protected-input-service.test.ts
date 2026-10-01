import { afterEach, describe, expect, test, vi } from "vitest";
import { protectedInputOutgoingEvents } from "../../types/protected-input/events/outgoing";
import { createProtectedInputService } from "./protectedInputService";

const FIELD = { key: "code", label: "Code", required: true, handling: "protected", input: { kind: "text" } } as const;
const apiClient = { buildUrl: (path: string) => `https://staging.crossmint.com${path}` };
const service = createProtectedInputService({ apiClient });
const RESULT = { requestId: "request-1", result: { status: "collected", input: { protectedInputId: "pi_1" } } };

function mount() {
    const iframe = document.createElement("iframe");
    iframe.src = service.iframe.getUrl({ field: FIELD, jwt: "buyer-jwt" });
    document.body.appendChild(iframe);
    const client = service.iframe.createClient(iframe);
    const received = vi.fn();
    const subscription = client.on("protected-input:result", received);
    return {
        iframe,
        client,
        received,
        dispose: () => {
            client.off(subscription);
            iframe.remove();
        },
    };
}
function deliver(source: Window | null, origin: string, data: unknown) {
    const event = new MessageEvent("message", { data: { event: "protected-input:result", data }, origin });
    Object.defineProperty(event, "source", { value: source });
    window.dispatchEvent(event);
}

describe("protected input transport", () => {
    const disposals: Array<() => void> = [];
    afterEach(() => {
        disposals.splice(0).forEach((dispose) => dispose());
        vi.restoreAllMocks();
    });

    test("puts only public presentation and the embedding origin in the iframe URL", () => {
        const url = new URL(
            service.iframe.getUrl({ field: FIELD, jwt: "buyer-jwt", expiresAt: "2026-10-01T12:00:00Z" })
        );
        expect(url.pathname).toBe("/sdk/unstable/protected-input");
        expect(JSON.parse(url.searchParams.get("field") ?? "")).toEqual(FIELD);
        expect(url.searchParams.get("targetOrigin")).toBe(window.location.origin);
        for (const key of ["jwt", "apiKey", "expiresAt", "merchantUrl"]) {
            expect(url.searchParams.has(key)).toBe(false);
        }
    });

    test("strips extra field and nested input properties from the URL", () => {
        const field = {
            ...FIELD,
            binding: "secret-binding",
            value: "secret-value",
            input: { ...FIELD.input, value: "secret-nested" },
        };
        const url = new URL(service.iframe.getUrl({ field, jwt: "buyer-jwt" }));
        expect(JSON.parse(url.searchParams.get("field") ?? "")).toEqual(FIELD);
        expect(url.toString()).not.toContain("secret");
    });

    test("keeps the iframe URL unchanged when disabled and invalid change", () => {
        const props = { field: FIELD, jwt: "buyer-jwt" };
        const url = service.iframe.getUrl(props);
        for (const state of [true, false]) {
            expect(service.iframe.getUrl({ ...props, disabled: state, invalid: state })).toBe(url);
        }
    });

    test("validates collection payloads before transport sends them", () => {
        const schema = protectedInputOutgoingEvents["protected-input:collect"];
        const data = { requestId: "request", jwt: "buyer-jwt", apiKey: "client-key" };
        expect(schema.safeParse(data).success).toBe(true);
        expect(schema.safeParse({ ...data, expiresAt: "2026-10-01T12:00:00+02:00" }).success).toBe(true);
        for (const invalid of [
            { ...data, requestId: "" },
            { ...data, jwt: "" },
            { ...data, apiKey: "" },
            { ...data, expiresAt: "2026-10-01" },
        ]) {
            expect(schema.safeParse(invalid).success).toBe(false);
        }
    });

    test("sends only valid collection credentials through the channel", () => {
        const field = mount();
        disposals.push(field.dispose);
        const frame = field.iframe.contentWindow;
        if (frame == null) {
            throw new Error("Frame window is unavailable");
        }
        const post = vi.spyOn(frame, "postMessage");
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        const data = { requestId: "request", jwt: "buyer-jwt", apiKey: "client-key" };
        field.client.send("protected-input:collect", { ...data, jwt: "" });
        expect(post).not.toHaveBeenCalled();
        field.client.send("protected-input:collect", data);
        expect(post).toHaveBeenCalledWith({ event: "protected-input:collect", data }, "https://staging.crossmint.com");
    });

    test("accepts only the hosted frame's messages, even among same-origin siblings", () => {
        const first = mount();
        const sibling = mount();
        disposals.push(first.dispose, sibling.dispose);
        deliver(sibling.iframe.contentWindow, "https://staging.crossmint.com", RESULT);
        deliver(first.iframe.contentWindow, "https://foreign.test", RESULT);
        expect(first.received).not.toHaveBeenCalled();
        deliver(first.iframe.contentWindow, "https://staging.crossmint.com", RESULT);
        expect(first.received).toHaveBeenCalledWith(RESULT);
    });

    test("refuses malformed results and strips fields outside the safe response", () => {
        const field = mount();
        disposals.push(field.dispose);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        deliver(field.iframe.contentWindow, "https://staging.crossmint.com", {
            requestId: "request-1",
            result: { status: "collected" },
        });
        expect(field.received).not.toHaveBeenCalled();
        deliver(field.iframe.contentWindow, "https://staging.crossmint.com", {
            ...RESULT,
            value: "secret",
            tokenId: "tok_private",
        });
        expect(field.received).toHaveBeenCalledWith(RESULT);
    });
});
