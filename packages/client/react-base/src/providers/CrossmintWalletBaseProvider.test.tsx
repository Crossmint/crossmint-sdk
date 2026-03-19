import React, { useContext } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CrossmintContext, CrossmintProvider } from "@/providers/CrossmintProvider";
import {
    CrossmintWalletBaseContext,
    CrossmintWalletBaseProvider,
} from "@/providers/CrossmintWalletBaseProvider";
import { useWallet } from "@/hooks/useWallet";
// These imports receive the mocked versions because vi.mock is hoisted before imports
import { CrossmintWallets, WalletNotAvailableError } from "@crossmint/wallets-sdk";
import { createCrossmint } from "@crossmint/common-sdk-base";
import { initReactLogger } from "@/logger/init";

// ─── Mock declarations (hoisted by vitest before imports) ────────────────────

vi.mock("@crossmint/wallets-sdk", () => {
    class MockWalletNotAvailableError extends Error {
        code = "wallet:wallet-not-available";
        constructor(message = "Wallet not available") {
            super(message);
            this.name = "WalletNotAvailableError";
        }
    }
    return {
        CrossmintWallets: { from: vi.fn() },
        WalletNotAvailableError: MockWalletNotAvailableError,
    };
});

vi.mock("@crossmint/common-sdk-base", async () => {
    const actual = await vi.importActual("@crossmint/common-sdk-base");
    return { ...(actual as object), createCrossmint: vi.fn() };
});

vi.mock("@/logger/init", () => ({ initReactLogger: vi.fn() }));
vi.mock("../../package.json", () => ({ default: { name: "test", version: "0.0.0" } }));

vi.mock("@/providers/CrossmintWalletUIBaseProvider", () => ({
    CrossmintWalletUIBaseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/providers/CrossmintAuthBaseProvider", () => ({
    CrossmintAuthBaseContext: React.createContext(null),
}));

// ─── Shared mock state ────────────────────────────────────────────────────────

const MOCK_API_KEY =
    "sk_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuSvnKeGiqY654DoBuuZEzYz4Eb8gRV2ePqQ1fxTjEP8tTaUQdzbGfyG9RgyeN5YbqViXinqxk8EayEkAGtvSSgjpjEr6iaBptJtUFwPW59DjQzTQP6P8uZdiajenVg7bARGKjzFyByNuVEoz41DpRB4hDZNFdwCTuf5joFv";

const MOCK_WALLET = {
    address: "0xMockWalletAddress",
    chain: "base-sepolia",
    recovery: { type: "external-wallet", address: "0xRecovery" },
    signers: vi.fn(),
    balances: vi.fn(),
    transactions: vi.fn(),
    needsRecovery: vi.fn(),
};

const MOCK_DEVICE_DESCRIPTOR = {
    type: "device",
    publicKey: { x: "0x" + "a".repeat(64), y: "0x" + "b".repeat(64) },
    locator: "device:base64MockPubKey",
};

