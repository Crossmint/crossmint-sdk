import { WebAuthnP256 } from "ox";
import {
    type Address,
    type Hex,
    type SignableMessage,
    type PublicClient,
    type HttpTransport,
    type TypedData,
    type TypedDataDefinition,
    type TypedDataDomain,
    http,
    createPublicClient,
    concat,
} from "viem";
import type {
    ApiClient,
    GetSignatureResponse,
    EvmWalletLocator,
    CreateTransactionSuccessResponse,
    GetTransactionsResponse,
    WalletBalance,
    DelegatedSigner,
} from "../../api";
import { sleep } from "../../utils";
import type { Callbacks } from "../../utils/options";
import {
    ENTRY_POINT_ADDRESS,
    STATUS_POLLING_INTERVAL_MS,
} from "../../utils/constants";
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
} from "../../utils/errors";

import entryPointAbi from "../../abi/entryPoint";
import { toViemChain, type EVMSmartWalletChain } from "./chains";
import type { EVMSigner } from "./types/signers";
import type { EVMSmartWallet, TransactionInput } from "./types/wallet";
import { EVMDelegatedSignerService } from "./services/delegated-signers-service";

type PendingApproval = NonNullable<
    NonNullable<CreateTransactionSuccessResponse["approvals"]>["pending"]
>[number];

export class EVMSmartWalletImpl implements EVMSmartWallet {
    protected readonly delegatedSignerService: EVMDelegatedSignerService;
    constructor(
        public readonly address: Address,
        private readonly apiClient: ApiClient,
        private readonly adminSigner: EVMSigner,
        private readonly callbacks: Callbacks
    ) {
        this.delegatedSignerService = new EVMDelegatedSignerService(
            this.walletLocator,
            this,
            this.apiClient
        );
    }

    // Public API Methods
    // ===================

    /**
     * Get the wallet balances
     * @param {Object} params - The parameters
     * @param {EVMSmartWalletChain} params.chain - The chain
     * @param {Address[]} params.tokens - The tokens
     * @returns {Promise<WalletBalance>} The balances
     * @throws {Error} If the balances cannot be retrieved
     */
    public async getBalances(params: {
        chain: EVMSmartWalletChain;
        tokens: string[];
    }): Promise<WalletBalance> {
        const response = await this.apiClient.getBalance(this.address, {
            chains: [params.chain],
            tokens: params.tokens,
        });
        if ("error" in response) {
            throw new Error(
                `Failed to get balances: ${JSON.stringify(response.error)}`
            );
        }
        return response;
    }

    /**
     * Get the wallet transactions
     * @returns The transactions
     */
    public async getTransactions() {
        const transactions = await this.apiClient.getTransactions(
            this.walletLocator
        );
        if ("error" in transactions) {
            throw new TransactionNotAvailableError(
                JSON.stringify(transactions)
            );
        }
        return transactions.transactions.filter(
            (transaction) => transaction.walletType === "evm-smart-wallet"
        ) as unknown as GetTransactionsResponse;
    }

    /**
     * Get the wallet NFTs
     * @param {Object} params - The parameters
     * @param {number} params.perPage - The number of NFTs per page
     * @param {number} params.page - The page number
     * @param {EVMSmartWalletChain} params.chain - The chain
     * @param {EvmWalletLocator} [params.locator] - The locator
     * @returns The NFTs
     * @unstable This API is unstable and may change in the future
     */
    public async unstable_getNfts(params: {
        perPage: number;
        page: number;
        chain: EVMSmartWalletChain;
    }) {
        return await this.apiClient.unstable_getNfts({
            ...params,
            address: this.address,
        });
    }

    /**
     * Get the nonce
     * @param {Object} params - The parameters
     * @param {EVMSmartWalletChain} params.chain - The chain
     * @param {bigint} [params.key] - The key
     * @param {HttpTransport} [params.transport] - Custom transport
     * @returns {Promise<bigint>} The nonce
     */
    public async getNonce(params: {
        chain: EVMSmartWalletChain;
        key?: bigint | undefined;
        transport?: HttpTransport;
    }): Promise<bigint> {
        const viemClient = this.getViemClient({
            chain: params.chain,
            transport: params?.transport,
        });
        const nonce = await viemClient.readContract({
            abi: entryPointAbi,
            address: ENTRY_POINT_ADDRESS,
            functionName: "getNonce",
            args: [this.address, params?.key ?? BigInt(0)],
        });
        return nonce;
    }

    /**
     * Sign a message
     * @param {Object} params - The parameters
     * @param {SignableMessage} params.message - The message
     * @param {EVMSmartWalletChain} params.chain - The chain
     * @returns {Promise<Hex>} The signature
     */
    public async signMessage(params: {
        message: SignableMessage;
        chain: EVMSmartWalletChain;
    }): Promise<Hex> {
        const signatureCreationResponse = await this.createSignature(params);
        const signatureId = signatureCreationResponse.id;
        const pendingApprovals =
            signatureCreationResponse.approvals?.pending || [];
        const signature = await this.approveSignature(
            pendingApprovals,
            signatureId
        );
        await this.waitForSignature(signatureId);
        return signature;
    }

