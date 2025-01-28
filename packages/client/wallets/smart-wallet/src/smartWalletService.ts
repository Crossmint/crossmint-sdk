import { createPublicClient, http, type Address, type Hex, type EIP1193Provider, type LocalAccount } from "viem";

import type { CrossmintApiService, TransactionResponse } from "./apiService";
import type { SmartWalletChain } from "./evm/chains";
import type { SmartWalletClient } from "./evm/smartWalletClient";
import { EVMSmartWallet } from "./evm/wallet";
import { getAlchemyRPC } from "./evm/rpc";

type ViemAccount = {
    type: "VIEM_ACCOUNT";
    account: LocalAccount & { source: "custom" };
};

type PasskeySigner = {
    type: "PASSKEY";

    /**
     * Displayed to the user during passkey registration or signing prompts.
     * If not provided, a default name identifier within the JWT
     * that is specified in the project settings (typically `sub`) will be used.
     */
    passkeyName?: string;
    onPrePasskeyRegistration?: () => Promise<void> | void;
    onPasskeyRegistrationError?: (error: unknown) => Promise<void>;
    onFirstTimePasskeySigning?: () => Promise<void> | void;
    onFirstTimePasskeySigningError?: (error: unknown) => Promise<void>;
};

type ExternalSigner = EIP1193Provider | ViemAccount;
export interface WalletParams {
    signer: ExternalSigner | PasskeySigner;
}

export interface UserParams {
    jwt: string;
}

export class SmartWalletService {
    constructor(private readonly crossmintApiService: CrossmintApiService) {}

    public async getOrCreate(
        user: UserParams,
        chain: SmartWalletChain,
        walletParams: WalletParams
    ): Promise<EVMSmartWallet> {
        const publicClient = createPublicClient({ transport: http(getAlchemyRPC(chain)) });

        const { signer } = walletParams;
        // TODO implement passkey support
        if ("type" in signer && signer.type === "PASSKEY") {
            throw new Error("Passkey signers are not yet supported");
        }
        const adminSigner =
            "type" in signer ? signer.account.address : (await signer.request({ method: "eth_requestAccounts" }))[0];

        // TODO handle "wallet already exists" error
        const walletResponse = await this.crossmintApiService.createWallet({
            type: "evm-smart-wallet",
            config: {
                adminSigner: {
                    type: "evm-keypair",
                    address: adminSigner,
                },
                creationSeed: "0",
            },
        });

        const address = walletResponse.address;

        return new EVMSmartWallet(
            { wallet: this.smartAccountClient(signer, chain, address), public: publicClient },
            chain
        );
    }

    private smartAccountClient(
        adminSigner: ExternalSigner,
        chain: SmartWalletChain,
        address: Address
    ): SmartWalletClient {
        return {
            getAddress: () => {
                return address;
            },

            getNonce: async () => {
                throw new Error("Not implemented");
            },

            signMessage: async () => {
                throw new Error("Not implemented");
            },

            signTypedData: async () => {
                throw new Error("Not implemented");
            },

            sendTransaction: async (parameters: {
                to: Address;
                data?: Hex;
                value?: bigint;
            }) => {
                const adminSignerAddress =
                    "type" in adminSigner
                        ? adminSigner.account.address
                        : (await adminSigner.request({ method: "eth_requestAccounts" }))[0];

                // Create transaction
                const transactionCreationResponse = await this.crossmintApiService.createTransaction(address, {
                    params: {
                        signer: `evm-keypair:${adminSignerAddress}`,
                        chain,
                        calls: [
                            {
                                to: parameters.to,
                                value: parameters.value ? parameters.value.toString() : "0",
                                data: parameters.data ?? "0x",
                            },
                        ],
                    },
                });
                const transactionId = transactionCreationResponse.id;

                // Approve transaction
                const pendingApprovals = transactionCreationResponse.approvals.pending;
                if (pendingApprovals.length !== 1) {
                    throw new Error(`Expected 1 pending approval, got ${pendingApprovals.length}`);
                }

                const pendingApproval = pendingApprovals[0];
                const signature =
                    "type" in adminSigner
                        ? await adminSigner.account.signMessage({
                              message: {
                                  raw: pendingApproval.message,
                              },
                          })
                        : await adminSigner.request({
                              method: "personal_sign",
                              params: [pendingApproval.message, adminSignerAddress],
                          });
                await this.crossmintApiService.approveTransaction(address, transactionId, {
                    approvals: [
                        {
                            signature,
                            signer: `evm-keypair:${adminSignerAddress}`,
                        },
                    ],
                });

                // Get transaction status until success
                let transactionResponse: TransactionResponse | null = null;
                while (transactionResponse === null || transactionResponse.status === "pending") {
                    transactionResponse = await this.crossmintApiService.getTransaction(address, transactionId);
                }

                if (transactionResponse?.status === "failed") {
                    throw new Error("Transaction sending failed");
                }

                // Get transaction hash
                const transactionHash = transactionResponse?.onChain.txId;
                if (!transactionHash) {
                    throw new Error("Transaction hash not found");
                }
                return transactionHash;
            },
        };
    }
}
