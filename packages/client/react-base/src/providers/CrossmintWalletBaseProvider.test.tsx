import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { createCrossmint, CrossmintSDKError, WalletErrorCode } from "@crossmint/common-sdk-base";
import { CrossmintWallets, type DeviceSignerKeyStorage, WalletNotAvailableError } from "@crossmint/wallets-sdk";

import { CrossmintProvider } from "@/providers/CrossmintProvider";
import { CrossmintWalletBaseProvider } from "./CrossmintWalletBaseProvider";
import { useCrossmint } from "@/hooks/useCrossmint";
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
    const { setJwt } = useCrossmint();
    return (
        <div>
            <div data-testid="status">{status}</div>
            <div data-testid="chain">{wallet?.chain ?? ""}</div>
            <div data-testid="error">{error?.message ?? ""}</div>
            <button type="button" onClick={() => setJwt("refreshed-jwt")}>
                refresh jwt
            </button>
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
});

describe("CrossmintWalletBaseProvider — createOnLogin failure", () => {
    function failingWallets(createWallet: ReturnType<typeof vi.fn>) {
        vi.mocked(createCrossmint).mockImplementation(() => ({ apiKey: MOCK_API_KEY, jwt: "jwt", setJwt: vi.fn() }));
        vi.spyOn(CrossmintWallets, "from").mockReturnValue({
            getWallet: vi.fn().mockRejectedValue(new WalletNotAvailableError("not found")),
            createWallet,
        } as unknown as CrossmintWallets);
    }

    test("settles on error once when createWallet keeps failing, instead of retrying forever", async () => {
        const createWallet = vi.fn().mockRejectedValue(new Error("A recovery method is required"));
        failingWallets(createWallet);

        const { getByTestId } = renderWithCreateOnLogin({ chain: "ethereum" });

        await waitFor(() => expect(getByTestId("status").textContent).toBe("error"));
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(createWallet).toHaveBeenCalledTimes(1);
        expect(getByTestId("status").textContent).toBe("error");
        expect(getByTestId("error").textContent).toBe("A recovery method is required");
    });

    test("retries when the recovery configuration is corrected on the same chain and alias", async () => {
        const createWallet = vi.fn(({ chain, recovery }: { chain: string; recovery?: unknown }) => {
            if (recovery == null) {
                return Promise.reject(new Error("A recovery method is required"));
            }
            return Promise.resolve({ chain, alias: undefined });
        });
        failingWallets(createWallet);

        const { getByTestId, rerender } = renderWithCreateOnLogin({ chain: "ethereum" });
        await waitFor(() => expect(getByTestId("status").textContent).toBe("error"));

        rerender(
            <CrossmintProvider apiKey={MOCK_API_KEY}>
                <CrossmintWalletBaseProvider
                    createOnLogin={{ chain: "ethereum", recovery: { type: "email", email: "owner@example.com" } }}
                >
                    <TestConsumer />
                </CrossmintWalletBaseProvider>
            </CrossmintProvider>
        );

        await waitFor(() => expect(getByTestId("status").textContent).toBe("loaded"));
        expect(createWallet).toHaveBeenCalledTimes(2);
    });

    test("retries after the JWT is replaced by a new one", async () => {
        const createWallet = vi
            .fn()
            .mockRejectedValueOnce(new Error("Unauthorized"))
            .mockResolvedValue({ chain: "ethereum", alias: undefined });
        failingWallets(createWallet);

        const { getByTestId, getByText } = renderWithCreateOnLogin({ chain: "ethereum" });
        await waitFor(() => expect(getByTestId("status").textContent).toBe("error"));
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(createWallet).toHaveBeenCalledTimes(1);

        fireEvent.click(getByText("refresh jwt"));

        await waitFor(() => expect(getByTestId("status").textContent).toBe("loaded"));
        expect(createWallet).toHaveBeenCalledTimes(2);
    });

    test("retries when createOnLogin changes after a failure", async () => {
        const createWallet = vi.fn(({ chain }: { chain: string }) => {
            if (chain === "ethereum") {
                return Promise.reject(new Error("A recovery method is required"));
            }
            return Promise.resolve({ chain, alias: undefined });
        });
        failingWallets(createWallet);

        const { getByTestId, rerender } = renderWithCreateOnLogin({ chain: "ethereum" });
        await waitFor(() => expect(getByTestId("status").textContent).toBe("error"));

        rerender(
            <CrossmintProvider apiKey={MOCK_API_KEY}>
                <CrossmintWalletBaseProvider createOnLogin={{ chain: "solana" }}>
                    <TestConsumer />
                </CrossmintWalletBaseProvider>
            </CrossmintProvider>
        );

        await waitFor(() => expect(getByTestId("chain").textContent).toBe("solana"));
        expect(createWallet).toHaveBeenCalledTimes(2);
        expect(getByTestId("status").textContent).toBe("loaded");
    });
});

