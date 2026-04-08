import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Wallet } from "./wallet";
import type { ApiClient, GetBalanceSuccessResponse, SendResponse, GetWalletSuccessResponse } from "../api";
import type { SignerAdapter } from "../signers/types";
import {
    InvalidAddressError,
    InvalidTransferAmountError,
    TransactionNotCreatedError,
    TransactionNotAvailableError,
    WalletNotAvailableError,
    WalletTypeNotSupportedError,
    SignatureNotAvailableError,
} from "../utils/errors";
import { createMockWallet, createMockApiClient, type MockedApiClient } from "./__tests__/test-helpers";

vi.mock("@/signers/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/signers/server")>();
    return {
        ...actual,
        deriveServerSignerDetails: vi.fn().mockReturnValue({
            derivedKeyBytes: new Uint8Array(32),
            derivedAddress: "0xDerivedServerAddress",
        }),
        assembleServerSigner: vi.fn().mockReturnValue({
            type: "server",
            locator: () => "server:0xDerivedServerAddress",
            address: "0xDerivedServerAddress",
            status: undefined,
        }),
    };
});

vi.mock("@/utils/device-signers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/utils/device-signers")>();
    return {
        ...actual,
        createDeviceSigner: vi.fn().mockResolvedValue({
            type: "device",
            publicKey: { x: "0x01", y: "0x02" },
            locator: "device:mockNewKey",
            name: "Test Device",
        }),
    };
});

