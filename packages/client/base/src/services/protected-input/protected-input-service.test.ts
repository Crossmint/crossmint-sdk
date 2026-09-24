import { afterEach, describe, expect, test, vi } from "vitest";

import type {
    CrossmintProtectedInputProps,
    ProtectedInputError,
    ProtectedInputIFrameEmitter,
} from "@/types/protected-input";
import { protectedInputIncomingEvents } from "@/types/protected-input";
import { createProtectedInputService, validateProtectedInputProps } from "./protectedInputService";

const apiClient = {
    buildUrl: (path: string) => `https://staging.crossmint.com${path}`,
    crossmint: { apiKey: "ck_staging_key" },
    internalConfig: { sdkMetadata: { name: "test-sdk", version: "1.0.0" } },
} as never;

const AUTH = { targetOrigin: "https://shop.example.com" };

function iframeUrl(props: Partial<CrossmintProtectedInputProps>, auth = AUTH) {
    return new URL(
        createProtectedInputService({ apiClient }).iframe.getUrl(
            { jwt: "jwt-1", merchantUrl: "https://shop.example.com/login", ...props },
            auth
        )
    );
}

describe("createProtectedInputService", () => {
    describe("iframe.getUrl", () => {
        test("points at the standalone protected-input route", () => {
            expect(iframeUrl({}).pathname).toBe("/sdk/unstable/protected-input");
        });

        test("carries merchantUrl, jwt, targetOrigin, apiKey and sdkMetadata", () => {
            const params = iframeUrl({}).searchParams;

            expect(params.get("merchantUrl")).toBe("https://shop.example.com/login");
            expect(params.get("jwt")).toBe("jwt-1");
            expect(params.get("targetOrigin")).toBe("https://shop.example.com");
            expect(params.get("apiKey")).toBe("ck_staging_key");
            expect(JSON.parse(params.get("sdkMetadata") ?? "")).toEqual({ name: "test-sdk", version: "1.0.0" });
        });

        test("sends expiresAt and label as plain strings", () => {
            const params = iframeUrl({ expiresAt: "2026-09-24T12:00:00.000Z", label: "Example Shop" }).searchParams;

            expect(params.get("expiresAt")).toBe("2026-09-24T12:00:00.000Z");
            expect(params.get("label")).toBe("Example Shop");
        });

        test("omits expiresAt and label when they are not set", () => {
            const params = iframeUrl({}).searchParams;

            expect(params.has("expiresAt")).toBe(false);
            expect(params.has("label")).toBe(false);
        });

        test("JSON-encodes appearance like the payment-method-management page expects", () => {
            const appearance = { variables: { colors: { accent: "#123456" } } };

            const params = iframeUrl({ appearance }).searchParams;

            expect(JSON.parse(params.get("appearance") ?? "")).toEqual(appearance);
        });

        test("never serializes the callbacks", () => {
            const url = iframeUrl({ onCreated: vi.fn(), onError: vi.fn() });

            expect(url.searchParams.has("onCreated")).toBe(false);
            expect(url.searchParams.has("onError")).toBe(false);
            expect(url.toString()).not.toContain("function");
        });

        test("sends the jwt prop once and ignores keys outside the hosted page contract", () => {
            const params = iframeUrl({ extra: "x" } as Partial<CrossmintProtectedInputProps>).searchParams;

            expect(params.getAll("jwt")).toEqual(["jwt-1"]);
            expect(params.has("extra")).toBe(false);
        });

        test("rejects an invalid merchantUrl or expiresAt before the iframe loads", () => {
            expect(() => iframeUrl({ merchantUrl: "shop.example.com/login" })).toThrow(/merchantUrl/);
            expect(() => iframeUrl({ merchantUrl: "ftp://shop.example.com" })).toThrow(/http or https/);
            expect(() => iframeUrl({ expiresAt: "tomorrow" })).toThrow(/expiresAt/);
        });
    });

    describe("validateProtectedInputProps", () => {
        test("accepts a well-formed set of props", () => {
            expect(
                validateProtectedInputProps({
                    merchantUrl: "https://shop.example.com/login",
                    expiresAt: "2026-09-24T12:00:00.000Z",
                    label: "Example Shop",
                })
            ).toBeNull();
        });

        test("names the offending prop", () => {
            expect(validateProtectedInputProps({ merchantUrl: "not a url" })).toMatch(/merchantUrl/);
            expect(validateProtectedInputProps({ merchantUrl: "https://a.example", expiresAt: "x" })).toMatch(
                /expiresAt/
            );
            expect(validateProtectedInputProps({ merchantUrl: "https://a.example", label: "x".repeat(121) })).toMatch(
                /label/
            );
        });
    });

    describe("iframe.createClient", () => {
        const mounted: HTMLIFrameElement[] = [];
        const subscriptions: Array<{ client: ProtectedInputIFrameEmitter; id: string }> = [];

        afterEach(() => {
            for (const { client, id } of subscriptions) {
                client.off(id);
            }
            subscriptions.length = 0;
            for (const iframe of mounted) {
                iframe.remove();
            }
            mounted.length = 0;
        });

        function mountIframe() {
            const iframe = document.createElement("iframe");
            iframe.src = createProtectedInputService({ apiClient }).iframe.getUrl(
                { merchantUrl: "https://shop.example.com/login" },
                AUTH
            );
            document.body.appendChild(iframe);
            mounted.push(iframe);
            return iframe;
        }

        function subscribeCreated(iframe: HTMLIFrameElement, onCreated: (data: unknown) => void) {
            const client = createProtectedInputService({ apiClient }).iframe.createClient(iframe);
            subscriptions.push({ client, id: client.on("protected-input:created", onCreated) });
        }

        function deliver(source: Window | null, origin: string, event: string, data: unknown) {
            const message = new MessageEvent("message", { data: { event, data }, origin });
            // jsdom's MessageEvent only accepts a real WindowProxy as `source`, so install it directly.
            Object.defineProperty(message, "source", { value: source });
            window.dispatchEvent(message);
        }

        const CREATED = {
            protectedInputId: "pi_1",
            purpose: "password",
            merchant: { domain: "shop.example.com" },
            expiresAt: "2026-09-24T12:00:00.000Z",
        };

        test("accepts events posted from the Crossmint origin that serves the page", () => {
            const iframe = mountIframe();
            const onCreated = vi.fn();
            subscribeCreated(iframe, onCreated);

            deliver(iframe.contentWindow, "https://staging.crossmint.com", "protected-input:created", CREATED);

            expect(onCreated).toHaveBeenCalledWith(CREATED);
        });

        test("drops events posted from any other origin", () => {
            const iframe = mountIframe();
            const onCreated = vi.fn();
            subscribeCreated(iframe, onCreated);

            deliver(iframe.contentWindow, "https://evil.example.com", "protected-input:created", CREATED);
            deliver(iframe.contentWindow, "https://shop.example.com", "protected-input:created", CREATED);

            expect(onCreated).not.toHaveBeenCalled();
        });

        test("drops events from another Crossmint iframe on the same page, even on the right origin", () => {
            const iframe = mountIframe();
            const otherCrossmintIframe = mountIframe();
            const onCreated = vi.fn();
            subscribeCreated(iframe, onCreated);

            deliver(
                otherCrossmintIframe.contentWindow,
                "https://staging.crossmint.com",
                "protected-input:created",
                CREATED
            );

            expect(onCreated).not.toHaveBeenCalled();
        });

        test("drops a payload from the right origin that fails the event schema", () => {
            const iframe = mountIframe();
            const onCreated = vi.fn();
            const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
            subscribeCreated(iframe, onCreated);

            deliver(iframe.contentWindow, "https://staging.crossmint.com", "protected-input:created", {
                ...CREATED,
                purpose: "card",
            });

            expect(onCreated).not.toHaveBeenCalled();
            consoleError.mockRestore();
        });
    });
});

