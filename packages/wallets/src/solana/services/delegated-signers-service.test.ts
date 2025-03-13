import { describe, it, expect, beforeEach, vi } from "vitest";
import { SolanaDelegatedSignerService } from "./delegated-signers-service";
import type { ApiClient } from "../../api";
import { mock } from "vitest-mock-extended";
import type { SolanaTransactionsService } from "./transactions-service";
import type { SolanaNonCustodialSigner } from "../types/signers";

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

    describe("getDelegatedSigner", () => {
        it("should get a delegated signer", async () => {
            const signerAddress = "mock-signer-address";

            apiClient.getSigner.mockResolvedValueOnce({
                address: signerAddress,
                status: "active",
            });

            const result = await delegatedSignerService.getDelegatedSigner(signerAddress);

            expect(apiClient.getSigner).toHaveBeenCalledWith(walletLocator, signerAddress);
            expect(result).toEqual({
                address: signerAddress,
                status: "active",
            });
        });
    });

    describe("removeDelegatedSigner", () => {
        it("should throw not implemented error", async () => {
            const signerAddress = "mock-signer-address";

            await expect(delegatedSignerService.removeDelegatedSigner(signerAddress)).rejects.toThrow(
                "Not implemented"
            );
        });
    });
});
