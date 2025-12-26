import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Wallet } from "./wallet";
import type { GetBalanceSuccessResponse, SendResponse, GetWalletSuccessResponse } from "../api";
import {
    TransactionNotCreatedError,
    TransactionNotAvailableError,
    WalletNotAvailableError,
    WalletTypeNotSupportedError,
    SignatureNotAvailableError,
} from "../utils/errors";
import { createMockWallet, createMockApiClient, type MockedApiClient } from "./__tests__/test-helpers";

describe("Wallet - balances()", () => {
    let mockApiClient: MockedApiClient;
    let wallet: Wallet<"base-sepolia">;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
        wallet = createMockWallet("base-sepolia", mockApiClient);
    });

    describe("success cases", () => {
        it("should return balances for EVM chain with native token and USDC", async () => {
            const mockBalanceResponse: GetBalanceSuccessResponse = [
                {
                    symbol: "eth",
                    name: "Ethereum",
                    amount: "1.5",
                    rawAmount: "1500000000000000000",
                    decimals: 18,
                    chains: {
                        "base-sepolia": {
                            locator: "base-sepolia:eth",
                            amount: "1.5",
                            rawAmount: "1500000000000000000",
                        },
                    },
                },
                {
                    symbol: "usdc",
                    name: "USD Coin",
                    amount: "100.0",
                    rawAmount: "100000000",
                    decimals: 6,
                    chains: {
                        "base-sepolia": {
                            locator: "base-sepolia:usdc",
                            amount: "100.0",
                            rawAmount: "100000000",
                            contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                        },
                    },
                },
            ];

            mockApiClient.getBalance.mockResolvedValue(mockBalanceResponse);

            const balances = await wallet.balances();

            expect(balances.nativeToken).toBeDefined();
            expect(balances.nativeToken.symbol).toBe("eth");
            expect(balances.nativeToken.amount).toBe("1.5");
            expect(balances.usdc).toBeDefined();
            expect(balances.usdc.symbol).toBe("usdc");
            expect(balances.usdc.amount).toBe("100.0");
            expect(mockApiClient.getBalance).toHaveBeenCalledWith(wallet.address, {
                chains: ["base-sepolia"],
                tokens: ["eth", "usdc"],
            });
        });

        it("should return balances for Solana chain", async () => {
            const solanaWallet = createMockWallet("solana", mockApiClient);
            const mockBalanceResponse: GetBalanceSuccessResponse = [
                {
                    symbol: "sol",
                    name: "Solana",
                    amount: "10.5",
                    rawAmount: "10500000000",
                    decimals: 9,
                    chains: {
                        solana: {
                            locator: "solana:sol",
                            amount: "10.5",
                            rawAmount: "10500000000",
                        },
                    },
                },
                {
                    symbol: "usdc",
                    name: "USD Coin",
                    amount: "50.0",
                    rawAmount: "50000000",
                    decimals: 6,
                    chains: {
                        solana: {
                            locator: "solana:usdc",
                            amount: "50.0",
                            rawAmount: "50000000",
                            mintHash: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                        },
                    },
                },
            ];

            mockApiClient.getBalance.mockResolvedValue(mockBalanceResponse);

            const balances = await solanaWallet.balances();

            expect(balances.nativeToken.symbol).toBe("sol");
            expect(balances.nativeToken.amount).toBe("10.5");
            expect(mockApiClient.getBalance).toHaveBeenCalledWith(solanaWallet.address, {
                chains: ["solana"],
                tokens: ["sol", "usdc"],
            });
        });

        it("should return balances for Stellar chain", async () => {
            const stellarWallet = createMockWallet("stellar", mockApiClient);
            const mockBalanceResponse: GetBalanceSuccessResponse = [
                {
                    symbol: "xlm",
                    name: "Stellar Lumens",
                    amount: "100.0",
                    rawAmount: "1000000000",
                    decimals: 7,
                    chains: {
                        stellar: {
                            locator: "stellar:xlm",
                            amount: "100.0",
                            rawAmount: "1000000000",
                        },
                    },
                },
                {
                    symbol: "usdc",
                    name: "USD Coin",
                    amount: "25.0",
                    rawAmount: "25000000",
                    decimals: 6,
                    chains: {
                        stellar: {
                            locator: "stellar:usdc",
                            amount: "25.0",
                            rawAmount: "25000000",
                            contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                        },
                    },
                },
            ];

            mockApiClient.getBalance.mockResolvedValue(mockBalanceResponse);

            const balances = await stellarWallet.balances();

            expect(balances.nativeToken.symbol).toBe("xlm");
            expect(balances.nativeToken.amount).toBe("100.0");
            expect(mockApiClient.getBalance).toHaveBeenCalledWith(stellarWallet.address, {
                chains: ["stellar"],
                tokens: ["xlm", "usdc"],
            });
        });

        it("should include custom tokens when provided", async () => {
            const mockBalanceResponse: GetBalanceSuccessResponse = [
                {
                    symbol: "eth",
                    name: "Ethereum",
                    amount: "1.0",
                    rawAmount: "1000000000000000000",
                    decimals: 18,
                    chains: {
                        "base-sepolia": {
                            locator: "base-sepolia:eth",
                            amount: "1.0",
                            rawAmount: "1000000000000000000",
                        },
                    },
                },
                {
                    symbol: "usdc",
                    name: "USD Coin",
                    amount: "100.0",
                    rawAmount: "100000000",
                    decimals: 6,
                    chains: {
                        "base-sepolia": {
                            locator: "base-sepolia:usdc",
                            amount: "100.0",
                            rawAmount: "100000000",
                            contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                        },
                    },
                },
                {
                    symbol: "dai",
                    name: "Dai Stablecoin",
                    amount: "50.0",
                    rawAmount: "50000000000000000000",
                    decimals: 18,
                    chains: {
                        "base-sepolia": {
                            locator: "base-sepolia:dai",
                            amount: "50.0",
                            rawAmount: "50000000000000000000",
                            contractAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
                        },
                    },
                },
            ];

            mockApiClient.getBalance.mockResolvedValue(mockBalanceResponse);

            const balances = await wallet.balances(["dai"]);

            expect(balances.tokens).toHaveLength(1);
            expect(balances.tokens[0].symbol).toBe("dai");
            expect(mockApiClient.getBalance).toHaveBeenCalledWith(wallet.address, {
                chains: ["base-sepolia"],
                tokens: ["eth", "usdc", "dai"],
            });
        });

        it("should handle missing native token by returning zero balance", async () => {
            const mockBalanceResponse: GetBalanceSuccessResponse = [
                {
                    symbol: "usdc",
                    name: "USD Coin",
                    amount: "100.0",
                    rawAmount: "100000000",
                    decimals: 6,
                    chains: {
                        "base-sepolia": {
                            locator: "base-sepolia:usdc",
                            amount: "100.0",
                            rawAmount: "100000000",
                            contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                        },
                    },
                },
            ];

            mockApiClient.getBalance.mockResolvedValue(mockBalanceResponse);

            const balances = await wallet.balances();

            expect(balances.nativeToken.amount).toBe("0");
            expect(balances.usdc.amount).toBe("100.0");
        });
    });

    describe("error cases", () => {
        it("should throw error when API returns error response", async () => {
            const errorResponse = {
                error: {
                    message: "Failed to fetch balance",
                    code: "BALANCE_ERROR",
                },
            };

            mockApiClient.getBalance.mockResolvedValue(errorResponse as unknown as GetBalanceSuccessResponse);

            await expect(wallet.balances()).rejects.toThrow("Failed to get balances for wallet");
        });

        it("should throw error when API call fails", async () => {
            mockApiClient.getBalance.mockRejectedValue(new Error("Network error"));

            await expect(wallet.balances()).rejects.toThrow("Network error");
        });
    });
});

