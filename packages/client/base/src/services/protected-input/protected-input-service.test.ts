import { afterEach, describe, expect, test, vi } from "vitest";
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