describe("CrossmintWalletBaseProvider — createOnLogin switched while a load is in flight", () => {
    test("ends on the wallet for the latest createOnLogin, not the one that was loading", async () => {
        vi.mocked(createCrossmint).mockImplementation(() => ({ apiKey: MOCK_API_KEY, jwt: "jwt", setJwt: vi.fn() }));
        const createWallet = vi.fn(({ chain }: { chain: string }) => {
            const delay = chain === "ethereum" ? 60 : 0;
            return new Promise((resolve) => setTimeout(() => resolve({ chain, alias: undefined }), delay));
        });
        vi.spyOn(CrossmintWallets, "from").mockReturnValue({
            getWallet: vi.fn().mockRejectedValue(new WalletNotAvailableError("not found")),
            createWallet,
        } as unknown as CrossmintWallets);

        const { getByTestId, rerender } = renderWithCreateOnLogin({ chain: "ethereum" });
        await waitFor(() => expect(getByTestId("status").textContent).toBe("in-progress"));

        rerender(
            <CrossmintProvider apiKey={MOCK_API_KEY}>
                <CrossmintWalletBaseProvider createOnLogin={{ chain: "solana" }}>
                    <TestConsumer />
                </CrossmintWalletBaseProvider>
            </CrossmintProvider>
        );

        await waitFor(() => expect(getByTestId("chain").textContent).toBe("solana"), { timeout: 1500 });
        expect(createWallet).toHaveBeenCalledTimes(2);
    });
});

describe("CrossmintWalletBaseProvider — error reporting", () => {
    function TestErrorConsumer() {
        const { status, error } = useWallet();
        return (
            <div>
                <div data-testid="status">{status}</div>
                <div data-testid="error-code">{error?.code ?? ""}</div>
                <div data-testid="error">{error?.message ?? ""}</div>
            </div>
        );
    }

    function renderFailing(rejected: unknown) {
        vi.mocked(createCrossmint).mockImplementation(() => ({ apiKey: MOCK_API_KEY, jwt: "jwt", setJwt: vi.fn() }));
        vi.spyOn(CrossmintWallets, "from").mockReturnValue({
            getWallet: vi.fn().mockRejectedValue(new WalletNotAvailableError("not found")),
            createWallet: vi.fn().mockRejectedValue(rejected),
        } as unknown as CrossmintWallets);
        return render(
            <CrossmintProvider apiKey={MOCK_API_KEY}>
                <CrossmintWalletBaseProvider createOnLogin={{ chain: "ethereum" }}>
                    <TestErrorConsumer />
                </CrossmintWalletBaseProvider>
            </CrossmintProvider>
        );
    }

    test("preserves the SDK error code on useWallet().error", async () => {
        const { getByTestId } = renderFailing(
            new CrossmintSDKError("A quorum requires members", WalletErrorCode.SIGNER_INVALID)
        );

        await waitFor(() => expect(getByTestId("status").textContent).toBe("error"));
        expect(getByTestId("error-code").textContent).toBe("wallet:signer-invalid");
        expect(getByTestId("error").textContent).toBe("A quorum requires members");
    });

    test("reports a config TypeError as unknown", async () => {
        const { getByTestId } = renderFailing(new TypeError("Cannot read properties of null (reading 'type')"));

        await waitFor(() => expect(getByTestId("status").textContent).toBe("error"));
        expect(getByTestId("error-code").textContent).toBe("unknown");
    });
});

describe("CrossmintWalletBaseProvider — concurrent createWallet", () => {
    function TestCreateConsumer() {
        const { status, error, wallet, createWallet } = useWallet();
        const args = { chain: "ethereum", recovery: { type: "email", email: "owner@example.com" } } as const;
        return (
            <div>
                <div data-testid="status">{status}</div>
                <div data-testid="chain">{wallet?.chain ?? ""}</div>
                <div data-testid="error">{error?.message ?? ""}</div>
                <button
                    type="button"
                    onClick={() => {
                        void createWallet({ ...args });
                        void createWallet({ ...args });
                    }}
                >
                    create twice
                </button>
            </div>
        );
    }

    function renderCreate(createWalletImpl: ReturnType<typeof vi.fn>) {
        vi.mocked(createCrossmint).mockImplementation(() => ({ apiKey: MOCK_API_KEY, jwt: "jwt", setJwt: vi.fn() }));
        vi.spyOn(CrossmintWallets, "from").mockReturnValue({
            createWallet: createWalletImpl,
        } as unknown as CrossmintWallets);
        return render(
            <CrossmintProvider apiKey={MOCK_API_KEY}>
                <CrossmintWalletBaseProvider>
                    <TestCreateConsumer />
                </CrossmintWalletBaseProvider>
            </CrossmintProvider>
        );
    }

    test("sends a single request for two calls fired in the same tick", async () => {
        const createWallet = vi
            .fn()
            .mockImplementation(
                ({ chain }: { chain: string }) =>
                    new Promise((resolve) => setTimeout(() => resolve({ chain, alias: undefined }), 20))
            );
        const { getByTestId, getByText } = renderCreate(createWallet);

        fireEvent.click(getByText("create twice"));

        await waitFor(() => expect(getByTestId("status").textContent).toBe("loaded"));
        expect(createWallet).toHaveBeenCalledTimes(1);
        expect(getByTestId("error").textContent).toBe("");
    });
});