describe("Wallet - balances()", () => {
    let mockApiClient: MockedApiClient;
    let wallet: Wallet<"base-sepolia">;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
        wallet = await createMockWallet("base-sepolia", mockApiClient);
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
            const solanaWallet = await createMockWallet("solana", mockApiClient);
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
            const stellarWallet = await createMockWallet("stellar", mockApiClient);
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

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("success cases", () => {
        it("should send tokens successfully and return transaction by default", async () => {
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

            const sendPromise = wallet.send("0x1111111111111111111111111111111111111111", "usdc", "10.0");
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("0xabcdef123456");
            expect(result.transactionId).toBe("txn-123");
            expect(mockApiClient.send).toHaveBeenCalledWith(
                "me:evm:smart",
                "base-sepolia:usdc",
                expect.objectContaining({
                    recipient: "0x1111111111111111111111111111111111111111",
                    amount: "10.0",
                })
            );
        });

        it("should return prepared transaction with prepareOnly", async () => {
            const mockSendResponse = {
                id: "txn-123",
            } as unknown as SendResponse;

            mockApiClient.send.mockResolvedValue(mockSendResponse);

            const result = await wallet.send("0x1111111111111111111111111111111111111111", "usdc", "10.0", {
                prepareOnly: true,
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

            await expect(wallet.send("0x1111111111111111111111111111111111111111", "usdc", "10.0")).rejects.toThrow(
                TransactionNotCreatedError
            );
        });

        it("should throw InvalidAddressError for invalid recipient address", async () => {
            await expect(wallet.send("not-a-valid-address", "usdc", "10.0")).rejects.toThrow(InvalidAddressError);
            expect(mockApiClient.send).not.toHaveBeenCalled();
        });

        it("should throw InvalidAddressError for short hex address", async () => {
            await expect(wallet.send("0xrecipient123", "usdc", "10.0")).rejects.toThrow(InvalidAddressError);
            expect(mockApiClient.send).not.toHaveBeenCalled();
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

            await expect(wallet.send("0x1111111111111111111111111111111111111111", "usdc", "10.0")).rejects.toThrow();
        });

        it("should throw InvalidTransferAmountError when amount is zero", async () => {
            await expect(wallet.send("0x1111111111111111111111111111111111111111", "usdc", "0")).rejects.toThrow(
                InvalidTransferAmountError
            );
            expect(mockApiClient.send).not.toHaveBeenCalled();
        });

        it("should throw InvalidTransferAmountError when amount is negative", async () => {
            await expect(wallet.send("0x1111111111111111111111111111111111111111", "usdc", "-5.0")).rejects.toThrow(
                InvalidTransferAmountError
            );
            expect(mockApiClient.send).not.toHaveBeenCalled();
        });

        it("should throw InvalidTransferAmountError when amount is not a valid number", async () => {
            await expect(wallet.send("0x1111111111111111111111111111111111111111", "usdc", "abc")).rejects.toThrow(
                InvalidTransferAmountError
            );
            expect(mockApiClient.send).not.toHaveBeenCalled();
        });

        it("should throw InvalidTransferAmountError when amount is 0.0", async () => {
            await expect(wallet.send("0x1111111111111111111111111111111111111111", "usdc", "0.0")).rejects.toThrow(
                InvalidTransferAmountError
            );
            expect(mockApiClient.send).not.toHaveBeenCalled();
        });
    });
});

describe("Wallet - approve()", () => {
    let mockApiClient: MockedApiClient;
    let wallet: Wallet<"base-sepolia">;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
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

describe("Wallet - addSigner()", () => {
    let mockApiClient: MockedApiClient;
    let evmWallet: Wallet<"base-sepolia">;
    let solanaWallet: Wallet<"solana">;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        evmWallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
        solanaWallet = await createMockWallet("solana", mockApiClient, "api-key");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("EVM chains", () => {
        it("should add signer successfully for EVM", async () => {
            const mockRegisterResponse = {
                type: "external-wallet",
                address: "0x456",
                locator: "external-wallet:0x456",
                chains: {
                    "base-sepolia": {
                        id: "sig-123",
                        status: "success",
                    },
                },
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);

            const result = await evmWallet.addSigner({ type: "external-wallet", address: "0x456" });

            expect(mockApiClient.registerSigner).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({
                    signer: "external-wallet:0x456",
                    chain: "base-sepolia",
                })
            );
            expect(result.type).toBe("external-wallet");
            expect(result.locator).toBe("external-wallet:0x456");
            expect(result.status).toBe("success");
        });

        it("should return signatureId with prepareOnly", async () => {
            const mockRegisterResponse = {
                type: "external-wallet",
                address: "0x456",
                locator: "external-wallet:0x456",
                chains: {
                    "base-sepolia": {
                        id: "sig-123",
                        status: "awaiting-approval",
                    },
                },
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);

            const result = await evmWallet.addSigner(
                { type: "external-wallet", address: "0x456" },
                { prepareOnly: true }
            );

            expect(result.signatureId).toBe("sig-123");
            expect(result.type).toBe("external-wallet");
            expect(result.status).toBe("awaiting-approval");
        });

        it("should approve signature when status is awaiting-approval by default", async () => {
            const mockRegisterResponse = {
                type: "external-wallet",
                address: "0x456",
                locator: "external-wallet:0x456",
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

            const addPromise = evmWallet.addSigner({ type: "external-wallet", address: "0x456" });
            await vi.runAllTimersAsync();
            await addPromise;

            expect(mockApiClient.registerSigner).toHaveBeenCalled();
        });
    });

    describe("Solana chains", () => {
        it("should add signer successfully for Solana", async () => {
            const mockRegisterResponse = {
                type: "external-wallet",
                address: "ABC123",
                locator: "external-wallet:ABC123",
                transaction: {
                    id: "txn-123",
                    status: "pending",
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

            const addPromise = solanaWallet.addSigner({ type: "external-wallet", address: "ABC123" });
            await vi.runAllTimersAsync();
            const result = await addPromise;

            expect(mockApiClient.registerSigner).toHaveBeenCalledWith(
                "me:solana:smart",
                expect.objectContaining({
                    signer: "external-wallet:ABC123",
                    chain: undefined,
                })
            );
            expect(result.type).toBe("external-wallet");
            expect(result.status).toBe("success");
        });

        it("should return transactionId with prepareOnly", async () => {
            const mockRegisterResponse = {
                type: "external-wallet",
                address: "ABC123",
                locator: "external-wallet:ABC123",
                transaction: {
                    id: "txn-123",
                    status: "pending",
                },
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);

            const result = await solanaWallet.addSigner(
                { type: "external-wallet", address: "ABC123" },
                { prepareOnly: true }
            );

            expect(result.transactionId).toBe("txn-123");
            expect(result.type).toBe("external-wallet");
        });
    });

    describe("passkey signers", () => {
        it("should pass full passkey config including publicKey to API", async () => {
            const mockRegisterResponse = {
                type: "passkey",
                locator: "passkey:pk-123",
                chains: {
                    "base-sepolia": {
                        id: "sig-456",
                        status: "success",
                    },
                },
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);

            const passkeyConfig = {
                type: "passkey" as const,
                id: "pk-123",
                name: "My Passkey",
                publicKey: { x: "abc", y: "def" },
            };

            await evmWallet.addSigner(passkeyConfig);

            expect(mockApiClient.registerSigner).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({
                    signer: expect.objectContaining({
                        type: "passkey",
                        id: "pk-123",
                        name: "My Passkey",
                        publicKey: { x: "abc", y: "def" },
                    }),
                    chain: "base-sepolia",
                })
            );
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

            await expect(evmWallet.addSigner({ type: "external-wallet", address: "0x456" })).rejects.toThrow(
                "Failed to register signer"
            );
        });

        it("should throw error when Solana response missing transaction", async () => {
            const mockRegisterResponse = {
                type: "external-wallet",
                address: "ABC123",
                locator: "external-wallet:ABC123",
                chains: {},
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);

            await expect(solanaWallet.addSigner({ type: "external-wallet", address: "ABC123" })).rejects.toThrow(
                "Expected transaction in response for Solana/Stellar chain"
            );
        });

        it("should throw error when EVM response missing chains", async () => {
            const mockRegisterResponse = {
                type: "external-wallet",
                address: "0x456",
                locator: "external-wallet:0x456",
                transaction: { id: "txn-123" },
            };

            mockApiClient.registerSigner.mockResolvedValue(mockRegisterResponse as any);

            await expect(evmWallet.addSigner({ type: "external-wallet", address: "0x456" })).rejects.toThrow(
                "Expected chains in response for EVM chain"
            );
        });
    });
});

describe("Wallet - removeSigner()", () => {
    let mockApiClient: MockedApiClient;
    let evmWallet: Wallet<"base-sepolia">;
    let solanaWallet: Wallet<"solana">;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
        evmWallet = await createMockWallet("base-sepolia", mockApiClient);
        solanaWallet = await createMockWallet("solana", mockApiClient);
    });

    describe("success cases", () => {
        it("should remove signer for EVM chain", async () => {
            const mockRemoveResponse = {
                id: "txn-123",
                status: "pending",
                approvals: { pending: [], submitted: [] },
            };

            const mockGetTransactionResponse = {
                id: "txn-123",
                status: "success",
                onChain: {
                    txId: "0xhash-123",
                    explorerLink: "https://sepolia.basescan.org/tx/0xhash-123",
                },
            };

            mockApiClient.removeSigner.mockResolvedValue(mockRemoveResponse as any);
            mockApiClient.getTransaction.mockResolvedValue(mockGetTransactionResponse as any);

            const result = await evmWallet.removeSigner({ type: "external-wallet", address: "0x456" });

            expect(mockApiClient.removeSigner).toHaveBeenCalledWith(expect.any(String), "external-wallet:0x456", {
                chain: "base-sepolia",
            });
            expect(result.transactionId).toBe("txn-123");
            expect(result.status).toBe("success");
        });

        it("should remove signer with prepareOnly for EVM", async () => {
            const mockRemoveResponse = {
                id: "txn-123",
                status: "awaiting-approval",
                approvals: { pending: [], submitted: [] },
            };

            mockApiClient.removeSigner.mockResolvedValue(mockRemoveResponse as any);

            const result = await evmWallet.removeSigner(
                { type: "external-wallet", address: "0x456" },
                {
                    prepareOnly: true,
                }
            );

            expect(result.transactionId).toBe("txn-123");
            expect(result.status).toBeUndefined();
            expect(mockApiClient.approveSignature).not.toHaveBeenCalled();
        });

        it("should remove signer for Solana chain with transaction", async () => {
            const mockRemoveResponse = {
                id: "txn-123",
                status: "pending",
                approvals: { pending: [], submitted: [] },
            };

            mockApiClient.removeSigner.mockResolvedValue(mockRemoveResponse as any);
            mockApiClient.getTransaction.mockResolvedValue({
                id: "txn-123",
                status: "success",
                onChain: { txId: "hash-123", explorerLink: "https://explorer.com/tx/hash-123" },
            } as any);

            const result = await solanaWallet.removeSigner({ type: "external-wallet", address: "ABC123" });

            expect(mockApiClient.removeSigner).toHaveBeenCalledWith(expect.any(String), "external-wallet:ABC123", {
                chain: undefined,
            });
            expect(result.transactionId).toBe("txn-123");
            expect(result.status).toBe("success");
        });

        it("should remove signer with prepareOnly for Solana", async () => {
            const mockRemoveResponse = {
                id: "txn-123",
                status: "awaiting-approval",
                approvals: { pending: [], submitted: [] },
            };

            mockApiClient.removeSigner.mockResolvedValue(mockRemoveResponse as any);

            const result = await solanaWallet.removeSigner(
                { type: "external-wallet", address: "ABC123" },
                {
                    prepareOnly: true,
                }
            );

            expect(result.transactionId).toBe("txn-123");
            expect(result.status).toBeUndefined();
            expect(mockApiClient.getTransaction).not.toHaveBeenCalled();
        });
    });

    describe("error cases", () => {
        it("should throw error on API failure", async () => {
            mockApiClient.removeSigner.mockResolvedValue({
                error: true,
                message: "Failed to remove signer",
            } as any);

            await expect(evmWallet.removeSigner({ type: "external-wallet", address: "0x456" })).rejects.toThrow(
                "Failed to remove signer"
            );
        });

        it("should throw when removeSigner response omits transaction id", async () => {
            mockApiClient.removeSigner.mockResolvedValue({
                status: "pending",
                approvals: { pending: [], submitted: [] },
            } as any);
            mockApiClient.getTransaction.mockResolvedValue({ error: true, message: "not found" } as any);

            await expect(solanaWallet.removeSigner({ type: "external-wallet", address: "ABC123" })).rejects.toThrow(
                TransactionNotAvailableError
            );
        });
    });
});

describe("Wallet - signers()", () => {
    let mockApiClient: MockedApiClient;
    let wallet: Wallet<"base-sepolia">;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
        wallet = await createMockWallet("base-sepolia", mockApiClient);
        vi.mocked(wallet.signers).mockRestore();
    });

    describe("success cases", () => {
        it("should return list of signers with status for EVM", async () => {
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

            // Mock getSigner responses for each signer (EVM requires per-signer API calls)
            mockApiClient.getSigner
                .mockResolvedValueOnce({
                    type: "external-wallet",
                    address: "0xsigner1",
                    locator: "external-wallet:0xsigner1",
                    chains: {
                        "base-sepolia": { status: "success" },
                    },
                } as any)
                .mockResolvedValueOnce({
                    type: "external-wallet",
                    address: "0xsigner2",
                    locator: "external-wallet:0xsigner2",
                    chains: {
                        "base-sepolia": { status: "awaiting-approval", id: "sig-456" },
                    },
                } as any);

            const signers = await wallet.signers();

            expect(signers).toHaveLength(2);
            expect(signers[0].type).toBe("external-wallet");
            expect(signers[0].locator).toBe("external-wallet:0xsigner1");
            expect(signers[0].status).toBe("success");
            expect(signers[1].locator).toBe("external-wallet:0xsigner2");
            expect(signers[1].status).toBe("awaiting-approval");
        });

        it("should filter out signers without approval for current chain", async () => {
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

            // Signer1 has approval for base-sepolia, signer2 only has approval for ethereum (not base-sepolia)
            mockApiClient.getSigner
                .mockResolvedValueOnce({
                    type: "external-wallet",
                    address: "0xsigner1",
                    locator: "external-wallet:0xsigner1",
                    chains: {
                        "base-sepolia": { status: "success" },
                    },
                } as any)
                .mockResolvedValueOnce({
                    type: "external-wallet",
                    address: "0xsigner2",
                    locator: "external-wallet:0xsigner2",
                    chains: {
                        ethereum: { status: "success" },
                    },
                } as any);

            const signers = await wallet.signers();

            expect(signers).toHaveLength(1);
            expect(signers[0].locator).toBe("external-wallet:0xsigner1");
        });

        it("should return empty array when no signers", async () => {
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

            const signers = await wallet.signers();

            expect(signers).toHaveLength(0);
        });

        it("should return signer status for Solana from getSigner", async () => {
            const solanaWallet = await createMockWallet("solana", mockApiClient);
            vi.mocked(solanaWallet.signers).mockRestore();

            const mockWalletResponse: GetWalletSuccessResponse = {
                chainType: "solana",
                type: "smart",
                address: solanaWallet.address,
                config: {
                    adminSigner: {
                        type: "api-key",
                        address: "solana-admin",
                        locator: "api-key:admin",
                    },
                    delegatedSigners: [
                        {
                            type: "device",
                            locator: "device:solana-device",
                            publicKey: { x: "1", y: "2" },
                        },
                    ],
                },
                createdAt: Date.now(),
            } as GetWalletSuccessResponse;

            mockApiClient.getWallet.mockResolvedValue(mockWalletResponse);
            mockApiClient.getSigner.mockResolvedValue({
                type: "device",
                locator: "device:solana-device",
                publicKey: { x: "1", y: "2" },
                transaction: {
                    chainType: "solana",
                    id: "tx-123",
                    status: "pending",
                    onChain: {
                        transaction: "serialized-tx",
                    },
                },
            } as any);

            const signers = await solanaWallet.signers();

            expect(signers).toHaveLength(1);
            expect(signers[0].locator).toBe("device:solana-device");
            expect(signers[0].status).toBe("pending");
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

            await expect(wallet.signers()).rejects.toThrow(WalletNotAvailableError);
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

            await expect(wallet.signers()).rejects.toThrow(WalletTypeNotSupportedError);
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

            await expect(wallet.signers()).rejects.toThrow(WalletTypeNotSupportedError);
        });
    });
});

describe("Wallet - useSigner()", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("recovery signer support", () => {
        it("should accept the recovery signer (api-key) without registration check", async () => {
            mockApiClient = createMockApiClient();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await wallet.useSigner({ type: "api-key" } as any);

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("api-key");
        });

        it("should accept the recovery signer (email) by config object without registration check", async () => {
            mockApiClient = createMockApiClient();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "email", email: "admin@example.com" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await wallet.useSigner({ type: "email", email: "admin@example.com" } as any);

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("email");
        });

        it("should accept the recovery signer (phone) by config object without registration check", async () => {
            mockApiClient = createMockApiClient();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "phone", phone: "+1234567890" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await wallet.useSigner({ type: "phone", phone: "+1234567890" } as any);

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("phone");
        });

        it("should accept recovery external-wallet signer with full config object", async () => {
            mockApiClient = createMockApiClient();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "external-wallet", address: "0xRecoveryWallet" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await wallet.useSigner({
                type: "external-wallet",
                address: "0xRecoveryWallet",
                onSign: vi.fn().mockResolvedValue("0xsigned"),
            } as any);

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("external-wallet");
        });

        it("should accept the recovery signer (passkey) when no delegated passkeys exist", async () => {
            mockApiClient = createMockApiClient();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "passkey" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            // No delegated passkeys → falls back to recovery signer
            await wallet.useSigner({ type: "passkey" } as any);

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("passkey");
        });

        it("should accept a passkey with explicit id as recovery when not found in delegated signers", async () => {
            mockApiClient = createMockApiClient();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "passkey" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            // Not a registered delegated signer, but matches recovery type → accepted as recovery
            await wallet.useSigner({ type: "passkey", id: "recovery-credential" } as any);

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("passkey");
        });

        it("should use passkey with explicit id as delegated when it IS registered, even if recovery is also passkey", async () => {
            mockApiClient = createMockApiClient();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "passkey" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([
                {
                    type: "passkey",
                    id: "delegated-credential",
                    address: "0xPasskey",
                    locator: "passkey:delegated-credential",
                    status: "success" as const,
                },
            ]);

            // This id matches a registered delegated signer → used as delegated, not recovery
            await wallet.useSigner({ type: "passkey", id: "delegated-credential" } as any);

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("passkey");
        });

        it("should still reject non-recovery, non-registered signers", async () => {
            mockApiClient = createMockApiClient();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            // An email signer that is NOT the recovery signer and NOT registered should fail
            await expect(wallet.useSigner({ type: "email", email: "unknown@example.com" } as any)).rejects.toThrow(
                'Signer "email:unknown@example.com" is not registered in this wallet.'
            );
        });

        it("should accept server recovery signer when recovery config has no secret (API-sourced)", async () => {
            const { deriveServerSignerDetails } = await import("@/signers/server");
            const mockedDerive = vi.mocked(deriveServerSignerDetails);
            // The input signer (with secret) derives to this address
            mockedDerive.mockReturnValue({
                derivedKeyBytes: new Uint8Array(32),
                derivedAddress: "0xDerivedServerAddress",
            });

            mockApiClient = createMockApiClient();
            // API-sourced recovery config: has address but no secret
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "server", address: "0xDerivedServerAddress" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([]);
            mockApiClient.getSigner.mockResolvedValue({
                type: "server",
                address: "0xDerivedServerAddress",
                locator: "server:0xDerivedServerAddress",
                chains: {
                    "base-sepolia": { status: "active", id: "sig-server" },
                },
            } as any);

            // Should NOT throw TypeError about 'startsWith'
            await wallet.useSigner({ type: "server", secret: "test-secret" } as any);

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("server");
        });

        it("should reject server signer when derived address does not match API-sourced recovery address", async () => {
            const { deriveServerSignerDetails } = await import("@/signers/server");
            const mockedDerive = vi.mocked(deriveServerSignerDetails);
            // The input signer derives to a DIFFERENT address than the recovery
            mockedDerive.mockReturnValue({
                derivedKeyBytes: new Uint8Array(32),
                derivedAddress: "0xDifferentAddress",
            });

            mockApiClient = createMockApiClient();
            // API-sourced recovery config with a different address
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "server", address: "0xRecoveryAddress" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            // Should throw "not registered" rather than a TypeError
            await expect(wallet.useSigner({ type: "server", secret: "wrong-secret" } as any)).rejects.toThrow(
                "is not registered in this wallet"
            );
        });

        it("should accept server recovery signer when recovery config has a secret (user-provided)", async () => {
            const { deriveServerSignerDetails } = await import("@/signers/server");
            const mockedDerive = vi.mocked(deriveServerSignerDetails);
            // Both input and recovery derive to the same address
            mockedDerive.mockReturnValue({
                derivedKeyBytes: new Uint8Array(32),
                derivedAddress: "0xDerivedServerAddress",
            });

            mockApiClient = createMockApiClient();
            // User-provided recovery config: has a secret
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "server", secret: "recovery-secret" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([]);
            mockApiClient.getSigner.mockResolvedValue({
                type: "server",
                address: "0xDerivedServerAddress",
                locator: "server:0xDerivedServerAddress",
                chains: {
                    "base-sepolia": { status: "active", id: "sig-server" },
                },
            } as any);

            await wallet.useSigner({ type: "server", secret: "test-secret" } as any);

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("server");
        });

        it("should still allow registered delegated signers that are not the recovery signer", async () => {
            mockApiClient = createMockApiClient();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([
                {
                    type: "email",
                    email: "delegated@example.com",
                    address: "0xDelegated",
                    locator: "email:delegated@example.com",
                    status: "success" as const,
                },
            ]);
            mockApiClient.getSigner.mockResolvedValue({
                type: "email",
                email: "delegated@example.com",
                address: "0xDelegated",
                locator: "email:delegated@example.com",
                chains: {
                    "base-sepolia": { status: "awaiting-approval", id: "sig-789" },
                },
            } as any);

            await wallet.useSigner({ type: "email", email: "delegated@example.com" } as any);

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("email");
            expect(wallet.signer?.status).toBe("awaiting-approval");
        });

        it("addSigner should throw when no signer is set and recovery is API-sourced", async () => {
            const { deriveServerSignerDetails } = await import("@/signers/server");
            const mockedDerive = vi.mocked(deriveServerSignerDetails);
            mockedDerive.mockReturnValue({
                derivedKeyBytes: new Uint8Array(32),
                derivedAddress: "0xNewSignerAddress",
            });

            mockApiClient = createMockApiClient();
            // API-sourced recovery with no secret
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "server", address: "0xRecoveryAddress" } as any,
                },
                mockApiClient as unknown as ApiClient
            );

            // Don't call useSigner — this.#signer is null
            await expect(wallet.addSigner({ type: "server", secret: "new-signer-secret" } as any)).rejects.toThrow(
                "the recovery config is API-sourced (no secret)"
            );
        });

        it("addSigner should throw when active signer is not a server type and recovery is API-sourced", async () => {
            const { deriveServerSignerDetails } = await import("@/signers/server");
            const mockedDerive = vi.mocked(deriveServerSignerDetails);
            mockedDerive.mockReturnValue({
                derivedKeyBytes: new Uint8Array(32),
                derivedAddress: "0xNewSignerAddress",
            });

            mockApiClient = createMockApiClient();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "server", address: "0xRecoveryAddress" } as any,
                },
                mockApiClient as unknown as ApiClient
            );

            // Set an email delegated signer via useSigner (registered as delegated)
            vi.spyOn(wallet, "signers").mockResolvedValue([
                {
                    type: "email",
                    email: "delegated@example.com",
                    address: "0xDelegated",
                    locator: "email:delegated@example.com",
                    status: "success" as const,
                },
            ]);
            mockApiClient.getSigner.mockResolvedValue({
                type: "email",
                email: "delegated@example.com",
                address: "0xDelegated",
                locator: "email:delegated@example.com",
                chains: {
                    "base-sepolia": { status: "active", id: "sig-email" },
                },
            } as any);
            await wallet.useSigner({ type: "email", email: "delegated@example.com" } as any);

            // Now addSigner should throw because the active signer is email, not server
            await expect(wallet.addSigner({ type: "server", secret: "new-signer-secret" } as any)).rejects.toThrow(
                "the recovery config is API-sourced (no secret)"
            );
        });
    });
});

