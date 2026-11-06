import { OfframpSignatureRejectedError } from "@crossmint/client-sdk-base";
import { act, cleanup, render } from "@testing-library/react";
import React from "react";
import { WebView } from "react-native-webview";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CrossmintEmbeddedOfframp } from "./CrossmintEmbeddedOfframp";
import { isSameSession } from "./sameSession";

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

let currentNonce: string | null = null;

function load(url = lastWebViewProps().source.uri as string) {
    act(() => lastWebViewProps().onLoad({ nativeEvent: { url } }));
    const script = injectJavaScript.mock.calls.at(-1)?.[0] as string | undefined;
    currentNonce = script == null ? null : /__mainFrameNonce: "([0-9a-f]+)"/.exec(script)?.[1] ?? null;
    injectJavaScript.mockClear();
    return { script, nonce: currentNonce };
}

// A nonce of undefined means "the page's current one, loading first if needed"; null sends none.
function emit(
    event: string,
    data: Record<string, unknown> = {},
    url = `${ROUTE}?credentials=x`,
    nonce: string | null | undefined = undefined
) {
    const isWallet = event.startsWith("crypto:");
    if (isWallet && nonce === undefined && currentNonce == null) {
        load();
    }
    const stamp = nonce === undefined ? currentNonce : nonce;
    const { onMessage } = lastWebViewProps();
    return act(async () => {
        onMessage({
            nativeEvent: {
                data: JSON.stringify({
                    event,
                    data: isWallet && stamp != null ? { ...data, __mainFrameNonce: stamp } : data,
                }),
                url,
            },
        });
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
    currentNonce = null;
    cleanup();
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

    test("sizes the WebView to the reported content height", async () => {
        render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction: vi.fn() }} />);
        await emit("ui:height.changed", { height: 720 });
        expect(lastWebViewProps().style).toEqual({ width: "100%", height: 720, backgroundColor: "transparent" });
    });

    describe("when fill is on", () => {
        test("fills the parent and ignores content height changes", async () => {
            render(
                <CrossmintEmbeddedOfframp
                    credentials={CREDENTIALS}
                    payer={{ signAndSendTransaction: vi.fn() }}
                    fill={true}
                />
            );
            await emit("ui:height.changed", { height: 720 });
            const props = lastWebViewProps();
            expect(new URL(props.source.uri as string).searchParams.get("fill")).toBe("true");
            expect(props.style).toEqual({ width: "100%", flex: 1, backgroundColor: "transparent" });
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

    describe("when a wallet request must come from the main frame", () => {
        const SIGN = { message: "crossmint.com wants you to sign in", chain: "solana", payerAddress: "9Wz" };
        const renderPayer = () => {
            const payer = {
                signAndSendTransaction: vi.fn().mockResolvedValue("0xtx"),
                signMessage: vi.fn().mockResolvedValue("c2ln"),
            };
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payer} />);
            return payer;
        };

        test("answers requests carrying the nonce of the finished load", async () => {
            const payer = renderPayer();
            load();
            await emit("crypto:send-transaction", TX);
            await emit("crypto:sign-message", SIGN);
            expect(payer.signAndSendTransaction).toHaveBeenCalledTimes(1);
            expect(payer.signMessage).toHaveBeenCalledTimes(1);
            expect(injectJavaScript).toHaveBeenCalledTimes(2);
        });

        test.each([
            ["crypto:send-transaction", TX],
            ["crypto:sign-message", SIGN],
        ])("drops %s without a nonce, silently", async (event, data) => {
            const payer = renderPayer();
            load();
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            await emit(event, data, undefined, null);
            expect(payer.signAndSendTransaction).not.toHaveBeenCalled();
            expect(payer.signMessage).not.toHaveBeenCalled();
            expect(injectJavaScript).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledWith(expect.stringContaining(event));
            warn.mockRestore();
        });

        test.each([
            ["crypto:send-transaction", TX],
            ["crypto:sign-message", SIGN],
        ])("drops %s with a wrong nonce", async (event, data) => {
            const payer = renderPayer();
            load();
            vi.spyOn(console, "warn").mockImplementation(() => undefined);
            await emit(event, data, undefined, "00".repeat(16));
            expect(payer.signAndSendTransaction).not.toHaveBeenCalled();
            expect(payer.signMessage).not.toHaveBeenCalled();
            expect(injectJavaScript).not.toHaveBeenCalled();
        });

        test("drops requests before any load finished", async () => {
            const payer = renderPayer();
            vi.spyOn(console, "warn").mockImplementation(() => undefined);
            await emit("crypto:send-transaction", TX, undefined, "00".repeat(16));
            expect(payer.signAndSendTransaction).not.toHaveBeenCalled();
            expect(injectJavaScript).not.toHaveBeenCalled();
        });

        test("keeps accepting the current nonce after a same-document navigation (onLoadStart without onLoad)", async () => {
            const payer = renderPayer();
            load();
            act(() => lastWebViewProps().onLoadStart?.());
            await emit("crypto:send-transaction", TX);
            expect(payer.signAndSendTransaction).toHaveBeenCalledTimes(1);
        });

        test("after a second load, drops the old nonce and accepts the new one", async () => {
            const payer = renderPayer();
            const first = load().nonce;
            const second = load().nonce;
            vi.spyOn(console, "warn").mockImplementation(() => undefined);
            await emit("crypto:send-transaction", TX, undefined, first);
            expect(payer.signAndSendTransaction).not.toHaveBeenCalled();
            await emit("crypto:send-transaction", TX, undefined, second);
            expect(payer.signAndSendTransaction).toHaveBeenCalledTimes(1);
        });

        test("drops a request with a null or missing nonce before any load", async () => {
            const payer = renderPayer();
            vi.spyOn(console, "warn").mockImplementation(() => undefined);
            const { onMessage } = lastWebViewProps();
            for (const data of [{ ...TX, __mainFrameNonce: null }, TX]) {
                await act(async () => {
                    onMessage({
                        nativeEvent: { data: JSON.stringify({ event: "crypto:send-transaction", data }), url: ROUTE },
                    });
                });
            }
            expect(payer.signAndSendTransaction).not.toHaveBeenCalled();
        });

        describe("a load of the same route for another session", () => {
            test.each([
                ["credentials", "credentials", "other"],
                ["apiKey", "apiKey", "ck_staging_other"],
            ])("gets no nonce when the %s differs", async (_name, param, value) => {
                const payer = renderPayer();
                vi.spyOn(console, "warn").mockImplementation(() => undefined);
                const own = lastWebViewProps().source.uri as string;
                const { nonce } = load(own);
                expect(nonce).not.toBeNull();
                const changed = new URL(own);
                changed.searchParams.set(param as string, value as string);
                expect(load(changed.toString()).script).toBeUndefined();
                await emit("crypto:send-transaction", TX, undefined, nonce);
                expect(payer.signAndSendTransaction).not.toHaveBeenCalled();
            });

            test("warns once per load that is not stamped", () => {
                renderPayer();
                const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
                load("https://evil.example/page");
                expect(warn).toHaveBeenCalledTimes(1);
                load();
                expect(warn).toHaveBeenCalledTimes(1);
            });

            test("is still stamped when URL and URLSearchParams are unusable", () => {
                renderPayer();
                const own = lastWebViewProps().source.uri as string;
                vi.stubGlobal("URL", () => {
                    throw new Error("not implemented");
                });
                try {
                    expect(load(own).nonce).not.toBeNull();
                } finally {
                    vi.unstubAllGlobals();
                }
            });

            test("the component's own URL gets a nonce", () => {
                renderPayer();
                expect(load(lastWebViewProps().source.uri as string).nonce).not.toBeNull();
            });
        });

        test("uses a fresh nonce for each finished load", () => {
            renderPayer();
            const first = load().nonce;
            const second = load().nonce;
            expect(first).toMatch(/^[0-9a-f]{32}$/);
            expect(second).toMatch(/^[0-9a-f]{32}$/);
            expect(second).not.toBe(first);
        });

        test("passes other events through without a nonce", async () => {
            const onReady = vi.fn();
            render(
                <CrossmintEmbeddedOfframp
                    credentials={CREDENTIALS}
                    payer={{ signAndSendTransaction: vi.fn() }}
                    onReady={onReady}
                />
            );
            await emit("offramp:ready");
            expect(onReady).toHaveBeenCalledTimes(1);
        });

        test("a load finishing on another page clears the nonce and injects nothing", async () => {
            const payer = renderPayer();
            const { nonce } = load();
            vi.spyOn(console, "warn").mockImplementation(() => undefined);
            act(() => lastWebViewProps().onLoad({ nativeEvent: { url: "https://evil.example/page" } }));
            expect(injectJavaScript).not.toHaveBeenCalled();
            await emit("crypto:send-transaction", TX, undefined, nonce);
            expect(payer.signAndSendTransaction).not.toHaveBeenCalled();
        });

        describe("the injected script", () => {
            function runScript(script: string) {
                const postMessage = vi.fn();
                const fakeWindow: { ReactNativeWebView: { postMessage: (message: string) => void } } = {
                    ReactNativeWebView: { postMessage },
                };
                new Function("window", script)(fakeWindow);
                return { postMessage, bridge: fakeWindow.ReactNativeWebView };
            }

            test("stamps the nonce into the data of every message", () => {
                renderPayer();
                const { script, nonce } = load();
                const { postMessage, bridge } = runScript(script as string);
                bridge.postMessage(JSON.stringify({ event: "crypto:sign-message", data: { message: "m" } }));
                expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({
                    event: "crypto:sign-message",
                    data: { message: "m", __mainFrameNonce: nonce },
                });
            });

            test("keeps the newer nonce when the page is stamped twice", () => {
                renderPayer();
                const first = load();
                const second = load();
                const { postMessage, bridge } = runScript(first.script as string);
                const fakeWindow = { ReactNativeWebView: bridge };
                new Function("window", second.script as string)(fakeWindow);
                fakeWindow.ReactNativeWebView.postMessage(JSON.stringify({ event: "e", data: {} }));
                expect(JSON.parse(postMessage.mock.calls[0][0]).data.__mainFrameNonce).toBe(second.nonce);
            });

            test("posts exactly once even when the bridge throws", () => {
                renderPayer();
                const { script } = load();
                const postMessage = vi.fn((_message: string) => {
                    throw new Error("bridge down");
                });
                const fakeWindow = { ReactNativeWebView: { postMessage } };
                new Function("window", script as string)(fakeWindow);
                expect(() => fakeWindow.ReactNativeWebView.postMessage("{}")).toThrow("bridge down");
                expect(postMessage).toHaveBeenCalledTimes(1);
            });

            test("forwards an unparsable message unchanged", () => {
                renderPayer();
                const { script } = load();
                const { postMessage, bridge } = runScript(script as string);
                bridge.postMessage("not json");
                expect(postMessage).toHaveBeenCalledWith("not json");
            });
        });
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

    describe("when the page requests a message signature", () => {
        const SIGN = { message: "crossmint.com wants you to sign in", chain: "solana", payerAddress: "9Wz" };
        const payerSigning = (sign: (request: typeof SIGN) => Promise<string>) => ({
            signAndSendTransaction: vi.fn(),
            signMessage: vi.fn(sign),
        });

        test("signs the request with the payer and replies once with the signature", async () => {
            const payer = payerSigning(async () => "c2ln");
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payer} />);

            await emit("crypto:sign-message", SIGN);

            expect(payer.signMessage).toHaveBeenCalledWith(SIGN);
            expect(payer.signMessage.mock.contexts[0]).toBe(payer);
            expect(injectJavaScript).toHaveBeenCalledTimes(1);
            expect(replies("crypto:sign-message:success")).toEqual([
                { event: "crypto:sign-message:success", data: { signature: "c2ln" } },
            ]);
        });

        test("reports OfframpSignatureRejectedError as rejected", async () => {
            const payer = payerSigning(() => Promise.reject(new OfframpSignatureRejectedError("declined")));
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payer} />);

            await emit("crypto:sign-message", SIGN);

            expect(injectJavaScript).toHaveBeenCalledTimes(1);
            expect(replies("crypto:sign-message:failed")).toEqual([
                { event: "crypto:sign-message:failed", data: { error: "declined", rejected: true } },
            ]);
        });

        test("reports a payer without signMessage as failed, not rejected", async () => {
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction: vi.fn() }} />);

            await emit("crypto:sign-message", SIGN);

            expect(injectJavaScript).toHaveBeenCalledTimes(1);
            expect(replies("crypto:sign-message:failed")).toEqual([
                {
                    event: "crypto:sign-message:failed",
                    data: { error: "This payer cannot sign messages", rejected: false },
                },
            ]);
        });

        test("ignores a second request while one is pending", async () => {
            const signature = deferredTransaction();
            const payer = payerSigning(() => signature.promise);
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payer} />);

            await emit("crypto:sign-message", SIGN);
            await emit("crypto:sign-message", SIGN);
            expect(payer.signMessage).toHaveBeenCalledTimes(1);

            await act(async () => signature.resolve("c2ln"));
            expect(injectJavaScript).toHaveBeenCalledTimes(1);
        });

        test("ignores a pending reply after a new document sends ready, then serves new requests", async () => {
            const oldSignature = deferredTransaction();
            const newSignature = deferredTransaction();
            const payer = payerSigning(
                vi.fn().mockReturnValueOnce(oldSignature.promise).mockReturnValueOnce(newSignature.promise)
            );
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payer} />);
            await emit("crypto:sign-message", SIGN);
            await emit("offramp:ready");
            await emit("crypto:sign-message", SIGN);
            expect(payer.signMessage).toHaveBeenCalledTimes(2);
            await act(async () => oldSignature.resolve("old"));
            expect(injectJavaScript).not.toHaveBeenCalled();
            await act(async () => newSignature.resolve("new"));
            expect(replies("crypto:sign-message:success")).toEqual([
                { event: "crypto:sign-message:success", data: { signature: "new" } },
            ]);
        });

        test("does not reply after unmount", async () => {
            const signature = deferredTransaction();
            const { unmount } = render(
                <CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payerSigning(() => signature.promise)} />
            );
            await emit("crypto:sign-message", SIGN);
            unmount();
            await act(async () => signature.resolve("c2ln"));
            expect(injectJavaScript).not.toHaveBeenCalled();
        });

        test("keeps a delayed reply for the same session across callback updates", async () => {
            const signature = deferredTransaction();
            const payer = payerSigning(() => signature.promise);
            const { rerender } = render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payer} />);
            await emit("crypto:sign-message", SIGN);
            rerender(<CrossmintEmbeddedOfframp credentials={{ ...CREDENTIALS }} payer={payer} onReady={vi.fn()} />);
            await act(async () => signature.resolve("c2ln"));
            expect(replies("crypto:sign-message:success")).toEqual([
                { event: "crypto:sign-message:success", data: { signature: "c2ln" } },
            ]);
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