describe("Wallet - send()", () => {
    let mockApiClient: MockedApiClient;
    let wallet: Wallet<"base-sepolia">;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        wallet = createMockWallet("base-sepolia", mockApiClient, "api-key");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("success cases", () => {
        it("should send tokens successfully and return transaction", async () => {
            const mockSendResponse = {
                id: "txn-123",
            } as unknown as SendResponse;

            const mockTransactionResponse = {
                id: "txn-123",
                status: "success",
                onChain: {
                    txId: "0xabcdef123456",
                    explorerLink: "https://explorer.example.com/tx/0xabcdef123456",
                },
            };

            mockApiClient.send.mockResolvedValue(mockSendResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = wallet.send("0xrecipient123", "usdc", "10.0");
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("0xabcdef123456");
            expect(result.transactionId).toBe("txn-123");
            expect(mockApiClient.send).toHaveBeenCalledWith(
                "me:evm:smart",
                "base-sepolia:usdc",
                expect.objectContaining({
                    recipient: "0xrecipient123",
                    amount: "10.0",
                })
            );
        });

        it("should return prepared transaction when experimental_prepareOnly is true", async () => {
            const mockSendResponse = {
                id: "txn-123",
            } as unknown as SendResponse;

            mockApiClient.send.mockResolvedValue(mockSendResponse);

            const result = await wallet.send("0xrecipient123", "usdc", "10.0", {
                experimental_prepareOnly: true,
            });

            expect(result.hash).toBeUndefined();
            expect(result.transactionId).toBe("txn-123");
            expect(mockApiClient.getTransaction).not.toHaveBeenCalled();
        });

        it("should handle user locator as recipient", async () => {
            const mockSendResponse = {
                id: "txn-456",
            } as unknown as SendResponse;

            const mockTransactionResponse = {
                id: "txn-456",
                status: "success",
                onChain: {
                    txId: "0x789abc",
                    explorerLink: "https://explorer.example.com/tx/0x789abc",
                },
            };

            mockApiClient.send.mockResolvedValue(mockSendResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = wallet.send({ email: "user@example.com" }, "usdc", "5.0");
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("0x789abc");
            expect(mockApiClient.send).toHaveBeenCalledWith(
                "me:evm:smart",
                "base-sepolia:usdc",
                expect.objectContaining({
                    recipient: "email:user@example.com",
                    amount: "5.0",
                })
            );
        });
    });

    describe("error cases", () => {
        it("should throw TransactionNotCreatedError when API returns error", async () => {
            const errorResponse = {
                message: "Insufficient balance",
            };

            mockApiClient.send.mockResolvedValue(errorResponse as unknown as SendResponse);

            await expect(wallet.send("0xrecipient123", "usdc", "10.0")).rejects.toThrow(TransactionNotCreatedError);
        });

        it("should throw error when transaction approval fails", async () => {
            const mockSendResponse = {
                id: "txn-123",
            } as unknown as SendResponse;

            mockApiClient.send.mockResolvedValue(mockSendResponse);
            mockApiClient.getTransaction.mockResolvedValue({
                id: "txn-123",
                status: "failed",
                error: "Transaction failed",
            } as any);

            await expect(wallet.send("0xrecipient123", "usdc", "10.0")).rejects.toThrow();
        });
    });
});

describe("Wallet - approve()", () => {
    let mockApiClient: MockedApiClient;
    let wallet: Wallet<"base-sepolia">;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        wallet = createMockWallet("base-sepolia", mockApiClient, "api-key");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("transaction approval", () => {
        it("should approve transaction successfully", async () => {
            const mockTransactionResponse = {
                id: "txn-123",
                status: "success",
                onChain: {
                    txId: "0xabcdef",
                    explorerLink: "https://explorer.example.com/tx/0xabcdef",
                },
            };

            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const approvePromise = wallet.approve({ transactionId: "txn-123" });
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect(result.hash).toBe("0xabcdef");
            expect(result.transactionId).toBe("txn-123");
            expect(mockApiClient.getTransaction).toHaveBeenCalledWith("me:evm:smart", "txn-123");
        });

        it("should throw error when transaction not found", async () => {
            const errorResponse = {
                error: {
                    message: "Transaction not found",
                },
            };

            mockApiClient.getTransaction.mockResolvedValue(errorResponse as any);

            await expect(wallet.approve({ transactionId: "txn-123" })).rejects.toThrow(TransactionNotAvailableError);
        });
    });

    describe("signature approval", () => {
        it("should approve signature successfully", async () => {
            const mockSignatureResponse = {
                id: "sig-123",
                status: "success",
                outputSignature: "0xsigned",
            };

            mockApiClient.getSignature.mockResolvedValue(mockSignatureResponse as any);

            const approvePromise = wallet.approve({ signatureId: "sig-123" });
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect(result.signature).toBe("0xsigned");
            expect(result.signatureId).toBe("sig-123");
        });

        it("should throw error when signature not found", async () => {
            const errorResponse = {
                error: {
                    message: "Signature not found",
                },
            };

            mockApiClient.getSignature.mockResolvedValue(errorResponse as any);

            await expect(wallet.approve({ signatureId: "sig-123" })).rejects.toThrow(SignatureNotAvailableError);
        });
    });

    describe("error cases", () => {
        it("should throw error when neither transactionId nor signatureId is provided", async () => {
            await expect(wallet.approve({} as any)).rejects.toThrow(
                "Either transactionId or signatureId must be provided"
            );
        });
    });
});

describe("Wallet - addDelegatedSigner()", () => {
    let mockApiClient: MockedApiClient;
    let evmWallet: Wallet<"base-sepolia">;
    let solanaWallet: Wallet<"solana">;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        evmWallet = createMockWallet("base-sepolia", mockApiClient, "api-key");
        solanaWallet = createMockWallet("solana", mockApiClient, "api-key");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("EVM chains", () => {
        it("should add delegated signer successfully for EVM", async () => {
            const mockRegisterResponse = {
                chains: {
                    "base-sepolia": {
                        id: "sig-123",
                        status: "success",
                    },
                },
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);

            await evmWallet.addDelegatedSigner({ signer: "external-wallet:0x456" });

            expect(mockApiClient.registerSigner).toHaveBeenCalledWith("me:evm:smart", {
                signer: "external-wallet:0x456",
                chain: "base-sepolia",
            });
        });

        it("should return signatureId when experimental_prepareOnly is true", async () => {
            const mockRegisterResponse = {
                chains: {
                    "base-sepolia": {
                        id: "sig-123",
                        status: "awaiting-approval",
                    },
                },
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);

            const result = await evmWallet.addDelegatedSigner({
                signer: "external-wallet:0x456",
                options: { experimental_prepareOnly: true },
            });

            expect(result.signatureId).toBe("sig-123");
        });

        it("should approve signature when status is awaiting-approval", async () => {
            const mockRegisterResponse = {
                chains: {
                    "base-sepolia": {
                        id: "sig-123",
                        status: "awaiting-approval",
                    },
                },
            };

            const mockSignatureResponse = {
                id: "sig-123",
                status: "success",
                outputSignature: "0xsigned",
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);
            mockApiClient.getSignature.mockResolvedValue(mockSignatureResponse as any);

            const addPromise = evmWallet.addDelegatedSigner({ signer: "external-wallet:0x456" });
            await vi.runAllTimersAsync();
            await addPromise;

            expect(mockApiClient.registerSigner).toHaveBeenCalled();
        });
    });

    describe("Solana chains", () => {
        it("should add delegated signer successfully for Solana", async () => {
            const mockRegisterResponse = {
                transaction: {
                    id: "txn-123",
                },
            };

            const mockTransactionResponse = {
                id: "txn-123",
                status: "success",
                onChain: {
                    txId: "sol-tx-hash",
                    explorerLink: "https://explorer.solana.com/tx/sol-tx-hash",
                },
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const addPromise = solanaWallet.addDelegatedSigner({ signer: "external-wallet:ABC123" });
            await vi.runAllTimersAsync();
            await addPromise;

            expect(mockApiClient.registerSigner).toHaveBeenCalledWith("me:solana:smart", {
                signer: "external-wallet:ABC123",
                chain: undefined,
            });
        });

        it("should return transactionId when experimental_prepareOnly is true", async () => {
            const mockRegisterResponse = {
                transaction: {
                    id: "txn-123",
                },
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);

            const result = await solanaWallet.addDelegatedSigner({
                signer: "external-wallet:ABC123",
                options: { experimental_prepareOnly: true },
            });

            expect(result.transactionId).toBe("txn-123");
        });
    });

    describe("error cases", () => {
        it("should throw error when API returns error", async () => {
            const errorResponse = {
                error: {
                    message: "Failed to register signer",
                },
            };

            mockApiClient.registerSigner.mockResolvedValue(errorResponse as any);

            await expect(evmWallet.addDelegatedSigner({ signer: "external-wallet:0x456" })).rejects.toThrow(
                "Failed to register signer"
            );
        });

        it("should throw error when Solana response missing transaction", async () => {
            const mockRegisterResponse = {
                chains: {},
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);

            await expect(solanaWallet.addDelegatedSigner({ signer: "external-wallet:ABC123" })).rejects.toThrow(
                "Expected transaction in response for Solana/Stellar chain"
            );
        });

        it("should throw error when EVM response missing chains", async () => {
            const mockRegisterResponse = {
                transaction: { id: "txn-123" },
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);

            await expect(evmWallet.addDelegatedSigner({ signer: "external-wallet:0x456" })).rejects.toThrow(
                "Expected chains in response for EVM chain"
            );
        });
    });
});

describe("Wallet - delegatedSigners()", () => {
    let mockApiClient: MockedApiClient;
    let wallet: Wallet<"base-sepolia">;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
        wallet = createMockWallet("base-sepolia", mockApiClient);
    });

    describe("success cases", () => {
        it("should return list of delegated signers", async () => {
            const mockWalletResponse: GetWalletSuccessResponse = {
                chainType: "evm",
                type: "smart",
                address: wallet.address,
                config: {
                    adminSigner: {
                        type: "api-key",
                        address: "0xadmin",
                        locator: "api-key:admin",
                    },
                    delegatedSigners: [
                        {
                            type: "external-wallet",
                            address: "0xsigner1",
                            locator: "external-wallet:0xsigner1",
                        },
                        {
                            type: "external-wallet",
                            address: "0xsigner2",
                            locator: "external-wallet:0xsigner2",
                        },
                    ],
                },
                createdAt: Date.now(),
            } as GetWalletSuccessResponse;

            mockApiClient.getWallet.mockResolvedValue(mockWalletResponse);

            const signers = await wallet.delegatedSigners();

            expect(signers).toHaveLength(2);
            expect(signers[0].signer).toBe("external-wallet:0xsigner1");
            expect(signers[1].signer).toBe("external-wallet:0xsigner2");
        });

        it("should return empty array when no delegated signers", async () => {
            const mockWalletResponse: GetWalletSuccessResponse = {
                chainType: "evm",
                type: "smart",
                address: wallet.address,
                config: {
                    adminSigner: {
                        type: "api-key",
                        address: "0xadmin",
                        locator: "api-key:admin",
                    },
                },
                createdAt: Date.now(),
            } as GetWalletSuccessResponse;

            mockApiClient.getWallet.mockResolvedValue(mockWalletResponse);

            const signers = await wallet.delegatedSigners();

            expect(signers).toHaveLength(0);
        });
    });

    describe("error cases", () => {
        it("should throw error when wallet not found", async () => {
            const errorResponse = {
                error: {
                    message: "Wallet not found",
                },
            };

            mockApiClient.getWallet.mockResolvedValue(errorResponse as any);

            await expect(wallet.delegatedSigners()).rejects.toThrow(WalletNotAvailableError);
        });

        it("should throw error when wallet type is not smart", async () => {
            const mockWalletResponse: GetWalletSuccessResponse = {
                chainType: "evm",
                type: "mpc",
                address: wallet.address,
                config: {
                    adminSigner: {
                        type: "api-key",
                        address: "0xadmin",
                        locator: "api-key:admin",
                    },
                },
                createdAt: Date.now(),
            } as GetWalletSuccessResponse;

            mockApiClient.getWallet.mockResolvedValue(mockWalletResponse);

            await expect(wallet.delegatedSigners()).rejects.toThrow(WalletTypeNotSupportedError);
        });

        it("should throw error when chain type is not supported", async () => {
            const mockWalletResponse: GetWalletSuccessResponse = {
                chainType: "unsupported" as any,
                type: "smart",
                address: wallet.address,
                config: {
                    adminSigner: {
                        type: "api-key",
                        address: "0xadmin",
                        locator: "api-key:admin",
                    },
                },
                createdAt: Date.now(),
            } as GetWalletSuccessResponse;

            mockApiClient.getWallet.mockResolvedValue(mockWalletResponse);

            await expect(wallet.delegatedSigners()).rejects.toThrow(WalletTypeNotSupportedError);
        });
    });
});
