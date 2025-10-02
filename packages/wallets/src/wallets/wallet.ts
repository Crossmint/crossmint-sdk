import { isValidAddress } from "@crossmint/common-sdk-base";
import type {
    Activity,
    ApiClient,
    GetSignatureResponse,
    GetBalanceSuccessResponse,
    WalletLocator,
    RegisterSignerPasskeyParams,
    GetTransactionSuccessResponse,
    GetTransactionsResponse,
} from "../api";
import type {
    DelegatedSigner,
    WalletOptions,
    UserLocator,
    Transaction,
    Balances,
    TokenBalance,
    TransactionInputOptions,
    ApproveParams,
    ApproveOptions,
    Approval,
    Signature,
    ApproveResult,
    PrepareOnly,
} from "./types";
import {
    InvalidSignerError,
    SignatureFailedError,
    SignatureNotAvailableError,
    SigningFailedError,
    TransactionAwaitingApprovalError,
    TransactionConfirmationTimeoutError,
    TransactionFailedError,
    TransactionHashNotFoundError,
    TransactionNotAvailableError,
    TransactionNotCreatedError,
    TransactionSendingFailedError,
    WalletNotAvailableError,
    WalletTypeNotSupportedError,
} from "../utils/errors";
import { STATUS_POLLING_INTERVAL_MS } from "../utils/constants";
import type { Chain } from "../chains/chains";
import type { Signer } from "../signers/types";

type WalletContructorType<C extends Chain> = {
    chain: C;
    address: string;
    owner?: string;
    signer: Signer;
    options?: WalletOptions;
};

export class Wallet<C extends Chain> {
    chain: C;
    address: string;
    owner?: string;
    signer: Signer;
    #options?: WalletOptions;
    #apiClient: ApiClient;

    constructor(args: WalletContructorType<C>, apiClient: ApiClient) {
        const { chain, address, owner, signer, options } = args;
        this.#apiClient = apiClient;
        this.chain = chain;
        this.address = address;
        this.owner = owner;
        this.signer = signer;
        this.#options = options;
    }

    protected static getApiClient<C extends Chain>(wallet: Wallet<C>): ApiClient {
        return wallet.apiClient;
    }

    protected static getOptions<C extends Chain>(wallet: Wallet<C>): WalletOptions | undefined {
        return wallet.options;
    }

    protected get apiClient(): ApiClient {
        return this.#apiClient;
    }

    protected get options(): WalletOptions | undefined {
        return this.#options;
    }

    /**
     * Get the API client
     * @returns The API client
     * @experimental This API is experimental and may change in the future
     */
    public experimental_apiClient(): ApiClient {
        return this.#apiClient;
    }

