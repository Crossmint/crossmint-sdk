import { WebAuthnP256 } from "ox";
import {
    type Account,
    type Address,
    type Hex,
    type SignableMessage,
    type PublicClient,
    type HttpTransport,
    type TypedData,
    type TypedDataDefinition,
    type TypedDataDomain,
    type EIP1193Provider,
    http,
    createPublicClient,
    concat,
} from "viem";

import type { ApiClient, GetSignatureResponse, EvmWalletLocator, CreateTransactionSuccessResponse } from "../api";
import { sleep } from "../utils";
import type { Callbacks } from "../utils/options";
import { ENTRY_POINT_ADDRESS, STATUS_POLLING_INTERVAL_MS } from "../utils/constants";
import {
    InvalidMessageFormatError,
    InvalidSignerError,
    InvalidTypedDataError,
    MessageSigningNotSupportedError,
    SignatureNotAvailableError,
    SignatureNotCreatedError,
    SignatureNotFoundError,
    SigningFailedError,
    TransactionAwaitingApprovalError,
    TransactionConfirmationTimeoutError,
    TransactionFailedError,
    TransactionHashNotFoundError,
    TransactionNotAvailableError,
    TransactionNotCreatedError,
    TransactionSendingFailedError,
} from "../utils/errors";

import entryPointAbi from "./abi/entryPoint";
import { toViemChain, type EVMSmartWalletChain } from "./chains";

export interface TransactionInput {
    to: Address;
    data?: Hex;
    value?: bigint;
}

export type PasskeySigningCallback = (
    message: string
) => Promise<{ signature: Hex; metadata: WebAuthnP256.SignMetadata }>;
export type PasskeyCreationCallback = (name: string) => Promise<{ id: string; publicKey: { x: string; y: string } }>;

export type EVMSignerInput =
    | {
          type: "evm-keypair";
          address: string;
          signer:
              | {
                    type: "provider";
                    provider: EIP1193Provider;
                }
              | {
                    type: "viem_v2";
                    account: Account;
                };
      }
    | {
          type: "evm-passkey";
          name?: string;
          signingCallback?: PasskeySigningCallback;
          creationCallback?: PasskeyCreationCallback;
      };
export type EVMSigner = EVMSignerInput & {
    locator: string;
} & (
        | {
              type: "evm-passkey";
              id: string;
          }
        | {
              type: "evm-keypair";
          }
    );

export interface ViemWallet {
    /**
     * Get the wallet address
     * @returns The wallet address
     */
    getAddress: () => Address;

    /**
     * Get the wallet nonce
     * @param parameters - The parameters
     * @returns The nonce
     */
    getNonce?: ((parameters?: { key?: bigint | undefined } | undefined) => Promise<bigint>) | undefined;

    /**
     * Sign a message
     * @param parameters - The parameters
     * @returns The signature
     */
    signMessage: (parameters: { message: SignableMessage }) => Promise<Hex>;

    /**
     * Sign a typed data
     * @param parameters - The parameters
     * @returns The signature
     */
    signTypedData: <
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(
        parameters: TypedDataDefinition<typedData, primaryType>
    ) => Promise<Hex>;

    /**
     * Sign and submit a transaction
     * @param parameters - The transaction parameters
     * @returns The transaction hash
     */
    sendTransaction: (parameters: TransactionInput) => Promise<Hex>;
}

type PendingApproval = NonNullable<NonNullable<CreateTransactionSuccessResponse["approvals"]>["pending"]>[number];

export class EVMSmartWallet implements ViemWallet {
    public readonly publicClient: PublicClient<HttpTransport>;

    constructor(
        public readonly chain: EVMSmartWalletChain,
        private readonly apiClient: ApiClient,
        private readonly address: Address,
        private readonly adminSigner: EVMSigner,
        private readonly callbacks: Callbacks
    ) {
        this.publicClient = createPublicClient({
            chain: toViemChain(chain),
            transport: http(),
        });
    }

    /**
     * Get the wallet balances
     * @param tokens - The tokens
     * @returns The balances
     */
    public async balances(tokens: Address[]) {
        return await this.apiClient.getBalance(this.getAddress(), {
            chains: [this.chain],
            tokens,
        });
    }

    /**
     * Get the wallet transactions
     * @returns The transactions
     */
    public async transactions() {
        const transactions = await this.apiClient.getTransactions(this.walletLocator);
        if ("error" in transactions) {
            throw new TransactionNotAvailableError(JSON.stringify(transactions));
        }
        return transactions.transactions.filter((transaction) => transaction.walletType === "evm-smart-wallet");
    }

    /**
     * Get the wallet NFTs
     * @param perPage - The number of NFTs per page
     * @param page - The page number
     * @param chain - The chain
     * @param locator - The locator
     * @returns The NFTs
     */
    public async nfts(perPage: number, page: number, chain: string, locator?: EvmWalletLocator) {
        return await this.apiClient.getNfts(chain, locator ?? this.walletLocator, perPage, page);
    }

