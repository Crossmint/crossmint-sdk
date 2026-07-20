import { WithLoggerContext } from "@crossmint/common-sdk-base";
import type {
    Transfers,
    ApiClient,
    WalletLocator,
    RegisterSignerParams,
    GetTransactionSuccessResponse,
    GetTransactionsResponse,
    GetWalletSuccessResponse,
    FundWalletResponse,
} from "../api";
import type {
    AddSignerOptions,
    AddSignerReturnType,
    RemoveSignerOptions,
    RemoveSignerReturnType,
    Signer as WalletSigner,
    WalletOptions,
    UserLocator,
    Transaction,
    Balances,
    ApproveParams,
    ApproveOptions,
    Approval,
    Signature,
    ApproveResult,
    PrepareOnly,
    SendTokenTransactionOptions,
} from "./types";
import { mapApiSignerToSigner } from "../utils/signer-mapping";
import {
    DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE,
    DeviceSignerNotSupportedError,
    InvalidSignerError,
    InvalidTransferAmountError,
    SignatureFailedError,
    SignatureNotAvailableError,
    TransactionFailedError,
    TransactionNotAvailableError,
    TransactionNotCreatedError,
    WalletNotAvailableError,
    WalletTypeNotSupportedError,
    throwIfCrossmintApiAuthError,
} from "../utils/errors";
import { validateChainForEnvironment, type Chain } from "../chains/chains";
import { type ChainAdapter, type ChainType, getChainAdapter, isSupportedChainType } from "../chains/chain-adapter";
import type {
    ExternalWalletRegistrationConfig,
    PasskeySignerConfig,
    RecoverySignerConfigForChain,
    ServerSignerConfig,
    SignerAdapter,
    SignerConfigForChain,
    SignerLocator,
} from "../signers/types";
import { type ApiSourcedServerSignerConfig, isApiSourcedServerSignerConfig } from "../signers/types";
import { NonCustodialSigner } from "../signers/non-custodial";
import { ServerSignerResolver } from "../signers/server/resolver";
import { getSignerDescriptor } from "../signers/descriptors";
import { walletsLogger } from "../logger";

import { getSignerLocator } from "../utils/signer-locator";
import { toRecipientLocator, toTokenLocator } from "../utils/locators";
import { formatBalanceResponse } from "./services/balance-formatter";
import { SignerManager } from "./services/signer-manager";
import { DeviceRecoveryService } from "./services/device-recovery-service";
import {
    type PollingOptions,
    waitForSignatureCompletion,
    waitForTransactionCompletion,
} from "./services/operation-poller";

type WalletContructorType<C extends Chain> = {
    chain: C;
    address: string;
    owner?: string;
    alias?: string;
    options?: WalletOptions;
    recovery: RecoverySignerConfigForChain<C>;
    apiRecoveryServerSignerAddress?: string;
    apiDelegatedServerSignerAddresses?: string[];
    signers?: SignerConfigForChain<C>[];
    signer?: SignerAdapter;
};

export class Wallet<C extends Chain> {
    chain: C;
    address: string;
    owner?: string;
    alias?: string;
    #options?: WalletOptions;
    #apiClient: ApiClient;
    #initialSigners: SignerConfigForChain<C>[];
    #serverSignerResolver: ServerSignerResolver;
    #signerManager: SignerManager<C>;
    #deviceRecovery: DeviceRecoveryService<C>;
    #apiDelegatedServerSignerAddresses: string[] = [];
    #signerInitialization: Promise<void>;
    #recovering: Promise<void> | null = null;

