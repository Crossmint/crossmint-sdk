import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, test, vi } from "vitest";

import { createCrossmint } from "@crossmint/common-sdk-base";
import { CrossmintWallets, WalletNotAvailableError } from "@crossmint/wallets-sdk";

import { CrossmintProvider } from "@/providers/CrossmintProvider";
import { CrossmintWalletBaseProvider } from "./CrossmintWalletBaseProvider";
import { useWallet } from "@/hooks/useWallet";
import type { CreateOnLogin } from "@/types";

const MOCK_API_KEY =
    "sk_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuSvnKeGiqY654DoBuuZEzYz4Eb8gRV2ePqQ1fxTjEP8tTaUQdzbGfyG9RgyeN5YbqViXinqxk8EayEkAGtvSSgjpjEr6iaBptJtUFwPW59DjQzTQP6P8uZdiajenVg7bARGKjzFyByNuVEoz41DpRB4hDZNFdwCTuf5joFv";

vi.mock("@crossmint/common-sdk-base", async () => {
    const actual = await vi.importActual("@crossmint/common-sdk-base");
    return { ...actual, createCrossmint: vi.fn() };
});
vi.mock("@/logger/init", () => ({
    initReactLogger: vi.fn(() => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("../../package.json", () => ({ default: { name: "test", version: "0.0.0" } }));

function TestConsumer() {
    const { wallet, status, error } = useWallet();
    return (
        <div>
            <div data-testid="status">{status}</div>
            <div data-testid="chain">{wallet?.chain ?? ""}</div>
            <div data-testid="error">{error?.message ?? ""}</div>
        </div>
    );
}

type GetWallet = ReturnType<typeof useWallet>["getWallet"];

function TestSwitcher({ onReady }: { onReady: (getWallet: GetWallet) => void }) {
    const { wallet, status, getWallet } = useWallet();
    useEffect(() => {
        onReady(getWallet);
    }, [getWallet, onReady]);
    return (
        <div>
            <div data-testid="status">{status}</div>
            <div data-testid="chain">{wallet?.chain ?? ""}</div>
        </div>
    );
}

function renderWithCreateOnLogin(createOnLogin: CreateOnLogin) {
    return render(
        <CrossmintProvider apiKey={MOCK_API_KEY}>
            <CrossmintWalletBaseProvider createOnLogin={createOnLogin}>
                <TestConsumer />
            </CrossmintWalletBaseProvider>
        </CrossmintProvider>
    );
}

describe("CrossmintWalletBaseProvider — createOnLogin wallet cache", () => {
    test("reloads the wallet when createOnLogin requests a different chain", async () => {
        vi.mocked(createCrossmint).mockImplementation(() => ({ apiKey: MOCK_API_KEY, jwt: "jwt", setJwt: vi.fn() }));
        let callCount = 0;
        const createWallet = vi.fn(({ chain }: { chain: string }) => {
            callCount++;
            return { chain, alias: undefined };
        });
        vi.spyOn(CrossmintWallets, "from").mockReturnValue({
            getWallet: vi.fn().mockRejectedValue(new WalletNotAvailableError("not found")),
            createWallet,
        } as unknown as CrossmintWallets);

        const { getByTestId, rerender } = renderWithCreateOnLogin({ chain: "ethereum" });

        await waitFor(() => expect(getByTestId("chain").textContent).toBe("ethereum"));
        expect(callCount).toBe(1);

        rerender(
            <CrossmintProvider apiKey={MOCK_API_KEY}>
                <CrossmintWalletBaseProvider createOnLogin={{ chain: "solana" }}>
                    <TestConsumer />
                </CrossmintWalletBaseProvider>
            </CrossmintProvider>
        );

        await waitFor(() => expect(getByTestId("chain").textContent).toBe("solana"));
        expect(callCount).toBe(2);
    });

    test("does not reload when the API resolves the requested chain to a different one, e.g. a staging key auto-converting a mainnet chain to its testnet equivalent", async () => {
        vi.mocked(createCrossmint).mockImplementation(() => ({ apiKey: MOCK_API_KEY, jwt: "jwt", setJwt: vi.fn() }));
        let callCount = 0;
        const createWallet = vi.fn(() => {
            callCount++;
            // The API key's environment converts the requested "base" to "base-sepolia", so the
            // loaded wallet's own `.chain` differs from the chain `createOnLogin` asked for.
            return { chain: "base-sepolia", alias: undefined };
        });
        vi.spyOn(CrossmintWallets, "from").mockReturnValue({
            getWallet: vi.fn().mockRejectedValue(new WalletNotAvailableError("not found")),
            createWallet,
        } as unknown as CrossmintWallets);

        const { getByTestId, rerender } = renderWithCreateOnLogin({ chain: "base" });

        await waitFor(() => expect(getByTestId("chain").textContent).toBe("base-sepolia"));
        expect(callCount).toBe(1);

        rerender(
            <CrossmintProvider apiKey={MOCK_API_KEY}>
                <CrossmintWalletBaseProvider createOnLogin={{ chain: "base" }}>
                    <TestConsumer />
                </CrossmintWalletBaseProvider>
            </CrossmintProvider>
        );

        await waitFor(() => expect(getByTestId("status").textContent).toBe("loaded"));
        expect(callCount).toBe(1);
    });

    test("keeps a wallet the consumer switched to with getWallet, instead of re-running createOnLogin for its chain", async () => {
        vi.mocked(createCrossmint).mockImplementation(() => ({ apiKey: MOCK_API_KEY, jwt: "jwt", setJwt: vi.fn() }));
        const chainsLoaded: string[] = [];
        const getWallet = vi.fn(({ chain }: { chain: string }) => {
            chainsLoaded.push(chain);
            // The createOnLogin chain does not exist yet on first load; everything else resolves.
            if (chain === "ethereum" && chainsLoaded.filter((c) => c === "ethereum").length === 1) {
                return Promise.reject(new WalletNotAvailableError("not found"));
            }
            return Promise.resolve({ chain, alias: undefined });
        });
        const createWallet = vi.fn(({ chain }: { chain: string }) => Promise.resolve({ chain, alias: undefined }));
        vi.spyOn(CrossmintWallets, "from").mockReturnValue({ getWallet, createWallet } as unknown as CrossmintWallets);

        let latestGetWallet: GetWallet | undefined;
        const { getByTestId } = render(
            <CrossmintProvider apiKey={MOCK_API_KEY}>
                <CrossmintWalletBaseProvider createOnLogin={{ chain: "ethereum" }}>
                    <TestSwitcher onReady={(fn) => (latestGetWallet = fn)} />
                </CrossmintWalletBaseProvider>
            </CrossmintProvider>
        );

        await waitFor(() => expect(getByTestId("chain").textContent).toBe("ethereum"));
        expect(createWallet).toHaveBeenCalledTimes(1);

        await act(async () => {
            await latestGetWallet?.({ chain: "solana" });
        });

        await waitFor(() => expect(getByTestId("chain").textContent).toBe("solana"));
        // Let any effect cascade triggered by the wallet change settle.
        await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

        expect(getByTestId("chain").textContent).toBe("solana");
        expect(chainsLoaded).toEqual(["ethereum", "solana"]);
        expect(createWallet).toHaveBeenCalledTimes(1);
    });
});