describe("CrossmintWalletBaseProvider — calls overlapping a session change or a read", () => {
    const createArgs = { chain: "ethereum", recovery: { type: "email", email: "owner@example.com" } } as const;

    function TestOverlapConsumer() {
        const { status, wallet, getWallet, createWallet } = useWallet();
        const { crossmint, setJwt } = useCrossmint();
        return (
            <div>
                <div data-testid="status">{status}</div>
                <div data-testid="chain">{wallet?.chain ?? ""}</div>
                <div data-testid="jwt">{crossmint.jwt ?? ""}</div>
                <button type="button" onClick={() => void createWallet({ ...createArgs })}>
                    create
                </button>
                <button type="button" onClick={() => void getWallet({ chain: "solana" })}>
                    read
                </button>
                <button type="button" onClick={() => setJwt("refreshed-jwt")}>
                    refresh jwt
                </button>
            </div>
        );
    }

    function renderOverlap(wallets: Partial<CrossmintWallets>) {
        vi.mocked(createCrossmint).mockImplementation(() => ({ apiKey: MOCK_API_KEY, jwt: "jwt", setJwt: vi.fn() }));
        vi.spyOn(CrossmintWallets, "from").mockReturnValue(wallets as CrossmintWallets);
        return render(
            <CrossmintProvider apiKey={MOCK_API_KEY}>
                <CrossmintWalletBaseProvider>
                    <TestOverlapConsumer />
                </CrossmintWalletBaseProvider>
            </CrossmintProvider>
        );
    }

    function resolveAfter(chain: string, delayMs: number) {
        return new Promise((resolve) => setTimeout(() => resolve({ chain, alias: undefined }), delayMs));
    }

    test("sends a new request when the same args are used after the JWT changed", async () => {
        const createWallet = vi.fn(() => resolveAfter("ethereum", 60));
        const { getByTestId, getByText } = renderOverlap({ createWallet } as unknown as Partial<CrossmintWallets>);

        fireEvent.click(getByText("create"));
        fireEvent.click(getByText("refresh jwt"));
        await waitFor(() => expect(getByTestId("jwt").textContent).toBe("refreshed-jwt"));
        fireEvent.click(getByText("create"));

        await waitFor(() => expect(createWallet).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(getByTestId("status").textContent).toBe("loaded"));
    });

    test("keeps the wallet created after a slower read that started first", async () => {
        const getWallet = vi.fn(() => resolveAfter("solana", 60));
        const createWallet = vi.fn(() => resolveAfter("ethereum", 0));
        const { getByTestId, getByText } = renderOverlap({
            getWallet,
            createWallet,
        } as unknown as Partial<CrossmintWallets>);

        fireEvent.click(getByText("read"));
        fireEvent.click(getByText("create"));

        await waitFor(() => expect(getByTestId("chain").textContent).toBe("ethereum"));
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(getByTestId("chain").textContent).toBe("ethereum");
        expect(getByTestId("status").textContent).toBe("loaded");
    });
});

describe("CrossmintWalletBaseProvider — device signer key storage", () => {
    const deviceSignerKeyStorage = {} as DeviceSignerKeyStorage;

    function renderWithStorage(wallets: Partial<CrossmintWallets>) {
        vi.mocked(createCrossmint).mockImplementation(() => ({ apiKey: MOCK_API_KEY, jwt: "jwt", setJwt: vi.fn() }));
        vi.spyOn(CrossmintWallets, "from").mockReturnValue(wallets as CrossmintWallets);
        return render(
            <CrossmintProvider apiKey={MOCK_API_KEY}>
                <CrossmintWalletBaseProvider
                    createOnLogin={{ chain: "base-sepolia" }}
                    deviceSignerKeyStorage={deviceSignerKeyStorage}
                >
                    <TestConsumer />
                </CrossmintWalletBaseProvider>
            </CrossmintProvider>
        );
    }

    test("reaches the wallet the provider reads", async () => {
        const getWallet = vi.fn().mockResolvedValue({ chain: "base-sepolia", alias: undefined });
        const { getByTestId } = renderWithStorage({ getWallet, createWallet: vi.fn() });

        await waitFor(() => expect(getByTestId("status").textContent).toBe("loaded"));
        expect(getWallet.mock.calls[0][0].options.deviceSignerKeyStorage).toBe(deviceSignerKeyStorage);
    });

    test("reaches the wallet the provider creates", async () => {
        const createWallet = vi.fn().mockResolvedValue({ chain: "base-sepolia", alias: undefined });
        const { getByTestId } = renderWithStorage({
            getWallet: vi.fn().mockRejectedValue(new WalletNotAvailableError("not found")),
            createWallet,
        });

        await waitFor(() => expect(getByTestId("status").textContent).toBe("loaded"));
        expect(createWallet.mock.calls[0][0].options.deviceSignerKeyStorage).toBe(deviceSignerKeyStorage);
    });
});
