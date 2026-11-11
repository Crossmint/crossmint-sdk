import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CrossmintEmbeddedOfframp } from "./CrossmintEmbeddedOfframp";

const listeners = new Map<string, (data: unknown) => void>();
const iframeClient = {
    on: vi.fn((event: string, handler: (data: unknown) => void) => {
        listeners.set(event, handler);
        return `listener-id:${event}`;
    }),
    off: vi.fn(),
    send: vi.fn(),
};

vi.mock("@crossmint/client-sdk-base", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@crossmint/client-sdk-base")>()),
    createEmbeddedOfframpService: () => ({
        iframe: {
            getUrl: (props: { credentials: unknown }) =>
                `https://staging.crossmint.com/sdk/unstable/embedded-offramp?credentials=${JSON.stringify(props.credentials)}`,
            createClient: () => iframeClient,
        },
    }),
}));
vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: () => ({ crossmint: { apiKey: "ck_staging_key" } }),
}));
vi.mock("@/utils/createCrossmintApiClient", () => ({ createCrossmintApiClient: () => ({}) }));

const CREDENTIALS = { sessionId: "ofs_1", clientSecret: "jwt" };
const emit = (event: string, data: unknown) => act(() => listeners.get(event)?.(data));

const TX = { serializedTransaction: "0x", chain: "base", payerAddress: "0xabc" };
const sendTx = () =>
    act(async () => {
        void listeners.get("crypto:send-transaction")?.(TX);
    });

afterEach(() => {
    cleanup();
    listeners.clear();
    vi.clearAllMocks();
});

