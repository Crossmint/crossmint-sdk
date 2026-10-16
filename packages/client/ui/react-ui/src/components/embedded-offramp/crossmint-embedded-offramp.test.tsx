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

    test("signs and replies with the txId", async () => {
        const signAndSendTransaction = vi.fn().mockResolvedValue("0xtx");
        render(<CrossmintEmbeddedOfframp credentials={credentials} payer={{ signAndSendTransaction }} />);
        await act(async () =>
            listeners.get("crypto:send-transaction")?.({
                serializedTransaction: "0x",
                chain: "base",
                payerAddress: "0xabc",
            })
        );
        expect(signAndSendTransaction).toHaveBeenCalledWith({
            serializedTransaction: "0x",
            chain: "base",
            payerAddress: "0xabc",
        });
        expect(iframeClient.send).toHaveBeenCalledWith("crypto:send-transaction:success", { txId: "0xtx" });
    });

    test("reports a rejection only when the payer says so", async () => {
        const rejected = Object.assign(new Error("declined"), { rejected: true });
        render(
            <CrossmintEmbeddedOfframp
                credentials={credentials}
                payer={{ signAndSendTransaction: vi.fn().mockRejectedValue(rejected) }}
            />
        );
        await act(async () =>
            listeners.get("crypto:send-transaction")?.({
                serializedTransaction: "0x",
                chain: "base",
                payerAddress: "0xabc",
            })
        );
        expect(iframeClient.send).toHaveBeenCalledWith("crypto:send-transaction:failed", {
            error: "declined",
            rejected: true,
        });
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
});
