import { render, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { createCrossmint } from "@crossmint/common-sdk-base";
import { CrossmintWallets } from "@crossmint/wallets-sdk";

import { CrossmintProvider } from "@/providers/CrossmintProvider";
import { CrossmintWalletBaseProvider } from "./CrossmintWalletBaseProvider";
import { useWallet } from "@/hooks/useWallet";

const MOCK_API_KEY =
    "sk_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuSvnKeGiqY654DoBuuZEzYz4Eb8gRV2ePqQ1fxTjEP8tTaUQdzbGfyG9RgyeN5YbqViXinqxk8EayEkAGtvSSgjpjEr6iaBptJtUFwPW59DjQzTQP6P8uZdiajenVg7bARGKjzFyByNuVEoz41DpRB4hDZNFdwCTuf5joFv";

vi.mock("@crossmint/common-sdk-base", async () => {
    const actual = await vi.importActual("@crossmint/common-sdk-base");
    return { ...actual, createCrossmint: vi.fn() };
});
vi.mock("@/logger/init", () => ({
    initReactLogger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("../../package.json", () => ({ default: { name: "test", version: "0.0.0" } }));

function Status() {
    const { status } = useWallet();
    return <div data-testid="status">{status}</div>;
}

describe("React Native: a loaded wallet whose own recovery is an email key", () => {
    test("gets the signer WebView connection, though createOnLogin names no email key", async () => {
        // Mirrors the RN provider: the connection throws until initializeWebView runs.
        let ready = false;
        const connection = { name: "signer-webview" };
        const initializeWebView = vi.fn(async () => {
            ready = true;
        });
        const clientTEEConnection = () => {
            if (!ready) {
                throw new Error("WebView not ready or handshake incomplete");
            }
            return connection;
        };
        // Returning user: the wallet on the server has email recovery (e.g. created under an older app config).
        const getWallet = vi.fn(async ({ chain }: { chain: string }) => ({
            chain,
            alias: undefined,
            recoveryMethods: [{ type: "email", email: "alice@example.com" }],
        }));
        vi.mocked(createCrossmint).mockImplementation(() => ({ apiKey: MOCK_API_KEY, jwt: "jwt", setJwt: vi.fn() }));
        vi.spyOn(CrossmintWallets, "from").mockReturnValue({ getWallet, createWallet: vi.fn() } as never);

        const { getByTestId } = render(
            <CrossmintProvider apiKey={MOCK_API_KEY}>
                <CrossmintWalletBaseProvider
                    createOnLogin={{
                        chain: "base-sepolia",
                        recovery: { type: "external-wallet", address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
                    }}
                    initializeWebView={initializeWebView}
                    clientTEEConnection={clientTEEConnection as never}
                >
                    <Status />
                </CrossmintWalletBaseProvider>
            </CrossmintProvider>
        );

        await waitFor(() => expect(getByTestId("status").textContent).toBe("loaded"));
        const options = (getWallet.mock.calls.at(-1)?.[0] as { options: { clientTEEConnection?: unknown } }).options;
        // The wallet SDK builds the email signer from this connection; without it NcsSigner falls back to the DOM iframe.
        expect(options.clientTEEConnection).toBe(connection);
    });
});