    public getAddress() {
        return this.address;
    }

    public async getNonce(parameters?: { key?: bigint | undefined } | undefined): Promise<bigint> {
        const nonce = await this.publicClient.readContract({
            abi: entryPointAbi,
            address: ENTRY_POINT_ADDRESS,
            functionName: "getNonce",
            args: [this.address, parameters?.key ?? BigInt(0)],
        });
        return nonce;
    }

    public async signMessage(parameters: {
        message: SignableMessage;
    }): Promise<Hex> {
        const signatureCreationResponse = await this.createSignature(parameters.message);
        const signatureId = signatureCreationResponse.id;
        const pendingApprovals = signatureCreationResponse.approvals?.pending || [];
        const signature = await this.approveSignature(pendingApprovals, signatureId);
        await this.waitForSignature(signatureId);
        return signature;
    }

    public async signTypedData<
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(parameters: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
        const signatureCreationResponse = await this.createTypedDataSignature(parameters);
        const signatureId = signatureCreationResponse.id;
        const pendingApprovals = signatureCreationResponse.approvals?.pending || [];
        const signature = await this.approveSignature(pendingApprovals, signatureId);
        await this.waitForSignature(signatureId);
        return signature;
    }

    public async sendTransaction(parameters: TransactionInput): Promise<Hex> {
        await this.callbacks?.onTransactionStart?.(parameters);
        const transactionCreationResponse = await this.createTransaction(parameters);
        const transactionId = transactionCreationResponse.id;
        await this.approveTransaction(transactionCreationResponse.approvals?.pending || [], transactionId);
        return await this.waitForTransaction(transactionId);
    }

    private get walletLocator(): EvmWalletLocator {
        if (this.apiClient.isServerSide) {
            return this.address;
        } else {
            return `me:evm-smart-wallet`;
        }
    }

    private get signerLocator(): string {
        return this.adminSigner.locator;
    }

    private async signWithAdminSigner(message: Hex): Promise<{ signature: Hex; metadata?: WebAuthnP256.SignMetadata }> {
        switch (this.adminSigner.type) {
            case "evm-passkey": {
                // Custom signing function
                if (this.adminSigner.signingCallback) {
                    return this.adminSigner.signingCallback(message);
                }
                const { metadata, signature } = await WebAuthnP256.sign({
                    credentialId: this.adminSigner.id,
                    challenge: message,
                });

                return {
                    signature: concat([`0x${signature.r.toString(16)}`, `0x${signature.s.toString(16)}`]),
                    metadata,
                };
            }
            case "evm-keypair": {
                const signerAddress = this.adminSigner.address as Address;
                if (this.adminSigner.signer.type === "viem_v2") {
                    const account = this.adminSigner.signer.account;
                    if (!account.signMessage) {
                        throw new MessageSigningNotSupportedError("Account does not support signMessage");
                    }
                    const signature = await account.signMessage({
                        message: {
                            raw: message,
                        },
                    });
                    return { signature };
                } else {
                    const signature = await this.adminSigner.signer.provider.request({
                        method: "personal_sign",
                        params: [message, signerAddress],
                    });
                    return { signature };
                }
            }
        }
    }

