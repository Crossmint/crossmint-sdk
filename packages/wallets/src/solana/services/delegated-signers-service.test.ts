import { describe, it, expect, beforeEach, vi } from "vitest";
import { SolanaDelegatedSignerService } from "./delegated-signers-service";
import type { ApiClient } from "../../api";
import { mock } from "vitest-mock-extended";
import type { SolanaTransactionsService } from "./transactions-service";
import type { SolanaNonCustodialSigner } from "../types/signers";
import { WalletNotAvailableError, WalletTypeNotSupportedError } from "../../utils/errors";

vi.mock("../../utils", () => ({
    sleep: vi.fn(),
}));

describe("SolanaDelegatedSignerService", () => {
    const walletLocator = "mock-wallet-locator";
    const apiClient = mock<ApiClient>();
    const transactionsService = mock<SolanaTransactionsService>();
    let delegatedSignerService: SolanaDelegatedSignerService;

    beforeEach(() => {
        vi.resetAllMocks();
        delegatedSignerService = new SolanaDelegatedSignerService(walletLocator, transactionsService, apiClient);
    });

    describe("registerDelegatedSigner", () => {
        it("should register a delegated signer without admin signer", async () => {
            const signerAddress = "mock-signer-address";
            const transactionId = "mock-tx-id";

            apiClient.registerSigner.mockResolvedValueOnce({
                transaction: { id: transactionId },
            });

            apiClient.getSigner.mockResolvedValueOnce({
                address: signerAddress,
                status: "active",
            });

            const result = await delegatedSignerService.registerDelegatedSigner(signerAddress);

            expect(apiClient.registerSigner).toHaveBeenCalledWith(walletLocator, { signer: signerAddress });
            expect(transactionsService.approveTransaction).toHaveBeenCalledWith(transactionId, []);
            expect(transactionsService.waitForTransaction).toHaveBeenCalledWith(transactionId);
            expect(apiClient.getSigner).toHaveBeenCalledWith(walletLocator, signerAddress);
            expect(result).toEqual({
                address: signerAddress,
                status: "active",
            });
        });

        it("should register a delegated signer with admin signer", async () => {
            const signerAddress = "mock-signer-address";
            const transactionId = "mock-tx-id";
            const adminSigner = mock<SolanaNonCustodialSigner>({
                address: "mock-admin-address",
            });

            apiClient.registerSigner.mockResolvedValueOnce({
                transaction: { id: transactionId },
            });

            apiClient.getSigner.mockResolvedValueOnce({
                address: signerAddress,
                status: "active",
            });

            const result = await delegatedSignerService.registerDelegatedSigner(signerAddress, adminSigner);

            expect(apiClient.registerSigner).toHaveBeenCalledWith(walletLocator, { signer: signerAddress });
            expect(transactionsService.approveTransaction).toHaveBeenCalledWith(transactionId, [adminSigner]);
            expect(transactionsService.waitForTransaction).toHaveBeenCalledWith(transactionId);
            expect(apiClient.getSigner).toHaveBeenCalledWith(walletLocator, signerAddress);
            expect(result).toEqual({
                address: signerAddress,
                status: "active",
            });
        });
    });

    describe("getDelegatedSigners", () => {
        it("should get all delegated signers", async () => {
            const delegatedSigners = [
                {
                    address: "mock-signer-address-1",
                    status: "active",
                },
                {
                    address: "mock-signer-address-2",
                    status: "active",
                },
            ];

            apiClient.getWallet.mockResolvedValueOnce({
                type: "solana-smart-wallet",
                config: {
                    delegatedSigners: delegatedSigners,
                },
            });

            const result = await delegatedSignerService.getDelegatedSigners();

            expect(apiClient.getWallet).toHaveBeenCalledWith(walletLocator);
            expect(result).toEqual(delegatedSigners);
        });

        it("should return empty array when no delegated signers exist", async () => {
            apiClient.getWallet.mockResolvedValueOnce({
                type: "solana-smart-wallet",
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

            await expect(delegatedSignerService.getDelegatedSigners()).rejects.toThrow(WalletTypeNotSupportedError);
            expect(apiClient.getWallet).toHaveBeenCalledWith(walletLocator);
        });

        it("should throw error when wallet is not available", async () => {
            apiClient.getWallet.mockResolvedValueOnce({
                error: "wallet not found",
            });

            await expect(delegatedSignerService.getDelegatedSigners()).rejects.toThrow(WalletNotAvailableError);
            expect(apiClient.getWallet).toHaveBeenCalledWith(walletLocator);
        });
    });
});
