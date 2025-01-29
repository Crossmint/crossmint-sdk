import { createPublicClient, http, type Address, type Hex, type EIP1193Provider, type LocalAccount } from "viem";
import { WebAuthnP256 } from "ox";

import type { CrossmintApiService, CreateWalletResponse, TransactionResponse, SignerType } from "./apiService";
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
    credential: WebAuthnP256.P256Credential;
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
        const walletResponse = await this.createWallet(signer);
        const address = walletResponse.address;
        return new EVMSmartWallet(
            { wallet: this.smartAccountClient(signer, chain, address), public: publicClient },
            chain
        );
    }

    private smartAccountClient(
        adminSigner: ExternalSigner | PasskeySigner,
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
                const signerLocator = await this.getSignerLocator(adminSigner);
                // Create transaction
                const transactionCreationResponse = await this.crossmintApiService.createTransaction(address, {
                    params: {
                        signer: signerLocator,
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
                await this.approveTransaction(address, adminSigner, transactionId, pendingApproval.message);

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

    private async createWallet(signer: ExternalSigner | PasskeySigner): Promise<CreateWalletResponse> {
        // TODO handle "wallet already exists" error
        if ("type" in signer && signer.type === "PASSKEY") {
            return await this.crossmintApiService.createWallet({
                type: "evm-smart-wallet",
                config: {
                    adminSigner: {
                        type: "evm-passkey",
                        id: signer.credential.id,
                        name: "Default",
                        publicKey: {
                            x: `0x${signer.credential.publicKey.x.toString(16)}`,
                            y: `0x${signer.credential.publicKey.y.toString(16)}`,
                        },
                    },
                    creationSeed: "0",
                },
            });
        } else {
            const adminSigner = await this.getSignerAddress(signer);
            return await this.crossmintApiService.createWallet({
                type: "evm-smart-wallet",
                config: {
                    adminSigner: {
                        type: "evm-keypair",
                        address: adminSigner,
                    },
                    creationSeed: "0",
                },
            });
        }
    }

    private async getSignerLocator(signer: ExternalSigner | PasskeySigner): Promise<SignerType> {
        if ("type" in signer && signer.type === "PASSKEY") {
            return `evm-passkey:${signer.credential.id}`;
        } else {
            const signerAddress = await this.getSignerAddress(signer);
            return `evm-keypair:${signerAddress}`;
        }
    }

    private async getSignerAddress(signer: ExternalSigner): Promise<Address> {
        return "type" in signer ? signer.account.address : (await signer.request({ method: "eth_requestAccounts" }))[0];
    }

    private async approveTransaction(
        walletAddress: Address,
        signer: ExternalSigner | PasskeySigner,
        transactionId: string,
        message: Hex
    ) {
        if ("type" in signer && signer.type === "PASSKEY") {
            const { metadata, signature } = await WebAuthnP256.sign({
                credentialId: signer.credential.id,
                challenge: message,
            });

            await this.crossmintApiService.approveTransaction(walletAddress, transactionId, {
                approvals: [
                    {
                        metadata,
                        signature: {
                            r: `0x${signature.r.toString(16)}`,
                            s: `0x${signature.s.toString(16)}`,
                        },
                        signer: `evm-passkey:${signer.credential.id}`,
                    },
                ],
            });
        } else {
            const signerAddress = await this.getSignerAddress(signer);
            const signature =
                "type" in signer
                    ? await signer.account.signMessage({
                          message: {
                              raw: message,
                          },
                      })
                    : await signer.request({
                          method: "personal_sign",
                          params: [message, signerAddress],
                      });

            await this.crossmintApiService.approveTransaction(walletAddress, transactionId, {
                approvals: [
                    {
                        signature,
                        signer: `evm-keypair:${signerAddress}`,
                    },
                ],
            });
        }
    }
}
