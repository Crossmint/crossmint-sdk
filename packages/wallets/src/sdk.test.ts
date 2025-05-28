import { beforeEach, describe, expect, it, vi } from "vitest";

import { CrossmintWallets } from "./sdk";
import type { Chain } from "./chains/chains";
import { EVMWallet } from "./wallets/evm";
import { SolanaWallet } from "./wallets/solana";

// Mock EVMWallet
vi.mock("./wallets/evm", () => {
    const MockEVMWallet = vi.fn().mockImplementation(() => ({
        address: "0x123",
        chain: "ethereum",
        signer: {
            signMessage: vi.fn().mockResolvedValue("0xsignature"),
            signTransaction: vi.fn().mockResolvedValue("0xsignedTx"),
        },
    }));
    // @ts-expect-error - Mocking a static method
    MockEVMWallet.from = vi.fn().mockImplementation((wallet) => ({
        address: wallet.address,
        chain: wallet.chain,
        signer: wallet.signer,
    }));
    return { EVMWallet: MockEVMWallet };
});

// Mock SolanaWallet
vi.mock("./wallets/solana", () => {
    const MockSolanaWallet = vi.fn().mockImplementation(() => ({
        address: "solana123",
        chain: "solana",
        signer: {
            signMessage: vi.fn().mockResolvedValue("solanaSignature"),
            signTransaction: vi.fn().mockResolvedValue("solanaSignedTx"),
        },
    }));
    // @ts-expect-error - Mocking a static method
    MockSolanaWallet.from = vi.fn().mockImplementation((wallet) => ({
        address: wallet.address,
        chain: wallet.chain,
        signer: wallet.signer,
    }));
    return { SolanaWallet: MockSolanaWallet };
});

// Mock ApiClient
vi.mock("./api", () => ({
    ApiClient: vi.fn().mockImplementation(() => ({
        createWallet: vi.fn().mockImplementation((options) => ({
            address: options.chain === "solana" ? "solana123" : "0x123",
            chain: options.chain,
            signer: options.signer,
        })),
    })),
}));

// Mock WalletFactory
const mockWalletFactory = {
    getOrCreateWallet: vi.fn(),
    getWallet: vi.fn(),
    createWallet: vi.fn(),
};

vi.mock("./wallets/wallet-factory", () => ({
    WalletFactory: vi.fn().mockImplementation(() => mockWalletFactory),
}));

// Mock Crossmint validation
vi.mock("@crossmint/common-sdk-base", () => ({
    createCrossmint: vi.fn().mockImplementation((config) => {
        if (!config.apiKey) {
            throw new Error("API key is required");
        }
        return config;
    }),
}));

// Mock global window object
vi.stubGlobal("window", {
    location: {
        origin: "http://localhost",
    },
});

