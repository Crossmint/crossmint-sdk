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

    describe("when the page fails to load", () => {
        function renderWithOnError() {
            const onError = vi.fn();
            render(
                <CrossmintEmbeddedOfframp
                    credentials={CREDENTIALS}
                    payer={{ signAndSendTransaction: vi.fn() }}
                    onError={onError}
                />
            );
            return onError;
        }

        test.each([[400], [404]])("reports HTTP %s as a non-retriable configuration error", (statusCode) => {
            const onError = renderWithOnError();
            act(() => lastWebViewProps().onHttpError({ nativeEvent: { statusCode } }));
            expect(onError).toHaveBeenCalledWith({
                reason: "invalid-configuration",
                retriable: false,
                message: `HTTP ${statusCode}`,
            });
        });

        test.each([[500], [503]])("reports HTTP %s as a retriable provider error", (statusCode) => {
            const onError = renderWithOnError();
            act(() => lastWebViewProps().onHttpError({ nativeEvent: { statusCode } }));
            expect(onError).toHaveBeenCalledWith({
                reason: "provider-error",
                retriable: true,
                message: `HTTP ${statusCode}`,
            });
        });

        test("reports a connection failure as a retriable provider error", () => {
            const onError = renderWithOnError();
            act(() =>
                lastWebViewProps().onError({
                    nativeEvent: { description: "The Internet connection appears to be offline." },
                })
            );
            expect(onError).toHaveBeenCalledWith({
                reason: "provider-error",
                retriable: true,
                message: "The Internet connection appears to be offline.",
            });
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

function deferredTransaction() {
    let resolve!: (txId: string) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<string>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

describe("signing session isolation", () => {
    test.each(["success", "rejection"])("ignores old session %s without unlocking the new session", async (outcome) => {
        const oldTransaction = deferredTransaction();
        const newTransaction = deferredTransaction();
        const oldSigner = vi.fn().mockReturnValue(oldTransaction.promise);
        const newSigner = vi.fn().mockReturnValue(newTransaction.promise);
        const { rerender } = render(
            <CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction: oldSigner }} />
        );
        await emit("crypto:send-transaction", TX);
        rerender(
            <CrossmintEmbeddedOfframp
                credentials={{ sessionId: "ofs_2", clientSecret: "jwt_2" }}
                payer={{ signAndSendTransaction: newSigner }}
            />
        );
        await emit("crypto:send-transaction", TX);
        expect(newSigner).toHaveBeenCalledTimes(1);
        await act(async () => {
            if (outcome === "success") {
                oldTransaction.resolve("old-tx");
            } else {
                oldTransaction.reject(new Error("old rejection"));
            }
            await Promise.resolve();
        });
        expect(injectJavaScript).not.toHaveBeenCalled();
        await emit("crypto:send-transaction", TX);
        expect(newSigner).toHaveBeenCalledTimes(1);
        await act(async () => newTransaction.resolve("new-tx"));
        expect(injectJavaScript).toHaveBeenCalledTimes(1);
    });

    test("ignores a pending reply after the document reloads", async () => {
        const oldTransaction = deferredTransaction();
        const newTransaction = deferredTransaction();
        const signer = vi.fn().mockReturnValueOnce(oldTransaction.promise).mockReturnValueOnce(newTransaction.promise);
        render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction: signer }} />);
        act(() => lastWebViewProps().onLoadStart());
        await emit("crypto:send-transaction", TX);
        act(() => lastWebViewProps().onLoadStart());
        await emit("crypto:send-transaction", TX);
        expect(signer).toHaveBeenCalledTimes(2);
        await act(async () => oldTransaction.resolve("old-tx"));
        expect(injectJavaScript).not.toHaveBeenCalled();
        await emit("crypto:send-transaction", TX);
        expect(signer).toHaveBeenCalledTimes(2);
        await act(async () => newTransaction.resolve("new-tx"));
        expect(injectJavaScript).toHaveBeenCalledTimes(1);
    });

    test("does not reply after unmount", async () => {
        const transaction = deferredTransaction();
        const { unmount } = render(
            <CrossmintEmbeddedOfframp
                credentials={CREDENTIALS}
                payer={{ signAndSendTransaction: () => transaction.promise }}
            />
        );
        await emit("crypto:send-transaction", TX);
        unmount();
        await act(async () => transaction.resolve("old-tx"));
        expect(injectJavaScript).not.toHaveBeenCalled();
    });

    test("keeps a delayed reply for the same session across callback updates", async () => {
        vi.useFakeTimers();
        try {
            const transaction = deferredTransaction();
            const payer = { signAndSendTransaction: vi.fn().mockReturnValue(transaction.promise) };
            const { rerender } = render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payer} />);
            await emit("crypto:send-transaction", TX);
            rerender(<CrossmintEmbeddedOfframp credentials={{ ...CREDENTIALS }} payer={payer} onReady={vi.fn()} />);
            await act(async () => vi.advanceTimersByTime(121_000));
            await emit("crypto:send-transaction", TX);
            expect(payer.signAndSendTransaction).toHaveBeenCalledTimes(1);
            await act(async () => transaction.resolve("late-tx"));
            expect(injectJavaScript).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });
});