// mockWalletManager is re-setup in each beforeEach
const mockWalletManager = {
    createWallet: vi.fn(),
    getWallet: vi.fn(),
    createDeviceSigner: vi.fn(),
    createPasskeySigner: vi.fn(),
};

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeWrapper(opts: { deviceSignerKeyStorage?: object; createOnLogin?: object } = {}) {
    return ({ children }: { children: React.ReactNode }) => (
        <CrossmintProvider apiKey={MOCK_API_KEY}>
            <CrossmintWalletBaseProvider
                deviceSignerKeyStorage={opts.deviceSignerKeyStorage as any}
                createOnLogin={opts.createOnLogin as any}
            >
                {children}
            </CrossmintWalletBaseProvider>
        </CrossmintProvider>
    );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CrossmintWalletBaseProvider", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        // Logger mock: must return non-null or useLogger throws
        vi.mocked(initReactLogger).mockReturnValue({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
        } as any);

        // SDK mock: CrossmintWallets.from returns the mockWalletManager
        vi.mocked(CrossmintWallets.from).mockReturnValue(mockWalletManager as any);

        // Default wallet manager implementations
        mockWalletManager.createWallet.mockResolvedValue(MOCK_WALLET);
        mockWalletManager.getWallet.mockResolvedValue(MOCK_WALLET);
        mockWalletManager.createDeviceSigner.mockResolvedValue(MOCK_DEVICE_DESCRIPTOR);
        mockWalletManager.createPasskeySigner.mockResolvedValue({ type: "passkey", id: "mock-id" });

        // createCrossmint: default = no JWT
        vi.mocked(createCrossmint).mockImplementation(() => ({
            apiKey: MOCK_API_KEY,
            jwt: undefined,
        }) as any);
    });

    // ── Initialization ────────────────────────────────────────────────────────

    describe("initialization", () => {
        it("initial status is 'not-loaded'", () => {
            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });
            expect(result.current.status).toBe("not-loaded");
        });

        it("initial wallet is undefined", () => {
            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });
            expect(result.current.wallet).toBeUndefined();
        });

        it("emailSignerState starts with needsAuth=false and all handlers null", () => {
            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });
            const { emailSignerState } = result.current;
            expect(emailSignerState.needsAuth).toBe(false);
            expect(emailSignerState.sendOtp).toBeNull();
            expect(emailSignerState.verifyOtp).toBeNull();
            expect(emailSignerState.reject).toBeNull();
        });

        it("exposes createWallet, getWallet, createDeviceSigner, createPasskeySigner as functions", () => {
            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });
            expect(typeof result.current.createWallet).toBe("function");
            expect(typeof result.current.getWallet).toBe("function");
            expect(typeof result.current.createDeviceSigner).toBe("function");
            expect(typeof result.current.createPasskeySigner).toBe("function");
        });
    });

    // ── useWallet hook ────────────────────────────────────────────────────────

    describe("useWallet()", () => {
        it("returns default context (not-loaded state) when used outside wallet provider", () => {
            // CrossmintWalletBaseContext has a non-null DEFAULT value (createContext with defaults).
            // The hook returns default context rather than throwing.
            const WrapperWithoutWallet = ({ children }: { children: React.ReactNode }) => (
                <CrossmintProvider apiKey={MOCK_API_KEY}>{children}</CrossmintProvider>
            );
            const { result } = renderHook(() => useWallet(), { wrapper: WrapperWithoutWallet });
            expect(result.current.status).toBe("not-loaded");
            expect(result.current.wallet).toBeUndefined();
        });

        it("createDeviceSigner() in default context (outside provider) rejects with helpful message", async () => {
            // The default context createDeviceSigner throws to signal usage outside the provider
            const WrapperWithoutWallet = ({ children }: { children: React.ReactNode }) => (
                <CrossmintProvider apiKey={MOCK_API_KEY}>{children}</CrossmintProvider>
            );
            const { result } = renderHook(() => useWallet(), { wrapper: WrapperWithoutWallet });
            await expect(result.current.createDeviceSigner()).rejects.toThrow(
                "createDeviceSigner must be used within a CrossmintWalletBaseProvider"
            );
        });

        it("returns the wallet context when used inside the provider", () => {
            const { result } = renderHook(() => useWallet(), { wrapper: makeWrapper() });
            expect(result.current.status).toBe("not-loaded");
            expect(typeof result.current.createWallet).toBe("function");
        });
    });

    // ── createWallet ──────────────────────────────────────────────────────────

    describe("createWallet()", () => {
        it("returns undefined without calling SDK when JWT is not set", async () => {
            // jwt=undefined in default mock setup
            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });

            let ret: unknown;
            await act(async () => {
                ret = await result.current.createWallet({
                    chain: "base-sepolia",
                    recovery: { type: "external-wallet", address: "0xTest" } as any,
                });
            });

            expect(ret).toBeUndefined();
            expect(result.current.status).toBe("not-loaded");
            expect(mockWalletManager.createWallet).not.toHaveBeenCalled();
        });

        it("transitions status to 'loaded' and sets wallet after successful createWallet", async () => {
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });

            await act(async () => {
                await result.current.createWallet({
                    chain: "base-sepolia",
                    recovery: { type: "external-wallet", address: "0xTest" } as any,
                });
            });

            await waitFor(() => {
                expect(result.current.status).toBe("loaded");
                expect(result.current.wallet).toBe(MOCK_WALLET);
            });
        });

        it("transitions status to 'error' and clears wallet when SDK throws", async () => {
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);
            mockWalletManager.createWallet.mockRejectedValue(new Error("SDK error"));

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });

            await act(async () => {
                await result.current.createWallet({
                    chain: "base-sepolia",
                    recovery: { type: "external-wallet", address: "0xTest" } as any,
                });
            });

            await waitFor(() => {
                expect(result.current.status).toBe("error");
                expect(result.current.wallet).toBeUndefined();
            });
        });

        it("wallets-v1: createWallet calls SDK.createWallet directly (does NOT call SDK.getWallet)", async () => {
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });

            await act(async () => {
                await result.current.createWallet({
                    chain: "base-sepolia",
                    recovery: { type: "external-wallet", address: "0xTest" } as any,
                });
            });

            expect(mockWalletManager.createWallet).toHaveBeenCalledTimes(1);
            expect(mockWalletManager.getWallet).not.toHaveBeenCalled();
        });

        it("returns undefined without double-calling SDK when status is already 'in-progress'", async () => {
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);

            let resolveFirst!: (v: typeof MOCK_WALLET) => void;
            mockWalletManager.createWallet.mockReturnValueOnce(
                new Promise<typeof MOCK_WALLET>((resolve) => { resolveFirst = resolve; })
            );

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });

            // Start first call (will stay in-progress)
            act(() => {
                result.current.createWallet({
                    chain: "base-sepolia",
                    recovery: { type: "external-wallet", address: "0xTest" } as any,
                });
            });

            // Second call while in-progress → must return undefined without calling SDK again
            let secondResult: unknown;
            await act(async () => {
                secondResult = await result.current.createWallet({
                    chain: "base-sepolia",
                    recovery: { type: "external-wallet", address: "0xTest" } as any,
                });
            });

            expect(secondResult).toBeUndefined();
            expect(mockWalletManager.createWallet).toHaveBeenCalledTimes(1);

            // Resolve first call to clean up
            act(() => resolveFirst(MOCK_WALLET));
        });

        it("passes recovery and chain to SDK.createWallet", async () => {
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });

            await act(async () => {
                await result.current.createWallet({
                    chain: "solana",
                    recovery: { type: "external-wallet", address: "0xSolanaTest" } as any,
                });
            });

            expect(mockWalletManager.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    chain: "solana",
                    recovery: { type: "external-wallet", address: "0xSolanaTest" },
                })
            );
        });
    });

    // ── getWallet ─────────────────────────────────────────────────────────────

    describe("getWallet()", () => {
        it("returns undefined when JWT is not set", async () => {
            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });

            let ret: unknown;
            await act(async () => {
                ret = await result.current.getWallet({ chain: "base-sepolia" });
            });

            expect(ret).toBeUndefined();
            expect(mockWalletManager.getWallet).not.toHaveBeenCalled();
        });

        it("returns wallet and sets status 'loaded' when SDK returns wallet", async () => {
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });

            await act(async () => {
                await result.current.getWallet({ chain: "base-sepolia" });
            });

            await waitFor(() => {
                expect(result.current.status).toBe("loaded");
                expect(result.current.wallet).toBe(MOCK_WALLET);
            });
        });

        it("wallets-v1: getWallet throws WalletNotAvailableError → status 'error' (v1 throws, not returns undefined)", async () => {
            // In wallets-v1, SDK.getWallet throws WalletNotAvailableError for non-existent wallets.
            // The provider's getWallet catches all errors and sets status="error".
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);
            mockWalletManager.getWallet.mockRejectedValue(
                new WalletNotAvailableError("Wallet not found")
            );

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });

            await act(async () => {
                await result.current.getWallet({ chain: "base-sepolia" });
            });

            await waitFor(() => {
                expect(result.current.status).toBe("error");
                expect(result.current.wallet).toBeUndefined();
            });
        });

        it("passes chain and alias to SDK.getWallet", async () => {
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });

            await act(async () => {
                await result.current.getWallet({ chain: "solana", alias: "my-wallet" });
            });

            expect(mockWalletManager.getWallet).toHaveBeenCalledWith(
                expect.objectContaining({ chain: "solana", alias: "my-wallet" })
            );
        });
    });

    // ── createDeviceSigner ────────────────────────────────────────────────────

    describe("createDeviceSigner()", () => {
        it("throws when deviceSignerKeyStorage is not provided to the provider", () => {
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper({ deviceSignerKeyStorage: undefined }),
            });

            expect(() => result.current.createDeviceSigner()).toThrow(
                "A DeviceSignerKeyStorage must be provided to create a device signer"
            );
        });

        it("does not throw and calls through when deviceSignerKeyStorage is provided", async () => {
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);

            const mockStorage = {
                generateKey: vi.fn().mockResolvedValue("base64PubKey"),
                mapAddressToKey: vi.fn(),
                getKey: vi.fn().mockResolvedValue(null),
                hasKey: vi.fn().mockResolvedValue(false),
                signMessage: vi.fn().mockResolvedValue({ r: "0x01", s: "0x02" }),
                deleteKey: vi.fn(),
            };

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper({ deviceSignerKeyStorage: mockStorage }),
            });

            let descriptor: unknown;
            await act(async () => {
                descriptor = await result.current.createDeviceSigner();
            });

            expect(mockWalletManager.createDeviceSigner).toHaveBeenCalledWith(mockStorage);
            expect(descriptor).toBe(MOCK_DEVICE_DESCRIPTOR);
        });

        it("returned DeviceSignerDescriptor has type='device', locator starts with 'device:', and publicKey.x/y defined", async () => {
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);

            const mockStorage = { generateKey: vi.fn(), mapAddressToKey: vi.fn(), getKey: vi.fn(), hasKey: vi.fn(), signMessage: vi.fn(), deleteKey: vi.fn() };

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper({ deviceSignerKeyStorage: mockStorage }),
            });

            let descriptor: any;
            await act(async () => {
                descriptor = await result.current.createDeviceSigner();
            });

            expect(descriptor.type).toBe("device");
            expect(descriptor.locator).toMatch(/^device:/);
            expect(descriptor.publicKey.x).toBeDefined();
            expect(descriptor.publicKey.y).toBeDefined();
        });
    });

    // ── JWT state ─────────────────────────────────────────────────────────────

    describe("JWT state management", () => {
        it("resets status to 'not-loaded' and clears wallet when JWT becomes null", async () => {
            // Render a hook that reads BOTH CrossmintContext (for setJwt) and wallet context
            const { result } = renderHook(
                () => ({
                    wallet: useContext(CrossmintWalletBaseContext),
                    crossmint: useContext(CrossmintContext),
                }),
                { wrapper: makeWrapper() }
            );

            // Set a JWT via the proper setJwt API (goes through the Proxy, triggers re-render)
            act(() => {
                result.current.crossmint!.setJwt("test-jwt");
            });

            // Create a wallet now that we have a JWT
            await act(async () => {
                await result.current.wallet.createWallet({
                    chain: "base-sepolia",
                    recovery: { type: "external-wallet", address: "0xTest" } as any,
                });
            });

            await waitFor(() => expect(result.current.wallet.status).toBe("loaded"));

            // Simulate logout — use setJwt(undefined) which goes through the Proxy SET trap
            // and triggers setVersion() → re-render → crossmint.jwt is null → useEffect clears wallet
            act(() => {
                result.current.crossmint!.setJwt(undefined);
            });

            await waitFor(() => {
                expect(result.current.wallet.status).toBe("not-loaded");
                expect(result.current.wallet.wallet).toBeUndefined();
            });
        });
    });

    // ── wallets-v1 specific ───────────────────────────────────────────────────

    describe("wallets-v1 API surface", () => {
        it("context exposes 'createWallet' and 'getWallet' — does NOT expose 'getOrCreateWallet'", () => {
            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });
            expect(typeof result.current.createWallet).toBe("function");
            expect(typeof result.current.getWallet).toBe("function");
            expect((result.current as any).getOrCreateWallet).toBeUndefined();
        });

        it("wallet in context has 'recovery' field (wallets-v1), not 'adminSigner'", async () => {
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: makeWrapper(),
            });

            await act(async () => {
                await result.current.createWallet({
                    chain: "base-sepolia",
                    recovery: { type: "external-wallet", address: "0xTest" } as any,
                });
            });

            await waitFor(() => expect(result.current.wallet).toBe(MOCK_WALLET));

            expect(result.current.wallet?.recovery).toBeDefined();
            expect((result.current.wallet as any)?.adminSigner).toBeUndefined();
        });

        it("createOnLogin: when getWallet throws WalletNotAvailableError, falls back to createWallet", async () => {
            // getOrCreateWallet is the internal method used by createOnLogin.
            // It catches WalletNotAvailableError from getWallet and then calls createWallet.
            vi.mocked(createCrossmint).mockImplementation(() => ({
                apiKey: MOCK_API_KEY,
                jwt: "test-jwt",
            }) as any);
            mockWalletManager.getWallet.mockRejectedValueOnce(
                new WalletNotAvailableError("Wallet not found")
            );
            mockWalletManager.createWallet.mockResolvedValueOnce(MOCK_WALLET);

            const WrapperWithCreateOnLogin = ({ children }: { children: React.ReactNode }) => (
                <CrossmintProvider apiKey={MOCK_API_KEY}>
                    <CrossmintWalletBaseProvider
                        createOnLogin={{
                            chain: "base-sepolia",
                            recovery: { type: "external-wallet", address: "0xTest" },
                        } as any}
                    >
                        {children}
                    </CrossmintWalletBaseProvider>
                </CrossmintProvider>
            );

            const { result } = renderHook(() => useContext(CrossmintWalletBaseContext), {
                wrapper: WrapperWithCreateOnLogin,
            });

            await waitFor(
                () => expect(result.current.status).toBe("loaded"),
                { timeout: 5000 }
            );

            expect(mockWalletManager.createWallet).toHaveBeenCalledTimes(1);
        });
    });
});