describe("protectedInputIncomingEvents", () => {
    test("protected-input:created accepts the payload the hosted page posts", () => {
        const result = protectedInputIncomingEvents["protected-input:created"].safeParse({
            protectedInputId: "pi_1",
            purpose: "password",
            merchant: { domain: "shop.example.com" },
            expiresAt: "2026-09-24T12:00:00.000Z",
        });

        expect(result.success).toBe(true);
    });

    test("protected-input:created rejects any purpose other than password", () => {
        const result = protectedInputIncomingEvents["protected-input:created"].safeParse({
            protectedInputId: "pi_1",
            purpose: "card",
            merchant: { domain: "shop.example.com" },
            expiresAt: "2026-09-24T12:00:00.000Z",
        });

        expect(result.success).toBe(false);
    });

    test("ui:height.changed rejects a negative height", () => {
        expect(protectedInputIncomingEvents["ui:height.changed"].safeParse({ height: -1 }).success).toBe(false);
        expect(protectedInputIncomingEvents["ui:height.changed"].safeParse({ height: 0 }).success).toBe(true);
    });

    test("protected-input:error keeps the known codes typed and still accepts a code added later", () => {
        const known = protectedInputIncomingEvents["protected-input:error"].safeParse({
            code: "provider_unavailable",
            message: "vault widget failed to load",
        });
        const future = protectedInputIncomingEvents["protected-input:error"].safeParse({
            code: "rate_limited",
            message: "try again later",
        });

        expect(known.success && known.data.code).toBe("provider_unavailable");
        expect(future.success && future.data.code).toBe("rate_limited");
        // The exported type narrows to the known codes for autocomplete and exhaustive switches.
        const error: ProtectedInputError = { code: "load_timeout", message: "" };
        expect(error.code).toBe("load_timeout");
    });

    test("protected-input:error needs both a code and a message", () => {
        expect(
            protectedInputIncomingEvents["protected-input:error"].safeParse({ code: "invalid_params" }).success
        ).toBe(false);
        expect(
            protectedInputIncomingEvents["protected-input:error"].safeParse({
                code: "invalid_params",
                message: "merchantUrl is required",
            }).success
        ).toBe(true);
    });
});
