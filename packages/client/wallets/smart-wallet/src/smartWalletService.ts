import {
    createPublicClient,
    concat,
    http,
    type Address,
    type EIP1193Provider,
    type Hex,
    type LocalAccount,
    type SignableMessage,
    type TypedData,
    type TypedDataDefinition,
    stringify,
    type Abi,
    type ContractFunctionArgs,
    type ContractFunctionName,
    type WriteContractParameters,
    encodeFunctionData,
} from "viem";
import { WebAuthnP256 } from "ox";

import entryPointAbi from "./abi/entryPoint";
import type { CrossmintApiService } from "./apiService";
import type { CreateWalletResponse, TransactionResponse, Signer, SignatureResponse } from "./types/api";
import type { SmartWalletChain } from "./evm/chains";
import type { SmartWalletClient } from "./evm/smartWalletClient";
import { EVMSmartWallet } from "./evm/wallet";
import { getAlchemyRPC } from "./evm/rpc";
import { sleep } from "./utils";
import { ENTRY_POINT_ADDRESS, STATUS_POLLING_INTERVAL_MS } from "./utils/constants";
import {
    InvalidMessageFormatError,
    MessageSigningError,
    TransactionApprovalError,
    TypedDataSigningError,
    TransactionFailedError,
    TransactionNotFoundError,
    InvalidTypedDataError,
} from "./error";

export type ViemAccount = {
    type: "VIEM_ACCOUNT";
    account: LocalAccount & { source: "custom" };
};

export type PasskeySigner = {
    type: "PASSKEY";
    credential: WebAuthnP256.P256Credential;
};

export type ExternalSigner = EIP1193Provider | ViemAccount;
export interface WalletParams {
    signer: ExternalSigner | PasskeySigner;
}

export interface UserParams {
    jwt: string;
}

export class SmartWalletService {
    constructor(private readonly crossmintApiService: CrossmintApiService) {}

    /*
     * Retrieves or creates a wallet for the specified user.
     * @param user - The user parameters.
     * @param chain - The chain to create the wallet on.
     * @param walletParams - The wallet parameters.
     * @returns The smart wallet.
     */
    public async getOrCreate(
        user: UserParams,
        chain: SmartWalletChain,
        walletParams: WalletParams
    ): Promise<EVMSmartWallet> {
        const publicClient = createPublicClient({
            transport: http(getAlchemyRPC(chain)),
        });
        const { signer } = walletParams;
        const walletResponse = await this.createWallet(user, signer);
        const address = walletResponse.address;
        return new EVMSmartWallet(
            {
                wallet: this.smartAccountClient(user, signer, chain, address),
                public: publicClient,
            },
            chain,
            this.crossmintApiService
        );
    }

    private smartAccountClient(
        user: UserParams,
        adminSigner: ExternalSigner | PasskeySigner,
        chain: SmartWalletChain,
        address: Address
    ): SmartWalletClient {
        return {
            getAddress: () => {
                return address;
            },

            getNonce: async (params?: { key?: bigint }) => {
                const publicClient = createPublicClient({
                    transport: http(getAlchemyRPC(chain)),
                });
                const nonce = await publicClient.readContract({
                    abi: entryPointAbi,
                    address: ENTRY_POINT_ADDRESS,
                    functionName: "getNonce",
                    args: [address, params?.key ?? 0n],
                });
                return nonce;
            },

            signMessage: async (parameters: { message: SignableMessage }) => {
                if (typeof parameters.message !== "string") {
                    throw new InvalidMessageFormatError("Message must be a string");
                }
                const signerLocator = await this.getSignerLocator(adminSigner);

                // Create signature
                const signatureCreationResponse = await this.crossmintApiService.createSignature(user, {
                    type: "evm-message",
                    params: {
                        message: parameters.message,
                        signer: signerLocator,
                        chain,
                    },
                });
                const signatureId = signatureCreationResponse.id;

                // Approve signature
                const pendingApprovals = signatureCreationResponse.approvals.pending;
                if (pendingApprovals.length !== 1) {
                    throw new MessageSigningError(`Expected 1 pending approval, got ${pendingApprovals.length}`);
                }
                const pendingApproval = pendingApprovals[0];
                const signature = await this.approveSignature(user, adminSigner, signatureId, pendingApproval.message);

                // Get signature status until success
                let signatureResponse: SignatureResponse | null = null;
                while (signatureResponse === null || signatureResponse.status === "pending") {
                    await sleep(STATUS_POLLING_INTERVAL_MS);
                    signatureResponse = await this.crossmintApiService.getSignature(user, signatureId);
                }

                if (signatureResponse.status === "failed") {
                    throw new MessageSigningError("Message signing failed");
                }

                return signature;
            },

            signTypedData: async <
                const typedData extends TypedData | Record<string, unknown>,
                primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
            >(
                parameters: TypedDataDefinition<typedData, primaryType>
            ) => {
                const signerLocator = await this.getSignerLocator(adminSigner);

                const { domain, message, primaryType, types } = parameters;
                if (!domain || !message || !types) {
                    throw new InvalidTypedDataError("Invalid typed data");
                }

                // Create signature
                const signatureCreationResponse = await this.crossmintApiService.createSignature(user, {
                    type: "evm-typed-data",
                    params: {
                        typedData: {
                            domain,
                            message,
                            primaryType,
                            types: types as TypedData,
                        },
                        signer: signerLocator,
                        chain,
                        isSmartWalletSignature: false,
                    },
                });
                const signatureId = signatureCreationResponse.id;

                // Approve signature
                const pendingApprovals = signatureCreationResponse.approvals.pending;
                if (pendingApprovals.length !== 1) {
                    throw new TypedDataSigningError(`Expected 1 pending approval, got ${pendingApprovals.length}`);
                }
                const pendingApproval = pendingApprovals[0];
                const signature = await this.approveSignature(user, adminSigner, signatureId, pendingApproval.message);

                // Get signature status until success
                let signatureResponse: SignatureResponse | null = null;
                while (signatureResponse === null || signatureResponse.status === "pending") {
                    await sleep(STATUS_POLLING_INTERVAL_MS);
                    signatureResponse = await this.crossmintApiService.getSignature(user, signatureId);
                }

                if (signatureResponse.status === "failed") {
                    throw new TypedDataSigningError("Typed data signing failed");
                }

                return signature;
            },

            sendTransaction: async (parameters: {
                to: Address;
                data?: Hex;
                value?: bigint;
            }) => {
                return await this.sendTransactionInternal(parameters, adminSigner, user, chain);
            },

            writeContract: async <
                const TAbi extends Abi | readonly unknown[],
                TFunctionName extends ContractFunctionName<TAbi, "nonpayable" | "payable"> = ContractFunctionName<
                    TAbi,
                    "nonpayable" | "payable"
                >,
                TArgs extends ContractFunctionArgs<
                    TAbi,
                    "nonpayable" | "payable",
                    TFunctionName
                > = ContractFunctionArgs<TAbi, "nonpayable" | "payable", TFunctionName>,
            >({
                address,
                abi,
                functionName,
                args,
                value,
            }: Omit<WriteContractParameters<TAbi, TFunctionName, TArgs>, "chain" | "account">): Promise<Hex> => {
                // @ts-ignore
                const data = encodeFunctionData({
                    abi,
                    functionName,
                    args,
                });
                return await this.sendTransactionInternal(
                    {
                        to: address,
                        data,
                        value,
                    },
                    adminSigner,
                    user,
                    chain
                );
            },
        };
    }