    /**
     * Get the wallet balances - always includes USDC and native token (ETH/SOL)
     * @param {string[]} tokens - Additional tokens to request (optional: native token and usdc are always included)
     * @param {Chain[]} chains - The chains (optional)
     * @returns {Promise<Balances<C>>} The balances returns nativeToken, usdc, tokens
     * @throws {Error} If the balances cannot be retrieved
     */
    public async balances(tokens?: string[], chains?: Chain[]): Promise<Balances<C>> {
        let nativeToken: string;
        switch (this.chain) {
            case "solana":
                nativeToken = "sol";
                break;
            case "stellar":
                nativeToken = "xlm";
                break;
            default:
                nativeToken = "eth";
                break;
        }
        const allTokens = [nativeToken, "usdc", ...(tokens ?? [])];

        const response = await this.#apiClient.getBalance(this.address, {
            chains: chains ?? [this.chain],
            tokens: allTokens,
        });

        if ("error" in response) {
            throw new Error(`Failed to get balances for wallet: ${JSON.stringify(response.message)}`);
        }

        return this.transformBalanceResponse(response, nativeToken, tokens);
    }

    /**
     * Transform the API balance response to the new structure
     * @private
     */
    private transformBalanceResponse(
        apiResponse: GetBalanceSuccessResponse,
        nativeTokenSymbol: TokenBalance<C>["symbol"],
        requestedTokens?: string[]
    ): Balances<C> {
        const transformTokenBalance = (tokenData: GetBalanceSuccessResponse[number]): TokenBalance<C> => {
            const chainData = tokenData.chains?.[this.chain];

            let chainSpecificField = {};
            if (this.chain === "solana" && chainData && "mintHash" in chainData) {
                chainSpecificField = { mintHash: chainData.mintHash };
            } else if (this.chain === "stellar" && chainData && "contractId" in chainData) {
                chainSpecificField = { contractId: chainData.contractId };
            } else if (chainData && "contractAddress" in chainData) {
                chainSpecificField = { contractAddress: chainData.contractAddress };
            }

            return {
                symbol: tokenData.symbol ?? "",
                name: tokenData.name ?? "",
                amount: tokenData.amount ?? "0",
                decimals: tokenData.decimals,
                rawAmount: tokenData.rawAmount ?? "0",
                ...chainSpecificField,
            } as TokenBalance<C>;
        };

        const nativeTokenData = apiResponse.find((token) => token.symbol === nativeTokenSymbol);
        const usdcData = apiResponse.find((token) => token.symbol === "usdc");

        const otherTokens = apiResponse.filter((token) => {
            return token.symbol !== nativeTokenSymbol && token.symbol !== "usdc";
        });

        const createDefaultToken = (symbol: TokenBalance<C>["symbol"]): TokenBalance<C> => {
            const baseToken = {
                symbol,
                name: symbol,
                amount: "0",
                decimals: 0,
                rawAmount: "0",
            };

            if (this.chain === "solana") {
                return { ...baseToken, mintHash: undefined } as TokenBalance<C>;
            } else if (this.chain === "stellar") {
                return { ...baseToken, contractId: undefined } as TokenBalance<C>;
            } else {
                return { ...baseToken, contractAddress: undefined } as TokenBalance<C>;
            }
        };

        return {
            nativeToken:
                nativeTokenData != null
                    ? transformTokenBalance(nativeTokenData)
                    : createDefaultToken(nativeTokenSymbol),
            usdc: usdcData != null ? transformTokenBalance(usdcData) : createDefaultToken("usdc"),
            tokens: otherTokens.map(transformTokenBalance),
        };
    }

    /**
     * Get the wallet NFTs
     * @param {Object} params - The parameters
     * @param {number} params.perPage - The number of NFTs per page
     * @param {number} params.page - The page number
     * @param {WalletLocator} [params.locator] - The locator
     * @returns The NFTs
     * @experimental This API is experimental and may change in the future
     */
    public async experimental_nfts(params: { perPage: number; page: number }) {
        return await this.#apiClient.experimental_getNfts({
            ...params,
            chain: this.chain,
            address: this.address,
        });
    }

    /**
     * Get the wallet transactions
     * @returns The transactions
     * @throws {Error} If the transactions cannot be retrieved
     */
    public async experimental_transactions(): Promise<GetTransactionsResponse> {
        const response = await this.#apiClient.getTransactions(this.walletLocator);
        if ("error" in response) {
            throw new Error(`Failed to get transactions: ${JSON.stringify(response.message)}`);
        }
        return response;
    }

    /**
     * Get a transaction by id
     * @returns The transaction
     * @throws {Error} If the transaction cannot be retrieved
     */
    public async experimental_transaction(transactionId: string): Promise<GetTransactionSuccessResponse> {
        const response = await this.#apiClient.getTransaction(this.walletLocator, transactionId);
        if ("error" in response) {
            throw new Error(`Failed to get transaction: ${JSON.stringify(response.error)}`);
        }
        return response;
    }

    /**
     * Get the wallet activity
     * @returns The activity
     * @experimental This API is experimental and may change in the future
     * @throws {Error} If the activity cannot be retrieved
     */
    public async experimental_activity(): Promise<Activity> {
        const response = await this.apiClient.experimental_activity(this.walletLocator, { chain: this.chain });
        if ("error" in response) {
            throw new Error(`Failed to get activity: ${JSON.stringify(response.message)}`);
        }
        return response;
    }

    /**
     * Send a token to a wallet or user locator
     * @param {string | UserLocator} to - The recipient (address or user locator)
     * @param {string} token - The token (address or currency symbol)
     * @param {string} amount - The amount to send (decimal units)
     * @param {TransactionInputOptions} options - The options for the transaction
     * @returns {Transaction} The transaction
     */
    public async send<T extends TransactionInputOptions | undefined = undefined>(
        to: string | UserLocator,
        token: string,
        amount: string,
        options?: T
    ): Promise<Transaction<T extends PrepareOnly<true> ? true : false>> {
        const recipient = toRecipientLocator(to);
        const tokenLocator = toTokenLocator(token, this.chain);
        const sendParams = {
            recipient,
            amount,
            ...(options?.experimental_signer != null ? { signer: options.experimental_signer } : {}),
        };
        const transactionCreationResponse = await this.#apiClient.send(this.walletLocator, tokenLocator, sendParams);

        if ("message" in transactionCreationResponse) {
            throw new TransactionNotCreatedError(
                `Failed to send token: ${JSON.stringify(transactionCreationResponse.message)}`
            );
        }

        if (options?.experimental_prepareOnly) {
            return {
                hash: undefined,
                explorerLink: undefined,
                transactionId: transactionCreationResponse.id,
            } as Transaction<T extends PrepareOnly<true> ? true : false>;
        }

        return await this.approveTransactionAndWait(transactionCreationResponse.id);
    }

    /**
     * @deprecated Use `approve` instead.
     * Approve a transaction
     * @param params - The parameters
     * @param params.transactionId - The transaction id
     * @param params.options - The options for the transaction
     * @param params.options.experimental_approval - The approval
     * @param params.options.additionalSigners - The additional signers
     * @returns The transaction
     */
    // TODO: Remove this method in the next major version
    public async approveTransaction(params: ApproveParams) {
        console.warn(
            "approveTransaction is deprecated. Use approve instead. This method will be removed in the next major version."
        );
        return await this.approve(params);
    }

    /**
     * Approve a transaction or signature
     * @param params - The parameters
     * @param params.transactionId - The transaction id or
     * @param params.signatureId - The signature id
     * @param params.options - The options for the transaction
     * @param params.options.experimental_approval - The approval
     * @param params.options.additionalSigners - The additional signers
     * @returns The transaction or signature
     */

    public async approve<T extends ApproveParams>(params: T): Promise<ApproveResult<T>> {
        if (params.transactionId != null) {
            return (await this.approveTransactionAndWait(params.transactionId, params.options)) as ApproveResult<T>;
        }
        if (params.signatureId != null) {
            return (await this.approveSignatureAndWait(params.signatureId, params.options)) as ApproveResult<T>;
        }
        throw new Error("Either transactionId or signatureId must be provided");
    }

    /**
     * Add a delegated signer to the wallet
     * @param signer - The signer. For Solana, it must be a string. For EVM, it can be a string or a passkey.
     */
    public async addDelegatedSigner(params: { signer: string | RegisterSignerPasskeyParams }) {
        const response = await this.#apiClient.registerSigner(this.walletLocator, {
            signer: params.signer,
            chain: this.chain === "solana" || this.chain === "stellar" ? undefined : this.chain,
        });

        if ("error" in response) {
            throw new Error(`Failed to register signer: ${JSON.stringify(response.message)}`);
        }

        if ("transaction" in response && response.transaction != null) {
            // Solana has "transaction" in response
            const transactionId = response.transaction.id;
            await this.approveTransactionAndWait(transactionId);
        } else if ("chains" in response) {
            // EVM has "chains" in response
            const chainResponse = response.chains?.[this.chain];
            if (chainResponse?.status === "awaiting-approval") {
                await this.approveSignatureAndWait(chainResponse.id);
                return;
            }
            if (chainResponse?.status === "pending") {
                await this.waitForSignature(chainResponse.id);
                return;
            }
        }
    }

    public async delegatedSigners(): Promise<DelegatedSigner[]> {
        const walletResponse = await this.#apiClient.getWallet(this.walletLocator);
        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }

        if (
            walletResponse.type !== "smart" ||
            (walletResponse.chainType !== "evm" &&
                walletResponse.chainType !== "solana" &&
                walletResponse.chainType !== "stellar")
        ) {
            throw new WalletTypeNotSupportedError(`Wallet type ${walletResponse.type} not supported`);
        }

        // Map wallet-type to simply wallet
        return (
            walletResponse?.config?.delegatedSigners?.map((signer) => {
                const colonIndex = signer.locator.indexOf(":");
                // If there's a colon, keep everything after it; otherwise treat the whole string as "rest"
                const address = colonIndex >= 0 ? signer.locator.slice(colonIndex + 1) : signer.locator;
                return {
                    signer: `external-wallet:${address}`,
                };
            }) ?? []
        );
    }

    protected get walletLocator(): WalletLocator {
        if (this.#apiClient.isServerSide) {
            return this.address;
        } else {
            if (this.chain === "stellar") {
                return `me:stellar:smart`;
            } else if (this.chain === "solana") {
                return `me:solana:smart`;
            } else {
                return `me:evm:smart`;
            }
        }
    }

    protected get isSolanaWallet(): boolean {
        return this.chain === "solana";
    }

    protected async approveTransactionAndWait(transactionId: string, options?: ApproveOptions) {
        await this.approveTransactionInternal(transactionId, options);
        await this.sleep(1_000); // Rule of thumb: tx won't be confirmed in less than 1 second
        return await this.waitForTransaction(transactionId);
    }

    protected async approveSignatureAndWait(signatureId: string, options?: ApproveOptions) {
        const signatureResponse = await this.approveSignatureInternal(signatureId, options);

        if (
            !("error" in signatureResponse) &&
            signatureResponse.status === "success" &&
            signatureResponse.outputSignature != null
        ) {
            return {
                signature: signatureResponse.outputSignature,
                signatureId,
            };
        }

        await this.sleep(1_000);
        return await this.waitForSignature(signatureId);
    }

    protected async approveSignatureInternal(signatureId: string, options?: ApproveOptions) {
        if (this.isSolanaWallet) {
            throw new Error("Approving signatures is only supported for EVM smart wallets");
        }

        const signature = await this.#apiClient.getSignature(this.walletLocator, signatureId);

        if ("error" in signature) {
            throw new SignatureNotAvailableError(JSON.stringify(signature));
        }

        // API key signers approve automatically
        if (this.signer.type === "api-key") {
            return signature;
        }

        // If an external signature is provided, use it to approve the transaction
        if (options?.experimental_approval != null) {
            const approvals = [options.experimental_approval];

            return await this.executeApproveSignatureWithErrorHandling(signatureId, approvals);
        }

        const pendingApprovals = signature.approvals?.pending;

        if (pendingApprovals == null) {
            return signature;
        }

        const signers = [...(options?.additionalSigners ?? []), this.signer];

        const signedApprovals = await Promise.all(
            pendingApprovals.map((pendingApproval) => {
                const signer = signers.find((s) => s.locator() === pendingApproval.signer.locator);
                if (signer == null) {
                    throw new InvalidSignerError(`Signer ${pendingApproval.signer} not found in pending approvals`);
                }

                return signer.signMessage(pendingApproval.message);
            })
        );

        const approvals = signedApprovals.map((signature) => {
            return {
                ...signature,
                signer: this.signer.locator(),
            };
        });

        return await this.executeApproveSignatureWithErrorHandling(signatureId, approvals);
    }

    protected async approveTransactionInternal(transactionId: string, options?: ApproveOptions) {
        const transaction = await this.#apiClient.getTransaction(this.walletLocator, transactionId);

        if ("error" in transaction) {
            throw new TransactionNotAvailableError(JSON.stringify(transaction));
        }

        await this.#options?.experimental_callbacks?.onTransactionStart?.();

        // API key signers approve automatically
        if (this.signer.type === "api-key") {
            return transaction;
        }

        // If an external signature is provided, use it to approve the transaction
        if (options?.experimental_approval != null) {
            const approvals = [options.experimental_approval];

            return await this.executeApproveTransactionWithErrorHandling(transactionId, approvals);
        }

        const pendingApprovals = transaction.approvals?.pending;

        if (pendingApprovals == null) {
            return transaction;
        }

        const signers = [...(options?.additionalSigners ?? []), this.signer];

        const signedApprovals = await Promise.all(
            pendingApprovals.map((pendingApproval) => {
                const signer = signers.find((s) => s.locator() === pendingApproval.signer.locator);
                if (signer == null) {
                    throw new InvalidSignerError(`Signer ${pendingApproval.signer} not found in pending approvals`);
                }

                const transactionToSign =
                    transaction.chainType === "solana" && "transaction" in transaction.onChain
                        ? (transaction.onChain.transaction as string) // in Solana, the transaction is a string
                        : pendingApproval.message;

                return signer.signTransaction(transactionToSign);
            })
        );

        const approvals = signedApprovals.map((signature) => {
            return {
                ...signature,
                signer: this.signer.locator(),
            };
        });

        return await this.executeApproveTransactionWithErrorHandling(transactionId, approvals);
    }

    private async executeApproveTransactionWithErrorHandling(transactionId: string, approvals: Approval[]) {
        const approvedTransaction = await this.#apiClient.approveTransaction(this.walletLocator, transactionId, {
            approvals,
        });

        if (approvedTransaction.error) {
            throw new TransactionFailedError(JSON.stringify(approvedTransaction));
        }

        return approvedTransaction;
    }

    private async executeApproveSignatureWithErrorHandling(signatureId: string, approvals: Approval[]) {
        const approvedSignature = await this.#apiClient.approveSignature(this.walletLocator, signatureId, {
            approvals,
        });

        if (approvedSignature.error) {
            throw new SignatureFailedError(JSON.stringify(approvedSignature));
        }

        return approvedSignature;
    }

    protected async waitForSignature(signatureId: string): Promise<Signature<false>> {
        let signatureResponse: GetSignatureResponse | null = null;

        do {
            await new Promise((resolve) => setTimeout(resolve, STATUS_POLLING_INTERVAL_MS));
            signatureResponse = await this.#apiClient.getSignature(this.walletLocator, signatureId);
            if ("error" in signatureResponse) {
                throw new SignatureNotAvailableError(JSON.stringify(signatureResponse));
            }
        } while (signatureResponse === null || signatureResponse.status === "pending");

        if (signatureResponse.status === "failed") {
            throw new SigningFailedError("Signature signing failed");
        }

        if (!signatureResponse.outputSignature) {
            throw new SignatureNotAvailableError("Signature not available");
        }

        return {
            signature: signatureResponse.outputSignature,
            signatureId,
        };
    }

    protected async waitForTransaction(
        transactionId: string,
        timeoutMs = 60_000,
        {
            backoffMultiplier = 1.1,
            maxBackoffMs = 2_000,
            initialBackoffMs = STATUS_POLLING_INTERVAL_MS,
        }: {
            initialBackoffMs?: number;
            backoffMultiplier?: number;
            maxBackoffMs?: number;
        } = {}
    ): Promise<Transaction<false>> {
        const startTime = Date.now();
        let transactionResponse;

        do {
            if (Date.now() - startTime > timeoutMs) {
                const error = new TransactionConfirmationTimeoutError("Transaction confirmation timeout");
                throw error;
            }

            transactionResponse = await this.#apiClient.getTransaction(this.walletLocator, transactionId);
            if (transactionResponse.error) {
                throw new TransactionNotAvailableError(JSON.stringify(transactionResponse));
            }
            // Wait for the polling interval
            await this.sleep(initialBackoffMs);
            initialBackoffMs = Math.min(initialBackoffMs * backoffMultiplier, maxBackoffMs);
        } while (transactionResponse.status === "pending");

        if (transactionResponse.status === "failed") {
            const error = new TransactionSendingFailedError(
                `Transaction sending failed: ${JSON.stringify(transactionResponse.error)}`
            );
            throw error;
        }

        if (transactionResponse.status === "awaiting-approval") {
            const error = new TransactionAwaitingApprovalError(
                `Transaction is awaiting approval. Please submit required approvals before waiting for completion.`
            );
            throw error;
        }

        const transactionHash = transactionResponse.onChain.txId;
        if (transactionHash == null) {
            const error = new TransactionHashNotFoundError("Transaction hash not found on transaction response");
            throw error;
        }

        return {
            hash: transactionHash,
            explorerLink: transactionResponse.onChain.explorerLink ?? "",
            transactionId: transactionResponse.id,
        };
    }

    protected async sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

function toRecipientLocator(to: string | UserLocator): string {
    if (typeof to === "string") {
        return to;
    }
    if ("email" in to) {
        return `email:${to.email}`;
    }
    if ("x" in to) {
        return `x:${to.x}`;
    }
    if ("twitter" in to) {
        return `twitter:${to.twitter}`;
    }
    if ("phone" in to) {
        return `phoneNumber:${to.phone}`;
    }
    if ("userId" in to) {
        return `userId:${to.userId}`;
    }
    throw new Error("Invalid recipient locator");
}

function toTokenLocator(token: string, chain: string): string {
    if (isValidAddress(token)) {
        return `${chain}:${token}`;
    }
    // Otherwise, treat as currency symbol (lowercase)
    return `${chain}:${token.toLowerCase()}`;
}