describe("<CrossmintEmbeddedOfframp />", () => {
    test("renders the offramp iframe with camera access for KYC", () => {
        render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction: vi.fn() }} />);
        const iframe = screen.getByTitle("Withdraw");
        expect(iframe.getAttribute("src")).toContain("/sdk/unstable/embedded-offramp");
        expect(iframe.getAttribute("allow")).toBe("camera");
    });

    test("sizes the iframe to the reported content height", () => {
        render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction: vi.fn() }} />);
        emit("ui:height.changed", { height: 720 });
        expect(screen.getByTitle("Withdraw").style.height).toBe("720px");
    });

    describe("when fill is on", () => {
        test("fills the container and ignores content height changes", () => {
            render(
                <CrossmintEmbeddedOfframp
                    credentials={CREDENTIALS}
                    payer={{ signAndSendTransaction: vi.fn() }}
                    fill={true}
                />
            );
            emit("ui:height.changed", { height: 720 });
            const { style } = screen.getByTitle("Withdraw");
            expect(style.height).toBe("100%");
            expect(style.width).toBe("100%");
            expect(style.display).toBe("block");
        });
    });

    test("forwards completion and errors to the callbacks", () => {
        const onComplete = vi.fn();
        const onError = vi.fn();
        render(
            <CrossmintEmbeddedOfframp
                credentials={CREDENTIALS}
                payer={{ signAndSendTransaction: vi.fn() }}
                onComplete={onComplete}
                onError={onError}
            />
        );
        emit("offramp:completed", { orderId: "o1", txId: "0xtx" });
        emit("offramp:error", { reason: "session-spent", retriable: false, message: "spent" });
        expect(onComplete).toHaveBeenCalledWith({ orderId: "o1", txId: "0xtx" });
        expect(onError).toHaveBeenCalledWith({ reason: "session-spent", retriable: false, message: "spent" });
    });

    describe("when the iframe requests a transaction", () => {
        test("signs and replies once with the txId", async () => {
            const signAndSendTransaction = vi.fn().mockResolvedValue("0xtx");
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction }} />);
            await sendTx();
            expect(signAndSendTransaction).toHaveBeenCalledWith(TX);
            expect(iframeClient.send).toHaveBeenCalledTimes(1);
            expect(iframeClient.send).toHaveBeenCalledWith("crypto:send-transaction:success", { txId: "0xtx" });
        });

        test("reports a rejection when the payer says so", async () => {
            const rejected = Object.assign(new Error("declined"), { rejected: true });
            render(
                <CrossmintEmbeddedOfframp
                    credentials={CREDENTIALS}
                    payer={{ signAndSendTransaction: vi.fn().mockRejectedValue(rejected) }}
                />
            );
            await sendTx();
            expect(iframeClient.send).toHaveBeenCalledTimes(1);
            expect(iframeClient.send).toHaveBeenCalledWith("crypto:send-transaction:failed", {
                error: "declined",
                rejected: true,
            });
        });

        test.each([
            ["a plain error", new Error("boom")],
            ["a confirmation timeout", new Error("Transaction confirmation timeout")],
        ])("reports %s as not rejected", async (_name, error) => {
            render(
                <CrossmintEmbeddedOfframp
                    credentials={CREDENTIALS}
                    payer={{ signAndSendTransaction: vi.fn().mockRejectedValue(error) }}
                />
            );
            await sendTx();
            expect(iframeClient.send).toHaveBeenCalledTimes(1);
            expect(iframeClient.send).toHaveBeenCalledWith("crypto:send-transaction:failed", {
                error: error.message,
                rejected: false,
            });
        });

        test.each([[undefined], [""], [42]])("reports a non-string txId (%s) as not rejected", async (txId) => {
            render(
                <CrossmintEmbeddedOfframp
                    credentials={CREDENTIALS}
                    payer={{ signAndSendTransaction: vi.fn().mockResolvedValue(txId) }}
                />
            );
            await sendTx();
            expect(iframeClient.send).toHaveBeenCalledTimes(1);
            expect(iframeClient.send).toHaveBeenCalledWith("crypto:send-transaction:failed", {
                error: expect.any(String),
                rejected: false,
            });
        });

        test("ignores a second request while one is pending", async () => {
            let resolveSend: (txId: string) => void = () => {};
            const signAndSendTransaction = vi
                .fn()
                .mockReturnValue(new Promise<string>((resolve) => (resolveSend = resolve)));
            render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction }} />);
            await sendTx();
            await sendTx();
            expect(signAndSendTransaction).toHaveBeenCalledTimes(1);
            await act(async () => resolveSend("0xtx"));
            expect(iframeClient.send).toHaveBeenCalledTimes(1);
            expect(iframeClient.send).toHaveBeenCalledWith("crypto:send-transaction:success", { txId: "0xtx" });
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
        await sendTx();
        rerender(
            <CrossmintEmbeddedOfframp
                credentials={{ sessionId: "ofs_2", clientSecret: "jwt_2" }}
                payer={{ signAndSendTransaction: newSigner }}
            />
        );
        await sendTx();
        expect(newSigner).toHaveBeenCalledTimes(1);
        await act(async () => {
            if (outcome === "success") {
                oldTransaction.resolve("old-tx");
            } else {
                oldTransaction.reject(new Error("old rejection"));
            }
            await Promise.resolve();
        });
        expect(iframeClient.send).not.toHaveBeenCalled();
        await sendTx();
        expect(newSigner).toHaveBeenCalledTimes(1);
        await act(async () => newTransaction.resolve("new-tx"));
        expect(iframeClient.send).toHaveBeenCalledTimes(1);
    });

    test("ignores a pending reply after the document reloads", async () => {
        const oldTransaction = deferredTransaction();
        const newTransaction = deferredTransaction();
        const signer = vi.fn().mockReturnValueOnce(oldTransaction.promise).mockReturnValueOnce(newTransaction.promise);
        render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={{ signAndSendTransaction: signer }} />);
        fireEvent.load(screen.getByTitle("Withdraw"));
        await sendTx();
        fireEvent.load(screen.getByTitle("Withdraw"));
        await sendTx();
        expect(signer).toHaveBeenCalledTimes(2);
        await act(async () => oldTransaction.resolve("old-tx"));
        expect(iframeClient.send).not.toHaveBeenCalled();
        await sendTx();
        expect(signer).toHaveBeenCalledTimes(2);
        await act(async () => newTransaction.resolve("new-tx"));
        expect(iframeClient.send).toHaveBeenCalledTimes(1);
    });

    test("does not reply after unmount", async () => {
        const transaction = deferredTransaction();
        const { unmount } = render(
            <CrossmintEmbeddedOfframp
                credentials={CREDENTIALS}
                payer={{ signAndSendTransaction: () => transaction.promise }}
            />
        );
        await sendTx();
        unmount();
        await act(async () => transaction.resolve("old-tx"));
        expect(iframeClient.send).not.toHaveBeenCalled();
    });

    test("keeps a delayed reply for the same session across callback updates", async () => {
        vi.useFakeTimers();
        try {
            const transaction = deferredTransaction();
            const payer = { signAndSendTransaction: vi.fn().mockReturnValue(transaction.promise) };
            const { rerender } = render(<CrossmintEmbeddedOfframp credentials={CREDENTIALS} payer={payer} />);
            await sendTx();
            rerender(<CrossmintEmbeddedOfframp credentials={{ ...CREDENTIALS }} payer={payer} onReady={vi.fn()} />);
            await act(async () => vi.advanceTimersByTime(121_000));
            await sendTx();
            expect(payer.signAndSendTransaction).toHaveBeenCalledTimes(1);
            await act(async () => transaction.resolve("late-tx"));
            expect(iframeClient.send).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });
});