    public async signTypedData<
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
    >(
        params: TypedDataDefinition<typedData, primaryType> & {
            chain: EVMSmartWalletChain;
        }
    ): Promise<Hex> {
        const signatureCreationResponse = await this.createTypedDataSignature(
            params
        );
        const signatureId = signatureCreationResponse.id;
        const pendingApprovals =
            signatureCreationResponse.approvals?.pending || [];
        const signature = await this.approveSignature(
            pendingApprovals,
            signatureId
        );
        await this.waitForSignature(signatureId);
        return signature;
    }

    /**
     * Send a transaction
     * @param {TransactionInput} params - The parameters
     * @param {Address} params.to - The recipient address
     * @param {EVMSmartWalletChain} params.chain - The blockchain network
     * @param {Hex} [params.data] - The transaction calldata
     * @param {bigint} [params.value] - The amount of native currency to send (in wei)
     * @returns {Promise<Hex>} The transaction hash
     */
    public async sendTransaction(params: TransactionInput): Promise<Hex> {
        await this.callbacks?.onTransactionStart?.(params);
        const transactionCreationResponse = await this.createTransaction(
            params
        );
        const transactionId = transactionCreationResponse.id;
        await this.approveTransaction(
            transactionCreationResponse.approvals?.pending || [],
            transactionId
        );
        return await this.waitForTransaction(transactionId);
    }

    /**
     * Get a viem client for a chain
     * @param {Object} params - The parameters
     * @param {EVMSmartWalletChain} params.chain - The chain
     * @param {HttpTransport} [params.transport] - Optional custom transport
     * @returns {PublicClient<HttpTransport>} The viem client
     */
    public getViemClient(params: {
        chain: EVMSmartWalletChain;
        transport?: HttpTransport;
    }): PublicClient<HttpTransport> {
        return createPublicClient({
            transport: params.transport ?? http(),
            chain: toViemChain(params.chain),
        });
    }

    /**
     * Add a delegated signer to the wallet
     * @param {Object} params - The parameters
     * @param {EVMSmartWalletChain} params.chain - The chain
     * @param {string} params.signer - The signer
     * @returns The delegated signer
     */
    public async addDelegatedSigner(params: {
        chain: EVMSmartWalletChain;
        signer: string;
    }) {
        return await this.delegatedSignerService.registerDelegatedSigner(
            params.chain,
            params.signer,
            {
                adminSigner: this.adminSigner,
            }
        );
    }

    /**
     * Gets delegated signers for the wallet
     * @returns The delegated signers
     * @throws {WalletNotAvailableError} If the wallet is not found
     * @throws {WalletTypeNotSupportedError} If the wallet type is not supported
     */
    public async getDelegatedSigners(): Promise<DelegatedSigner[]> {
        return await this.delegatedSignerService.getDelegatedSigners();
    }

    // Private Methods
    // ===============

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

