import type { ApiClient, CreateTransactionResponse, SolanaWalletLocator } from "@/api";
import type { SolanaNonCustodialSigner } from "../../types/signers";
import bs58 from "bs58";

type PendingApproval = NonNullable<NonNullable<CreateTransactionResponse["approvals"]>["pending"]>[number];

export class SolanaApprovalsService {
    constructor(
        private readonly walletLocator: SolanaWalletLocator,
        private readonly apiClient: ApiClient
    ) {}

    public async approve(
        transactionId: string,
        pendingApprovals: Array<PendingApproval>,
        signers: Array<SolanaNonCustodialSigner>
    ) {
        const approvals = await Promise.all(
            pendingApprovals.map(async (approval) => {
                const signer = signers.find((s) => s.address === approval.signer);
                if (!signer) {
                    throw new Error(
                        `Signer ${approval.signer} is required for the transaction but was not found in the signer list`
                    );
                }
                return {
                    signature: bs58.encode(await signer.signMessage(bs58.decode(approval.message))),
                    signer: approval.signer,
                };
            })
        );
        const transaction = await this.apiClient.approveTransaction(this.walletLocator, transactionId, {
            approvals,
        });
        if (transaction.status === "awaiting-approval") {
            throw new Error("Still has pending approvals, please submit all approvals");
        }
        return transaction;
    }
}
