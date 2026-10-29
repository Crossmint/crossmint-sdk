import { WithLoggerContext } from "@crossmint/common-sdk-base";
import type {
    Transfers,
    ApiClient,
    WalletLocator,
    RegisterSignerParams,
    RegisterRecoveryMethodParams,
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
    AddRecoveryMethodOptions,
    AddRecoveryMethodReturnType,
    RemoveRecoveryMethodOptions,
    RemoveRecoveryMethodReturnType,
    Signer as WalletSigner,
    WalletOptions,
    UserLocator,
    Transaction,
    Balances,
    ApproveParams,
    ApproveOptions,
    Approval,
    PendingApproval,
    SignerStatus,
    Signature,
    ApproveResult,
    PrepareOnly,
    RecoverySignerConfigFor,
    SendTokenTransactionOptions,
    SignerOption,
} from "./types";
import { isSignerLocatorOption } from "./types";
import { mapApiSignerToSigner } from "../utils/signer-mapping";
import {
    DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE,
    DeviceSignerNotSupportedError,
    InvalidRecoveryConfigError,
    InvalidSignerError,
    InvalidTransferAmountError,
    RecoveryNotSupportedOnChainError,
    SignatureFailedError,
    SignatureNotAvailableError,
    TransactionFailedError,
    TransactionNotAvailableError,
    TransactionNotCreatedError,
    WalletNotAvailableError,
    WalletTypeNotSupportedError,
    throwIfCrossmintApiAuthError,
    throwIfQuorumApiError,
    throwIfRequestExpired,
} from "../utils/errors";
import { validateChainForEnvironment, type Chain } from "../chains/chains";
import {
    type ChainAdapter,
    type ChainType,
    getApprovalAdapter,
    getChainAdapter,
    isSupportedChainType,
} from "../chains/chain-adapter";
import type {
    ExternalWalletRegistrationConfig,
    PasskeySignerConfig,
    QuorumSigner,
    RecoverySignerConfigForChain,
    ServerSignerConfig,
    SignerAdapter,
    SignerConfigForChain,
    SignerLocator,
} from "../signers/types";
import {
    type ApiSourcedServerSignerConfig,
    isApiSourcedServerSignerConfig,
    isQuorumSigner,
    throwIfQuorumSigner,
} from "../signers/types";
import { NonCustodialSigner } from "../signers/non-custodial";
import { ServerSignerResolver } from "../signers/server/resolver";
import { getSignerDescriptor } from "../signers/descriptors";
import { walletsLogger } from "../logger";

import { recoveryMethodsFromWalletConfig } from "../utils/recovery";
import { getSignerLocator, isSameSignerLocator, passkeyCredentialId } from "../utils/signer-locator";
import { toRecipientLocator, toTokenLocator } from "../utils/locators";
import { formatBalanceResponse } from "./services/balance-formatter";
import { SignerManager } from "./services/signer-manager";
import { DeviceRecoveryService } from "./services/device-recovery-service";
import { isQuorumPendingApproval } from "../quorum/approvals";
import { quorumsWithMember } from "../quorum/members";
import { resolveActingRole } from "../quorum/roles";
import { type ApprovalSigning, collectApprovals } from "./services/approval-collector";
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
    /** The wallet's recovery signer(s). Wallets on chains that support a single recovery signer take one entry. */
    recovery: RecoverySignerConfigForChain<C> | Array<RecoverySignerConfigForChain<C>>;
    /** Addresses of the API-sourced server recovery signers, so legacy derivations can be recognised. */
    apiRecoveryServerSignerAddresses?: string[];
    apiDelegatedServerSignerAddresses?: string[];
    signers?: SignerConfigForChain<C>[];
    signer?: SignerAdapter;
    /** The active `signer`'s locator when it was selected as only a quorum member. */
    quorumMemberLocator?: SignerLocator | null;
};

// How `useSigner` holds a key: as a recovery method, a registered signer, or a member of one of the wallet's quorums.
type HeldKeyRole = { kind: "recovery" } | { kind: "registered" } | { kind: "member"; status: SignerStatus | undefined };
const RECOVERY: HeldKeyRole = { kind: "recovery" };
const REGISTERED: HeldKeyRole = { kind: "registered" };

