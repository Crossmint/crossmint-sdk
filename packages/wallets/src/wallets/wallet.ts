import { isValidAddress, WithLoggerContext } from "@crossmint/common-sdk-base";
import type {
    Activity,
    ApiClient,
    GetSignatureResponse,
    GetBalanceSuccessResponse,
    WalletLocator,
    RegisterSignerPasskeyParams,
    GetTransactionSuccessResponse,
    GetTransactionsResponse,
    FundWalletResponse,
} from "../api";
import type {
    AddDelegatedSignerOptions,
    AddDelegatedSignerReturnType,
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
import { NonCustodialSigner } from "../signers/non-custodial";
import { walletsLogger } from "../logger";

type WalletContructorType<C extends Chain> = {
    chain: C;
    address: string;
    owner?: string;
    alias?: string;
    signer: Signer;
    options?: WalletOptions;
};

export class Wallet<C extends Chain> {
    chain: C;
    address: string;
    owner?: string;
    alias?: string;
    signer: Signer;
    #options?: WalletOptions;
    #apiClient: ApiClient;

    constructor(args: WalletContructorType<C>, apiClient: ApiClient) {
        const { chain, address, owner, signer, options, alias } = args;
        this.#apiClient = apiClient;
        this.chain = chain;
        this.address = address;
        this.owner = owner;
        this.signer = signer;
        this.#options = options;
        this.alias = alias;
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
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.balances",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async balances(tokens?: string[], chains?: Chain[]): Promise<Balances<C>> {
        walletsLogger.info("wallet.balances.start");

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
            walletsLogger.error("wallet.balances.error", { error: response });
            throw new Error(`Failed to get balances for wallet: ${JSON.stringify(response.message)}`);
        }

        walletsLogger.info("wallet.balances.success");
        return this.transformBalanceResponse(response, nativeToken, tokens);
    }

    /**
     * Funds the wallet with Crossmint's stablecoin (USDXM).
     *
     * **Note:** This method is only available in staging environments and exclusively supports USDXM tokens.
     * It cannot be used in production environments.
     * @param amount - The amount of USDXM to fund the wallet with
     * @param chain - Optional chain to fund on. If not provided, uses the wallet's default chain
     * @returns The funding response
     * @throws {Error} If the funding operation fails or if called in a production environment
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.stagingFund",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async stagingFund(amount: number, chain?: Chain): Promise<FundWalletResponse> {
        walletsLogger.info("wallet.stagingFund.start", { amount, chain: chain ?? this.chain });

        const response = await this.apiClient.fundWallet(this.address, {
            amount,
            token: "usdxm",
            // Type casting is necessary here due to a type mismatch between our DTO schema and server-side types
            // (which only contains 10 testnet chains. Variable in main server is called EvmUsdcEnabledTestnetChains for reference).
            chain: chain ?? (this.chain as any),
        });
        if ("error" in response) {
            walletsLogger.error("wallet.stagingFund.error", { error: response });
            throw new Error(`Failed to fund wallet: ${JSON.stringify(response.message)}`);
        }
        walletsLogger.info("wallet.stagingFund.success");
        return response;
    }

    /**
     * Transform the API balance response to the new structure
     * @private
     */
    private transformBalanceResponse(
        apiResponse: GetBalanceSuccessResponse,
        nativeTokenSymbol: TokenBalance["symbol"],
        requestedTokens?: string[]
    ): Balances<C> {
        const transformTokenBalance = (tokenData: GetBalanceSuccessResponse[number]): TokenBalance<C> => {
            const chainData = tokenData.chains?.[this.chain];

            let chainSpecificField = {};
            if (this.chain === "solana" && chainData != null && "mintHash" in chainData) {
                chainSpecificField = { mintHash: chainData.mintHash };
            } else if (this.chain === "stellar" && chainData != null && "contractId" in chainData) {
                chainSpecificField = { contractId: chainData.contractId };
            } else if (chainData != null && "contractAddress" in chainData) {
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

        const createDefaultToken = (symbol: TokenBalance["symbol"]): TokenBalance<C> => {
            const baseToken = {
                symbol,
                name: symbol,
                amount: "0",
                decimals: 0,
                rawAmount: "0",
            };

            let chainSpecificField = {};
            if (this.chain === "solana") {
                chainSpecificField = { mintHash: undefined };
            } else if (this.chain === "stellar") {
                chainSpecificField = { contractId: undefined };
            } else {
                chainSpecificField = { contractAddress: undefined };
            }

            return {
                ...baseToken,
                ...chainSpecificField,
            } as TokenBalance<C>;
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
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.send",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async send<T extends TransactionInputOptions | undefined = undefined>(
        to: string | UserLocator,
        token: string,
        amount: string,
        options?: T
    ): Promise<Transaction<T extends PrepareOnly<true> ? true : false>> {
        const recipient = toRecipientLocator(to);
        const tokenLocator = toTokenLocator(token, this.chain);

        walletsLogger.info("wallet.send.start", { recipient, token: tokenLocator, amount });

        await this.preAuthIfNeeded();
        const sendParams = {
            recipient,
            amount,
            ...(options?.experimental_signer != null ? { signer: options.experimental_signer } : {}),
        };
        const transactionCreationResponse = await this.#apiClient.send(this.walletLocator, tokenLocator, sendParams);

        if ("message" in transactionCreationResponse) {
            walletsLogger.error("wallet.send.error", { error: transactionCreationResponse });
            throw new TransactionNotCreatedError(
                `Failed to send token: ${JSON.stringify(transactionCreationResponse.message)}`
            );
        }

        if (options?.experimental_prepareOnly) {
            walletsLogger.info("wallet.send.prepared", { transactionId: transactionCreationResponse.id });
            return {
                hash: undefined,
                explorerLink: undefined,
                transactionId: transactionCreationResponse.id,
            } as Transaction<T extends PrepareOnly<true> ? true : false>;
        }

        const result = await this.approveTransactionAndWait(transactionCreationResponse.id);
        walletsLogger.info("wallet.send.success", {
            transactionId: transactionCreationResponse.id,
            hash: result.hash,
        });
        return result;
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
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.approve",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async approve<T extends ApproveParams>(params: T): Promise<ApproveResult<T>> {
        walletsLogger.info("wallet.approve.start", {
            transactionId: params.transactionId,
            signatureId: params.signatureId,
        });

        if (params.transactionId != null) {
            const result = (await this.approveTransactionAndWait(
                params.transactionId,
                params.options
            )) as ApproveResult<T>;
            walletsLogger.info("wallet.approve.success", { transactionId: params.transactionId });
            return result;
        }
        if (params.signatureId != null) {
            const result = (await this.approveSignatureAndWait(params.signatureId, params.options)) as ApproveResult<T>;
            walletsLogger.info("wallet.approve.success", { signatureId: params.signatureId });
            return result;
        }
        walletsLogger.error("wallet.approve.error", {
            error: "Either transactionId or signatureId must be provided",
        });
        throw new Error("Either transactionId or signatureId must be provided");
    }

    /**
     * Add a delegated signer to the wallet
     * @param signer - The signer. For Solana, it must be a string. For EVM, it can be a string or a passkey.
     * @param options - The options for the operation
     * @param options.experimental_prepareOnly - If true, returns the transaction/signature ID without auto-approving
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.addDelegatedSigner",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async addDelegatedSigner<T extends AddDelegatedSignerOptions | undefined = undefined>(params: {
        signer: string | RegisterSignerPasskeyParams;
        options?: T;
    }): Promise<T extends PrepareOnly<true> ? AddDelegatedSignerReturnType<C> : void> {
        walletsLogger.info("wallet.addDelegatedSigner.start");

        const response = await this.#apiClient.registerSigner(this.walletLocator, {
            signer: params.signer,
            chain: this.chain === "solana" || this.chain === "stellar" ? undefined : this.chain,
        });

        if ("error" in response) {
            walletsLogger.error("wallet.addDelegatedSigner.error", { error: response });
            throw new Error(`Failed to register signer: ${JSON.stringify(response.message)}`);
        }

        if (this.chain === "solana" || this.chain === "stellar") {
            if (!("transaction" in response) || response.transaction == null) {
                walletsLogger.error("wallet.addDelegatedSigner.error", {
                    error: "Expected transaction in response for Solana/Stellar chain",
                });
                throw new Error("Expected transaction in response for Solana/Stellar chain");
            }

            const transactionId = response.transaction.id;

            if (params.options?.experimental_prepareOnly) {
                walletsLogger.info("wallet.addDelegatedSigner.prepared", { transactionId });
                return { transactionId } as any;
            }

            await this.approveTransactionAndWait(transactionId);
            walletsLogger.info("wallet.addDelegatedSigner.success", { transactionId });
            return undefined as any;
        }

        if (!("chains" in response)) {
            walletsLogger.error("wallet.addDelegatedSigner.error", {
                error: "Expected chains in response for EVM chain",
            });
            throw new Error("Expected chains in response for EVM chain");
        }

        const chainResponse = response.chains?.[this.chain];

        if (params.options?.experimental_prepareOnly) {
            const signatureId = chainResponse?.status !== "success" ? chainResponse?.id : undefined;
            walletsLogger.info("wallet.addDelegatedSigner.prepared", { signatureId });
            return { signatureId } as any;
        }

        if (chainResponse?.status === "awaiting-approval") {
            await this.approveSignatureAndWait(chainResponse.id);
            walletsLogger.info("wallet.addDelegatedSigner.success", { signatureId: chainResponse.id });
            return undefined as any;
        }
        if (chainResponse?.status === "pending") {
            await this.waitForSignature(chainResponse.id);
            walletsLogger.info("wallet.addDelegatedSigner.success", { signatureId: chainResponse.id });
            return undefined as any;
        }

        walletsLogger.info("wallet.addDelegatedSigner.success");
        return undefined as any;
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.delegatedSigners",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async delegatedSigners(): Promise<DelegatedSigner[]> {
        walletsLogger.info("wallet.delegatedSigners.start");

        const walletResponse = await this.#apiClient.getWallet(this.walletLocator);
        if ("error" in walletResponse) {
            walletsLogger.error("wallet.delegatedSigners.error", { error: walletResponse });
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }

        if (
            walletResponse.type !== "smart" ||
            (walletResponse.chainType !== "evm" &&
                walletResponse.chainType !== "solana" &&
                walletResponse.chainType !== "stellar")
        ) {
            walletsLogger.error("wallet.delegatedSigners.error", {
                error: `Wallet type ${walletResponse.type} not supported`,
            });
            throw new WalletTypeNotSupportedError(`Wallet type ${walletResponse.type} not supported`);
        }

        // Map wallet-type to simply wallet
        const signers =
            walletResponse?.config?.delegatedSigners?.map((signer) => {
                const colonIndex = signer.locator.indexOf(":");
                // If there's a colon, keep everything after it; otherwise treat the whole string as "rest"
                const address = colonIndex >= 0 ? signer.locator.slice(colonIndex + 1) : signer.locator;
                return {
                    signer: `external-wallet:${address}`,
                };
            }) ?? [];

        walletsLogger.info("wallet.delegatedSigners.success", { count: signers.length });
        return signers;
    }

    protected get walletLocator(): WalletLocator {
        if (this.#apiClient.isServerSide) {
            return this.address;
        } else {
            let baseLocator: string;
            switch (this.chain) {
                case "stellar":
                    baseLocator = `me:stellar:smart`;
                    break;
                case "solana":
                    baseLocator = `me:solana:smart`;
                    break;
                default:
                    baseLocator = `me:evm:smart`;
                    break;
            }
            const aliasLocatorPart = this.alias != null ? `:alias:${this.alias}` : "";
            return baseLocator + aliasLocatorPart;
        }
    }

    protected async preAuthIfNeeded(): Promise<void> {
        if (this.signer instanceof NonCustodialSigner) {
            await this.signer.ensureAuthenticated();
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

        const approvals = await Promise.all(
            pendingApprovals.map(async (pendingApproval) => {
                const signer = signers.find((s) => s.locator() === pendingApproval.signer.locator);
                if (signer == null) {
                    throw new InvalidSignerError(`Signer ${pendingApproval.signer} not found in pending approvals`);
                }

                const signature = await signer.signMessage(pendingApproval.message);
                return {
                    ...signature,
                    signer: signer.locator(),
                };
            })
        );

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

        const approvals = await Promise.all(
            pendingApprovals.map(async (pendingApproval) => {
                const signer = signers.find((s) => s.locator() === pendingApproval.signer.locator);
                if (signer == null) {
                    throw new InvalidSignerError(`Signer ${pendingApproval.signer} not found in pending approvals`);
                }

                const transactionToSign =
                    transaction.chainType === "solana" && "transaction" in transaction.onChain
                        ? (transaction.onChain.transaction as string) // in Solana, the transaction is a string
                        : pendingApproval.message;

                const signature = await signer.signTransaction(transactionToSign);
                return {
                    ...signature,
                    signer: signer.locator(),
                };
            })
        );

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
