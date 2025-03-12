import { describe, it, expect, beforeEach, vi } from "vitest";
import { SolanaApprovalsService } from "./approvals-service";
import type { ApiClient } from "../../../api";
import { mock } from "vitest-mock-extended";
import type { SolanaNonCustodialSigner } from "../../types/signers";
import base58 from "bs58";

vi.mock("../../../utils", () => ({
    sleep: vi.fn(),
}));

describe("SolanaApprovalsService", () => {
    const walletLocator = "mock-wallet-locator";
    const apiClient = mock<ApiClient>();
    let approvalsService: SolanaApprovalsService;

    beforeEach(() => {
        vi.resetAllMocks();
        approvalsService = new SolanaApprovalsService(walletLocator, apiClient);
    });

    describe("approve", () => {
        it("should successfully approve a transaction with single signer", async () => {
            const messageBytes = base58.decode("jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN");
            const signer = mock<SolanaNonCustodialSigner>({
                address: "mock-address",
                signMessage: vi.fn().mockResolvedValue(messageBytes),
            });

            const pendingApprovals = [
                {
                    signer: "mock-address",
                    message: "jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN",
                },
            ];

            apiClient.approveTransaction.mockResolvedValueOnce({
                id: "mock-approval-id",
            });

            const result = await approvalsService.approve("mock-tx-id", pendingApprovals, [signer]);

            expect(signer.signMessage).toHaveBeenCalledWith(messageBytes);
            expect(apiClient.approveTransaction).toHaveBeenCalledWith(walletLocator, "mock-tx-id", {
                approvals: [
                    {
                        signer: "mock-address",
                        signature: "jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN",
                    },
                ],
            });
            expect(result).toEqual({ id: "mock-approval-id" });
        });

        it("should successfully approve a transaction with multiple signers", async () => {
            const messageBytes = base58.decode("jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN");
            const signer1 = mock<SolanaNonCustodialSigner>({
                address: "mock-address-1",
                signMessage: vi.fn().mockResolvedValue(messageBytes),
            });
            const signer2 = mock<SolanaNonCustodialSigner>({
                address: "mock-address-2",
                signMessage: vi.fn().mockResolvedValue(messageBytes),
            });
            const pendingApprovals = [
                {
                    signer: "mock-address-1",
                    message: "jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN",
                },
                {
                    signer: "mock-address-2",
                    message: "jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN",
                },
            ];

            apiClient.approveTransaction.mockResolvedValueOnce({
                id: "mock-tx-id",
            });

            const result = await approvalsService.approve("mock-tx-id", pendingApprovals, [signer1, signer2]);

            expect(signer1.signMessage).toHaveBeenCalledWith(messageBytes);
            expect(signer2.signMessage).toHaveBeenCalledWith(messageBytes);
            expect(apiClient.approveTransaction).toHaveBeenCalledTimes(1);
            expect(apiClient.approveTransaction).toHaveBeenCalledWith(walletLocator, "mock-tx-id", {
                approvals: [
                    {
                        signer: "mock-address-1",
                        signature: "jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN",
                    },
                    {
                        signer: "mock-address-2",
                        signature: "jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN",
                    },
                ],
            });
            expect(result).toEqual({ id: "mock-tx-id" });
        });

        it("should throw error if no matching approval found for signer", async () => {
            const signer = mock<SolanaNonCustodialSigner>({
                address: "mock-address",
            });

            const pendingApprovals = [
                {
                    signer: "different-address",
                    message: "jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN",
                },
            ];

            await expect(approvalsService.approve("mock-tx-id", pendingApprovals, [signer])).rejects.toThrow(
                "Signer different-address is required for the transaction but was not found in the signer list"
            );
        });
    });
});