describe("isSameSession", () => {
    const OWN = "https://h.example/r?apiKey=ck%20a&credentials=%7B%22a%22%3A1%7D";

    test.each([
        ["identical", OWN, true],
        ["+ and %20 both mean a space", "https://h.example/r?credentials=%7B%22a%22%3A1%7D&apiKey=ck+a", true],
        ["different param order", "https://h.example/r?credentials=%7B%22a%22%3A1%7D&apiKey=ck%20a", true],
        ["a fragment", `${OWN}#frag?apiKey=other`, true],
        ["an extra param", `${OWN}&fill=true`, true],
        ["a missing param", "https://h.example/r?apiKey=ck%20a", false],
        ["a different value", "https://h.example/r?apiKey=ck%20b&credentials=%7B%22a%22%3A1%7D", false],
        ["a malformed escape", "https://h.example/r?apiKey=%E0%A4%A&credentials=%7B%22a%22%3A1%7D", false],
    ])("%s", (_name, page, expected) => {
        expect(isSameSession(page as string, OWN)).toBe(expected);
    });

    test("is false when both URLs lack the params", () => {
        expect(isSameSession("https://h.example/r", "https://h.example/r")).toBe(false);
    });
});

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
        load();
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

    test("keeps pending send and sign replies when the page only updates its URL (onLoadStart, same document)", async () => {
        const send = deferredTransaction();
        const sign = deferredTransaction();
        const payer = {
            signAndSendTransaction: vi.fn().mockReturnValue(send.promise),
            signMessage: vi.fn().mockReturnValue(sign.promise),
        };
        render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payer} />);
        await emit("crypto:send-transaction", TX);
        await emit("crypto:sign-message", { message: "m", chain: "solana", payerAddress: "9Wz" });
        act(() => lastWebViewProps().onLoadStart?.());
        await act(async () => {
            send.resolve("0xtx");
            sign.resolve("c2ln");
        });
        expect(replies("crypto:send-transaction:success")).toHaveLength(1);
        expect(replies("crypto:sign-message:success")).toHaveLength(1);
    });

    test("ignores a pending reply after a new document sends ready, then serves new requests", async () => {
        const oldTransaction = deferredTransaction();
        const newTransaction = deferredTransaction();
        const signer = vi.fn().mockReturnValueOnce(oldTransaction.promise).mockReturnValueOnce(newTransaction.promise);
        render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction: signer }} />);
        await emit("crypto:send-transaction", TX);
        await emit("offramp:ready");
        await emit("crypto:send-transaction", TX);
        expect(signer).toHaveBeenCalledTimes(2);
        await act(async () => oldTransaction.resolve("old-tx"));
        expect(injectJavaScript).not.toHaveBeenCalled();
        await emit("crypto:send-transaction", TX);
        expect(signer).toHaveBeenCalledTimes(2);
        await act(async () => newTransaction.resolve("new-tx"));
        expect(replies("crypto:send-transaction:success")).toEqual([
            { event: "crypto:send-transaction:success", data: { txId: "new-tx" } },
        ]);
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
