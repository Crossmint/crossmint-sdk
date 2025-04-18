import { describe, it, expect, beforeEach, vi, expectTypeOf } from "vitest";
import { mock } from "vitest-mock-extended";
import { Keypair } from "@solana/web3.js";
import type { ApiClient } from "../api";
import { WalletFactory } from "./wallet-factory";
import type { EVMSmartWallet } from "../evm";
import type { SolanaSmartWallet } from "../solana";

describe("WalletSDK", () => {
    let factory: WalletFactory;
    let apiClient: ReturnType<typeof mock<ApiClient>>;
    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        apiClient = mock<ApiClient>({
            environment: "development",
        });
        factory = new WalletFactory(apiClient);
    });

    it("should create a EVM wallet with a keypair admin signer", async () => {
        const adminSigner = {
            type: "evm-keypair",
            address: "mock-address",
        };
        apiClient.createWallet.mockResolvedValueOnce({
            type: "evm-smart-wallet",
            address: "mock-address",
            config: {
                adminSigner,
            },
        });
        const wallet = (await factory.getOrCreateWallet("evm-smart-wallet", {
            adminSigner,
        })) satisfies EVMSmartWallet;

        // Wallet Checks
        expectTypeOf(wallet).toMatchTypeOf<EVMSmartWallet>();
        expect(typeof wallet.sendTransaction).toBe("function");
        expect(typeof wallet.getBalances).toBe("function");
        expect(typeof wallet.getTransactions).toBe("function");
        expect(typeof wallet.unstable_getNfts).toBe("function");
        expect(typeof wallet.signMessage).toBe("function");
        expect(typeof wallet.address).toBe("string");
        expect(typeof wallet.getViemClient).toBe("function");
        expect(typeof wallet.getNonce).toBe("function");
        expect(typeof wallet.signTypedData).toBe("function");
        expect(wallet.address).toBe("mock-address");
    });

    it("should create a SSW with a keypair admin signer", async () => {
        const keypair = Keypair.generate();
        const adminSigner = {
            type: "solana-keypair",
            address: keypair.publicKey.toBase58(),
            signer: keypair,
        };
        const walletAddress = Keypair.generate().publicKey.toBase58();
        apiClient.createWallet.mockResolvedValueOnce({
            type: "solana-smart-wallet",
            address: walletAddress,
            config: {
                adminSigner: {
                    type: "solana-keypair",
                    address: adminSigner.address,
                },
            },
        });
        const wallet = (await factory.getOrCreateWallet("solana-smart-wallet", {
            adminSigner,
        })) satisfies SolanaSmartWallet;

        // Wallet Checks
        expectTypeOf(wallet).toMatchTypeOf<SolanaSmartWallet>();
        expect(typeof wallet.sendTransaction).toBe("function");
        expect(typeof wallet.getBalances).toBe("function");
        expect(typeof wallet.getTransactions).toBe("function");
        expect(typeof wallet.unstable_getNfts).toBe("function");
        expect(typeof wallet.addDelegatedSigner).toBe("function");
        expect(typeof wallet.getDelegatedSigners).toBe("function");
        expect(typeof wallet.adminSigner).toBe("object");
        expect(typeof wallet.publicKey).toBe("object");
        expect(typeof wallet.address).toBe("string");
        expect(wallet.publicKey.toBase58()).toBe(walletAddress);
        expect(wallet.adminSigner.type).toBe("solana-keypair");
        expect(wallet.adminSigner.address).toBe(adminSigner.address);
        expect(wallet.address).toBe(walletAddress);
        expect(wallet.publicKey.toBase58()).toBe(walletAddress);

        // Mock Checks
        expect(apiClient.createWallet).toHaveBeenCalledWith({
            type: "solana-smart-wallet",
            config: {
                adminSigner: {
                    type: "solana-keypair",
                    address: adminSigner.address,
                },
            },
        });
        expect(apiClient.createWallet).toHaveBeenCalledTimes(1);
        expect;
    });

    it("should create a SSW with an external admin signer", async () => {
        const adminSigner = {
            type: "solana-keypair",
            address: "mock-address",
            signer: {
                signMessage: vi.fn(),
                signTransaction: vi.fn(),
            },
        };
        const walletAddress = Keypair.generate().publicKey.toBase58();
        apiClient.createWallet.mockResolvedValueOnce({
            type: "solana-smart-wallet",
            address: walletAddress,
            config: {
                adminSigner: {
                    type: "solana-keypair",
                    address: adminSigner.address,
                },
            },
        });
        const wallet = (await factory.getOrCreateWallet("solana-smart-wallet", {
            adminSigner,
        })) satisfies SolanaSmartWallet;

        // Wallet Checks
        expectTypeOf(wallet).toMatchTypeOf<SolanaSmartWallet>();
        expect(wallet.publicKey.toBase58()).toBe(walletAddress);
        expect(wallet.adminSigner.type).toBe("solana-keypair");
        expect(wallet.adminSigner.address).toBe(adminSigner.address);
        expect(wallet.address).toBe(walletAddress);
        expect(wallet.publicKey.toBase58()).toBe(walletAddress);

        // Mock Checks
        expect(apiClient.createWallet).toHaveBeenCalledWith({
            type: "solana-smart-wallet",
            config: {
                adminSigner: {
                    type: "solana-keypair",
                    address: adminSigner.address,
                },
            },
        });
        expect(apiClient.createWallet).toHaveBeenCalledTimes(1);
        expect;
    });

    it("should create a SSW with a custodial admin signer", async () => {
        const adminSigner = {
            type: "solana-fireblocks-custodial",
        };
        const walletAddress = Keypair.generate().publicKey.toBase58();
        apiClient.createWallet.mockResolvedValueOnce({
            type: "solana-smart-wallet",
            address: walletAddress,
            config: {
                adminSigner: {
                    type: "solana-fireblocks-custodial",
                    address: "mock-address",
                },
            },
        });
        const wallet = (await factory.getOrCreateWallet("solana-smart-wallet", {
            adminSigner,
        })) satisfies SolanaSmartWallet;

        // Wallet Checks
        expectTypeOf(wallet).toMatchTypeOf<SolanaSmartWallet>();
        expect(wallet.publicKey.toBase58()).toBe(walletAddress);
        expect(wallet.adminSigner.type).toBe("solana-fireblocks-custodial");
        expect(wallet.address).toBe(walletAddress);
        expect(wallet.publicKey.toBase58()).toBe(walletAddress);

        // Mock Checks
        expect(apiClient.createWallet).toHaveBeenCalledWith({
            type: "solana-smart-wallet",
            config: {
                adminSigner: {
                    type: "solana-fireblocks-custodial",
                },
            },
        });
        expect(apiClient.createWallet).toHaveBeenCalledTimes(1);
        expect;
    });
});
