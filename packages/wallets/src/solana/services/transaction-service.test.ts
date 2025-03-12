import { describe, it, expect, beforeEach, vi } from "vitest";
import { SolanaTransactionsService } from "./transactions-service";
import type { ApiClient } from "../../api";
import { mock } from "vitest-mock-extended";
import type { SolanaApprovalsService } from "./approvals-service";
import type { VersionedTransaction } from "@solana/web3.js";
import type { SolanaNonCustodialSigner } from "../types/signers";
import bs58 from "bs58";

vi.mock("../../../utils", () => ({
    sleep: vi.fn(),
}));

describe("SolanaTransactionsService", () => {
    const walletLocator = "mock-wallet-locator";
    const apiClient = mock<ApiClient>();
    const approvalsService = mock<SolanaApprovalsService>();
    let transactionsService: SolanaTransactionsService;
    beforeEach(() => {
        vi.resetAllMocks();
        transactionsService = new SolanaTransactionsService(walletLocator, apiClient, approvalsService);
    });
    it("transaction creation complete flow -- happy path", async () => {
        const signer = mock<SolanaNonCustodialSigner>({
            address: "mock-address",
        });
        const transaction = mock<VersionedTransaction>();
        const pendingApprovals = [
            {
                signer: "mock-address",
                message: "mock-message",
            },
        ];

        const serializedTransactionString = "jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN";
        const serializedTransaction = bs58.decode(serializedTransactionString);
        transaction.serialize.mockReturnValueOnce(serializedTransaction);
        apiClient.createTransaction.mockResolvedValueOnce({
            id: "mock-tx-id",
            approvals: {
                pending: pendingApprovals,
            },
        });

        approvalsService.approve.mockResolvedValueOnce({
            id: "mock-approval-id",
        });
        apiClient.getTransaction
            .mockResolvedValueOnce({
                id: "mock-tx-id",
                status: "awaiting-approval",
                approvals: {
                    pending: pendingApprovals,
                },
            })
            .mockResolvedValueOnce({
                id: "mock-tx-id",
                status: "pending",
            })
            .mockResolvedValueOnce({
                id: "mock-tx-id",
                status: "pending",
            })
            .mockResolvedValueOnce({
                id: "mock-tx-id",
                status: "success",
                onChain: {
                    txId: "mock-tx-id",
                },
            });
        await transactionsService.createSignAndConfirm({
            transaction,
            signer,
            additionalSigners: [],
        });

        expect(transaction.serialize).toHaveBeenCalledTimes(1);
        expect(apiClient.createTransaction).toHaveBeenCalledTimes(1);
        expect(apiClient.createTransaction).toHaveBeenCalledWith(walletLocator, {
            params: {
                signer: "mock-address",
                transaction: serializedTransactionString,
                additionalSigners: [],
            },
        });
        expect(approvalsService.approve).toHaveBeenCalledTimes(1);
        expect(approvalsService.approve).toHaveBeenCalledWith("mock-tx-id", pendingApprovals, [signer]);
        expect(apiClient.getTransaction).toHaveBeenCalledTimes(4);
        expect(apiClient.getTransaction).toHaveBeenCalledWith(walletLocator, "mock-tx-id");
    });
});
