import { describe, it, expect, beforeEach, vi } from "vitest";
import { EVMDelegatedSignerService } from "./delegated-signers-service";
import { mock } from "vitest-mock-extended";
import type { EVMSmartWalletImpl } from "../wallet";
import {
    WalletNotAvailableError,
    WalletTypeNotSupportedError,
} from "../../../utils/errors";
import type { EVMSigner } from "../types/signers";
import type { ApiClient } from "../../../api";

describe("EVMDelegatedSignerService", () => {
    const walletLocator = "mock-wallet-locator";
    const apiClient = mock<ApiClient>();
    const wallet = mock<EVMSmartWalletImpl>();
    let delegatedSignerService: EVMDelegatedSignerService;

    beforeEach(() => {
        vi.resetAllMocks();
        delegatedSignerService = new EVMDelegatedSignerService(
            walletLocator,
            wallet,
            apiClient
        );
    });

    describe("registerDelegatedSigner", () => {
        const chain = "base-sepolia";
        const signerAddress = "0x1234567890123456789012345678901234567890";

        it("should register a delegated signer without requiring approval", async () => {
            const mockResponse = {
                type: "evm-keypair",
                chains: {
                    [chain]: {
                        status: "success",
                    },
                },
            };

            apiClient.registerSigner.mockResolvedValueOnce(mockResponse);
            apiClient.getSigner.mockResolvedValueOnce({
                address: signerAddress,
            });

            const result = await delegatedSignerService.registerDelegatedSigner(
                chain,
                signerAddress
            );

            expect(apiClient.registerSigner).toHaveBeenCalledWith(
                walletLocator,
                {
                    signer: signerAddress,
                    chain,
                    expiresAt: undefined,
                }
            );
            expect(apiClient.getSigner).toHaveBeenCalledWith(
                walletLocator,
                signerAddress
            );
            expect(result).toEqual({ address: signerAddress });
        });

        it("should register a delegated signer with approval and admin signer", async () => {
            const adminSigner = mock<EVMSigner>();
            const pendingApprovals = [
                { signer: "signer1", message: "message1" },
            ];
            const mockResponse = {
                type: "evm-keypair",
                chains: {
                    [chain]: {
                        status: "awaiting-approval",
                        id: "approval-id",
                        approvals: {
                            pending: pendingApprovals,
                        },
                    },
                },
            };

            apiClient.registerSigner.mockResolvedValueOnce(mockResponse);
            apiClient.getSigner.mockResolvedValueOnce({
                address: signerAddress,
            });

            const result = await delegatedSignerService.registerDelegatedSigner(
                chain,
                signerAddress,
                {
                    adminSigner,
                }
            );

            expect(apiClient.registerSigner).toHaveBeenCalledWith(
                walletLocator,
                {
                    signer: signerAddress,
                    chain,
                    expiresAt: undefined,
                }
            );
            expect(wallet.approveSignature).toHaveBeenCalledWith(
                pendingApprovals,
                "approval-id"
            );
            expect(wallet.waitForSignature).toHaveBeenCalledWith("approval-id");
            expect(apiClient.getSigner).toHaveBeenCalledWith(
                walletLocator,
                signerAddress
            );
            expect(result).toEqual({ address: signerAddress });
        });

        it("should throw error when approval is required but no admin signer provided", async () => {
            const mockResponse = {
                type: "evm-keypair",
                chains: {
                    [chain]: {
                        status: "awaiting-approval",
                        id: "approval-id",
                    },
                },
            };

            apiClient.registerSigner.mockResolvedValueOnce(mockResponse);

            await expect(
                delegatedSignerService.registerDelegatedSigner(
                    chain,
                    signerAddress
                )
            ).rejects.toThrow(
                "Admin signer is required to approve delegated signer registration"
            );
        });
    });

    describe("getDelegatedSigners", () => {
        it("should get all delegated signers", async () => {
            const delegatedSigners = [
                { address: "0x123", status: "active" },
                { address: "0x456", status: "active" },
            ];

            apiClient.getWallet.mockResolvedValueOnce({
                type: "evm-smart-wallet",
                config: {
                    delegatedSigners,
                },
            });

            const result = await delegatedSignerService.getDelegatedSigners();

            expect(apiClient.getWallet).toHaveBeenCalledWith(walletLocator);
            expect(result).toEqual(delegatedSigners);
        });

        it("should return empty array when no delegated signers exist", async () => {
            apiClient.getWallet.mockResolvedValueOnce({
                type: "evm-smart-wallet",
                config: {},
            });

            const result = await delegatedSignerService.getDelegatedSigners();

            expect(apiClient.getWallet).toHaveBeenCalledWith(walletLocator);
            expect(result).toEqual([]);
        });

        it("should throw error when wallet type is not supported", async () => {
            apiClient.getWallet.mockResolvedValueOnce({
                type: "unsupported-wallet-type",
            });

            await expect(
                delegatedSignerService.getDelegatedSigners()
            ).rejects.toThrow(WalletTypeNotSupportedError);
        });

        it("should throw error when wallet is not available", async () => {
            apiClient.getWallet.mockResolvedValueOnce({
                error: "wallet not found",
            });

            await expect(
                delegatedSignerService.getDelegatedSigners()
            ).rejects.toThrow(WalletNotAvailableError);
        });
    });

    describe("getDelegatedSigner", () => {
        it("should get a specific delegated signer", async () => {
            const signerAddress = "0x1234567890123456789012345678901234567890";
            const mockSigner = { address: signerAddress, status: "active" };

            apiClient.getSigner.mockResolvedValueOnce(mockSigner);

            const result = await delegatedSignerService.getDelegatedSigner(
                signerAddress
            );

            expect(apiClient.getSigner).toHaveBeenCalledWith(
                walletLocator,
                signerAddress
            );
            expect(result).toEqual(mockSigner);
        });
    });
});
