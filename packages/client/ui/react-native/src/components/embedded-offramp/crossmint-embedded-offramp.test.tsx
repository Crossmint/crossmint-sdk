import { act, render } from "@testing-library/react";
import React from "react";
import { WebView } from "react-native-webview";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CrossmintEmbeddedOfframp } from "./CrossmintEmbeddedOfframp";

const { injectJavaScript, openURL } = vi.hoisted(() => ({
    injectJavaScript: vi.fn(),
    openURL: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("react-native-webview", () => ({
    WebView: vi.fn().mockImplementation(({ ref }) => {
        React.useImperativeHandle(ref, () => ({ injectJavaScript }));
        return React.createElement("div", { "data-testid": "mock-webview" });
    }),
}));

vi.mock("react-native", () => ({ Linking: { openURL } }));

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

const CREDENTIALS = { sessionId: "ofs_1", clientSecret: "jwt" };
const TX = { serializedTransaction: "0x", chain: "solana", payerAddress: "9Wz" };

function lastWebViewProps() {
    const props = vi.mocked(WebView).mock.calls.at(-1)?.[0];
    if (props == null) {
        throw new Error("WebView was never rendered");
    }
    return props as Record<string, any>;
}

const ROUTE = "https://staging.crossmint.com/sdk/unstable/embedded-offramp";

function emit(event: string, data: Record<string, unknown> = {}, url = `${ROUTE}?credentials=x`) {
    const { onMessage } = lastWebViewProps();
    return act(async () => {
        onMessage({ nativeEvent: { data: JSON.stringify({ event, data }), url } });
    });
}

function replies(name: string) {
    return injectJavaScript.mock.calls
        .map(([script]) =>
            JSON.parse(JSON.parse(/onMessageFromRN\(("(?:[^"\\]|\\.)*")\)/.exec(String(script))?.[1] ?? "null"))
        )
        .filter((message) => message.event === name);
}

afterEach(() => {
    vi.clearAllMocks();
});

describe("<CrossmintEmbeddedOfframp /> (React Native)", () => {
    test("loads the offramp route with the credentials, storage and inline media for KYC", () => {
        render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction: vi.fn() }} />);
        const props = lastWebViewProps();
        const url = new URL(props.source.uri as string);
        expect(url.origin + url.pathname).toBe("https://staging.crossmint.com/sdk/unstable/embedded-offramp");
        expect(JSON.parse(url.searchParams.get("credentials") ?? "{}")).toEqual(CREDENTIALS);
        expect(url.searchParams.has("payer")).toBe(false);
        expect(props).toMatchObject({
            domStorageEnabled: true,
            scrollEnabled: true,
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
        });
    });

    test("reports a load failure through onError", () => {
        const onError = vi.fn();
        render(
            <CrossmintEmbeddedOfframp
                credentials={CREDENTIALS}
                payer={{ signAndSendTransaction: vi.fn() }}
                onError={onError}
            />
        );
        act(() => lastWebViewProps().onHttpError({ nativeEvent: { statusCode: 500 } }));
        expect(onError).toHaveBeenCalledWith({
            reason: "invalid-configuration",
            retriable: false,
            message: "HTTP 500",
        });
    });

    test("forwards completion to the latest callback", async () => {
        const first = vi.fn();
        const second = vi.fn();
        const payer = { signAndSendTransaction: vi.fn() };
        const { rerender } = render(
            <CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payer} onComplete={first} />
        );
        rerender(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payer} onComplete={second} />);
        await emit("offramp:completed", { orderId: "o1", txId: "0xtx" });
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith({ orderId: "o1", txId: "0xtx" });
    });

    describe("when the sender is reported by origin only (Android)", () => {
        test("accepts the route origin", async () => {
            const signAndSendTransaction = vi.fn().mockResolvedValue("0xtx");
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction }} />);
            await emit("crypto:send-transaction", TX, "https://staging.crossmint.com");
            expect(signAndSendTransaction).toHaveBeenCalledTimes(1);
        });

        test.each([["https://evil.example"], ["https://staging.crossmint.com.evil.example"]])(
            "ignores %s",
            async (url) => {
                const signAndSendTransaction = vi.fn().mockResolvedValue("0xtx");
                render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction }} />);
                await emit("crypto:send-transaction", TX, url);
                expect(signAndSendTransaction).not.toHaveBeenCalled();
            }
        );
    });

    describe("when another page is showing in the WebView", () => {
        test.each([["https://evil.example/page"], [`${ROUTE}-evil`], [""]])(
            "ignores a transaction request from %s",
            async (url) => {
                const signAndSendTransaction = vi.fn().mockResolvedValue("0xtx");
                render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction }} />);

                await emit("crypto:send-transaction", TX, url);

                expect(signAndSendTransaction).not.toHaveBeenCalled();
                expect(injectJavaScript).not.toHaveBeenCalled();
            }
        );
    });

    describe("when the page opens a new window", () => {
        test("opens http(s) links in the system browser", () => {
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction: vi.fn() }} />);
            act(() => lastWebViewProps().onOpenWindow({ nativeEvent: { targetUrl: "https://terms.example/x" } }));
            expect(openURL).toHaveBeenCalledWith("https://terms.example/x");
        });

        test("ignores other schemes", () => {
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction: vi.fn() }} />);
            act(() => lastWebViewProps().onOpenWindow({ nativeEvent: { targetUrl: "javascript:alert(1)" } }));
            expect(openURL).not.toHaveBeenCalled();
        });
    });

    describe("when the page requests a transaction", () => {
        test("signs and replies once with the txId", async () => {
            const signAndSendTransaction = vi.fn().mockResolvedValue("0xtx");
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction }} />);

            await emit("crypto:send-transaction", TX);

            expect(signAndSendTransaction).toHaveBeenCalledWith(TX);
            expect(injectJavaScript).toHaveBeenCalledTimes(1);
            expect(replies("crypto:send-transaction:success")).toHaveLength(1);
            expect(replies("crypto:send-transaction:success")[0].data).toEqual({ txId: "0xtx" });
        });

        test("reports a rejection when the payer says so", async () => {
            const rejected = Object.assign(new Error("declined"), { rejected: true });
            render(
                <CrossmintEmbeddedOfframp
                    credentials={CREDENTIALS}
                    payer={{ signAndSendTransaction: vi.fn().mockRejectedValue(rejected) }}
                />
            );

            await emit("crypto:send-transaction", TX);

            expect(injectJavaScript).toHaveBeenCalledTimes(1);
            expect(replies("crypto:send-transaction:failed")).toEqual([
                { event: "crypto:send-transaction:failed", data: { error: "declined", rejected: true } },
            ]);
        });

        test("reports a plain error as not rejected", async () => {
            render(
                <CrossmintEmbeddedOfframp
                    credentials={CREDENTIALS}
                    payer={{ signAndSendTransaction: vi.fn().mockRejectedValue(new Error("boom")) }}
                />
            );

            await emit("crypto:send-transaction", TX);

            expect(injectJavaScript).toHaveBeenCalledTimes(1);
            expect(replies("crypto:send-transaction:failed")).toEqual([
                { event: "crypto:send-transaction:failed", data: { error: expect.any(String), rejected: false } },
            ]);
        });

        test.each([[undefined], [""], [42]])("reports a non-string txId (%s) as not rejected", async (txId) => {
            render(
                <CrossmintEmbeddedOfframp
                    credentials={CREDENTIALS}
                    payer={{ signAndSendTransaction: vi.fn().mockResolvedValue(txId) }}
                />
            );

            await emit("crypto:send-transaction", TX);

            expect(injectJavaScript).toHaveBeenCalledTimes(1);
            expect(replies("crypto:send-transaction:failed")).toEqual([
                { event: "crypto:send-transaction:failed", data: { error: expect.any(String), rejected: false } },
            ]);
        });

        test("ignores a second request while one is pending", async () => {
            let resolveSend: (txId: string) => void = () => {};
            const signAndSendTransaction = vi
                .fn()
                .mockReturnValue(new Promise<string>((resolve) => (resolveSend = resolve)));
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction }} />);

            await emit("crypto:send-transaction", TX);
            await emit("crypto:send-transaction", TX);
            expect(signAndSendTransaction).toHaveBeenCalledTimes(1);

            await act(async () => resolveSend("0xtx"));
            expect(injectJavaScript).toHaveBeenCalledTimes(1);
            expect(replies("crypto:send-transaction:success")).toHaveLength(1);
        });
    });
});
