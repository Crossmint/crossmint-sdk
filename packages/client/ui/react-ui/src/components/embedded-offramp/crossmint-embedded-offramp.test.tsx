import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
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
            getUrl: () => "https://staging.crossmint.com/sdk/unstable/embedded-offramp?credentials=%7B%7D",
            createClient: () => iframeClient,
        },
    }),
}));
vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: () => ({ crossmint: { apiKey: "ck_staging_key" } }),
}));
vi.mock("@/utils/createCrossmintApiClient", () => ({ createCrossmintApiClient: () => ({}) }));

const credentials = { sessionId: "ofs_1", clientSecret: "jwt" };
const emit = (event: string, data: unknown) => act(() => listeners.get(event)?.(data));

const tx = { serializedTransaction: "0x", chain: "base", payerAddress: "0xabc" };
const sendTx = () =>
    act(async () => {
        void listeners.get("crypto:send-transaction")?.(tx);
    });

describe("<CrossmintEmbeddedOfframp />", () => {
    afterEach(() => {
        cleanup();
        listeners.clear();
        vi.clearAllMocks();
    });

    test("renders the offramp iframe with camera access for KYC", () => {
        render(<CrossmintEmbeddedOfframp credentials={credentials} payer={{ signAndSendTransaction: vi.fn() }} />);
        const iframe = screen.getByTitle("Withdraw");
        expect(iframe.getAttribute("src")).toContain("/sdk/unstable/embedded-offramp");
        expect(iframe.getAttribute("allow")).toBe("camera");
    });

    test("forwards completion and errors to the callbacks", () => {
        const onComplete = vi.fn();
        const onError = vi.fn();
        render(
            <CrossmintEmbeddedOfframp
                credentials={credentials}
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
            render(<CrossmintEmbeddedOfframp credentials={credentials} payer={{ signAndSendTransaction }} />);
            await sendTx();
            expect(signAndSendTransaction).toHaveBeenCalledWith(tx);
            expect(iframeClient.send).toHaveBeenCalledTimes(1);
            expect(iframeClient.send).toHaveBeenCalledWith("crypto:send-transaction:success", { txId: "0xtx" });
        });

        test("reports a rejection when the payer says so", async () => {
            const rejected = Object.assign(new Error("declined"), { rejected: true });
            render(
                <CrossmintEmbeddedOfframp
                    credentials={credentials}
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
                    credentials={credentials}
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
                    credentials={credentials}
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
            render(<CrossmintEmbeddedOfframp credentials={credentials} payer={{ signAndSendTransaction }} />);
            await sendTx();
            await sendTx();
            expect(signAndSendTransaction).toHaveBeenCalledTimes(1);
            await act(async () => resolveSend("0xtx"));
            expect(iframeClient.send).toHaveBeenCalledTimes(1);
            expect(iframeClient.send).toHaveBeenCalledWith("crypto:send-transaction:success", { txId: "0xtx" });
        });
    });
});