    private async sendTransactionInternal(
        parameters: {
            to: Address;
            data?: Hex;
            value?: bigint;
        },
        adminSigner: ExternalSigner | PasskeySigner,
        user: UserParams,
        chain: SmartWalletChain
    ): Promise<Hex> {
        const signerLocator = await this.getSignerLocator(adminSigner);
        // Create transaction
        const transactionCreationResponse = await this.crossmintApiService.createTransaction(user, {
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
            throw new TransactionApprovalError(`Expected 1 pending approval, got ${pendingApprovals.length}`);
        }
        const pendingApproval = pendingApprovals[0];
        await this.approveTransaction(user, adminSigner, transactionId, pendingApproval.message);

        // Get transaction status until success
        let transactionResponse: TransactionResponse | null = null;
        while (transactionResponse === null || transactionResponse.status === "pending") {
            await sleep(STATUS_POLLING_INTERVAL_MS);
            transactionResponse = await this.crossmintApiService.getTransaction(user, transactionId);
        }

        if (transactionResponse.status === "failed") {
            throw new TransactionFailedError("Transaction sending failed", stringify(transactionResponse.error));
        }

        // Get transaction hash
        const transactionHash = transactionResponse.onChain.txId;
        if (transactionHash === undefined) {
            throw new TransactionNotFoundError("Transaction hash not found");
        }
        return transactionHash;
    }

    private async createWallet(
        user: UserParams,
        signer: ExternalSigner | PasskeySigner
    ): Promise<CreateWalletResponse> {
        if ("type" in signer && signer.type === "PASSKEY") {
            return await this.crossmintApiService.createWallet(user, {
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
                },
            });
        } else {
            const adminSigner = await this.getSignerAddress(signer);
            return await this.crossmintApiService.createWallet(user, {
                type: "evm-smart-wallet",
                config: {
                    adminSigner: {
                        type: "evm-keypair",
                        address: adminSigner,
                    },
                },
            });
        }
    }

    private async getSignerLocator(signer: ExternalSigner | PasskeySigner): Promise<Signer> {
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
        user: UserParams,
        signer: ExternalSigner | PasskeySigner,
        transactionId: string,
        message: Hex
    ) {
        if ("type" in signer && signer.type === "PASSKEY") {
            const { metadata, signature } = await WebAuthnP256.sign({
                credentialId: signer.credential.id,
                challenge: message,
            });

            await this.crossmintApiService.approveTransaction(user, transactionId, {
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

            await this.crossmintApiService.approveTransaction(user, transactionId, {
                approvals: [
                    {
                        signature,
                        signer: `evm-keypair:${signerAddress}`,
                    },
                ],
            });
        }
    }

    private async approveSignature(
        user: UserParams,
        signer: ExternalSigner | PasskeySigner,
        signatureId: string,
        message: Hex
    ) {
        if ("type" in signer && signer.type === "PASSKEY") {
            const { metadata, signature } = await WebAuthnP256.sign({
                credentialId: signer.credential.id,
                challenge: message,
            });

            await this.crossmintApiService.approveSignature(user, signatureId, {
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

            // Convert signature to hex
            return concat([`0x${signature.r.toString(16)}`, `0x${signature.s.toString(16)}`]);
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

            await this.crossmintApiService.approveSignature(user, signatureId, {
                approvals: [
                    {
                        signature,
                        signer: `evm-keypair:${signerAddress}`,
                    },
                ],
            });

            return signature;
        }
    }
}