    private async signWithAdminSigner(
        message: Hex
    ): Promise<{ signature: Hex; metadata?: WebAuthnP256.SignMetadata }> {
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
                    signature: concat([
                        `0x${signature.r.toString(16)}`,
                        `0x${signature.s.toString(16)}`,
                    ]),
                    metadata,
                };
            }
            case "evm-keypair": {
                const signerAddress = this.adminSigner.address as Address;
                if (this.adminSigner.signer.type === "viem_v2") {
                    const account = this.adminSigner.signer.account;
                    if (!account.signMessage) {
                        throw new MessageSigningNotSupportedError(
                            "Account does not support signMessage"
                        );
                    }
                    const signature = await account.signMessage({
                        message: {
                            raw: message,
                        },
                    });
                    return { signature };
                } else {
                    const signature =
                        await this.adminSigner.signer.provider.request({
                            method: "personal_sign",
                            params: [message, signerAddress],
                        });
                    return { signature };
                }
            }
        }
    }

    private async createTransaction(params: TransactionInput) {
        const transactionCreationResponse =
            await this.apiClient.createTransaction(this.walletLocator, {
                params: {
                    signer: this.signerLocator,
                    chain: params.chain,
                    calls: [
                        {
                            to: params.to,
                            value: params.value ? params.value.toString() : "0",
                            data: params.data ?? "0x",
                        },
                    ],
                },
            });
        if ("error" in transactionCreationResponse) {
            throw new TransactionNotCreatedError(
                JSON.stringify(transactionCreationResponse)
            );
        }
        return transactionCreationResponse;
    }

    private async approveTransaction(
        pendingApprovals: Array<PendingApproval>,
        transactionId: string
    ) {
        const pendingApproval = pendingApprovals.find(
            (approval) => approval.signer === this.signerLocator
        );
        if (!pendingApproval) {
            const error = new InvalidSignerError(
                `Signer ${this.signerLocator} not found in pending approvals`
            );
            await this.callbacks?.onTransactionFail?.(error);
            throw error;
        }
        const message = pendingApproval.message as Hex;

        const { signature, metadata } = await this.signWithAdminSigner(message);

        const approvalResponse = await this.apiClient.approveTransaction(
            this.walletLocator,
            transactionId,
            {
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
            }
        );
        if ("error" in approvalResponse) {
            throw new TransactionFailedError(JSON.stringify(approvalResponse));
        }
    }

    private async waitForTransaction(
        transactionId: string,
        timeoutMs = 60000
    ): Promise<Hex> {
        const startTime = Date.now();
        let transactionResponse;

        do {
            if (Date.now() - startTime > timeoutMs) {
                const error = new TransactionConfirmationTimeoutError(
                    "Transaction confirmation timeout"
                );
                await this.callbacks.onTransactionFail?.(error);
                throw error;
            }

            transactionResponse = await this.apiClient.getTransaction(
                this.walletLocator,
                transactionId
            );
            if ("error" in transactionResponse) {
                throw new TransactionNotAvailableError(
                    JSON.stringify(transactionResponse)
                );
            }
            await sleep(STATUS_POLLING_INTERVAL_MS);
        } while (transactionResponse.status === "pending");

        if (transactionResponse.status === "failed") {
            const error = new TransactionSendingFailedError(
                `Transaction sending failed: ${JSON.stringify(
                    transactionResponse.error
                )}`
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
            const error = new TransactionHashNotFoundError(
                "Transaction hash not found on transaction response"
            );
            await this.callbacks.onTransactionFail?.(error);
            throw error;
        }
        return transactionHash as Hex;
    }

    /**
     * @internal Used by DelegatedSignerService
     */
    async approveSignature(
        pendingApprovals: Array<PendingApproval>,
        signatureId: string
    ) {
        const pendingApproval = pendingApprovals.find(
            (approval) => approval.signer === this.signerLocator
        );
        if (!pendingApproval) {
            throw new InvalidSignerError(
                `Signer ${this.signerLocator} not found in pending approvals`
            );
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

    /**
     * @internal Used by DelegatedSignerService
     */
    async waitForSignature(signatureId: string) {
        let signatureResponse: GetSignatureResponse | null = null;
        do {
            await sleep(STATUS_POLLING_INTERVAL_MS);
            signatureResponse = await this.apiClient.getSignature(
                this.walletLocator,
                signatureId
            );
            if ("error" in signatureResponse) {
                throw new SignatureNotAvailableError(
                    JSON.stringify(signatureResponse)
                );
            }
        } while (
            signatureResponse === null ||
            signatureResponse.status === "pending"
        );

        if (signatureResponse.status === "failed") {
            throw new SigningFailedError("Signature signing failed");
        }
    }

    private async createSignature(params: {
        message: SignableMessage;
        chain: EVMSmartWalletChain;
    }) {
        if (typeof params.message !== "string") {
            throw new InvalidMessageFormatError("Message must be a string");
        }
        const signatureCreationResponse = await this.apiClient.createSignature(
            this.walletLocator,
            {
                type: "evm-message",
                params: {
                    message: params.message,
                    signer: this.signerLocator,
                    chain: params.chain,
                },
            }
        );
        if ("error" in signatureCreationResponse) {
            throw new SignatureNotCreatedError(
                JSON.stringify(signatureCreationResponse)
            );
        }
        return signatureCreationResponse;
    }

    private async createTypedDataSignature<
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
    >(
        params: TypedDataDefinition<typedData, primaryType> & {
            chain: EVMSmartWalletChain;
        }
    ) {
        const { domain, message, primaryType, types, chain } = params;
        if (!domain || !message || !types || !chain) {
            throw new InvalidTypedDataError("Invalid typed data");
        }

        const { name, version, chainId, verifyingContract, salt } =
            domain as TypedDataDomain;
        if (!name || !version || !chainId || !verifyingContract) {
            throw new InvalidTypedDataError("Invalid typed data domain");
        }

        const signatureCreationResponse = await this.apiClient.createSignature(
            this.walletLocator,
            {
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
                        types: types as Record<
                            string,
                            Array<{ name: string; type: string }>
                        >,
                    },
                    signer: this.signerLocator,
                    chain,
                    isSmartWalletSignature: false,
                },
            }
        );
        if ("error" in signatureCreationResponse) {
            throw new SignatureNotCreatedError(
                JSON.stringify(signatureCreationResponse)
            );
        }
        return signatureCreationResponse;
    }
}