    constructor(args: WalletContructorType<C>, apiClient: ApiClient) {
        const {
            chain,
            address,
            owner,
            options,
            alias,
            recovery,
            apiRecoveryServerSignerAddress,
            apiDelegatedServerSignerAddresses,
            signers,
            signer,
        } = args;
        this.#apiClient = apiClient;
        this.chain = chain;
        this.address = address;
        this.owner = owner;
        this.#options = options;
        this.alias = alias;
        let apiRecoveryAddress: string | null = null;
        if (apiRecoveryServerSignerAddress != null) {
            apiRecoveryAddress = apiRecoveryServerSignerAddress;
        } else if (recovery.type === "server" && isApiSourcedServerSignerConfig(recovery)) {
            apiRecoveryAddress = recovery.address;
        }
        this.#apiDelegatedServerSignerAddresses = apiDelegatedServerSignerAddresses ?? [];
        this.#initialSigners = signers ?? [];
        this.#serverSignerResolver = new ServerSignerResolver({
            chain,
            projectId: this.#apiClient.projectId,
            environment: this.#apiClient.environment,
            apiRecoveryAddress,
            apiDelegatedAddresses: this.#apiDelegatedServerSignerAddresses,
            knownOnChainAddresses: () => [
                ...this.#initialSigners
                    .filter(
                        (s): s is SignerConfigForChain<C> & ApiSourcedServerSignerConfig =>
                            s.type === "server" && isApiSourcedServerSignerConfig(s)
                    )
                    .map((s) => s.address),
                ...this.#apiDelegatedServerSignerAddresses,
            ],
        });
        this.#signerManager = new SignerManager({
            apiClient,
            options,
            chain,
            walletAddress: this.address,
            walletLocator: () => this.walletLocator,
            serverSignerResolver: this.#serverSignerResolver,
            recovery,
            initialSigners: this.#initialSigners,
            signers: () => this.signers(),
            signer,
        });
        this.#deviceRecovery = new DeviceRecoveryService({
            chain,
            walletAddress: this.address,
            options,
            signerManager: this.#signerManager,
            serverSignerResolver: this.#serverSignerResolver,
            signers: () => this.signers(),
            addSigner: (deviceSigner) => this.addSigner(deviceSigner),
            approveSignature: (signatureId) => this.approveSignatureAndWait(signatureId),
            approveTransaction: (transactionId) => this.approveTransactionAndWait(transactionId),
        });
        this.#signerInitialization = this.initDefaultSigner();
    }

    public get signer(): SignerAdapter | undefined {
        return this.#signerManager.activeSigner;
    }

    /**
     * Wait for the wallet's internal signer initialization to complete.
     * After this resolves, `needsRecovery()` reflects the true state.
     */
    public async waitForInit(): Promise<void> {
        await this.#signerInitialization;
    }

    /**
     * Initialize the default signer for this wallet.
     * Priority:
     * 1. Device signer (if available and enabled)
     * 2. If no device signer and no pending recovery: fallback based on delegated signer count
     *    - 0 signers: try to use recovery signer
     *    - 1 signer: try to use that signer
     *    - >1 signers: leave undefined (user must call useSigner)
     *
     * Note: Server and api-key signers may fail to auto-assemble if required data
     * is not available in the API response. In those cases, the signer is left undefined.
     */
    private async initDefaultSigner(): Promise<void> {
        // If useSigner has been called, don't try to auto-assemble a signer
        if (this.#signerManager.activeSigner != null) {
            return;
        }
        // Step 1: Try device signer (existing behavior)
        await this.#deviceRecovery.initDeviceSigner();

        // If device signer was found or recovery is pending, we're done
        if (this.#signerManager.activeSigner != null || this.#deviceRecovery.needsRecovery) {
            return;
        }

        const signerToAssemble =
            this.#initialSigners.length === 0
                ? this.#signerManager.recovery
                : this.#initialSigners.length === 1
                  ? this.#initialSigners[0]
                  : null; // >1 signers → user must call useSigner()

        if (signerToAssemble == null) {
            return;
        }

        const signerDescriptor = getSignerDescriptor<C>(signerToAssemble.type);
        const signerDescriptorContext = this.#signerManager.descriptorContext();
        if (!signerDescriptor.canAutoAssemble(signerToAssemble, signerDescriptorContext)) {
            return;
        }

        const isAdminSigner = signerToAssemble === this.#signerManager.recovery;
        try {
            const internalConfig = signerDescriptor.buildInternalConfig(
                signerToAssemble as SignerConfigForChain<C>,
                signerDescriptorContext
            );
            this.#signerManager.setActiveSigner(await this.#signerManager.assemble(internalConfig, { isAdminSigner }));
        } catch (error) {
            walletsLogger.warn("wallet.initDefaultSigner.autoAssemblyFailed", {
                recoveryType: this.#signerManager.recovery.type,
                signerCount: this.#initialSigners.length,
                error,
            });
            // #signer remains undefined — user will need to call useSigner() explicitly
        }
    }

    protected static getApiClient<C extends Chain>(wallet: Wallet<C>): ApiClient {
        return wallet.apiClient;
    }

    protected static getOptions<C extends Chain>(wallet: Wallet<C>): WalletOptions | undefined {
        return wallet.options;
    }

    protected static getRecovery<C extends Chain>(wallet: Wallet<C>): RecoverySignerConfigForChain<C> {
        return wallet.#signerManager.recovery as RecoverySignerConfigForChain<C>;
    }

    protected static getInitialSigners<C extends Chain>(wallet: Wallet<C>): SignerConfigForChain<C>[] {
        return wallet.#initialSigners;
    }

    protected static getApiRecoveryServerSignerAddress<C extends Chain>(wallet: Wallet<C>): string | undefined {
        return wallet.#serverSignerResolver.apiRecoveryAddress ?? undefined;
    }

    protected static getApiDelegatedServerSignerAddresses<C extends Chain>(wallet: Wallet<C>): string[] {
        return wallet.#apiDelegatedServerSignerAddresses;
    }

    public get apiClient(): ApiClient {
        return this.#apiClient;
    }

    protected get options(): WalletOptions | undefined {
        return this.#options;
    }

    private get chainAdapter(): ChainAdapter {
        return getChainAdapter(this.chain);
    }

    /**
     * Resolve a ServerSignerConfig to an API locator string.
     */
    protected resolveServerSignerApiLocator(signer: ServerSignerConfig): string {
        return this.#serverSignerResolver.apiLocator(signer);
    }

    /**
     * Get the recovery signer config
     * @returns The recovery signer config
     * @experimental This API is experimental and may change in the future
     */
    public get recovery(): SignerConfigForChain<C> {
        return this.#signerManager.recovery;
    }

    /**
     * Get the wallet balances - always includes USDC and native token (ETH/SOL)
     * @param {string[]} tokens - Additional tokens to request (optional: native token and usdc are always included)
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
    public async balances(tokens?: string[]): Promise<Balances<C>> {
        walletsLogger.info("wallet.balances.start");

        const resolvedChain = this.resolveChainForEnvironment();

        const nativeToken = this.chainAdapter.nativeToken;
        const allTokens = [nativeToken, "usdc", ...(tokens ?? [])];

        const response = await this.#apiClient.getBalance(this.address, {
            chains: [resolvedChain],
            tokens: allTokens,
        });

        if ("error" in response) {
            walletsLogger.error("wallet.balances.error", { error: response });
            throw new Error(`Failed to get balances for wallet: ${JSON.stringify(response.message)}`);
        }

        walletsLogger.info("wallet.balances.success");
        return formatBalanceResponse(response, this.chain, nativeToken, tokens);
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
        walletsLogger.info("wallet.stagingFund.start", {
            amount,
            chain: chain ?? this.chain,
        });

        const response = await this.apiClient.fundWallet(this.address, {
            amount,
            token: "usdxm",
            // Type casting is necessary here due to a type mismatch between our DTO schema and server-side types
            // (which only contains 10 testnet chains. Variable in main server is called EvmUsdcEnabledTestnetChains for reference).
            chain: chain ?? (this.chain as any),
        });
        if ("error" in response) {
            walletsLogger.error("wallet.stagingFund.error", {
                error: response,
            });
            throw new Error(`Failed to fund wallet: ${JSON.stringify(response.message)}`);
        }
        walletsLogger.info("wallet.stagingFund.success");
        return response;
    }

    /**
     * Get the wallet NFTs
     * @param params - The parameters
     * @param params.perPage - The number of NFTs per page
     * @param params.page - The page number
     * @returns The NFTs
     */
    public async nfts(params: { perPage: number; page: number }) {
        const resolvedChain = this.resolveChainForEnvironment();
        const response = await this.#apiClient.getNfts({
            ...params,
            chain: resolvedChain,
            address: this.address,
        });
        if (response != null && typeof response === "object" && "error" in response) {
            walletsLogger.error("wallet.nfts.error", { error: response });
            throw new Error(`Failed to get nfts: ${JSON.stringify((response as { message?: unknown }).message)}`);
        }
        return response;
    }

    /**
     * Get the wallet transactions
     * @returns The transactions
     * @throws {Error} If the transactions cannot be retrieved
     */
    public async transactions(): Promise<GetTransactionsResponse> {
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
    public async transaction(transactionId: string): Promise<GetTransactionSuccessResponse> {
        const response = await this.#apiClient.getTransaction(this.walletLocator, transactionId);
        if ("error" in response) {
            throw new Error(
                `Failed to get transaction: ${JSON.stringify((response as { message?: unknown }).message)}`
            );
        }
        return response;
    }

    /**
     * Get the wallet transfers
     * @returns The transfers
     * @throws {Error} If the transfers cannot be retrieved
     */
    public async transfers(params: { tokens?: string; status: "successful" | "failed" }): Promise<Transfers> {
        const resolvedChain = this.resolveChainForEnvironment();
        const response = await this.apiClient.getTransfers(this.walletLocator, {
            chain: resolvedChain,
            tokens: params.tokens,
            status: params.status,
        });
        if ("error" in response) {
            throw new Error(`Failed to get transfers: ${JSON.stringify(response.message)}`);
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
    public async send<T extends SendTokenTransactionOptions | undefined = undefined>(
        to: string | UserLocator,
        token: string,
        amount: string,
        options?: T
    ): Promise<Transaction<T extends PrepareOnly<true> ? true : false>> {
        const parsedAmount = Number(amount);
        if (Number.isNaN(parsedAmount) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            throw new InvalidTransferAmountError(
                `Invalid transfer amount: "${amount}". Amount must be a positive number greater than zero.`
            );
        }

        const recipient = toRecipientLocator(to);
        const resolvedChain = this.resolveChainForEnvironment();
        const tokenLocator = toTokenLocator(token, resolvedChain);

        walletsLogger.info("wallet.send.start", {
            recipient,
            token: tokenLocator,
            amount,
            ...(options?.transactionType != null ? { transactionType: options.transactionType } : {}),
        });

        await this.preAuthIfNeeded();
        const walletSigner = this.#signerManager.require();

        let signer: string;
        if (options?.signer == null) {
            signer = walletSigner.locator();
        } else if (typeof options.signer === "string") {
            signer = options.signer;
        } else {
            signer = this.resolveServerSignerApiLocator(options.signer);
        }

        const sendParams = {
            recipient,
            amount,
            signer,
            ...(options?.transactionType != null ? { transactionType: options.transactionType } : {}),
        };
        const transactionCreationResponse = await this.#apiClient.send(this.walletLocator, tokenLocator, sendParams);

        if ("message" in transactionCreationResponse) {
            walletsLogger.error("wallet.send.error", {
                error: transactionCreationResponse,
            });
            throw new TransactionNotCreatedError(
                `Failed to send token: ${JSON.stringify(transactionCreationResponse.message)}`
            );
        }

        if (options?.prepareOnly === true) {
            walletsLogger.info("wallet.send.prepared", {
                transactionId: transactionCreationResponse.id,
            });
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
     * @param params.options.approval - The approval
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
     * @param params.transactionId - The transaction id
     * @param params.signatureId - The signature id
     * @param params.options - The options for the approval
     * @param params.options.approval - The approval data
     * @param params.options.additionalSigners - Additional signers for the approval
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

        await this.preAuthIfNeeded();

        if (params.transactionId != null) {
            const result = (await this.approveTransactionAndWait(
                params.transactionId,
                params.options
            )) as ApproveResult<T>;
            walletsLogger.info("wallet.approve.success", {
                transactionId: params.transactionId,
            });
            return result;
        }
        if (params.signatureId != null) {
            const result = (await this.approveSignatureAndWait(params.signatureId, params.options)) as ApproveResult<T>;
            walletsLogger.info("wallet.approve.success", {
                signatureId: params.signatureId,
            });
            return result;
        }
        walletsLogger.error("wallet.approve.error", {
            error: "Either transactionId or signatureId must be provided",
        });
        throw new Error("Either transactionId or signatureId must be provided");
    }

    /**
     * Add a signer to the wallet.
     * Always uses the recovery signer internally to approve the registration.
     * If the signer being added is the current operational signer, it will be reassembled with the new locator.
     * Otherwise, the original signer is restored after the operation.
     * @param signer - The signer configuration object
     * @param options - The options for the operation
     * @param options.prepareOnly - If true, returns the signer with approval ID without auto-approving
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.addSigner",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async addSigner<T extends AddSignerOptions | undefined = undefined>(
        signer: SignerConfigForChain<C> | ServerSignerConfig | ExternalWalletRegistrationConfig,
        options?: T
    ): Promise<T extends PrepareOnly<true> ? AddSignerReturnType<C> : WalletSigner> {
        walletsLogger.info("wallet.addSigner.start");

        // Resolve server signer config to locator string
        const resolvedSigner =
            typeof signer === "object" && "type" in signer && signer.type === "server"
                ? (this.resolveServerSignerApiLocator(signer) as `server:${string}`)
                : signer;

        return this.#signerManager.withRecoverySigner(async () => {
            // Check for an existing signer registration (e.g. from a previous interrupted attempt)
            const signerLocator =
                typeof resolvedSigner === "string" ? resolvedSigner : getSignerLocator(resolvedSigner);
            const existingState = await this.#signerManager.getSignerState(signerLocator);

            if (existingState.signer != null) {
                // Signer already fully approved — return immediately (idempotent)
                if (this.#signerManager.isApprovedSignerStatus(existingState.signer.status)) {
                    if (options?.scopes != null) {
                        walletsLogger.warn("wallet.addSigner.scopesIgnored", {
                            reason: "signer already approved",
                            signerLocator,
                        });
                    }
                    walletsLogger.info("wallet.addSigner.alreadyApproved");
                    return this.completeSignerRegistration(existingState.signer, null, options);
                }

                // Pending operation from a previous attempt — resume instead of re-registering
                if (existingState.pendingOperation != null) {
                    if (options?.scopes != null) {
                        throw new Error(
                            "Cannot apply scopes when resuming a pending signer registration. Remove the pending signer and register it again with the desired scopes."
                        );
                    }
                    walletsLogger.info("wallet.addSigner.resuming", {
                        operationType: existingState.pendingOperation.type,
                        operationId: existingState.pendingOperation.id,
                    });
                    return this.completeSignerRegistration(
                        existingState.signer,
                        existingState.pendingOperation,
                        options
                    );
                }
            }

            const signerInput =
                typeof resolvedSigner === "string"
                    ? resolvedSigner
                    : getSignerDescriptor<C>(resolvedSigner.type).addSignerPayload(
                          resolvedSigner as SignerConfigForChain<C>,
                          this.#signerManager.descriptorContext()
                      );

            const isEvm = this.chain !== "solana" && this.chain !== "stellar";
            const deployImmediately = isEvm ? options?.deployImmediately ?? true : undefined;

            const response = await this.#apiClient.registerSigner(this.walletLocator, {
                signer: signerInput as RegisterSignerParams["signer"],
                chain: this.chainAdapter.addSignerChain(this.chain),
                ...(options?.scopes != null && { scopes: options.scopes }),
                ...(deployImmediately != null && { deployImmediately }),
            });

            if ("error" in response) {
                walletsLogger.error("wallet.addSigner.error", {
                    error: response,
                });
                if (response.code === DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE) {
                    throw new DeviceSignerNotSupportedError(response.message);
                }
                throw new InvalidSignerError(`Failed to register signer: ${JSON.stringify(response.message)}`);
            }

            const registeredSigner = mapApiSignerToSigner(response, this.chain);

            if (registeredSigner == null) {
                throw new Error(`No approval found for chain ${this.chain} in register signer response`);
            }

            const pendingOperation = this.chainAdapter.extractAddSignerOperation(response, this.chain, {
                locator: signerLocator,
                type: signer.type,
            });

            return this.completeSignerRegistration(registeredSigner, pendingOperation, options);
        }) as Promise<T extends PrepareOnly<true> ? AddSignerReturnType<C> : WalletSigner>;
    }

    /**
     * Complete a signer registration by approving the pending operation (if any).
     * Shared by both fresh registrations and resumed pending ones.
     */
    private async completeSignerRegistration(
        signer: WalletSigner,
        pendingOperation: { type: "signature" | "transaction"; id: string } | null,
        options?: AddSignerOptions
    ): Promise<AddSignerReturnType<C> | WalletSigner> {
        if (options?.prepareOnly) {
            if (pendingOperation == null) {
                return { ...signer } as AddSignerReturnType<C>;
            }
            switch (pendingOperation.type) {
                case "transaction": {
                    const operationId = { transactionId: pendingOperation.id };
                    walletsLogger.info("wallet.addSigner.prepared", operationId);
                    return { ...signer, ...operationId } as AddSignerReturnType<C>;
                }
                case "signature": {
                    const operationId = { signatureId: pendingOperation.id };
                    walletsLogger.info("wallet.addSigner.prepared", operationId);
                    return { ...signer, ...operationId } as AddSignerReturnType<C>;
                }
                default: {
                    const _exhaustive: never = pendingOperation.type;
                    throw new Error(`Unknown pending operation type: ${_exhaustive}`);
                }
            }
        }

        if (pendingOperation != null) {
            switch (pendingOperation.type) {
                case "transaction":
                    await this.approveTransactionAndWait(pendingOperation.id);
                    walletsLogger.info("wallet.addSigner.success", { transactionId: pendingOperation.id });
                    break;
                case "signature":
                    await this.approveSignatureAndWait(pendingOperation.id);
                    walletsLogger.info("wallet.addSigner.success", { signatureId: pendingOperation.id });
                    break;
                default: {
                    const _exhaustive: never = pendingOperation.type;
                    throw new Error(`Unknown pending operation type: ${_exhaustive}`);
                }
            }
        } else {
            walletsLogger.info("wallet.addSigner.success");
        }

        return { ...signer, status: "success" as const } as WalletSigner;
    }

    /**
     * Remove a signer from the wallet.
     * Always uses the recovery signer internally to approve the removal.
     * @param signer - The signer to remove, provided as a signer config object
     * @param options - The options for the operation
     * @param options.prepareOnly - If true, returns the operation ID without auto-approving
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.removeSigner",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async removeSigner<T extends RemoveSignerOptions | undefined = undefined>(
        signer: SignerConfigForChain<C> | ExternalWalletRegistrationConfig,
        options?: T
    ): Promise<RemoveSignerReturnType> {
        const signerLocator = this.resolveSignerLocator(signer);
        walletsLogger.info("wallet.removeSigner.start", { signerLocator });

        return this.#signerManager.withRecoverySigner(async () => {
            const response = await this.#apiClient.removeSigner(this.walletLocator, signerLocator, {
                chain: this.chainAdapter.addSignerChain(this.chain),
            });

            if ("error" in response) {
                walletsLogger.error("wallet.removeSigner.error", {
                    error: response,
                });
                throw new Error(`Failed to remove signer: ${JSON.stringify(response)}`);
            }

            const transactionId = response.id;
            if (options?.prepareOnly) {
                walletsLogger.info("wallet.removeSigner.prepared", {
                    transactionId,
                });
                return { transactionId, status: undefined };
            }

            await this.approveTransactionAndWait(transactionId);
            walletsLogger.info("wallet.removeSigner.success", {
                transactionId,
            });
            return { transactionId, status: "success" } as RemoveSignerReturnType;
        });
    }

    /**
     * Set the active signer for this wallet.
     * Accepts a signer config object. The locator is inferred internally.
     * Works for both registered signers and the recovery signer.
     *
     * For passkey signers: if no `id` is provided, the wallet will auto-select the passkey
     * if exactly one passkey signer is registered. If multiple passkeys exist, an `id` must be specified.
     *
     * For device signers: if no device key is found locally, the signer will be created
     * automatically during the next transaction (via recovery).
     *
     * For external-wallet signers: the config object must include an onSign callback
     * (applies to both registered and recovery signers).
     *
     * @param signer - The signer config object to use
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.useSigner",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async useSigner(signer: SignerConfigForChain<C>): Promise<void> {
        walletsLogger.info("wallet.useSigner.start");
        // Reset the delegated signer cache when processing a fresh server signer.
        // The recovery resolution is intentionally preserved — it's set once during
        // recovery resolution and must survive across useSigner calls.
        if (signer.type === "server") {
            this.#serverSignerResolver.resetDelegatedCache();
        }
        getSignerDescriptor<C>(signer.type).validateConfig(signer);

        let isAdminSigner = false;
        if (signer.type === "device") {
            await this.#deviceRecovery.resolveAvailability(signer);
        } else {
            isAdminSigner = await this.resolveNonDeviceSigner(signer);
        }

        const internalConfig = getSignerDescriptor<C>(signer.type).buildInternalConfig(
            signer,
            this.#signerManager.descriptorContext()
        );
        const signerLocator = getSignerLocator(signer);
        this.#signerManager.setActiveSigner(await this.#signerManager.assemble(internalConfig, { isAdminSigner }));
        walletsLogger.info("wallet.useSigner.success", { signerLocator });
    }

    /**
     * Resolve a non-device signer: check registration first, then fall back to recovery.
     * For passkeys without an explicit credential id, auto-selects from registered signers.
     * Returns true if the signer is an admin (recovery) signer.
     */
    private async resolveNonDeviceSigner(signer: SignerConfigForChain<C>): Promise<boolean> {
        // For non-passkey, non-server signers, check if this is the recovery (admin) signer first.
        // Admin signers are always approved — skip the registration check and getSigner API call
        // which only works for delegated signers (returns 404/400 for admin signers).
        // Passkeys are excluded because isRecoverySigner matches by type only, which could
        // incorrectly match a delegated passkey.
        // Server signers are excluded so they always flow through the server signer block below,
        // which resolves the correct (primary or legacy) derivation.
        if (signer.type !== "passkey" && signer.type !== "server" && this.isRecoverySigner(signer)) {
            this.#deviceRecovery.onSignerSelected();
            return true;
        }

        // Passkey without id: try to auto-select from registered signers
        if (signer.type === "passkey" && this.isPasskeyMissingId(signer)) {
            const selected = await this.tryAutoSelectPasskey(signer);
            if (!selected) {
                // No registered passkeys — use recovery if this is the recovery signer
                if (this.isRecoverySigner(signer)) {
                    this.#deviceRecovery.onSignerSelected();
                    return true;
                }
                throw new Error("No passkey signer is registered on this wallet.");
            }
        }

        if (signer.type === "server") {
            return this.resolveServerSigner(signer);
        }

        // Check if this is a registered signer
        const locator = this.resolveSignerLocator(signer);
        if (await this.signerIsRegistered(locator)) {
            this.#deviceRecovery.onSignerSelected();
            return false;
        }

        // Not a registered signer — fall back to recovery
        if (this.isRecoverySigner(signer)) {
            this.#deviceRecovery.onSignerSelected();
            return true;
        }

        throw new Error(`Signer "${locator}" is not registered in this wallet.`);
    }

    /**
     * Resolve a server signer: prefer a derivation already registered on-chain, else fall back
     * to the recovery (admin) signer. Returns true if the signer is the admin (recovery) signer.
     */
    private async resolveServerSigner(signer: ServerSignerConfig): Promise<boolean> {
        const existingSigners = await this.signers();
        const registeredLocators = existingSigners.map((s) => s.locator);
        const resolution = this.#serverSignerResolver.resolveForUseSigner(signer, registeredLocators, () =>
            this.isRecoverySigner(signer as SignerConfigForChain<C>)
        );
        switch (resolution.kind) {
            case "delegated":
                this.#deviceRecovery.onSignerSelected();
                return false;
            case "recovery":
                this.#signerManager.stripSecretFromRecovery();
                this.#deviceRecovery.onSignerSelected();
                return true;
            case "unregistered":
                throw new Error(resolution.message);
        }
    }

    /**
     * Try to auto-select a passkey credential from registered signers.
     * Returns true if a credential was auto-selected, false if no passkey signers exist.
     * Throws if multiple passkey signers exist (user must specify an id).
     */
    private async tryAutoSelectPasskey(signer: PasskeySignerConfig): Promise<boolean> {
        const existingSigners = await this.signers();
        const passkeySigners = existingSigners.filter((s) => s.type === "passkey");

        if (passkeySigners.length === 0) {
            return false;
        }
        if (passkeySigners.length > 1) {
            throw new Error(
                'Multiple passkey signers are registered on this wallet. Please specify the credential id: wallet.useSigner({ type: "passkey", id: "<credential-id>" })'
            );
        }

        signer.id = passkeySigners[0].locator.replace("passkey:", "");
        return true;
    }

    /**
     * Compute the signer locator for registration checks.
     * Server signers use the derived address; other types use the standard locator.
     */
    private resolveSignerLocator(signer: SignerConfigForChain<C> | ExternalWalletRegistrationConfig): string {
        if (signer.type === "server") {
            return this.resolveServerSignerApiLocator(signer);
        }
        return getSignerLocator(signer);
    }

    private isPasskeyMissingId(signer: PasskeySignerConfig): boolean {
        return signer.id == null || signer.id === "";
    }

    /**
     * Check if a signer is registered in this wallet.
     * @param signerLocator - The locator of the signer to check
     * @returns true if the signer is registered
     */
    public async signerIsRegistered(signerLocator: SignerLocator | string): Promise<boolean> {
        return this.#signerManager.signerIsRegistered(signerLocator);
    }

    /**
     * Check if a signer is approved and usable for the current wallet chain.
     * @param signerLocator - The locator of the signer to check
     * @returns true if the signer is approved for this chain
     */
    public async isSignerApproved(signerLocator: SignerLocator | string): Promise<boolean> {
        return this.#signerManager.isSignerApproved(signerLocator);
    }

    /**
     * Whether the wallet needs recovery (signer registration) before the next transaction.
     * @returns true if recovery is needed
     */
    public needsRecovery(): boolean {
        return this.#deviceRecovery.needsRecovery;
    }

    /**
     * Register a device signer with the wallet using the recovery signer.
     * Generates a new device key and registers it on-chain.
     * Returns early if the device signer's locator is already approved on-chain.
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.recover",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async recover(): Promise<void> {
        await this.#deviceRecovery.recover();
    }

    /**
     * List the signers for this wallet.
     * Returns full signer objects with status.
     * For EVM wallets, only signers with an approval (pending or completed) for the wallet's chain are included.
     * @returns {Promise<WalletSigner[]>} The signers
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.signers",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async signers(): Promise<WalletSigner[]> {
        walletsLogger.info("wallet.signers.start");

        const walletResponse = await this.#apiClient.getWallet(this.walletLocator);
        if ("error" in walletResponse) {
            walletsLogger.error("wallet.signers.error", {
                error: walletResponse,
            });
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }

        if (!isSupportedSmartWallet(walletResponse)) {
            const reason =
                walletResponse.type !== "smart"
                    ? `Wallet type ${walletResponse.type} not supported`
                    : `Wallet chain type ${walletResponse.chainType} not supported`;
            walletsLogger.error("wallet.signers.error", { error: reason });
            throw new WalletTypeNotSupportedError(reason);
        }

        const configSigners = walletResponse?.config?.delegatedSigners ?? [];

        const signersWithStatus = await Promise.all(
            configSigners.map(async (configSigner) => {
                try {
                    const signerState = await this.#signerManager.getSignerState(configSigner.locator as SignerLocator);
                    return signerState.signer;
                } catch (error) {
                    walletsLogger.warn("wallet.signers.mapSigner.failed", { locator: configSigner.locator, error });
                    return null;
                }
            })
        );

        // Filter out null results (signers that don't have approval for this chain)
        const signers = signersWithStatus.filter((s): s is WalletSigner => s != null);

        walletsLogger.info("wallet.signers.success", {
            count: signers.length,
        });
        return signers;
    }

    protected get walletLocator(): WalletLocator {
        if (this.#apiClient.isServerSide) {
            return this.address;
        } else {
            const baseLocator = this.chainAdapter.walletLocatorPrefix;
            const aliasLocatorPart = this.alias != null ? `:alias:${this.alias}` : "";
            return baseLocator + aliasLocatorPart;
        }
    }

    protected get signerManager(): SignerManager<C> {
        return this.#signerManager;
    }

    protected async preAuthIfNeeded(): Promise<void> {
        await this.#signerInitialization;
        if (this.#recovering == null) {
            this.#recovering = this.recover();
        }
        try {
            await this.#recovering;
        } finally {
            this.#recovering = null;
        }
        const signer = this.#signerManager.require();
        if (signer instanceof NonCustodialSigner) {
            await signer.ensureAuthenticated();
        }
    }

    /**
     * Check if a signer config matches the wallet's recovery signer.
     */
    private isRecoverySigner(signerConfig: SignerConfigForChain<C>): boolean {
        const recovery = this.#signerManager.recovery;
        if (recovery == null || recovery.type !== signerConfig.type) {
            return false;
        }
        const signerDescriptor = getSignerDescriptor<C>(signerConfig.type);
        if (!signerDescriptor.matchesRecovery(signerConfig, recovery, this.#signerManager.descriptorContext())) {
            return false;
        }
        if (signerDescriptor.adoptsRecoveryConfigOnMatch) {
            this.#signerManager.adoptRecoveryConfig(signerConfig);
        }
        return true;
    }

    protected resolveChainForEnvironment(): C {
        const resolvedChain = validateChainForEnvironment(this.chain, this.#apiClient.environment);

        if (resolvedChain !== this.chain) {
            this.chain = resolvedChain as C;
        }

        return this.chain;
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

    async #resolveMissingDeviceSigner(locator: string): Promise<SignerAdapter | null> {
        const signer = await this.#deviceRecovery.tryResolveLocallyAvailableSigner(locator);
        if (signer != null) {
            walletsLogger.info("wallet.approve.deviceSignerRecoveredViaFallback", { signerLocator: locator });
        }
        return signer;
    }

    async #resolveApprovalSigner(signers: SignerAdapter[], locator: string): Promise<SignerAdapter> {
        let signer = signers.find((s) => s.locator() === locator);
        if (signer == null) {
            signer = (await this.#resolveMissingDeviceSigner(locator)) ?? undefined;
        }
        if (signer == null) {
            throw new InvalidSignerError(`Signer ${locator} not found in pending approvals`);
        }
        return signer;
    }

    async #collectApprovals<P extends { signer: { locator: string }; message: string }>(
        pendingApprovals: P[],
        signers: SignerAdapter[],
        sign: (signer: SignerAdapter, pendingApproval: P) => ReturnType<SignerAdapter["signMessage"]>
    ): Promise<Approval[]> {
        return await Promise.all(
            pendingApprovals.map(async (pendingApproval) => {
                const signer = await this.#resolveApprovalSigner(signers, pendingApproval.signer.locator);
                const signature = await sign(signer, pendingApproval);
                return {
                    ...signature,
                    signer: signer.locator(),
                };
            })
        );
    }

    protected async approveSignatureInternal(signatureId: string, options?: ApproveOptions) {
        if (!this.chainAdapter.supportsSignatures) {
            throw new Error("Approving signatures is only supported for EVM smart wallets");
        }

        const walletSigner = this.#signerManager.require();

        const signature = await this.#apiClient.getSignature(this.walletLocator, signatureId);

        if ("error" in signature) {
            throwIfCrossmintApiAuthError(signature);
            throw new SignatureNotAvailableError(JSON.stringify(signature));
        }

        // API key signers approve automatically
        if (walletSigner.type === "api-key") {
            return signature;
        }

        // If an external signature is provided, use it to approve the transaction
        if (options?.approval != null) {
            const approvals = [options.approval];

            return await this.executeApproveSignatureWithErrorHandling(signatureId, approvals);
        }

        const pendingApprovals = signature.approvals?.pending;

        if (pendingApprovals == null || pendingApprovals.length === 0) {
            return signature;
        }

        const signers = [...(options?.additionalSigners ?? []), walletSigner];

        const approvals = await this.#collectApprovals(pendingApprovals, signers, (signer, pendingApproval) =>
            signer.signMessage(pendingApproval.message)
        );

        return await this.executeApproveSignatureWithErrorHandling(signatureId, approvals);
    }

    protected async approveTransactionInternal(transactionId: string, options?: ApproveOptions) {
        const transaction = await this.#apiClient.getTransaction(this.walletLocator, transactionId);

        if ("error" in transaction) {
            throwIfCrossmintApiAuthError(transaction);
            throw new TransactionNotAvailableError(JSON.stringify(transaction));
        }

        await this.#options?.callbacks?.onTransactionStart?.();

        const walletSigner = this.#signerManager.require();

        // API key signers approve automatically
        if (walletSigner.type === "api-key") {
            return transaction;
        }

        // If an external signature is provided, use it to approve the transaction
        if (options?.approval != null) {
            const approvals = [options.approval];

            return await this.executeApproveTransactionWithErrorHandling(transactionId, approvals);
        }

        const pendingApprovals = transaction.approvals?.pending;

        if (pendingApprovals == null || pendingApprovals.length === 0) {
            return transaction;
        }

        const signers = [...(options?.additionalSigners ?? []), walletSigner];

        const approvals = await this.#collectApprovals(pendingApprovals, signers, (signer, pendingApproval) => {
            // For Solana device signers (secp256r1), the SWIG precompile expects a signature
            // over the keccak256 hash, which is provided in pendingApproval.message.
            // For other Solana signers (ed25519), the full serialized transaction is signed.
            const isDeviceSigner = signer.type === "device";
            const transactionToSign =
                transaction.chainType === "solana" && "transaction" in transaction.onChain && !isDeviceSigner
                    ? (transaction.onChain.transaction as string)
                    : pendingApproval.message;

            return signer.signTransaction(transactionToSign);
        });

        return await this.executeApproveTransactionWithErrorHandling(transactionId, approvals);
    }

    private async executeApproveTransactionWithErrorHandling(transactionId: string, approvals: Approval[]) {
        walletsLogger.info("wallet.approve: submitting approval to API", { transactionId });
        const approvedTransaction = await this.#apiClient.approveTransaction(this.walletLocator, transactionId, {
            approvals,
        });

        if (approvedTransaction.error) {
            throwIfCrossmintApiAuthError(approvedTransaction);
            throw new TransactionFailedError(JSON.stringify(approvedTransaction));
        }

        return approvedTransaction;
    }

    private async executeApproveSignatureWithErrorHandling(signatureId: string, approvals: Approval[]) {
        const approvedSignature = await this.#apiClient.approveSignature(this.walletLocator, signatureId, {
            approvals,
        });

        if (approvedSignature.error) {
            throwIfCrossmintApiAuthError(approvedSignature);
            throw new SignatureFailedError(JSON.stringify(approvedSignature));
        }

        return approvedSignature;
    }

    protected async waitForSignature(signatureId: string): Promise<Signature<false>> {
        return await waitForSignatureCompletion(this.#apiClient, this.walletLocator, signatureId);
    }

    protected async waitForTransaction(
        transactionId: string,
        timeoutMs = 60_000,
        options: Omit<PollingOptions, "timeoutMs"> = {}
    ): Promise<Transaction<false>> {
        return await waitForTransactionCompletion(this.#apiClient, this.walletLocator, transactionId, {
            timeoutMs,
            ...options,
        });
    }

    protected async sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

function isSupportedSmartWallet(
    wallet: GetWalletSuccessResponse
): wallet is Extract<GetWalletSuccessResponse, { chainType: ChainType }> {
    return wallet.type === "smart" && isSupportedChainType(wallet.chainType);
}
