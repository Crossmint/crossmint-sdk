import { act, render } from "@testing-library/react";
import React from "react";
import { WebView } from "react-native-webview";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CrossmintProtectedInput } from "./CrossmintProtectedInput";

// The mock must forward `ref`: without it webViewRef.current stays null, the client is never
// constructed, and every event assertion below passes vacuously.
vi.mock("react-native-webview", () => ({
    WebView: vi
        .fn()
        .mockImplementation(({ ref }) => React.createElement("div", { ref, "data-testid": "mock-webview" })),
}));

// A real CrossmintApiClient validates the key's signature; the client is stubbed while getUrl stays real.
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

const PROPS = { jwt: "jwt-1", merchantUrl: "https://shop.example.com/login", label: "Example Shop" } as const;
const CREATED = {
    protectedInputId: "pi_1",
    purpose: "password",
    merchant: { domain: "shop.example.com" },
    expiresAt: "2026-09-26T12:00:00.000Z",
} as const;

function lastWebViewProps() {
    const props = vi.mocked(WebView).mock.calls.at(-1)?.[0];
    if (props == null) {
        throw new Error("WebView was never rendered");
    }
    // biome-ignore lint/suspicious/noExplicitAny: the mock's props are untyped
    return props as Record<string, any>;
}

function emit(event: string, data: Record<string, unknown> = {}) {
    const { onMessage } = lastWebViewProps();
    act(() => onMessage({ nativeEvent: { data: JSON.stringify({ event, data }) } }));
}

afterEach(() => {
    vi.clearAllMocks();
});

describe("<CrossmintProtectedInput /> (React Native)", () => {
    test("points the WebView at the protected-input route with the props and the jwt, without targetOrigin", () => {
        render(<CrossmintProtectedInput {...PROPS} />);

        const url = new URL(lastWebViewProps().source.uri as string);
        expect(url.origin + url.pathname).toBe("https://staging.crossmint.com/sdk/unstable/protected-input");
        expect(url.searchParams.get("merchantUrl")).toBe(PROPS.merchantUrl);
        expect(url.searchParams.get("label")).toBe(PROPS.label);
        expect(url.searchParams.get("jwt")).toBe("jwt-1");
        expect(url.searchParams.get("apiKey")).toBe("ck_staging_key");
        expect(url.searchParams.has("targetOrigin")).toBe(false);
    });

    test("forwards protected-input:created and protected-input:error to the latest callbacks", () => {
        const stale = vi.fn();
        const onCreated = vi.fn();
        const onError = vi.fn();
        const { rerender } = render(<CrossmintProtectedInput {...PROPS} onCreated={stale} />);
        rerender(<CrossmintProtectedInput {...PROPS} onCreated={onCreated} onError={onError} />);

        emit("protected-input:created", CREATED);
        emit("protected-input:error", { code: "provider_unavailable", message: "vault widget failed to load" });

        expect(stale).not.toHaveBeenCalled();
        expect(onCreated).toHaveBeenCalledWith(CREATED);
        expect(onError).toHaveBeenCalledWith({ code: "provider_unavailable", message: "vault widget failed to load" });
    });

    test("applies the relayed height to the WebView", () => {
        render(<CrossmintProtectedInput {...PROPS} />);

        emit("ui:height.changed", { height: 180 });

        expect(lastWebViewProps().style).toMatchObject({ height: 180 });
    });

    test("puts a changed jwt in the page URL, like the other hosted components", () => {
        const { rerender } = render(<CrossmintProtectedInput {...PROPS} />);

        rerender(<CrossmintProtectedInput {...PROPS} jwt="jwt-2" />);

        expect(new URL(lastWebViewProps().source.uri as string).searchParams.get("jwt")).toBe("jwt-2");
    });

    test("reports a WebView load failure as load_failed", () => {
        const onError = vi.fn();
        render(<CrossmintProtectedInput {...PROPS} onError={onError} />);

        act(() => lastWebViewProps().onHttpError({ nativeEvent: { statusCode: 500 } }));
        act(() => lastWebViewProps().onError({ nativeEvent: { description: "net::ERR_NAME_NOT_RESOLVED" } }));

        expect(onError).toHaveBeenNthCalledWith(1, { code: "load_failed", message: "HTTP 500" });
        expect(onError).toHaveBeenNthCalledWith(2, { code: "load_failed", message: "net::ERR_NAME_NOT_RESOLVED" });
    });

    test("removes every listener on unmount", () => {
        const { unmount } = render(<CrossmintProtectedInput {...PROPS} />);
        emit("ui:height.changed", { height: 10 });

        unmount();
        const onCreated = vi.fn();
        render(<CrossmintProtectedInput {...PROPS} onCreated={onCreated} />);

        expect(vi.mocked(WebView).mock.calls.length).toBeGreaterThan(0);
    });
});