describe("CrossmintWallets SDK", () => {
    let sdk: CrossmintWallets;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();

        // Setup default mock responses with dynamic chain
        mockWalletFactory.getOrCreateWallet.mockImplementation((options) => ({
            address: options.chain === "solana" ? "solana123" : "0x123",
            chain: options.chain,
            signer: options.signer,
        }));

        mockWalletFactory.getWallet.mockImplementation((locator, options) => {
            if (!locator) {
                throw new Error("Wallet locator is required");
            }
            return {
                address: options.chain === "solana" ? "solana123" : "0x123",
                chain: options.chain,
                signer: options.signer,
            };
        });

        mockWalletFactory.createWallet.mockImplementation((options) => {
            if (!["ethereum", "polygon", "base-sepolia"].includes(options.chain)) {
                throw new Error("Invalid chain type");
            }
            return {
                address: options.chain === "solana" ? "solana123" : "0x123",
                chain: options.chain,
                signer: options.signer,
            };
        });

        sdk = CrossmintWallets.from({
            apiKey: "sk_staging_A4vDwAp4t5az6fVQMpQK6qapBnAqgpxrrD35TaFQnyKgxehNbd959uZeaHjNCadWDXrgLRAK1CxeasZjtYEq4TbFkKMBBvbQ9oinAxQf8LbHsSYW2DMzT8fBko3YGLq9t7ZiXZjmgkTioxGVUUjyLtWLeBKwNUDLgpshWjaoR7pKRnSE9SqhwjQbiK62VKiBTdA3KvHsyG9k8mLMcKrDyfXp",
            jwt: "mock-jwt",
        });
    });

    describe("Initialization", () => {
        it("should initialize the SDK correctly", () => {
            expect(sdk).toBeInstanceOf(CrossmintWallets);
        });
    });

    describe("getOrCreateWallet (client-side)", () => {
        const walletOptions = {
            chain: "base-sepolia" as Chain,
            signer: { type: "passkey" as const },
        };

        it("should create a wallet with passkey signer", async () => {
            const wallet = await sdk.getOrCreateWallet(walletOptions);

            expect(wallet).toBeDefined();
            expect(wallet.address).toBe("0x123");
            expect(wallet.chain).toBe("base-sepolia");
            expect(wallet.signer.type).toBe("passkey");
            expect(mockWalletFactory.getOrCreateWallet).toHaveBeenCalledWith(walletOptions);
        });

        it("should handle different chain types", async () => {
            const chains: Chain[] = ["story", "polygon", "base-sepolia"];

            for (const chain of chains) {
                const options = { ...walletOptions, chain };
                const wallet = await sdk.getOrCreateWallet(options);
                expect(wallet.chain).toBe(chain);
            }
        });

        it("should handle errors gracefully", async () => {
            mockWalletFactory.getOrCreateWallet.mockRejectedValueOnce(new Error("Network error"));

            await expect(sdk.getOrCreateWallet(walletOptions)).rejects.toThrow("Network error");
        });
    });

    describe("getWallet (server-side)", () => {
        const walletLocator = "wallet-123";
        const walletOptions = {
            chain: "base-sepolia" as Chain,
            signer: { type: "passkey" as const },
        };

        it("should get an existing wallet", async () => {
            const wallet = await sdk.getWallet(walletLocator, walletOptions);

            expect(wallet).toBeDefined();
            expect(wallet.address).toBe("0x123");
            expect(mockWalletFactory.getWallet).toHaveBeenCalledWith(walletLocator, walletOptions);
        });

        it("should handle non-existent wallet", async () => {
            mockWalletFactory.getWallet.mockRejectedValueOnce(new Error("Wallet not found"));

            await expect(sdk.getWallet("non-existent", walletOptions)).rejects.toThrow("Wallet not found");
        });

        it("should validate wallet locator", async () => {
            await expect(sdk.getWallet("", walletOptions)).rejects.toThrow();
        });
    });

    describe("createWallet (server-side)", () => {
        const walletOptions = {
            chain: "base-sepolia" as Chain,
            signer: { type: "passkey" as const },
        };

        it("should create a new wallet", async () => {
            const wallet = await sdk.createWallet(walletOptions);

            expect(wallet).toBeDefined();
            expect(wallet.address).toBe("0x123");
            expect(mockWalletFactory.createWallet).toHaveBeenCalledWith(walletOptions);
        });

        it("should handle creation errors", async () => {
            mockWalletFactory.createWallet.mockRejectedValueOnce(new Error("Creation failed"));

            await expect(sdk.createWallet(walletOptions)).rejects.toThrow("Creation failed");
        });

        it("should validate wallet options", async () => {
            const invalidOptions = { ...walletOptions, chain: "invalid-chain" as Chain };
            await expect(sdk.createWallet(invalidOptions)).rejects.toThrow();
        });
    });

    describe("Error handling and edge cases", () => {
        it("should handle network timeouts", async () => {
            mockWalletFactory.getOrCreateWallet.mockRejectedValueOnce(new Error("Timeout"));
            await expect(
                sdk.getOrCreateWallet({
                    chain: "base-sepolia",
                    signer: { type: "passkey" },
                })
            ).rejects.toThrow("Timeout");
        });

        it("should handle invalid API responses", async () => {
            mockWalletFactory.getOrCreateWallet.mockResolvedValueOnce({
                address: "invalid-address",
                chain: "base-sepolia",
                signer: { type: "passkey" },
            } as any);

            const wallet = await sdk.getOrCreateWallet({
                chain: "base-sepolia",
                signer: { type: "passkey" },
            });

            expect(wallet.address).toBe("invalid-address");
        });

        it("should handle concurrent requests", async () => {
            const promises = Array(5)
                .fill(null)
                .map(() =>
                    sdk.getOrCreateWallet({
                        chain: "base-sepolia",
                        signer: { type: "passkey" },
                    })
                );

            const results = await Promise.all(promises);
            expect(results).toHaveLength(5);
            expect(mockWalletFactory.getOrCreateWallet).toHaveBeenCalledTimes(5);
        });
    });
    describe("EVMWallets ", () => {
        it("should create a new EVM wallet", async () => {
            const wallet = await sdk.getOrCreateWallet({
                chain: "base-sepolia",
                signer: { type: "api-key" },
            });
            const evmWallet = EVMWallet.from(wallet);
            expect(evmWallet).toBeDefined();
            expect(evmWallet.address).toBe("0x123");
        });
    });
    describe("SolanaWallets ", () => {
        it("should create a new Solana wallet", async () => {
            const wallet = await sdk.getOrCreateWallet({
                chain: "solana",
                signer: { type: "api-key" },
            });
            const solanaWallet = SolanaWallet.from(wallet);
            expect(solanaWallet).toBeDefined();
            expect(solanaWallet.address).toBe("solana123");
        });
    });
});