    private async createTransaction(parameters: TransactionInput) {
        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                signer: this.signerLocator,
                chain: this.chain,
                calls: [
                    {
                        to: parameters.to,
                        value: parameters.value ? parameters.value.toString() : "0",
                        data: parameters.data ?? "0x",
                    },
                ],
            },
        });
        if ("error" in transactionCreationResponse) {
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }
        return transactionCreationResponse;
    }

    private async approveTransaction(pendingApprovals: Array<PendingApproval>, transactionId: string) {
        const pendingApproval = pendingApprovals.find((approval) => approval.signer === this.signerLocator);
        if (!pendingApproval) {
            const error = new InvalidSignerError(`Signer ${this.signerLocator} not found in pending approvals`);
            await this.callbacks?.onTransactionFail?.(error);
            throw error;
        }
        const message = pendingApproval.message as Hex;

        const { signature, metadata } = await this.signWithAdminSigner(message);

        const approvalResponse = await this.apiClient.approveTransaction(this.walletLocator, transactionId, {
            approvals: [
                {
                    signer: this.signerLocator,
                    // @ts-ignore the generated types are wrong
                    signature:
                        this.adminSigner.type === "evm-passkey"
                            ? {
                                  r: signature.slice(0, 66),
                                  s: `0x${signature.slice(66)}`,
                              }
                            : signature,
                    ...(metadata && { metadata }),
                },
            ],
        });
        if ("error" in approvalResponse) {
            throw new TransactionFailedError(JSON.stringify(approvalResponse));
        }
    }

    private async waitForTransaction(transactionId: string, timeoutMs = 60000): Promise<Hex> {
        const startTime = Date.now();
        let transactionResponse;

        do {
            if (Date.now() - startTime > timeoutMs) {
                const error = new TransactionConfirmationTimeoutError("Transaction confirmation timeout");
                await this.callbacks.onTransactionFail?.(error);
                throw error;
            }

            transactionResponse = await this.apiClient.getTransaction(this.walletLocator, transactionId);
            if ("error" in transactionResponse) {
                throw new TransactionNotAvailableError(JSON.stringify(transactionResponse));
            }
            await sleep(STATUS_POLLING_INTERVAL_MS);
        } while (transactionResponse.status === "pending");

        if (transactionResponse.status === "failed") {
            const error = new TransactionSendingFailedError(
                `Transaction sending failed: ${JSON.stringify(transactionResponse.error)}`
            );
            await this.callbacks.onTransactionFail?.(error);
            throw error;
        }

        if (transactionResponse.status === "awaiting-approval") {
            const error = new TransactionAwaitingApprovalError(
                `Transaction is awaiting approval. Please submit required approvals before waiting for completion.`
            );
            await this.callbacks.onTransactionFail?.(error);
            throw error;
        }

        const transactionHash = transactionResponse.onChain.txId;
        if (transactionHash == null) {
            const error = new TransactionHashNotFoundError("Transaction hash not found on transaction response");
            await this.callbacks.onTransactionFail?.(error);
            throw error;
        }
        return transactionHash as Hex;
    }

    private async createSignature(message: SignableMessage) {
        if (typeof message !== "string") {
            throw new InvalidMessageFormatError("Message must be a string");
        }
        const signatureCreationResponse = await this.apiClient.createSignature(this.walletLocator, {
            type: "evm-message",
            params: {
                message,
                signer: this.signerLocator,
                chain: this.chain,
            },
        });
        if ("error" in signatureCreationResponse) {
            throw new SignatureNotCreatedError(JSON.stringify(signatureCreationResponse));
        }
        return signatureCreationResponse;
    }

    private async createTypedDataSignature<
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(parameters: TypedDataDefinition<typedData, primaryType>) {
        const { domain, message, primaryType, types } = parameters;
        if (!domain || !message || !types) {
            throw new InvalidTypedDataError("Invalid typed data");
        }

        const { name, version, chainId, verifyingContract, salt } = domain as TypedDataDomain;
        if (!name || !version || !chainId || !verifyingContract) {
            throw new InvalidTypedDataError("Invalid typed data domain");
        }

        const signatureCreationResponse = await this.apiClient.createSignature(this.walletLocator, {
            type: "evm-typed-data",
            params: {
                typedData: {
                    domain: {
                        name,
                        version,
                        chainId: Number(chainId),
                        verifyingContract,
                        salt,
                    },
                    message,
                    primaryType,
                    types: types as Record<string, Array<{ name: string; type: string }>>,
                },
                signer: this.signerLocator,
                chain: this.chain,
                isSmartWalletSignature: false,
            },
        });
        if ("error" in signatureCreationResponse) {
            throw new SignatureNotCreatedError(JSON.stringify(signatureCreationResponse));
        }
        return signatureCreationResponse;
    }

    private async approveSignature(pendingApprovals: Array<PendingApproval>, signatureId: string) {
        const pendingApproval = pendingApprovals.find((approval) => approval.signer === this.signerLocator);
        if (!pendingApproval) {
            throw new InvalidSignerError(`Signer ${this.signerLocator} not found in pending approvals`);
        }
        const message = pendingApproval.message as Hex;

        const { signature, metadata } = await this.signWithAdminSigner(message);

        if (signature === undefined) {
            throw new SignatureNotFoundError("Signature not available");
        }

        await this.apiClient.approveSignature(this.walletLocator, signatureId, {
            approvals: [
                {
                    signer: this.signerLocator,
                    // @ts-ignore the generated types are wrong
                    signature:
                        this.adminSigner.type === "evm-passkey"
                            ? {
                                  r: signature.slice(0, 66),
                                  s: `0x${signature.slice(66)}`,
                              }
                            : signature,
                    metadata,
                },
            ],
        });

        return signature;
    }

    private async waitForSignature(signatureId: string) {
        let signatureResponse: GetSignatureResponse | null = null;
        do {
            await sleep(STATUS_POLLING_INTERVAL_MS);
            signatureResponse = await this.apiClient.getSignature(this.walletLocator, signatureId);
            if ("error" in signatureResponse) {
                throw new SignatureNotAvailableError(JSON.stringify(signatureResponse));
            }
        } while (signatureResponse === null || signatureResponse.status === "pending");

        if (signatureResponse.status === "failed") {
            throw new SigningFailedError("Signature signing failed");
        }
    }
}
