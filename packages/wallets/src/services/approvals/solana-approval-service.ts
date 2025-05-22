import type { ApprovalRequest, ApprovalServiceConfig } from "./types";
import { BaseApprovalServiceImpl } from "./base-approval-service";
import type { SolanaWalletLocator } from "@/api";
import type { SubmitApprovalDto } from "@/api/gen/types.gen";
import type { VersionedTransaction } from "@solana/web3.js";
import type { SolanaSigner } from "@/types";

interface ApprovalSignature {
    signer: string;
    signature: string;
}

export class SolanaApprovalService extends BaseApprovalServiceImpl {
    constructor(
        config: ApprovalServiceConfig & { walletLocator: SolanaWalletLocator },
        private readonly adminSigner: SolanaSigner
    ) {
        super(config);
    }

    async approve(request: ApprovalRequest): Promise<void> {
        const { pendingApprovals, id } = request;
        if (!pendingApprovals?.length) {
            return;
        }

        const approvals: ApprovalSignature[] = await Promise.all(
            pendingApprovals.map(async (approval) => {
                const signature = await this.signMessage(approval.message);
                if (!signature) {
                    throw new Error("Failed to sign message");
                }

                return {
                    signer: approval.signer,
                    signature,
                };
            })
        );

        const params: SubmitApprovalDto = { approvals };
        await this.config.apiClient.approveSignature(this.config.walletLocator, id, params);
    }

    public async getApprovalStatus(requestId: string): Promise<ApprovalRequest> {
        const response = await this.config.apiClient.getSignature(this.config.walletLocator, requestId);
        if ("error" in response) {
            throw new Error(JSON.stringify(response.error));
        }
        return {
            id: requestId,
            status: response.status,
            pendingApprovals: response.approvals?.pending,
            submittedApprovals: response.approvals?.submitted,
        };
    }

    public async approveTransaction(
        transactionId: string,
        params: {
            transaction: VersionedTransaction;
            signer: SolanaSigner;
        }
    ): Promise<void> {
        const signedTransaction = await params.signer.onSignTransaction(params.transaction);
        const signature = Buffer.from(signedTransaction.signatures[0]).toString("hex");

        const response = await this.config.apiClient.approveTransaction(this.config.walletLocator, transactionId, {
            approvals: [
                {
                    signer: params.signer.address,
                    signature,
                },
            ],
        });

        if ("error" in response) {
            throw new Error(`Failed to approve transaction: ${JSON.stringify(response.error)}`);
        }
    }

    public async approveSignature(
        signatureId: string,
        params: {
            message: Uint8Array;
            signer: SolanaSigner;
        }
    ): Promise<void> {
        const signature = await params.signer.onSignMessage(params.message);

        const response = await this.config.apiClient.approveSignature(this.config.walletLocator, signatureId, {
            approvals: [
                {
                    signer: params.signer.address,
                    signature: Buffer.from(signature).toString("hex"),
                },
            ],
        });

        if ("error" in response) {
            throw new Error(`Failed to approve signature: ${JSON.stringify(response.error)}`);
        }
    }

    private async signMessage(message: string): Promise<string | null> {
        if (this.adminSigner.type !== "external-wallet") {
            throw new Error("Unsupported signer type - only non-custodial signers are supported");
        }

        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = await this.adminSigner.onSignMessage(messageBytes);
        return Buffer.from(signatureBytes).toString("base64");
    }
}