describe("Wallet - recover()", () => {
    let mockApiClient: MockedApiClient;

    // Helper: create a mock DeviceSignerKeyStorage
    const createMockDeviceKeyStorage = () => ({
        generateKey: vi.fn().mockResolvedValue("mockPublicKeyBase64"),
        getKey: vi.fn().mockResolvedValue(null),
        hasKey: vi.fn().mockResolvedValue(false),
        mapAddressToKey: vi.fn().mockResolvedValue(undefined),
        deleteKey: vi.fn().mockResolvedValue(undefined),
        signMessage: vi.fn().mockResolvedValue({ r: "0x1", s: "0x2" }),
        getDeviceName: vi.fn().mockReturnValue("Test Device"),
        apiKey: "test-api-key",
    });

    // Helper: create a mock SignerAdapter for device type
    const createDeviceSignerAdapter = (
        locatorValue = "device:testkey123",
        status?: string
    ): SignerAdapter<"device"> => ({
        type: "device",
        status: status as any,
        locator: () => locatorValue as any,
        signMessage: vi.fn(),
        signTransaction: vi.fn(),
    });

    // Helper: mock getSigner to return an approved EVM device signer
    const mockGetSignerApproved = (chain: string, locator = "device:testkey123") => {
        if (chain === "stellar" || chain === "solana") {
            mockApiClient.getSigner.mockResolvedValue({
                type: "device",
                locator,
                publicKey: { x: "1", y: "2" },
                transaction: { id: "tx-1", status: "success" },
            } as any);
        } else {
            mockApiClient.getSigner.mockResolvedValue({
                type: "device",
                locator,
                publicKey: { x: "1", y: "2" },
                chains: { "base-sepolia": { status: "success" } },
            } as any);
        }
    };

    // Helper: mock getSigner to return a pending EVM device signer with a signature op
    const mockGetSignerPendingSignature = (sigId = "sig-pending-1") => {
        mockApiClient.getSigner.mockResolvedValue({
            type: "device",
            locator: "device:testkey123",
            publicKey: { x: "1", y: "2" },
            chains: {
                "base-sepolia": { status: "awaiting-approval", id: sigId },
            },
        } as any);
    };

    // Helper: mock getSigner to return a pending Stellar device signer with a transaction op
    const mockGetSignerPendingTransaction = (txId = "tx-pending-1") => {
        mockApiClient.getSigner.mockResolvedValue({
            type: "device",
            locator: "device:testkey123",
            publicKey: { x: "1", y: "2" },
            transaction: {
                chainType: "stellar",
                id: txId,
                status: "pending",
                onChain: { transaction: "serialized-tx" },
            },
        } as any);
    };

    // Helper: mock getSigner to return a signer with no approval / not approved
    const mockGetSignerNotApproved = () => {
        mockApiClient.getSigner.mockResolvedValue({
            type: "device",
            locator: "device:testkey123",
            publicKey: { x: "1", y: "2" },
            chains: {},
        } as any);
    };

    // Helper: mock successful signature approval flow
    const mockSignatureApprovalSuccess = (sigId = "sig-pending-1") => {
        mockApiClient.getSignature.mockResolvedValue({
            id: sigId,
            status: "success",
            outputSignature: "0xapprovedsig",
        } as any);
    };

    // Helper: mock successful transaction approval flow
    const mockTransactionApprovalSuccess = (txId = "tx-pending-1") => {
        mockApiClient.getTransaction.mockResolvedValue({
            id: txId,
            status: "success",
            chainType: "stellar",
            onChain: {
                txEnvelope: "envelope-xdr",
                txHash: "stellar-hash",
                explorerLink: "https://stellar.explorer/tx",
            },
        } as any);
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
    });

    describe("early return paths", () => {
        it("should skip recovery when deviceSignerApproved is already cached", async () => {
            // Use undefined status so first recover() must call getSigner to verify approval
            const deviceSigner = createDeviceSignerAdapter("device:testkey123", undefined);
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    signer: deviceSigner,
                },
                mockApiClient as unknown as ApiClient
            );

            // First call — signer status is unknown, so it checks via API and caches the flag
            mockGetSignerApproved("base-sepolia");
            await wallet.recover();
            expect(mockApiClient.getSigner).toHaveBeenCalledTimes(1);

            // Second call — should return immediately from cache without API call
            mockApiClient.getSigner.mockClear();
            await wallet.recover();
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });

        it("should skip recovery when current signer is non-device type (email)", async () => {
            const emailSigner: SignerAdapter = {
                type: "email",
                status: "success",
                locator: () => "email:user@example.com" as any,
                signMessage: vi.fn(),
                signTransaction: vi.fn(),
            };
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    signer: emailSigner,
                },
                mockApiClient as unknown as ApiClient
            );

            await wallet.recover();

            // Should not call getSigner at all — non-device signer is skipped
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });

        it("should return silently when no deviceSignerKeyStorage and !needsRecovery", async () => {
            // Wallet with no signer and no deviceSignerKeyStorage — needsRecovery defaults false
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                },
                mockApiClient as unknown as ApiClient
            );

            // Flush init so any constructor-driven API calls complete first
            await new Promise((resolve) => setTimeout(resolve, 0));
            mockApiClient.getSigner.mockClear();

            // Should not throw and recover itself should not call getSigner
            await wallet.recover();
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });

        it("should return early for Solana chain (defense-in-depth)", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            const wallet = new Wallet(
                {
                    chain: "solana",
                    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );

            // Flush init so any constructor-driven API calls complete first
            await new Promise((resolve) => setTimeout(resolve, 0));
            mockApiClient.getWallet.mockClear();
            mockApiClient.getSigner.mockClear();

            await wallet.recover();

            // recover() itself should not call signers() or getSigner — early Solana guard
            expect(mockApiClient.getWallet).not.toHaveBeenCalled();
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });
    });

    describe("existing device signer on wallet (this.#signer)", () => {
        it("should mark approved when assembled device signer has approved status", async () => {
            const deviceSigner = createDeviceSignerAdapter("device:testkey123", "success");
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    signer: deviceSigner,
                },
                mockApiClient as unknown as ApiClient
            );

            await wallet.recover();

            expect(wallet.signer?.type).toBe("device");
            expect(wallet.needsRecovery()).toBe(false);
            // No API calls needed — status was already approved in-memory
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });

        it("should mark approved when assembled device signer has active status", async () => {
            const deviceSigner = createDeviceSignerAdapter("device:testkey123", "active");
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    signer: deviceSigner,
                },
                mockApiClient as unknown as ApiClient
            );

            await wallet.recover();

            expect(wallet.needsRecovery()).toBe(false);
        });

        it("should check API and approve when signer status is not yet approved", async () => {
            const deviceSigner = createDeviceSignerAdapter("device:testkey123", undefined);
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    signer: deviceSigner,
                },
                mockApiClient as unknown as ApiClient
            );

            mockGetSignerApproved("base-sepolia");

            await wallet.recover();

            expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:evm:smart", "device:testkey123");
            expect(wallet.signer?.status).toBe("success");
            expect(wallet.needsRecovery()).toBe(false);
        });

        it("should resume pending signature approval on EVM chain", async () => {
            const deviceSigner = createDeviceSignerAdapter("device:testkey123", undefined);
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    signer: deviceSigner,
                },
                mockApiClient as unknown as ApiClient
            );

            mockGetSignerPendingSignature("sig-resume-1");
            mockSignatureApprovalSuccess("sig-resume-1");

            await wallet.recover();

            expect(mockApiClient.getSigner).toHaveBeenCalled();
            expect(mockApiClient.getSignature).toHaveBeenCalledWith("me:evm:smart", "sig-resume-1");
            expect(wallet.signer?.status).toBe("success");
        });

        it("should resume pending Stellar device signer registration from getSigner", async () => {
            const deviceSigner = createDeviceSignerAdapter("device:stellar-device", "pending");
            const wallet = new Wallet(
                {
                    chain: "stellar",
                    address: "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY",
                    recovery: { type: "api-key" } as any,
                    signer: deviceSigner,
                },
                mockApiClient as unknown as ApiClient
            );

            mockApiClient.getSigner.mockResolvedValue({
                type: "device",
                locator: "device:stellar-device",
                publicKey: { x: "1", y: "2" },
                transaction: {
                    chainType: "solana",
                    id: "tx-123",
                    status: "pending",
                    onChain: { transaction: "serialized-tx" },
                },
            } as any);
            mockApiClient.getTransaction.mockResolvedValue({
                id: "tx-123",
                status: "success",
                chainType: "stellar",
                onChain: {
                    txEnvelope: "envelope-xdr",
                    txHash: "stellar-hash",
                    explorerLink: "https://stellar.explorer/tx-123",
                },
            } as any);

            await wallet.recover();

            expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:stellar:smart", "device:stellar-device");
            expect(mockApiClient.getTransaction).toHaveBeenCalledWith("me:stellar:smart", "tx-123");
            expect(wallet.signer?.status).toBe("success");
        });
    });

    describe("findLocalDeviceSigner path", () => {
        it("should find local device signer and mark approved", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            mockStorage.hasKey.mockResolvedValue(true);

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "device", locator: "device:localkey456", publicKey: { x: "1", y: "2" }, status: "success" },
            ] as any);

            mockGetSignerApproved("base-sepolia", "device:localkey456");

            await wallet.recover();

            expect(mockStorage.hasKey).toHaveBeenCalledWith("localkey456");
            expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:evm:smart", "device:localkey456");
            expect(wallet.signer?.type).toBe("device");
            expect(wallet.needsRecovery()).toBe(false);
        });

        it("should call mapAddressToKey after confirming signer is approved", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            mockStorage.hasKey.mockResolvedValue(true);

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "device", locator: "device:localkey456", publicKey: { x: "1", y: "2" }, status: "success" },
            ] as any);

            mockGetSignerApproved("base-sepolia", "device:localkey456");

            await wallet.recover();

            expect(mockStorage.mapAddressToKey).toHaveBeenCalledWith(
                "0x1234567890123456789012345678901234567890",
                "localkey456"
            );
        });

        it("should tolerate mapAddressToKey failure without losing signer", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            mockStorage.hasKey.mockImplementation(async (key: string) => key === "localkey456");
            mockStorage.mapAddressToKey.mockRejectedValue(new Error("Storage I/O error"));

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers")
                .mockResolvedValueOnce([
                    { type: "device", locator: "device:localkey456", publicKey: { x: "1", y: "2" }, status: "success" },
                ] as any) // recover's findLocalDeviceSigner
                .mockResolvedValue([] as any); // init's resolveDeviceSignerAvailability

            mockGetSignerApproved("base-sepolia", "device:localkey456");

            await wallet.recover();

            // Signer should still be assigned despite mapAddressToKey failure
            expect(wallet.signer?.type).toBe("device");
            expect(wallet.needsRecovery()).toBe(false);
        });

        it("should resume pending operation on a found local device signer", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            mockStorage.hasKey.mockResolvedValue(true);

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "device", locator: "device:localkey456", publicKey: { x: "1", y: "2" }, status: "pending" },
            ] as any);

            // getSigner returns pending signature
            mockApiClient.getSigner.mockResolvedValue({
                type: "device",
                locator: "device:localkey456",
                publicKey: { x: "1", y: "2" },
                chains: {
                    "base-sepolia": { status: "awaiting-approval", id: "sig-local-1" },
                },
            } as any);
            mockSignatureApprovalSuccess("sig-local-1");

            await wallet.recover();

            expect(mockApiClient.getSignature).toHaveBeenCalledWith("me:evm:smart", "sig-local-1");
            expect(wallet.signer?.type).toBe("device");
            expect(wallet.signer?.status).toBe("success");
        });

        it("should skip device signers without local keys and check the next one", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            // Use mockImplementation so both init and recover get consistent key-based behavior
            mockStorage.hasKey.mockImplementation(async (key: string) => key === "mykey789");

            const deviceSigners = [
                {
                    type: "device",
                    locator: "device:otherdevicekey",
                    publicKey: { x: "a", y: "b" },
                    status: "success",
                },
                { type: "device", locator: "device:mykey789", publicKey: { x: "1", y: "2" }, status: "success" },
            ];

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            // recover()'s findLocalDeviceSigner calls signers() FIRST (sync, before init's getKey
            // microtask resolves). Give it the device signers; init gets empty → needsRecovery.
            vi.spyOn(wallet, "signers")
                .mockResolvedValueOnce(deviceSigners as any) // recover's findLocalDeviceSigner
                .mockResolvedValue([] as any); // init's resolveDeviceSignerAvailability

            mockGetSignerApproved("base-sepolia", "device:mykey789");

            await wallet.recover();

            expect(mockStorage.hasKey).toHaveBeenCalledWith("otherdevicekey");
            expect(mockStorage.hasKey).toHaveBeenCalledWith("mykey789");
            expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:evm:smart", "device:mykey789");
            expect(wallet.signer?.type).toBe("device");
        });

        it("should continue checking when hasKey throws for one signer", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            mockStorage.hasKey.mockImplementation(async (key: string) => {
                if (key === "badkey") throw new Error("Key check failed");
                return key === "goodkey";
            });

            const deviceSigners = [
                { type: "device", locator: "device:badkey", publicKey: { x: "a", y: "b" }, status: "success" },
                { type: "device", locator: "device:goodkey", publicKey: { x: "1", y: "2" }, status: "success" },
            ];

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers")
                .mockResolvedValueOnce(deviceSigners as any) // recover's findLocalDeviceSigner
                .mockResolvedValue([] as any); // init's resolveDeviceSignerAvailability

            mockGetSignerApproved("base-sepolia", "device:goodkey");

            await wallet.recover();

            expect(mockStorage.hasKey).toHaveBeenCalledTimes(2);
            expect(wallet.signer?.type).toBe("device");
        });

        it("should propagate network errors from signers() instead of silently generating new key", async () => {
            const mockStorage = createMockDeviceKeyStorage();

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockRejectedValue(new Error("Network error"));

            await expect(wallet.recover()).rejects.toThrow("Network error");

            // Should NOT have tried to generate a new key
            expect(mockStorage.generateKey).not.toHaveBeenCalled();
        });

        it("should ignore non-device signers when searching for local device signer", async () => {
            const mockStorage = createMockDeviceKeyStorage();

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "email", locator: "email:user@example.com", status: "success" },
                { type: "api-key", locator: "api-key", status: "success" },
            ] as any);

            // No device signers found — should proceed to new key generation
            // Mock registerSigner for the createDeviceSigner fallback
            mockApiClient.registerSigner.mockResolvedValue({
                type: "device",
                locator: "device:mockNewKey",
                publicKey: { x: "0x01", y: "0x02" },
                chains: { "base-sepolia": { status: "success" } },
            } as any);
            mockGetSignerApproved("base-sepolia", "device:mockNewKey");

            // hasKey should never be called since there are no device signers
            await wallet.recover();
            expect(mockStorage.hasKey).not.toHaveBeenCalled();
        });
    });

    describe("new key generation fallback (createDeviceSigner + addSigner)", () => {
        it("should generate new key and register when no local device signer found", async () => {
            const mockStorage = createMockDeviceKeyStorage();

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([] as any);

            mockApiClient.registerSigner.mockResolvedValue({
                type: "device",
                locator: "device:mockNewKey",
                publicKey: { x: "0x01", y: "0x02" },
                chains: { "base-sepolia": { status: "success" } },
            } as any);
            mockGetSignerApproved("base-sepolia", "device:mockNewKey");

            await wallet.recover();

            expect(mockApiClient.registerSigner).toHaveBeenCalled();
            expect(wallet.signer?.type).toBe("device");
            expect(wallet.signer?.status).toBe("success");
            expect(wallet.needsRecovery()).toBe(false);
        });

        it("should handle 'already approved' error gracefully during addSigner", async () => {
            const mockStorage = createMockDeviceKeyStorage();

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([] as any);

            // registerSigner returns an error response with "error" field → addSigner throws
            mockApiClient.registerSigner.mockResolvedValue({
                error: true,
                message: "Delegated signer is already 'approved'",
            } as any);
            // assembleFullSigner after the catch still needs getSigner
            mockGetSignerApproved("base-sepolia", "device:mockNewKey");

            await wallet.recover();

            // Should NOT delete the key
            expect(mockStorage.deleteKey).not.toHaveBeenCalled();
            expect(wallet.signer?.type).toBe("device");
            expect(wallet.signer?.status).toBe("success");
        });

        it("should delete key and rethrow when addSigner fails with non-'already approved' error", async () => {
            const mockStorage = createMockDeviceKeyStorage();

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([] as any);

            // registerSigner returns an error response → addSigner throws
            mockApiClient.registerSigner.mockResolvedValue({
                error: true,
                message: "Internal server error",
            } as any);

            await expect(wallet.recover()).rejects.toThrow("Failed to register signer");

            expect(mockStorage.deleteKey).toHaveBeenCalledWith("0x1234567890123456789012345678901234567890");
        });

        it("should not false-positive on error containing 'already' and 'approved' without 'delegated signer'", async () => {
            const mockStorage = createMockDeviceKeyStorage();

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([] as any);

            // Simulate a JSON-stringified API response that contains "already" and "approved"
            // but is NOT the "delegated signer already approved" error
            mockApiClient.registerSigner.mockResolvedValue({
                error: true,
                message: '{"status":"already","result":"approved","error":"some other failure"}',
            } as any);

            await expect(wallet.recover()).rejects.toThrow("Failed to register signer");
            expect(mockStorage.deleteKey).toHaveBeenCalled();
        });
    });

    describe("resumePendingDeviceSignerApproval error handling", () => {
        it("should preserve device signer reference on approval error (not restore null)", async () => {
            const deviceSigner = createDeviceSignerAdapter("device:testkey123", undefined);
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    signer: deviceSigner,
                },
                mockApiClient as unknown as ApiClient
            );

            // getSigner returns a pending signature
            mockGetSignerPendingSignature("sig-fail-1");
            // But the signature approval fails
            mockApiClient.getSignature.mockResolvedValue({
                error: { message: "Signature not found" },
            } as any);

            await expect(wallet.recover()).rejects.toThrow();

            // The device signer should still be set (not null)
            expect(wallet.signer).toBe(deviceSigner);
            expect(wallet.signer?.type).toBe("device");
        });

        it("should resume pending transaction approval on Stellar chain", async () => {
            const deviceSigner = createDeviceSignerAdapter("device:stellar-device", undefined);
            const wallet = new Wallet(
                {
                    chain: "stellar",
                    address: "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY",
                    recovery: { type: "api-key" } as any,
                    signer: deviceSigner,
                },
                mockApiClient as unknown as ApiClient
            );

            mockGetSignerPendingTransaction("tx-stellar-1");
            mockTransactionApprovalSuccess("tx-stellar-1");

            await wallet.recover();

            expect(mockApiClient.getTransaction).toHaveBeenCalledWith("me:stellar:smart", "tx-stellar-1");
            expect(wallet.signer?.status).toBe("success");
        });
    });

    describe("findLocalDeviceSigner with pending op on matched signer that fails check", () => {
        it("should fall through to new key generation when local signer is not approved and has no pending op", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            mockStorage.hasKey.mockImplementation(async (key: string) => key === "unapprovedkey");

            const deviceSigners = [
                {
                    type: "device",
                    locator: "device:unapprovedkey",
                    publicKey: { x: "1", y: "2" },
                    status: "pending",
                },
            ];

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers")
                .mockResolvedValueOnce(deviceSigners as any) // recover's findLocalDeviceSigner
                .mockResolvedValue([] as any); // init's resolveDeviceSignerAvailability

            // First getSigner call (for findLocalDeviceSigner match) — not approved, no pending op
            mockApiClient.getSigner.mockResolvedValueOnce({
                type: "device",
                locator: "device:unapprovedkey",
                publicKey: { x: "1", y: "2" },
                chains: { "base-sepolia": { status: "failed" } },
            } as any);

            // Second getSigner call (for assembleFullSigner after createDeviceSigner)
            mockApiClient.getSigner.mockResolvedValueOnce({
                type: "device",
                locator: "device:mockNewKey",
                publicKey: { x: "0x01", y: "0x02" },
                chains: { "base-sepolia": { status: "success" } },
            } as any);

            // createDeviceSigner → addSigner path
            mockApiClient.registerSigner.mockResolvedValue({
                type: "device",
                locator: "device:mockNewKey",
                publicKey: { x: "0x01", y: "0x02" },
                chains: { "base-sepolia": { status: "success" } },
            } as any);

            await wallet.recover();

            // Should have attempted findLocalDeviceSigner, failed check, and fallen through
            expect(mockApiClient.registerSigner).toHaveBeenCalled();
            expect(wallet.signer?.type).toBe("device");
        });
    });
});

describe("Wallet - isSignerApproved()", () => {
    it("should return true only when signer status is success", async () => {
        const mockApiClient = createMockApiClient();
        const wallet = await createMockWallet("base-sepolia", mockApiClient);
        vi.mocked(wallet.signers).mockRestore();

        mockApiClient.getSigner
            .mockResolvedValueOnce({
                type: "email",
                email: "approved@example.com",
                address: "0xApproved",
                locator: "email:approved@example.com",
                chains: {
                    "base-sepolia": { status: "success" },
                },
            } as any)
            .mockResolvedValueOnce({
                type: "email",
                email: "pending@example.com",
                address: "0xPending",
                locator: "email:pending@example.com",
                chains: {
                    "base-sepolia": { status: "awaiting-approval", id: "sig-pending" },
                },
            } as any);

        await expect(wallet.isSignerApproved("email:approved@example.com")).resolves.toBe(true);
        await expect(wallet.isSignerApproved("email:pending@example.com")).resolves.toBe(false);
    });
});
