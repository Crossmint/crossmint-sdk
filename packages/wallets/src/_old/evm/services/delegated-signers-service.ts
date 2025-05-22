import type { ApiClient, DelegatedSigner, EvmWalletLocator } from "@/api";
import type { EVMSigner } from "../types/signers";
import {
    WalletNotAvailableError,
    WalletTypeNotSupportedError,
} from "../../../utils/errors";
import type { EVMSmartWalletChain } from "../chains";
import type { EVMSmartWalletImpl } from "../wallet";

export class EVMDelegatedSignerService {
    constructor(
        private readonly walletLocator: EvmWalletLocator,
        private readonly wallet: EVMSmartWalletImpl,
        private readonly apiClient: ApiClient
    ) {}

    public async registerDelegatedSigner(
        chain: EVMSmartWalletChain,
        signer: string,
        options?: {
            expiresAt?: number;
            adminSigner?: EVMSigner;
        }
    ) {
        const response = (await this.apiClient.registerSigner(
            this.walletLocator,
            {
                signer,
                chain,
                expiresAt: options?.expiresAt,
            }
        )) as Extract<
            Awaited<ReturnType<typeof this.apiClient.registerSigner>>,
            {
                type:
                    | "evm-keypair"
                    | "evm-fireblocks-custodial"
                    | "evm-passkey";
                chains?: {
                    [key: string]:
                        | {
                              status: "success";
                          }
                        | {
                              status:
                                  | "pending"
                                  | "awaiting-approval"
                                  | "failed";
                              id: string;
                              approvals?: {
                                  pending: Array<{
                                      signer: string;
                                      message: string;
                                  }>;
                                  submitted: Array<{
                                      signature: string;
                                      submittedAt: number;
                                      signer: string;
                                      message: string;
                                  }>;
                              };
                          };
                };
            }
        >;

        const chainResponse = response.chains?.[chain];
        if (chainResponse?.status === "awaiting-approval") {
            if (!options?.adminSigner) {
                throw new Error(
                    "Admin signer is required to approve delegated signer registration"
                );
            }
            const pendingApprovals = chainResponse.approvals?.pending || [];
            await this.wallet.approveSignature(
                pendingApprovals,
                chainResponse.id
            );
            await this.wallet.waitForSignature(chainResponse.id);
        }
        return this.getDelegatedSigner(signer);
    }

    public async getDelegatedSigner(signer: string) {
        const response = await this.apiClient.getSigner(
            this.walletLocator,
            signer
        );
        return response;
    }

    public async getDelegatedSigners() {
        const walletResponse = await this.apiClient.getWallet(
            this.walletLocator
        );
        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        if (walletResponse.type !== "evm-smart-wallet") {
            throw new WalletTypeNotSupportedError(
                `Wallet type ${walletResponse.type} not supported`
            );
        }
        const signers =
            (walletResponse.config
                ?.delegatedSigners as unknown as DelegatedSigner[]) ?? [];
        return signers;
    }
}