// A delegated quorum as `signers()` lists it, with its install status.
type WalletQuorum = Extract<WalletSigner, { type: "quorum" }>;
const isWalletQuorum = (signer: WalletSigner): signer is WalletQuorum => isQuorumSigner(signer);

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
    // The active key when useSigner selected it as only a quorum member: creating calls then act as its quorum.
    #quorumMemberLocator: SignerLocator | null = null;

    constructor(args: WalletContructorType<C>, apiClient: ApiClient) {
        const {
            chain,
            address,
            owner,
            options,
            alias,
            recovery,
            apiRecoveryServerSignerAddresses,
            apiDelegatedServerSignerAddresses,
            signers,
            signer,
            quorumMemberLocator,
        } = args;
        this.#apiClient = apiClient;
        this.chain = chain;
        this.address = address;
        this.owner = owner;
        this.#options = options;
        this.alias = alias;
        const recoverySigners = Array.isArray(recovery) ? recovery : [recovery];
        const apiRecoveryAddresses =
            apiRecoveryServerSignerAddresses ??
            recoverySigners
                .filter(
                    (s): s is RecoverySignerConfigForChain<C> & ApiSourcedServerSignerConfig =>
                        s.type === "server" && isApiSourcedServerSignerConfig(s)
                )
                .map((s) => s.address);
        this.#apiDelegatedServerSignerAddresses = apiDelegatedServerSignerAddresses ?? [];
        this.#initialSigners = signers ?? [];
        this.#quorumMemberLocator = quorumMemberLocator ?? null;
        this.#serverSignerResolver = new ServerSignerResolver({
            chain,
            projectId: this.#apiClient.projectId,
            environment: this.#apiClient.environment,
            apiRecoveryAddresses,
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
            recoverySigners,
            initialSigners: this.#initialSigners,
            signers: () => this.signers(),
            signer,
        });
        // Recovery server secrets only ever live inside the resolver: the public recovery getters expose
        // the address-only form regardless of whether the wallet was created or fetched.
        recoverySigners.forEach((recoverySigner, index) => {
            if (recoverySigner.type === "server" && !isApiSourcedServerSignerConfig(recoverySigner)) {
                this.#signerManager.stripSecretFromRecovery(
                    index,
                    this.#serverSignerResolver.resolveRecovery(recoverySigner as ServerSignerConfig)
                );
            }
        });
        this.#deviceRecovery = new DeviceRecoveryService({
            chain,
            walletAddress: this.address,
            options,
            signerManager: this.#signerManager,
            serverSignerResolver: this.#serverSignerResolver,
            signers: () => this.signers(),
            // Until device recovery supports recovery quorums, its signer changes ignore a selected member.
            addSigner: (deviceSigner) => this.#signerManager.withoutMemberSelection(() => this.addSigner(deviceSigner)),
            removeSigner: (signerLocator) =>
                this.#signerManager.withoutMemberSelection(() =>
                    this.removeSigner({ type: "device", locator: signerLocator } as SignerConfigForChain<C>)
                ),
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
                ? this.#signerManager.defaultRecovery
                : this.#initialSigners.length === 1
                  ? this.#initialSigners[0]
                  : null; // >1 signers → user must call useSigner()

        // A quorum signs through its members, so it is never the default signer.
        if (signerToAssemble == null || isQuorumSigner(signerToAssemble)) {
            return;
        }

        const signerDescriptor = getSignerDescriptor<C>(signerToAssemble.type);
        const signerDescriptorContext = this.#signerManager.descriptorContext();
        if (!signerDescriptor.canAutoAssemble(signerToAssemble, signerDescriptorContext)) {
            return;
        }

        const isAdminSigner = signerToAssemble === this.#signerManager.defaultRecovery;
        try {
            const internalConfig = signerDescriptor.buildInternalConfig(
                signerToAssemble as SignerConfigForChain<C>,
                signerDescriptorContext
            );
            this.#signerManager.setActiveSigner(await this.#signerManager.assemble(internalConfig, { isAdminSigner }));
        } catch (error) {
            walletsLogger.warn("wallet.initDefaultSigner.autoAssemblyFailed", {
                recoveryType: this.#signerManager.defaultRecovery?.type,
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

    protected static getRecoverySigners<C extends Chain>(wallet: Wallet<C>): Array<RecoverySignerConfigForChain<C>> {
        return wallet.recoveryMethods;
    }

    protected static getInitialSigners<C extends Chain>(wallet: Wallet<C>): SignerConfigForChain<C>[] {
        return wallet.#initialSigners;
    }

    protected static getQuorumMemberLocator<C extends Chain>(wallet: Wallet<C>): SignerLocator | null {
        return wallet.#quorumMemberLocator;
    }

    protected static getApiRecoveryServerSignerAddresses<C extends Chain>(wallet: Wallet<C>): string[] {
        return wallet.#serverSignerResolver.apiRecoveryAddresses;
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

    /** The `signer` field of a create call: the call's `signer` option, or else the active signer. */
    protected async resolveSignerParams(options?: { signer?: SignerOption }): Promise<{ signer: string }> {
        if (options?.signer != null) {
            return { signer: this.resolveSignerOption(options.signer) };
        }
        const activeLocator = this.#signerManager.require().locator();
        if (this.#quorumMemberLocator == null || !isSameSignerLocator(activeLocator, this.#quorumMemberLocator)) {
            return { signer: activeLocator };
        }
        return { signer: await this.#actingRoleLocator(activeLocator) };
    }

    // A member-only key acts as its quorum (EDD 007 §7 "Role"). Recovery methods and delegated quorums come from one
    // fresh read of the wallet's config, so no per-signer lookup can silently drop a quorum from the decision.
    async #actingRoleLocator(heldLocator: SignerLocator): Promise<string> {
        const walletResponse = await this.#apiClient.getWallet(this.walletLocator);
        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        // A response the role cannot be read from counts as a failed read: guessing could name the wrong role.
        if (!isSupportedSmartWallet(walletResponse) || walletResponse.config == null) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        const recoveryMethods = recoveryMethodsFromWalletConfig<C>(walletResponse.config);
        const configSigners = walletResponse.config.delegatedSigners ?? [];
        const role = resolveActingRole({
            scope: "transaction",
            heldLocator,
            recoveryLocators: recoveryMethods
                .filter((recovery) => !isQuorumSigner(recovery))
                .map((recovery) => this.#signerManager.recoveryLocator(recovery))
                .filter((locator) => locator != null),
            recoveryQuorums: recoveryMethods.filter(isQuorumSigner),
            delegatedQuorums: configSigners.filter(isQuorumSigner),
            isRegisteredSigner: configSigners.some((signer) => isSameSignerLocator(signer.locator, heldLocator)),
        });
        return role.kind === "none" ? heldLocator : role.locator;
    }

    /** The API locator of a call's `signer` option. */
    protected resolveSignerOption(signer: SignerOption): string {
        if (isSignerLocatorOption(signer)) {
            return signer;
        }
        return this.resolveServerSignerApiLocator(signer);
    }

    /**
     * Get the primary recovery signer config. Use {@link recoveryMethods} for the full list on wallets
     * created with several recovery signers.
     * @returns The recovery signer config
     * @experimental This API is experimental and may change in the future
     */
    public get recovery(): RecoverySignerConfigForChain<C> {
        return this.#signerManager.recovery;
    }

    /**
     * Get every recovery signer config of the wallet. Wallets on chains that support a single recovery
     * signer always return one entry.
     * @returns The recovery signer configs
     * @experimental This API is experimental and may change in the future
     */
    public get recoveryMethods(): Array<RecoverySignerConfigForChain<C>> {
        return this.#signerManager.recoverySigners;
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

        const sendParams = {
            recipient,
            amount,
            ...(await this.resolveSignerParams(options)),
            ...(options?.transactionType != null ? { transactionType: options.transactionType } : {}),
        };
        const transactionCreationResponse = await this.#apiClient.send(this.walletLocator, tokenLocator, sendParams);

        if ("message" in transactionCreationResponse) {
            walletsLogger.error("wallet.send.error", {
                error: transactionCreationResponse,
            });
            throwIfQuorumApiError(transactionCreationResponse);
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
     * Always uses a recovery method internally to approve the registration: the one selected via
     * {@link useRecoveryMethod}, else the active signer when it is one of the recovery methods, else the wallet's
     * single recovery method. Wallets with several recovery methods must select one first; an operational signer
     * cannot authorize this.
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

        return this.#signerManager.withApprover(this.#explicitApprover(options), async (approver) => {
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
                ...(approver != null && { approver }),
            });

            if ("error" in response) {
                walletsLogger.error("wallet.addSigner.error", {
                    error: response,
                });
                if (response.code === DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE) {
                    throw new DeviceSignerNotSupportedError(response.message);
                }
                throwIfQuorumApiError(response);
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
     * Always uses a recovery method internally to approve the removal, selected as in {@link addSigner}.
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

        return this.#signerManager.withApprover(this.#explicitApprover(options), async (approver) => {
            const response = await this.#apiClient.removeSigner(this.walletLocator, signerLocator, {
                chain: this.chainAdapter.addSignerChain(this.chain),
                ...(approver != null && { approver }),
            });

            if ("error" in response) {
                walletsLogger.error("wallet.removeSigner.error", {
                    error: response,
                });
                throwIfQuorumApiError(response);
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
     * Add a recovery method to the wallet. Supported on Solana and Stellar only.
     * Always uses one of the existing recovery methods to approve the change, selected as in {@link addSigner}.
     * @param recoveryMethod - The recovery method configuration object
     * @param options - The options for the operation
     * @param options.prepareOnly - If true, returns the transaction ID without auto-approving
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.addRecoveryMethod",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async addRecoveryMethod<T extends AddRecoveryMethodOptions | undefined = undefined>(
        recoveryMethod: RecoverySignerConfigFor<C> | ServerSignerConfig | ExternalWalletRegistrationConfig,
        options?: T
    ): Promise<AddRecoveryMethodReturnType> {
        this.assertRecoveryMethodManagementSupported();
        walletsLogger.info("wallet.addRecoveryMethod.start");

        const resolvedMethod =
            recoveryMethod.type === "server"
                ? (this.resolveServerSignerApiLocator(recoveryMethod) as `server:${string}`)
                : recoveryMethod;

        return this.#signerManager.withApprover(this.#explicitApprover(options), async (approver) => {
            const recoveryMethodInput =
                typeof resolvedMethod === "string"
                    ? resolvedMethod
                    : getSignerDescriptor<C>(resolvedMethod.type).addSignerPayload(
                          resolvedMethod as SignerConfigForChain<C>,
                          this.#signerManager.descriptorContext()
                      );

            const response = await this.#apiClient.registerRecoveryMethod(this.walletLocator, {
                recoveryMethods: recoveryMethodInput as RegisterRecoveryMethodParams["recoveryMethods"],
                approver: this.resolveRecoveryApprover(approver),
            });

            if ("error" in response) {
                walletsLogger.error("wallet.addRecoveryMethod.error", {
                    error: response,
                });
                throwIfQuorumApiError(response);
                throw new InvalidSignerError(`Failed to add recovery method: ${JSON.stringify(response.message)}`);
            }

            const transactionId = response.tx.id;
            if (options?.prepareOnly) {
                walletsLogger.info("wallet.addRecoveryMethod.prepared", { transactionId });
                return { transactionId, status: undefined };
            }

            await this.approveTransactionAndWait(transactionId);
            this.#signerManager.addRecoverySigner(
                typeof resolvedMethod === "string"
                    ? ({
                          type: "server",
                          address: resolvedMethod.slice("server:".length),
                      } as ApiSourcedServerSignerConfig)
                    : (resolvedMethod as RecoverySignerConfigForChain<C>)
            );
            walletsLogger.info("wallet.addRecoveryMethod.success", { transactionId });
            return { transactionId, status: "success" as const };
        });
    }

    /**
     * Remove a recovery method from the wallet. Supported on Solana and Stellar only.
     * Always uses one of the remaining recovery methods to approve the change, selected as in {@link addSigner}.
     * @param recoveryMethod - The recovery method to remove, provided as a signer config object
     * @param options - The options for the operation
     * @param options.prepareOnly - If true, returns the transaction ID without auto-approving
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.removeRecoveryMethod",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async removeRecoveryMethod<T extends RemoveRecoveryMethodOptions | undefined = undefined>(
        recoveryMethod: SignerConfigForChain<C> | ExternalWalletRegistrationConfig,
        options?: T
    ): Promise<RemoveRecoveryMethodReturnType> {
        this.assertRecoveryMethodManagementSupported();
        const recoveryMethodLocator = this.resolveSignerLocator(recoveryMethod);
        walletsLogger.info("wallet.removeRecoveryMethod.start", { recoveryMethodLocator });

        return this.#signerManager.withApprover(this.#explicitApprover(options), async (approver) => {
            const response = await this.#apiClient.removeRecoveryMethod(this.walletLocator, recoveryMethodLocator, {
                approver: this.resolveRecoveryApprover(approver),
            });

            if ("error" in response) {
                walletsLogger.error("wallet.removeRecoveryMethod.error", {
                    error: response,
                });
                throwIfQuorumApiError(response);
                throw new Error(`Failed to remove recovery method: ${JSON.stringify(response)}`);
            }

            const transactionId = response.id;
            if (options?.prepareOnly) {
                walletsLogger.info("wallet.removeRecoveryMethod.prepared", { transactionId });
                return { transactionId, status: undefined };
            }

            await this.approveTransactionAndWait(transactionId);
            this.#signerManager.removeRecoverySigner(recoveryMethodLocator);
            walletsLogger.info("wallet.removeRecoveryMethod.success", { transactionId });
            return { transactionId, status: "success" as const };
        });
    }

    // A signer change's explicit approver: the API locator of its `signer` option, or none. A server recovery method
    // passed by its secret is resolved as useRecoveryMethod resolves it, so it can sign.
    #explicitApprover(options: { signer?: SignerOption } | undefined): string | undefined {
        if (options?.signer == null) {
            return undefined;
        }
        if (!isSignerLocatorOption(options.signer)) {
            const index = this.matchRecoverySigner(options.signer as SignerConfigForChain<C>);
            if (index != null) {
                this.#adoptServerRecoverySecret(index, options.signer);
            }
        }
        return this.resolveSignerOption(options.signer);
    }

    // Keep a server recovery method's derivation in the resolver and drop the secret from the stored config.
    #adoptServerRecoverySecret(index: number, config: ServerSignerConfig): void {
        this.#signerManager.stripSecretFromRecovery(index, this.#serverSignerResolver.resolveRecovery(config));
    }

    // A server key's secret only lives in the resolver: keep its derivation there and its address in the config.
    #withoutServerSecret(config: SignerConfigForChain<C>): RecoverySignerConfigForChain<C> {
        if (config.type !== "server" || isApiSourcedServerSignerConfig(config)) {
            return config as RecoverySignerConfigForChain<C>;
        }
        return {
            type: "server",
            address: this.#serverSignerResolver.resolveRecovery(config),
        } as RecoverySignerConfigForChain<C>;
    }

    private assertRecoveryMethodManagementSupported(): void {
        if (this.chain !== "solana" && this.chain !== "stellar") {
            throw new RecoveryNotSupportedOnChainError(
                `Adding and removing recovery methods is not supported on ${this.chain} yet. It is available on Solana and Stellar.`
            );
        }
    }

    /**
     * The recovery-methods API always needs the approving recovery method, while `withRecoverySigner` only
     * names it when the wallet has several. On single-recovery wallets the assembled recovery method is the
     * active signer for the duration of the operation, so its locator is used.
     */
    private resolveRecoveryApprover(approver: string | undefined): string {
        return approver ?? this.#signerManager.require().locator();
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
        throwIfQuorumSigner(signer);
        // Reset the delegated signer cache when processing a fresh server signer.
        // The recovery resolution is intentionally preserved — it's set once during
        // recovery resolution and must survive across useSigner calls.
        if (signer.type === "server") {
            this.#serverSignerResolver.resetDelegatedCache();
        }
        getSignerDescriptor<C>(signer.type).validateConfig(signer);

        let role: HeldKeyRole = REGISTERED;
        if (signer.type === "device") {
            await this.#deviceRecovery.resolveAvailability(signer);
        } else {
            role = await this.resolveNonDeviceSigner(signer);
        }

        const internalConfig = getSignerDescriptor<C>(signer.type).buildInternalConfig(
            signer,
            this.#signerManager.descriptorContext()
        );
        const signerLocator = getSignerLocator(signer);
        const activeSigner =
            role.kind === "member"
                ? this.#signerManager.assembleMember(internalConfig, role.status)
                : await this.#signerManager.assemble(internalConfig, { isAdminSigner: role.kind === "recovery" });
        this.#signerManager.setActiveSigner(activeSigner);
        this.#quorumMemberLocator = null;
        if (role.kind === "member") {
            this.#quorumMemberLocator = activeSigner.locator();
        }
        walletsLogger.info("wallet.useSigner.success", { signerLocator });
    }

    /**
     * Select which of the wallet's recovery methods authorizes admin operations ({@link addSigner},
     * {@link removeSigner}, {@link addRecoveryMethod}, {@link removeRecoveryMethod}). Unlike {@link useSigner},
     * this does not change the active signer used for transactions and signatures.
     *
     * The config must refer to one of {@link recoveryMethods}; pass the fuller form when the method needs it to
     * operate (an `onSign` callback for external wallets, the `secret` for server signers).
     *
     * @param recoveryMethod - The recovery method config object to authorize with
     * @experimental This API is experimental and may change in the future
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.useRecoveryMethod",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async useRecoveryMethod(recoveryMethod: SignerConfigForChain<C>): Promise<void> {
        walletsLogger.info("wallet.useRecoveryMethod.start");
        throwIfQuorumSigner(recoveryMethod);
        getSignerDescriptor<C>(recoveryMethod.type).validateConfig(recoveryMethod);

        const index = this.matchRecoverySigner(recoveryMethod);
        if (index == null) {
            // A key that is only a member of a recovery quorum selects that quorum as the approver (EDD 007 §7 "Role").
            const memberLocator = this.resolveSignerLocator(recoveryMethod);
            if (quorumsWithMember(this.recoveryMethods.filter(isQuorumSigner), memberLocator).length > 0) {
                this.#signerManager.selectRecoveryMember(this.#withoutServerSecret(recoveryMethod), memberLocator);
                walletsLogger.info("wallet.useRecoveryMethod.success", { recoveryMemberLocator: memberLocator });
                return;
            }
            const known = this.recoveryMethods
                .map((recovery) => this.#signerManager.recoveryLocator(recovery))
                .filter((locator) => locator != null)
                .join(", ");
            throw new InvalidRecoveryConfigError(
                `Signer "${this.resolveSignerLocator(recoveryMethod)}" is not one of this wallet's recovery methods (${known}).`
            );
        }
        if (recoveryMethod.type === "server") {
            this.#adoptServerRecoverySecret(index, recoveryMethod);
        }
        const selected = getSignerDescriptor<C>(recoveryMethod.type).adoptsRecoveryConfigOnMatch
            ? this.recoveryMethods[index]
            : recoveryMethod.type === "passkey"
              ? (this.withPasskeyRecoveryCredentialId(recoveryMethod, index) as RecoverySignerConfigForChain<C>)
              : (recoveryMethod as RecoverySignerConfigForChain<C>);
        this.#signerManager.selectRecovery(index, selected);
        walletsLogger.info("wallet.useRecoveryMethod.success", {
            recoveryMethodLocator: this.#signerManager.recoveryLocator(selected),
        });
    }

    /**
     * Resolve a non-device signer: check registration first, then fall back to recovery.
     * For passkeys without an explicit credential id, auto-selects from registered signers.
     * Returns true if the signer is an admin (recovery) signer.
     */
    private async resolveNonDeviceSigner(signer: SignerConfigForChain<C>): Promise<HeldKeyRole> {
        // For non-passkey, non-server signers, check if this is the recovery (admin) signer first.
        // Admin signers are always approved — skip the registration check and getSigner API call
        // which only works for delegated signers (returns 404/400 for admin signers).
        // Passkeys are excluded because isRecoverySigner matches by type only, which could
        // incorrectly match a delegated passkey.
        // Server signers are excluded so they always flow through the server signer block below,
        // which resolves the correct (primary or legacy) derivation.
        if (signer.type !== "passkey" && signer.type !== "server" && this.isRecoverySigner(signer)) {
            this.#deviceRecovery.onSignerSelected();
            return RECOVERY;
        }

        // Passkey without id: try to auto-select from registered signers
        if (signer.type === "passkey" && this.isPasskeyMissingId(signer)) {
            const selected = await this.tryAutoSelectPasskey(signer);
            if (!selected) {
                // No registered passkeys — use recovery if this is the recovery signer
                if (this.isRecoverySigner(signer)) {
                    this.#deviceRecovery.onSignerSelected();
                    return RECOVERY;
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
            return REGISTERED;
        }

        // Not a registered signer — fall back to recovery
        if (this.isRecoverySigner(signer)) {
            this.#deviceRecovery.onSignerSelected();
            return RECOVERY;
        }

        const member = await this.#memberRole(locator);
        if (member != null) {
            this.#deviceRecovery.onSignerSelected();
            return member;
        }

        throw new Error(`Signer "${locator}" is not registered in this wallet.`);
    }

    /**
     * Resolve a server signer: prefer a derivation already registered on-chain, else fall back
     * to the recovery (admin) signer. Returns true if the signer is the admin (recovery) signer.
     */
    private async resolveServerSigner(signer: ServerSignerConfig): Promise<HeldKeyRole> {
        const existingSigners = await this.signers();
        const registeredLocators = existingSigners.map((s) => s.locator);
        const memberLocators = this.#quorums(existingSigners).flatMap((quorum) =>
            quorum.members.map((member) => member.locator)
        );
        const match: { recoveryIndex: number | null } = { recoveryIndex: null };
        const resolution = this.#serverSignerResolver.resolveForUseSigner(
            signer,
            registeredLocators,
            () => {
                match.recoveryIndex = this.matchRecoverySigner(signer as SignerConfigForChain<C>);
                return match.recoveryIndex != null;
            },
            memberLocators
        );
        switch (resolution.kind) {
            case "delegated":
                this.#deviceRecovery.onSignerSelected();
                return REGISTERED;
            case "member":
                this.#deviceRecovery.onSignerSelected();
                return (await this.#memberRole(resolution.locator, existingSigners)) ?? REGISTERED;
            case "recovery":
                if (match.recoveryIndex != null) {
                    this.#signerManager.stripSecretFromRecovery(match.recoveryIndex, resolution.address);
                }
                this.#deviceRecovery.onSignerSelected();
                return RECOVERY;
            case "unregistered":
                throw new Error(resolution.message);
        }
    }

    // The wallet's recovery quorums (from its config), then its delegated quorums (from `signers`).
    #quorums(signers: WalletSigner[]): QuorumSigner[] {
        return [...this.recoveryMethods.filter(isQuorumSigner), ...signers.filter(isWalletQuorum)];
    }

    // A key that is only a quorum member acts as its quorum (EDD 007 §7 "Role"); a recovery quorum is always active.
    async #memberRole(locator: string, signers?: WalletSigner[]): Promise<HeldKeyRole | null> {
        if (quorumsWithMember(this.recoveryMethods.filter(isQuorumSigner), locator).length > 0) {
            return { kind: "member", status: "active" };
        }
        const [delegated] = quorumsWithMember((signers ?? (await this.signers())).filter(isWalletQuorum), locator);
        if (delegated == null) {
            return null;
        }
        return { kind: "member", status: delegated.status };
    }

    /**
     * The passkey recovery method to sign with, keeping the caller's config (its callbacks) and filling in the
     * credential id from the matched recovery method when the caller did not pass one. Signing needs the id: WebAuthn
     * would otherwise be asked for an empty credential.
     */
    private withPasskeyRecoveryCredentialId(recoveryMethod: PasskeySignerConfig, index: number): PasskeySignerConfig {
        const callerId = passkeyCredentialId(recoveryMethod);
        if (callerId != null) {
            return recoveryMethod;
        }
        if (this.recoveryMethods.filter((recovery) => recovery.type === "passkey").length > 1) {
            throw new InvalidRecoveryConfigError(
                'Multiple passkey recovery methods are registered on this wallet. Please specify the credential id: wallet.useRecoveryMethod({ type: "passkey", id: "<credential-id>" })'
            );
        }
        const storedId = passkeyCredentialId(this.recoveryMethods[index] as PasskeySignerConfig);
        if (storedId == null) {
            throw new InvalidRecoveryConfigError(
                'The passkey recovery method has no credential id. Please specify it: wallet.useRecoveryMethod({ type: "passkey", id: "<credential-id>" })'
            );
        }
        return { ...recoveryMethod, id: storedId };
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
        return passkeyCredentialId(signer) == null;
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
     * @returns true if the signer is approved for this chain, false if it is not approved or not registered
     * @throws if the approval state could not be fetched
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
     * Check if a signer config matches any of the wallet's recovery signers.
     */
    private isRecoverySigner(signerConfig: SignerConfigForChain<C>): boolean {
        return this.matchRecoverySigner(signerConfig) != null;
    }

    /**
     * Find the recovery signer that `signerConfig` refers to and, for signer types that need the
     * caller's fuller config to operate (e.g. an onSign callback or a server secret), adopt it in
     * place of the stored one. Returns the index of the matched recovery signer, or null.
     */
    private matchRecoverySigner(signerConfig: SignerConfigForChain<C>): number | null {
        const signerDescriptor = getSignerDescriptor<C>(signerConfig.type);
        const descriptorContext = this.#signerManager.descriptorContext();
        const index = this.recoveryMethods.findIndex(
            (recovery) =>
                recovery.type === signerConfig.type &&
                signerDescriptor.matchesRecovery(signerConfig, recovery, descriptorContext)
        );
        if (index === -1) {
            return null;
        }
        if (signerDescriptor.adoptsRecoveryConfigOnMatch) {
            this.#signerManager.adoptRecoveryConfig(index, signerConfig);
        }
        return index;
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

    // A quorum member may be any key this client holds, the useRecoveryMethod key included (EDD 007 §7 "Approval").
    // Flat-only approvals keep their keys, so wallets without quorums sign as before.
    #approvalSigning(
        walletSigner: SignerAdapter,
        options: ApproveOptions | undefined,
        pending: PendingApproval[],
        sign: ApprovalSigning["sign"]
    ) {
        const additional = options?.additionalSigners ?? [];
        return {
            held: pending.some(isQuorumPendingApproval)
                ? this.#signerManager.heldSigners(additional)
                : [...additional, walletSigner],
            limit: "all",
            sign,
            resolveMissing: (locator) => this.#resolveMissingDeviceSigner(locator),
        } satisfies ApprovalSigning;
    }

    protected async approveSignatureInternal(signatureId: string, options?: ApproveOptions) {
        if (!this.chainAdapter.supportsSignatures) {
            throw new Error("Approving signatures is only supported for EVM smart wallets");
        }

        const walletSigner = this.#signerManager.require();

        const signature = await this.#apiClient.getSignature(this.walletLocator, signatureId);

        if ("error" in signature) {
            throwIfCrossmintApiAuthError(signature);
            throwIfRequestExpired(signature, { signatureId });
            throw new SignatureNotAvailableError(JSON.stringify(signature));
        }

        const pendingApprovals = signature.approvals?.pending ?? [];

        // API key signers' flat entries are approved by the API; quorum members still sign with the held keys
        const signable =
            walletSigner.type === "api-key" ? pendingApprovals.filter(isQuorumPendingApproval) : pendingApprovals;
        if (walletSigner.type === "api-key" && signable.length === 0) {
            return signature;
        }

        // If an external signature is provided, use it to approve the transaction
        if (options?.approval != null) {
            const approvals = [options.approval];

            return await this.executeApproveSignatureWithErrorHandling(signatureId, approvals);
        }

        const approvals = await collectApprovals(
            signable,
            this.#approvalSigning(walletSigner, options, signable, (signer, message) => signer.signMessage(message))
        );

        // Nothing this client holds is pending: the request waits for other members.
        if (approvals.length === 0) {
            return signature;
        }

        return await this.executeApproveSignatureWithErrorHandling(signatureId, approvals);
    }

    protected async approveTransactionInternal(transactionId: string, options?: ApproveOptions) {
        const transaction = await this.#apiClient.getTransaction(this.walletLocator, transactionId);

        if ("error" in transaction) {
            throwIfCrossmintApiAuthError(transaction);
            throwIfRequestExpired(transaction, { transactionId });
            throw new TransactionNotAvailableError(JSON.stringify(transaction));
        }

        await this.#options?.callbacks?.onTransactionStart?.();

        const walletSigner = this.#signerManager.require();
        const pendingApprovals = transaction.approvals?.pending ?? [];

        // API key signers' flat entries are approved by the API; quorum members still sign with the held keys
        const signable =
            walletSigner.type === "api-key" ? pendingApprovals.filter(isQuorumPendingApproval) : pendingApprovals;
        if (walletSigner.type === "api-key" && signable.length === 0) {
            return transaction;
        }

        // If an external signature is provided, use it to approve the transaction
        if (options?.approval != null) {
            const approvals = [options.approval];

            return await this.executeApproveTransactionWithErrorHandling(transactionId, approvals);
        }

        const approvalAdapter = getApprovalAdapter(transaction.chainType, this.chainAdapter);
        const approvals = await collectApprovals(
            signable,
            this.#approvalSigning(walletSigner, options, signable, (signer, message) =>
                approvalAdapter.signApproval(signer, transaction, message)
            )
        );

        // Nothing this client holds is pending: the transaction waits for other members.
        if (approvals.length === 0) {
            return transaction;
        }

        return await this.executeApproveTransactionWithErrorHandling(transactionId, approvals);
    }

    private async executeApproveTransactionWithErrorHandling(transactionId: string, approvals: Approval[]) {
        walletsLogger.info("wallet.approve: submitting approval to API", { transactionId });
        const approvedTransaction = await this.#apiClient.approveTransaction(this.walletLocator, transactionId, {
            approvals,
        });

        if (approvedTransaction.error) {
            throwIfCrossmintApiAuthError(approvedTransaction);
            throwIfQuorumApiError(approvedTransaction, { transactionId });
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
            throwIfQuorumApiError(approvedSignature, { signatureId });
            // The client answers the API's 422 expiry with the stored request, which has no code.
            throwIfRequestExpired(approvedSignature, { signatureId });
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
