import { act, render } from "@testing-library/react";
import React from "react";
import { WebView } from "react-native-webview";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CrossmintIdentityVerification } from "./CrossmintIdentityVerification";

// The mock must forward `ref`: React 19 does not assign refs to function
// components, and without it webViewRef.current stays null, the client is never
// constructed, and every event assertion below passes vacuously.
vi.mock("react-native-webview", () => ({
    WebView: vi
        .fn()
        .mockImplementation(({ ref }) => React.createElement("div", { ref, "data-testid": "mock-webview" })),
}));

// A real CrossmintApiClient validates the key's ed25519 signature and throws on
// a fake one, so the client is stubbed while getUrl stays real. getIFrameUrl
// reads exactly these three members.
vi.mock("@/utils/createCrossmintApiClient", () => ({
    createCrossmintApiClient: () => ({
        buildUrl: (path: string) => `https://staging.crossmint.com${path}`,
        crossmint: { apiKey: "ck_staging_key" },
        internalConfig: { sdkMetadata: { name: "@crossmint/client-sdk-react-native-ui", version: "0.0.0" } },
    }),
}));

vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: () => ({ crossmint: { apiKey: "ck_staging_key" } }),
}));

const CREDENTIALS = { provider: "persona", inquiryId: "inq-1" } as const;

function lastWebViewProps() {
    const props = vi.mocked(WebView).mock.calls.at(-1)?.[0];
    if (props == null) {
        throw new Error("WebView was never rendered");
    }
    return props as Record<string, any>;
}

function emit(event: string, data: Record<string, unknown> = {}) {
    const { onMessage } = lastWebViewProps();
    act(() => onMessage({ nativeEvent: { data: JSON.stringify({ event, data }) } }));
}

afterEach(() => {
    vi.clearAllMocks();
});

describe("<CrossmintIdentityVerification />", () => {
    test("points the WebView at the identity-verification route with the credentials", () => {
        render(<CrossmintIdentityVerification credentials={CREDENTIALS} />);

        // Assert on the parsed query param, not on a substring of the encoded URL:
        // URLSearchParams and encodeURIComponent agree on this payload today, but
        // they disagree on spaces (+ versus %20).
        const url = new URL(lastWebViewProps().source.uri as string);
        expect(url.origin + url.pathname).toBe("https://staging.crossmint.com/sdk/unstable/identity-verification");
        expect(JSON.parse(url.searchParams.get("credentials") ?? "{}")).toEqual(CREDENTIALS);
    });

    describe("when the hosted page reports lifecycle events", () => {
        test("calls onReady", () => {
            const onReady = vi.fn();
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} onReady={onReady} />);

            emit("kyc:ready");

            expect(onReady).toHaveBeenCalledTimes(1);
        });

        test("calls onComplete with the reported status", () => {
            const onComplete = vi.fn();
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} onComplete={onComplete} />);

            emit("kyc:completed", { status: "verified" });

            expect(onComplete).toHaveBeenCalledWith({ status: "verified" });
        });

        test("calls onCancel", () => {
            const onCancel = vi.fn();
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} onCancel={onCancel} />);

            emit("kyc:cancelled");

            expect(onCancel).toHaveBeenCalledTimes(1);
        });

        test("calls onError with the retriable flag, reason and message", () => {
            const onError = vi.fn();
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} onError={onError} />);

            emit("kyc:error", { retriable: false, reason: "provider-error", message: "boom" });

            expect(onError).toHaveBeenCalledWith({ retriable: false, reason: "provider-error", message: "boom" });
        });

        test("applies the reported height to the WebView", () => {
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} />);

            emit("ui:height.changed", { height: 420 });

            expect(lastWebViewProps().style.height).toBe(420);
        });
    });

    describe("when the host unmounts", () => {
        test("stops delivering events to the callbacks", () => {
            const onReady = vi.fn();
            const { onMessage } = (() => {
                const view = render(<CrossmintIdentityVerification credentials={CREDENTIALS} onReady={onReady} />);
                const captured = lastWebViewProps();
                view.unmount();
                return captured;
            })();

            onMessage({ nativeEvent: { data: JSON.stringify({ event: "kyc:ready", data: {} }) } });

            expect(onReady).not.toHaveBeenCalled();
        });
    });
});
