import { WebAuthnP256 } from "ox";
import { concat, type Hex, type Address } from "viem";
import type { EvmWalletLocator } from "@/api";
import type { ApprovalRequest, ApprovalServiceConfig } from "./types";
import { BaseApprovalServiceImpl } from "./base-approval-service";
import { MessageSigningNotSupportedError } from "@/utils/errors";
import type { SubmitApprovalDto } from "@/api/gen/types.gen";
import type { EVMSigner } from "@/types";

interface ApprovalSignature {
    signer: string;
    signature: string;
}

export class EVMApprovalService extends BaseApprovalServiceImpl {
    constructor(
        config: ApprovalServiceConfig & { walletLocator: EvmWalletLocator },
        private readonly adminSigner: EVMSigner
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
                const signature = await this.signMessage(new TextEncoder().encode(approval.message));
                if (!signature) {
                    throw new Error("Failed to sign message");
                }

                const formattedSignature =
                    this.adminSigner.type === "evm-passkey"
                        ? `${signature.slice(0, 66)}${signature.slice(66)}`
                        : signature;

                return {
                    signer: approval.signer,
                    signature: formattedSignature,
                };
            })
        );

        const params: SubmitApprovalDto = { approvals };
        await this.config.apiClient.approveSignature(this.config.walletLocator as EvmWalletLocator, id, params);
    }

    public async getApprovalStatus(requestId: string): Promise<ApprovalRequest> {
        const response = await this.config.apiClient.getSignature(
            this.config.walletLocator as EvmWalletLocator,
            requestId
        );
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

    private async signMessage(message: Uint8Array): Promise<Hex | null> {
        switch (this.adminSigner.type) {
            case "evm-passkey": {
                if (this.adminSigner.onSignWithPasskey) {
                    return await this.adminSigner.onSignWithPasskey(message);
                }
                const { signature } = await WebAuthnP256.sign({
                    credentialId: this.adminSigner.id,
                    challenge: message,
                });
                return concat([`0x${signature.r.toString(16)}`, `0x${signature.s.toString(16)}`]) as Hex;
            }
            case "external-wallet": {
                if (this.adminSigner.type === "viem_v2") {
                    const account = this.adminSigner.account;
                    if (!account.signMessage) {
                        throw new MessageSigningNotSupportedError("Account does not support signMessage");
                    }
                    return await account.signMessage({
                        message: { raw: message },
                    });
                } else {
                    const result = await this.adminSigner.signer.provider.request({
                        method: "personal_sign",
                        params: [message, this.adminSigner.address as Address],
                    });
                    return result as Hex;
                }
            }
            default:
                throw new Error("Unsupported signer type");
        }
    }
}
