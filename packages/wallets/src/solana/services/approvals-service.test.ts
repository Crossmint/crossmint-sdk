import { describe, it, expect, beforeEach, vi } from "vitest";
import { SolanaApprovalsService } from "./approvals-service";
import type { ApiClient } from "../../api";
import { mock } from "vitest-mock-extended";
import type { SolanaNonCustodialSigner } from "../types/signers";
import base58 from "bs58";
import { VersionedMessage, VersionedTransaction } from "@solana/web3.js";

vi.mock("@solana/web3.js", () => {
    return {
        PublicKey: class {
            key: string;
            constructor(key: string) {
                this.key = key;
            }
            equals() {
                return true;
            }
            toBase58() {
                return "mock-address";
            }
        },
        VersionedMessage: {
            deserialize: () => ({
                staticAccountKeys: [{ equals: () => true }],
            }),
        },
        VersionedTransaction: class {
            message: any;
            signatures: any;
            constructor() {
                this.message = { staticAccountKeys: [{ equals: () => true }] };
                this.signatures = [new Uint8Array([1, 2, 3])];
            }
        },
    };
});

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
            const messageBase58 = "jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN";
            const mockSignedTxn = {
                message: {
                    staticAccountKeys: [{ equals: vi.fn().mockReturnValue(true) }],
                },
                signatures: [new Uint8Array([1, 2, 3])],
            };

            // Create a mock signer that implements signTransaction
            const signer = mock<SolanaNonCustodialSigner>({
                address: "mock-address",
                signTransaction: vi.fn().mockResolvedValue(mockSignedTxn),
            });

            const pendingApprovals = [
                {
                    signer: "mock-address",
                    message: messageBase58,
                },
            ];

            apiClient.approveTransaction.mockResolvedValueOnce({
                id: "mock-approval-id",
            });

            const result = await approvalsService.approve("mock-tx-id", pendingApprovals, [signer]);

            // Verify signTransaction was called with a VersionedTransaction
            expect(signer.signTransaction).toHaveBeenCalled();
            const txnArg = signer.signTransaction.mock.calls[0][0];
            expect(txnArg).toBeInstanceOf(VersionedTransaction);

            // Verify API call
            expect(apiClient.approveTransaction).toHaveBeenCalledWith(walletLocator, "mock-tx-id", {
                approvals: [
                    {
                        signer: "mock-address",
                        signature: expect.any(String),
                    },
                ],
            });
            expect(result).toEqual({ id: "mock-approval-id" });
        });

        it("should successfully approve a transaction with multiple signers", async () => {
            const messageBase58 = "jbvfjrXhwBBfLh5GiWf7owJQUkvokFFp1wxsnPhEciZqE87GMdN";
            const messageBytes = base58.decode(messageBase58);

            // Create mock transactions
            const mockSignedTxn = new VersionedTransaction(VersionedMessage.deserialize(messageBytes));

            const signer1 = mock<SolanaNonCustodialSigner>({
                address: "mock-address-1",
                signTransaction: vi.fn().mockResolvedValue(mockSignedTxn),
            });

            const signer2 = mock<SolanaNonCustodialSigner>({
                address: "mock-address-2",
                signTransaction: vi.fn().mockResolvedValue(mockSignedTxn),
            });

            const pendingApprovals = [
                {
                    signer: "mock-address-1",
                    message: messageBase58,
                },
                {
                    signer: "mock-address-2",
                    message: messageBase58,
                },
            ];

            apiClient.approveTransaction.mockResolvedValueOnce({
                id: "mock-tx-id",
            });

            const result = await approvalsService.approve("mock-tx-id", pendingApprovals, [signer1, signer2]);

            // Verify signTransaction was called for both signers
            expect(signer1.signTransaction).toHaveBeenCalled();
            expect(signer2.signTransaction).toHaveBeenCalled();

            // Verify API call
            expect(apiClient.approveTransaction).toHaveBeenCalledTimes(1);
            expect(apiClient.approveTransaction).toHaveBeenCalledWith(walletLocator, "mock-tx-id", {
                approvals: [
                    {
                        signer: "mock-address-1",
                        signature: expect.any(String),
                    },
                    {
                        signer: "mock-address-2",
                        signature: expect.any(String),
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
