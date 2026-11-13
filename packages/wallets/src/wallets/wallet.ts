import { WithLoggerContext } from "@crossmint/common-sdk-base";
import type {
    Transfers,
    ApiClient,
    WalletLocator,
    QuorumSignerInput,
    RegisterSignerParams,
    RegisterRecoveryMethodParams,
    RegisterRecoveryMethodResponse,
    GetTransactionSuccessResponse,
    GetTransactionsResponse,
    GetWalletSuccessResponse,
    FundWalletResponse,
    Signer as APISigner,
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
    PendingSignerOperation,
    SignerStatus,
    Signature,
    ApproveResult,
    PrepareOnly,
    RecoverResult,
    RecoverySignerConfigFor,
    SendTokenTransactionOptions,
    SignerOption,
} from "./types";
import { isSignerLocatorOption } from "./types";
import { isSignerOnChain, mapApiSignerToSigner, pendingOperationId, toQuorumSigner } from "../utils/signer-mapping";
import {
    DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE,
    DeviceSignerAwaitingApprovalError,
    DeviceSignerNotSupportedError,
    InvalidRecoveryConfigError,
    InvalidSignerError,
    InvalidTransferAmountError,
    SIGNER_LIMIT_EXCEEDED_ERROR_CODE,
    SignatureFailedError,
    SignerLimitExceededError,
    SignatureNotAvailableError,
    TransactionFailedError,
    TransactionNotAvailableError,
    TransactionNotCreatedError,
    WalletNotAvailableError,
    WalletTypeNotSupportedError,
    quorumSignerNotSupported,
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
    QuorumLocator,
    QuorumRef,
    QuorumSigner,
    QuorumSignerConfig,
    RecoverySignerConfigForChain,
    ServerSignerConfig,
    SignerAdapter,
    SignerConfigForChain,
    SignerLocator,
} from "../signers/types";
import {
    type ApiSourcedServerSignerConfig,
    isApiSourcedServerSignerConfig,
    isQuorumLocator,
    isQuorumRef,
    isQuorumSigner,
    throwIfQuorumSigner,
} from "../signers/types";
import { NonCustodialSigner } from "../signers/non-custodial";
import { ServerSignerResolver } from "../signers/server/resolver";
import { getSignerDescriptor } from "../signers/descriptors";
import { walletsLogger } from "../logger";

import { recoveryMethodsFromWalletConfig } from "../utils/recovery";
import {
    getSignerLocator,
    hasQuorumLocatorPrefix,
    isSameSignerLocator,
    parseSignerLocator,
    passkeyCredentialId,
} from "../utils/signer-locator";
import { toRecipientLocator, toTokenLocator } from "../utils/locators";
import { formatBalanceResponse } from "./services/balance-formatter";
import { type RecoveryMember, SignerManager } from "./services/signer-manager";
import { DeviceRecoveryService } from "./services/device-recovery-service";
import { isQuorumPendingApproval, quorumsAwaitOnlyOthers, splitPendingApprovals } from "../quorum/approvals";
import { quorumsWithMember } from "../quorum/members";
import { resolveTransactionRole } from "../quorum/roles";
import { quorumsMatchingInput, toQuorumSignerInput } from "../quorum/config";
import { type ApprovalSigning, collectApprovals } from "./services/approval-collector";
import { fetchDeviceSignerActivity } from "./services/device-signer-activity";
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
    /** The wallet's recovery signer(s). */
    recovery: RecoverySignerConfigForChain<C> | Array<RecoverySignerConfigForChain<C>>;
    /** Addresses of the API-sourced server recovery signers, so legacy derivations can be recognised. */
    apiRecoveryServerSignerAddresses?: string[];
    apiDelegatedServerSignerAddresses?: string[];
    signers?: SignerConfigForChain<C>[];
    signer?: SignerAdapter;
    /** The active `signer`'s locator when it was selected as only a quorum member. */
    quorumMemberLocator?: SignerLocator | null;
    /** The key selected with `useRecoveryMethod()` as only a member of a recovery quorum. */
    recoveryMember?: RecoveryMember<C> | null;
};

// How `useSigner` holds a key: as a recovery method, a registered signer, or a member of one of the wallet's quorums.
type HeldKeyRole = { kind: "recovery" } | { kind: "registered" } | { kind: "member"; status: SignerStatus | undefined };
const RECOVERY: HeldKeyRole = { kind: "recovery" };
const REGISTERED: HeldKeyRole = { kind: "registered" };

// A delegated quorum as `signers()` lists it, with its install status.
type WalletQuorum = Extract<WalletSigner, { type: "quorum" }>;
const isWalletQuorum = (signer: WalletSigner): signer is WalletQuorum => isQuorumSigner(signer);

export type WalletFactoryConstructorArgs<C extends Chain> = WalletContructorType<C> & { apiSigners?: APISigner[] };

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
    #recovering: Promise<RecoverResult> | null = null;
    // The active key when useSigner selected it as only a quorum member: creating calls then act as its quorum.
    #quorumMemberLocator: SignerLocator | null = null;
    // approve() calls in flight, by request id: a second call for the same request joins the first (one signing pass).
    #approving = new Map<string, Promise<unknown>>();

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
            recoveryMember,
            apiSigners,
        } = args as WalletFactoryConstructorArgs<C>;
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
        if (recoveryMember != null) {
            this.#signerManager.selectRecoveryMember(recoveryMember.config, recoveryMember.locator);
        }
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
            addSigner: (deviceSigner) => this.#addSigner(deviceSigner, undefined, { stopIfUnreadable: true }),
            removeSigner: (signerLocator, approver) =>
                this.#removeSigner(
                    { type: "device", locator: signerLocator } as SignerConfigForChain<C>,
                    approver == null ? undefined : { prepareOnly: true, signer: approver }
                ),
            approveSignature: (signatureId) => this.approveSignatureAndWait(signatureId),
            approveTransaction: (transactionId) => this.approveTransactionAndWait(transactionId),
            deviceSignerActivity: () =>
                fetchDeviceSignerActivity(this.#apiClient, this.walletLocator, {
                    includeSignatures: this.chainAdapter.supportsSignatures,
                }),
        });
        this.#signerInitialization = this.initDefaultSigner(apiSigners);
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
    private async initDefaultSigner(apiSigners?: APISigner[]): Promise<void> {
        // If useSigner has been called, don't try to auto-assemble a signer
        if (this.#signerManager.activeSigner != null) {
            return;
        }
        // Step 1: Try device signer (existing behavior)
        await this.#deviceRecovery.initDeviceSigner(apiSigners);

        // If device signer was found or recovery is pending, we're done
        if (this.#signerManager.activeSigner != null || this.#deviceRecovery.needsRecovery) {
            return;
        }

        // A quorum signs through its members, so it is never the default signer and does not count as one.
        const singleSigners = this.#signerManager.singleInitialSigners;
        const signerToAssemble =
            singleSigners.length === 0
                ? this.#signerManager.defaultRecovery
                : singleSigners.length === 1
                  ? singleSigners[0]
                  : null; // >1 signers → user must call useSigner()

        if (signerToAssemble == null) {
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
            this.#signerManager.setActiveSigner(
                await this.#signerManager.assemble(internalConfig, { isAdminSigner, apiSigners })
            );
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

    protected static getRecoveryMember<C extends Chain>(wallet: Wallet<C>): RecoveryMember<C> | null {
        return wallet.#signerManager.selectedMember;
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
    protected async resolveSignerParams(
        options?: { signer?: SignerOption },
        requestChain: Chain = this.chain
    ): Promise<{ signer: string }> {
        if (options?.signer != null) {
            return { signer: this.resolveSignerOption(options.signer) };
        }
        const activeLocator = this.#signerManager.require().locator();
        if (this.#quorumMemberLocator == null || !isSameSignerLocator(activeLocator, this.#quorumMemberLocator)) {
            return { signer: activeLocator };
        }
        return { signer: await this.#actingRoleLocator(activeLocator, requestChain) };
    }

    // One fresh read of the wallet's config. A failed read, or one without a config, throws: guessing from it could
    // name the wrong role or the wrong quorum.
    async #readWalletConfig() {
        const walletResponse = await this.#apiClient.getWallet(this.walletLocator);
        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        if (!isSupportedSmartWallet(walletResponse) || walletResponse.config == null) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }
        return walletResponse.config;
    }

    // A member-only key acts as its quorum (EDD 007 §7 "Role"). Recovery methods and delegated quorums come from one
    // fresh read of the wallet's config, so no per-signer lookup can silently drop a quorum from the decision.
    async #actingRoleLocator(heldLocator: SignerLocator, requestChain: Chain): Promise<string> {
        const walletConfig = await this.#readWalletConfig();
        // A signer acts only once its add landed on the request's chain (EDD 008 I10): a recovery method or quorum
        // still awaiting approval, or installed on another chain only, is neither a candidate nor a reason for the
        // ambiguous error. The API lists such entries with their status; the curated spec omits those fields.
        const installedOnChain = (entry: object) => {
            const onChain = mapApiSignerToSigner(entry as APISigner, requestChain);
            return onChain != null && this.#signerManager.isApprovedSignerStatus(onChain.status);
        };
        const recoveryMethods = recoveryMethodsFromWalletConfig<C>(walletConfig).filter(installedOnChain);
        const configSigners = walletConfig.delegatedSigners ?? [];
        const role = resolveTransactionRole({
            held: heldLocator,
            recoveryMethodLocators: recoveryMethods
                .filter((recovery) => !isQuorumSigner(recovery))
                .map((recovery) => this.#signerManager.recoveryLocator(recovery))
                .filter((locator) => locator != null),
            recoveryQuorums: recoveryMethods.filter(isQuorumSigner),
            delegatedQuorums: configSigners.filter(isQuorumSigner).filter(installedOnChain),
            // Registered on the request's chain: an EVM signer registered on other chains only is just a member there.
            registeredOnChain: configSigners.some(
                (signer) => isSameSignerLocator(signer.locator, heldLocator) && isSignerOnChain(signer, requestChain)
            ),
        });
        return role.kind === "none" ? heldLocator : role.locator;
    }

    /** A quorum acting signer creates the request unsigned and returns it, as `prepareOnly: true` does (EDD 007 §7). */
    protected isPrepareOnly(options: Partial<PrepareOnly> | undefined, signerLocator: string | undefined): boolean {
        return Boolean(options?.prepareOnly) || (signerLocator != null && hasQuorumLocatorPrefix(signerLocator));
    }

    /** The API locator of a call's `signer` option. */
    protected resolveSignerOption(signer: SignerOption): string {
        if (isSignerLocatorOption(signer)) {
            return signer;
        }
        return this.resolveServerSignerApiLocator(signer);
    }

    /**
     * Get the primary recovery signer config: the first recovery method that signs on its own. Use
     * {@link recoveryMethods} for the full list, quorums included.
     * @returns The recovery signer config
     * @throws {RecoveryMethodRequiredError} If every recovery method is a quorum
     * @experimental This API is experimental and may change in the future
     */
    public get recovery(): SignerConfigForChain<C> {
        return this.#signerManager.requireDefaultRecovery() as SignerConfigForChain<C>;
    }

    /**
     * Get every recovery signer config of the wallet.
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
     * When the signer is a quorum, named (`quorum:…`) or inferred from a key that is only a member, the call returns
     * the transaction unsigned and without a hash, as with `prepareOnly: true`; pass `prepareOnly: true` for that type.
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

        const signerParams = await this.resolveSignerParams(options);
        const sendParams = {
            recipient,
            amount,
            ...signerParams,
            ...(options?.transactionType != null ? { transactionType: options.transactionType } : {}),
        };
        const transactionCreationResponse = await this.#apiClient.send(this.walletLocator, tokenLocator, sendParams);

        if ("error" in transactionCreationResponse) {
            walletsLogger.error("wallet.send.error", {
                error: transactionCreationResponse,
            });
            throwIfQuorumApiError(transactionCreationResponse);
            throw new TransactionNotCreatedError(
                `Failed to send token: ${JSON.stringify(transactionCreationResponse)}`
            );
        }

        if (this.isPrepareOnly(options, signerParams.signer)) {
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
     * @returns The transaction or signature. While other quorum members must still sign, the transaction comes back
     * without `hash` and `explorerLink`, and the signature without `signature`.
     * A second call for a request that is still being approved runs after it, with its own keys and options.
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.approve",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async approve<T extends ApproveParams>(params: T): Promise<ApproveResult<T>> {
        const requestId = params.transactionId ?? params.signatureId;
        // One signing pass at a time per request: a later call waits for the running one, then signs with its own keys.
        const previous = requestId == null ? undefined : this.#approving.get(requestId);
        const run = (previous == null ? Promise.resolve() : previous.catch(() => undefined)).then(() =>
            this.#approveOnce(params)
        );
        if (requestId != null) {
            this.#approving.set(requestId, run);
            run.finally(() => {
                if (this.#approving.get(requestId) === run) {
                    this.#approving.delete(requestId);
                }
            }).catch(() => undefined);
        }
        return await run;
    }

    async #approveOnce<T extends ApproveParams>(params: T): Promise<ApproveResult<T>> {
        walletsLogger.info("wallet.approve.start", {
            transactionId: params.transactionId,
            signatureId: params.signatureId,
        });

        await this.#signerInitialization;
        // A member that stands in signs with its own key, so approving needs no device signer.
        if (!this.#signerManager.memberStandsIn) {
            await this.#recoverIfNeeded();
        }
        // With no active key, the key selected with useRecoveryMethod() approves (EDD 007 §7 use case 6).
        return this.#signerManager.withStandInSigner(async () => {
            await this.#authenticateActiveSigner();
            return this.#approveRequest(params);
        });
    }

    async #approveRequest<T extends ApproveParams>(params: T): Promise<ApproveResult<T>> {
        if (params.transactionId != null) {
            const result = (await this.approveTransactionAndWait(params.transactionId, params.options, {
                requireHeldMember: true,
            })) as ApproveResult<T>;
            walletsLogger.info("wallet.approve.success", {
                transactionId: params.transactionId,
            });
            return result;
        }
        if (params.signatureId != null) {
            const result = (await this.approveSignatureAndWait(params.signatureId, params.options, {
                requireHeldMember: true,
            })) as ApproveResult<T>;
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
     * The registration is approved by `options.signer` when given: one of the recovery methods, or a recovery quorum
     * (`quorum:<id>`). Otherwise by the recovery quorum of a
     * member selected with {@link useRecoveryMethod}, else by a recovery method: the one selected via
     * {@link useRecoveryMethod}, else the active signer when it is one of the recovery methods, else the wallet's
     * single recovery method. Wallets with several recovery methods must select one first; an operational signer
     * cannot authorize this.
     * If the signer being added is the current operational signer, it will be reassembled with the new locator.
     * Otherwise, the original signer is restored after the operation.
     * When a quorum approves, the registration is created unsigned and the signer is returned with its `transactionId`
     * or `signatureId`, as with `prepareOnly: true`; members sign it with {@link approve}. Pass `prepareOnly: true` for
     * that type. A resumed registration that quorum members must still approve is returned the same way.
     * @param signer - The signer configuration object, or a quorum `{ type: "quorum", threshold, members }`. Members are
     * sent by their identity fields only; the result carries the locator the API gives the quorum.
     * @param options - The options for the operation
     * @param options.prepareOnly - If true, returns the signer with approval ID without auto-approving
     * @param options.signer - The approver: a recovery method or a recovery quorum
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.addSigner",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async addSigner<T extends AddSignerOptions | undefined = undefined>(
        signer: SignerConfigForChain<C> | ServerSignerConfig | ExternalWalletRegistrationConfig | QuorumSignerConfig<C>,
        options?: T
    ): Promise<T extends PrepareOnly<true> ? AddSignerReturnType<C> : WalletSigner> {
        return this.#addSigner(signer, options) as Promise<
            T extends PrepareOnly<true> ? AddSignerReturnType<C> : WalletSigner
        >;
    }

    // addSigner's body; device recovery passes `stopIfUnreadable`, so through a quorum an unreadable earlier
    // registration stops it instead of starting a second request for the members.
    async #addSigner(
        signer: SignerConfigForChain<C> | ServerSignerConfig | ExternalWalletRegistrationConfig | QuorumSignerConfig<C>,
        options?: AddSignerOptions,
        { stopIfUnreadable = false }: { stopIfUnreadable?: boolean } = {}
    ): Promise<AddSignerReturnType<C> | WalletSigner> {
        walletsLogger.info("wallet.addSigner.start");

        // Resolve server signer config to locator string
        const resolvedSigner =
            typeof signer === "object" && "type" in signer && signer.type === "server"
                ? (this.resolveServerSignerApiLocator(signer) as `server:${string}`)
                : signer;

        const explicit = this.#explicitApprover(options);
        return this.#signerManager.withApprover({ explicit }, async (approver) => {
            const prepareOnly = this.isPrepareOnly(options, approver);
            // A passkey without a credential id is created here, after the approver is resolved
            const preparedSigner = await this.prepareRegistration(resolvedSigner);
            const createdNow = preparedSigner !== resolvedSigner;

            // An earlier registration (e.g. an interrupted attempt) exists only for a signer with a locator, and
            // never for a passkey that was only just created.
            const signerLocator = this.#registrationLocator(preparedSigner);
            if (signerLocator != null && !createdNow) {
                const stop = stopIfUnreadable && approver != null && hasQuorumLocatorPrefix(approver);
                const resumed = await this.#resumeRegistration(signerLocator, options, prepareOnly, stop);
                if (resumed != null) {
                    return resumed;
                }
            }

            const signerInput = this.#addSignerInput(preparedSigner);

            const isEvm = this.chain !== "solana" && this.chain !== "stellar";
            const deployImmediately = isEvm ? options?.deployImmediately ?? true : undefined;

            const response = await this.#apiClient.registerSigner(this.walletLocator, {
                signer: signerInput,
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
                if (response.code === SIGNER_LIMIT_EXCEEDED_ERROR_CODE) {
                    throw new SignerLimitExceededError(response.message, JSON.stringify(response));
                }
                throwIfQuorumApiError(response);
                throw new InvalidSignerError(`Failed to register signer: ${JSON.stringify(response.message)}`);
            }

            const registeredSigner = mapApiSignerToSigner(response, this.chain);

            if (registeredSigner == null) {
                throw new Error(`No approval found for chain ${this.chain} in register signer response`);
            }

            const pendingOperation = this.chainAdapter.extractAddSignerOperation(response, this.chain, {
                locator: registeredSigner.locator,
                type: signer.type,
            });

            return this.completeSignerRegistration(registeredSigner, pendingOperation, prepareOnly);
        });
    }

    // An earlier registration of the signer (e.g. an interrupted attempt): returned when already approved, resumed
    // when pending, or null when there is none.
    async #resumeRegistration(
        signerLocator: SignerLocator,
        options: AddSignerOptions | undefined,
        prepareOnly: boolean,
        stopIfUnreadable: boolean
    ): Promise<AddSignerReturnType<C> | WalletSigner | null> {
        const existingState = await this.#signerManager.getSignerState(signerLocator);
        if (stopIfUnreadable && existingState.lookupFailed) {
            throw new WalletNotAvailableError(`Could not read signer ${signerLocator}; try again`);
        }
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
                return this.completeSignerRegistration(existingState.signer, null, prepareOnly);
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
                    prepareOnly
                );
            }
        }

        return null;
    }

    // The register-signer input: a locator as is, a quorum's identity fields, or the signer type's payload.
    #addSignerInput(
        signer: SignerLocator | SignerConfigForChain<C> | ExternalWalletRegistrationConfig | QuorumSignerConfig<C>
    ): RegisterSignerParams["signer"] {
        if (typeof signer === "string") {
            return signer;
        }
        if (signer.type === "quorum") {
            return this.#quorumInput(signer);
        }
        return getSignerDescriptor<C>(signer.type).addSignerPayload(
            signer as SignerConfigForChain<C>,
            this.#signerManager.descriptorContext()
        );
    }

    #quorumInput(config: QuorumSignerConfig<C>): QuorumSignerInput {
        return toQuorumSignerInput(config as QuorumSignerConfig<Chain>, {
            chain: this.chain,
            projectId: this.#apiClient.projectId,
            environment: this.#apiClient.environment,
        });
    }

    // The locator a signer is registered under, or null for a quorum, which has none until the API names it.
    #registrationLocator(
        signer: SignerLocator | SignerConfigForChain<C> | ExternalWalletRegistrationConfig | QuorumSignerConfig<C>
    ): SignerLocator | null {
        if (typeof signer === "string") {
            return signer;
        }
        if (signer.type === "quorum") {
            return null;
        }
        return getSignerLocator(signer);
    }

    /** Lets the signer's descriptor complete the config before it is registered (creates a new passkey). */
    private async prepareRegistration<
        S extends SignerLocator | SignerConfigForChain<C> | ExternalWalletRegistrationConfig | QuorumSignerConfig<C>,
    >(signer: S): Promise<S> {
        // A locator names a registered signer and a quorum has no descriptor: both go to the API as given.
        if (typeof signer === "string" || signer.type === "quorum") {
            return signer;
        }
        const descriptor = getSignerDescriptor<C>(signer.type);
        if (descriptor.prepareRegistration == null) {
            return signer;
        }
        return (await descriptor.prepareRegistration(
            signer as SignerConfigForChain<C>,
            this.#signerManager.descriptorContext()
        )) as S;
    }

    /**
     * Complete a signer registration by approving the pending operation (if any).
     * Shared by both fresh registrations and resumed pending ones.
     */
    private async completeSignerRegistration(
        signer: WalletSigner,
        pendingOperation: PendingSignerOperation | null,
        prepareOnly: boolean
    ): Promise<AddSignerReturnType<C> | WalletSigner> {
        if (pendingOperation == null) {
            if (prepareOnly) {
                return { ...signer } as AddSignerReturnType<C>;
            }
            walletsLogger.info("wallet.addSigner.success");
        } else {
            const operationId = pendingOperationId(pendingOperation);
            // prepareOnly signs nothing; after this client approves, other quorum members may still have to sign.
            const landed = !prepareOnly && (await this.#approvePendingOperation(pendingOperation));
            if (!landed) {
                const event = prepareOnly ? "wallet.addSigner.prepared" : "wallet.addSigner.awaitingApproval";
                walletsLogger.info(event, operationId);
                return { ...signer, ...operationId } as AddSignerReturnType<C>;
            }
            walletsLogger.info("wallet.addSigner.success", operationId);
        }
        return { ...signer, status: "success" as const } as WalletSigner;
    }

    /** True when the operation landed; false while only quorum members can still approve it. */
    async #approvePendingOperation(pendingOperation: PendingSignerOperation): Promise<boolean> {
        switch (pendingOperation.type) {
            case "transaction":
                return (await this.approveTransactionAndWait(pendingOperation.id)).hash != null;
            case "signature":
                return (await this.approveSignatureAndWait(pendingOperation.id)).signature != null;
            default: {
                const _exhaustive: never = pendingOperation.type;
                throw new Error(`Unknown pending operation type: ${_exhaustive}`);
            }
        }
    }

    /**
     * Remove a signer from the wallet.
     * The removal is approved as in {@link addSigner}. When a quorum approves, it returns `{ transactionId }` with
     * `status` undefined, as with `prepareOnly: true`; members sign it with {@link approve}.
     * @param signer - The signer to remove, provided as a signer config object. A quorum is given by `{ locator }` or by
     * its threshold and members, which one read of the wallet's delegated quorums resolves to its locator.
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
        signer: SignerConfigForChain<C> | ExternalWalletRegistrationConfig | QuorumRef | QuorumSignerConfig<C>,
        options?: T
    ): Promise<RemoveSignerReturnType> {
        return this.#removeSigner(signer, options);
    }

    // removeSigner's body, also run by device recovery for the old device signer it removes.
    async #removeSigner(
        signer: SignerConfigForChain<C> | ExternalWalletRegistrationConfig | QuorumRef | QuorumSignerConfig<C>,
        options?: RemoveSignerOptions
    ): Promise<RemoveSignerReturnType> {
        const signerLocator = await this.#removalLocator(signer, "delegated");
        walletsLogger.info("wallet.removeSigner.start", { signerLocator });

        const explicit = this.#explicitApprover(options);
        return this.#signerManager.withApprover({ explicit }, async (approver) => {
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
            if (this.isPrepareOnly(options, approver)) {
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
     * Add a recovery method to the wallet.
     * The change is approved as in {@link addSigner}, by a recovery method or a recovery quorum. When a quorum
     * approves, it returns `{ transactionId }` with `status` undefined, as with `prepareOnly: true`.
     * @param recoveryMethod - The recovery method configuration object, or a quorum `{ type: "quorum", threshold,
     * members }`. Members are sent by their identity fields only. The result carries the new method's `locator`.
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
        walletsLogger.info("wallet.addRecoveryMethod.start");

        const resolvedMethod =
            recoveryMethod.type === "server"
                ? (this.resolveServerSignerApiLocator(recoveryMethod) as `server:${string}`)
                : recoveryMethod;

        return this.#signerManager.withApprover({ explicit: this.#explicitApprover(options) }, async (approver) => {
            // A passkey without a credential id is created here, after the approver is resolved
            const preparedMethod = await this.prepareRegistration(resolvedMethod);

            const response = await this.#apiClient.registerRecoveryMethod(this.walletLocator, {
                recoveryMethods: this.#addSignerInput(
                    preparedMethod
                ) as RegisterRecoveryMethodParams["recoveryMethods"],
                approver: this.resolveRecoveryApprover(approver),
                chain: this.chainAdapter.addSignerChain(this.chain),
            });

            if ("error" in response) {
                walletsLogger.error("wallet.addRecoveryMethod.error", {
                    error: response,
                });
                throwIfQuorumApiError(response);
                throw new InvalidSignerError(`Failed to add recovery method: ${JSON.stringify(response.message)}`);
            }

            const transactionId = response.tx.id;
            const locator = response.recoveryMethods.locator as SignerLocator;
            if (this.isPrepareOnly(options, approver)) {
                walletsLogger.info("wallet.addRecoveryMethod.prepared", { transactionId });
                return { transactionId, status: undefined, locator };
            }

            await this.approveTransactionAndWait(transactionId);
            this.#signerManager.addRecoverySigner(this.#addedRecoveryMethod(preparedMethod, response));
            walletsLogger.info("wallet.addRecoveryMethod.success", { transactionId });
            return { transactionId, status: "success" as const, locator };
        });
    }

    // How the wallet lists an added recovery method: the caller's config, which can sign (onSign, secret), or the
    // API's entry for a quorum, which carries the locators the quorum rules read.
    #addedRecoveryMethod(
        method: SignerLocator | RecoverySignerConfigFor<C> | ExternalWalletRegistrationConfig,
        response: Extract<RegisterRecoveryMethodResponse, { tx: unknown }>
    ): RecoverySignerConfigForChain<C> {
        if (typeof method === "string") {
            return { type: "server", address: parseSignerLocator(method).value } as ApiSourcedServerSignerConfig;
        }
        if (method.type === "quorum") {
            return toQuorumSigner(response.recoveryMethods as unknown as QuorumSigner);
        }
        return method as RecoverySignerConfigForChain<C>;
    }

    /**
     * Remove a recovery method from the wallet.
     * The change is approved as in {@link addSigner}, by a remaining recovery method or a recovery quorum. When a
     * quorum approves, it returns `{ transactionId }` with `status` undefined, as with `prepareOnly: true`.
     * @param recoveryMethod - The recovery method to remove, provided as a signer config object. A quorum is given by
     * `{ locator }` or by its threshold and members, which one read of the wallet's recovery quorums resolves.
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
        recoveryMethod: SignerConfigForChain<C> | ExternalWalletRegistrationConfig | QuorumRef | QuorumSignerConfig<C>,
        options?: T
    ): Promise<RemoveRecoveryMethodReturnType> {
        const recoveryMethodLocator = await this.#removalLocator(recoveryMethod, "recovery");
        walletsLogger.info("wallet.removeRecoveryMethod.start", { recoveryMethodLocator });

        return this.#signerManager.withApprover({ explicit: this.#explicitApprover(options) }, async (approver) => {
            const response = await this.#apiClient.removeRecoveryMethod(this.walletLocator, recoveryMethodLocator, {
                approver: this.resolveRecoveryApprover(approver),
                chain: this.chainAdapter.addSignerChain(this.chain),
            });

            if ("error" in response) {
                walletsLogger.error("wallet.removeRecoveryMethod.error", {
                    error: response,
                });
                throwIfQuorumApiError(response);
                throw new Error(`Failed to remove recovery method: ${JSON.stringify(response)}`);
            }

            const transactionId = response.id;
            if (this.isPrepareOnly(options, approver)) {
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
     * The config must refer to one of {@link recoveryMethods}, or to a member of one of its recovery quorums: signer
     * changes are then approved by that quorum. Pass the fuller form when the key needs it to operate (an `onSign`
     * callback for external wallets, the `secret` for server signers). With no active signer, {@link approve} signs
     * with the selected key.
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

    // The locator of what to remove. A quorum given by threshold and members is found in one fresh read of the wallet's
    // recovery or delegated quorums, so one added on another device is found too.
    async #removalLocator(
        target: SignerConfigForChain<C> | ExternalWalletRegistrationConfig | QuorumRef | QuorumSignerConfig<C>,
        scope: "recovery" | "delegated"
    ): Promise<string> {
        if (isQuorumRef(target)) {
            if (!isQuorumLocator(target.locator)) {
                throw new InvalidSignerError(`Malformed quorum locator: ${target.locator}`);
            }
            return target.locator;
        }
        if (target.type === "quorum") {
            return this.#quorumLocatorByComposition(target, scope);
        }
        return this.resolveSignerLocator(target);
    }

    async #quorumLocatorByComposition(
        config: QuorumSignerConfig<C>,
        scope: "recovery" | "delegated"
    ): Promise<QuorumLocator> {
        const walletConfig = await this.#readWalletConfig();
        const quorums =
            scope === "recovery"
                ? recoveryMethodsFromWalletConfig<C>(walletConfig).filter(isQuorumSigner)
                : (walletConfig.delegatedSigners ?? []).filter(isQuorumSigner);
        const matches = quorumsMatchingInput(quorums, this.#quorumInput(config));
        if (matches.length === 1) {
            return matches[0].locator;
        }
        if (matches.length === 0) {
            throw new InvalidSignerError(
                `No ${scope} quorum on this wallet has threshold ${config.threshold} and these members`
            );
        }
        throw new InvalidSignerError(
            `Several ${scope} quorums on this wallet have threshold ${config.threshold} and these members (${matches.map((quorum) => quorum.locator).join(", ")}); remove one by its locator`
        );
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
     * Returns the request recovery quorum members still have to sign with {@link approve}: the new device signer, then
     * the old one's removal; undefined when none is left.
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.recover",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async recover(): Promise<RecoverResult> {
        if (this.#recovering == null) {
            this.#recovering = this.#deviceRecovery.recover().finally(() => {
                this.#recovering = null;
            });
        }
        return await this.#recovering;
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

        // Each delegated signer in the wallet response is the same object GET signer returns, status included,
        // so one request covers them all. Signers with no approval on this chain map to null.
        const signers = ((walletResponse.config?.delegatedSigners ?? []) as APISigner[])
            .map((apiSigner) => mapApiSignerToSigner(apiSigner, this.chain))
            .filter((s): s is WalletSigner => s != null);

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
        const awaited = await this.#recoverIfNeeded();
        // Nothing the pending device signs is accepted until the quorum's members approve it: stop before creating.
        if (awaited != null && this.#deviceAwaitsApproval()) {
            throw new DeviceSignerAwaitingApprovalError(awaited);
        }
        await this.#authenticateActiveSigner();
    }

    #deviceAwaitsApproval(): boolean {
        const signer = this.#signerManager.activeSigner;
        return signer?.type === "device" && !this.#signerManager.isApprovedSignerStatus(signer.status);
    }

    async #recoverIfNeeded(): Promise<RecoverResult> {
        await this.#signerInitialization;
        // Joins a recovery already running, explicit or automatic, instead of calling recover() again.
        if (this.#recovering != null) {
            return await this.#recovering;
        }
        return await this.recover();
    }

    async #authenticateActiveSigner(): Promise<void> {
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

    // `requireHeldMember`: the public approve() fails when no held key can sign; a signer change finishing its own
    // registration returns it pending instead, since other members sign later.
    protected async approveTransactionAndWait(
        transactionId: string,
        options?: ApproveOptions,
        { requireHeldMember = false }: { requireHeldMember?: boolean } = {}
    ) {
        await this.approveTransactionInternal(transactionId, options, { requireHeldMember });
        await this.sleep(1_000); // Rule of thumb: tx won't be confirmed in less than 1 second
        return await this.waitForTransaction(transactionId);
    }

    protected async approveSignatureAndWait(
        signatureId: string,
        options?: ApproveOptions,
        { requireHeldMember = false }: { requireHeldMember?: boolean } = {}
    ) {
        const signatureResponse = await this.approveSignatureInternal(signatureId, options, { requireHeldMember });

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

    // Quorum approvals ship chain by chain: on a chain whose adapter does not support them yet,
    // a pending quorum entry fails with an actionable error instead of being signed.
    #requireSupportedApprovals<P extends { signer: { type: string; locator: string } }>(pendingApprovals: P[]): P[] {
        const quorumEntry = pendingApprovals.find((pendingApproval) => isQuorumSigner(pendingApproval.signer));
        if (!this.chainAdapter.supportsQuorumApprovals && quorumEntry != null) {
            throw quorumSignerNotSupported([quorumEntry.signer.locator]);
        }
        return pendingApprovals;
    }

    // An api-key signer's flat entries are approved by the API; on a chain with quorum approvals, quorum members
    // still sign with the held keys.
    #apiKeySignable(pendingApprovals: PendingApproval[]): PendingApproval[] {
        if (!this.chainAdapter.supportsQuorumApprovals) {
            return [];
        }
        return pendingApprovals.filter(isQuorumPendingApproval);
    }

    // A quorum member may be any key this client holds, the useRecoveryMethod key included (EDD 007 §7 "Approval").
    // Flat-only approvals keep their keys, so wallets without quorums sign as before.
    #heldSigners(
        walletSigner: SignerAdapter,
        additional: SignerAdapter[],
        pending: PendingApproval[]
    ): SignerAdapter[] {
        if (pending.some(isQuorumPendingApproval)) {
            return this.#signerManager.heldSigners(additional);
        }
        return [...additional, walletSigner];
    }

    #approvalSigning(
        walletSigner: SignerAdapter,
        options: ApproveOptions | undefined,
        pending: PendingApproval[],
        sign: ApprovalSigning["sign"]
    ) {
        return {
            held: this.#heldSigners(walletSigner, options?.additionalSigners ?? [], pending),
            limit: "all",
            sign,
            resolveMissing: (locator) => this.#resolveMissingDeviceSigner(locator),
        } satisfies ApprovalSigning;
    }

    // A wrong key must not look like a recorded approval: a quorum that still waits, with no held key among its
    // members, is this client's mistake, as a flat entry with no held key already is.
    #requireHeldMember(pending: PendingApproval[], held: SignerAdapter[]): void {
        const heldLocators = held.map((signer) => signer.locator());
        const { quorums } = splitPendingApprovals(pending);
        if (quorumsAwaitOnlyOthers(quorums, heldLocators)) {
            const waiting = quorums
                .filter((entry) => entry.quorumApprovals.remaining > 0)
                .map((entry) => entry.signer.locator)
                .join(", ");
            throw new InvalidSignerError(
                `None of the keys this client holds (${heldLocators.join(", ")}) is a member of the quorum still approving this request (${waiting})`
            );
        }
    }

    protected async approveSignatureInternal(
        signatureId: string,
        options?: ApproveOptions,
        { requireHeldMember = false }: { requireHeldMember?: boolean } = {}
    ) {
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

        const signable = walletSigner.type === "api-key" ? this.#apiKeySignable(pendingApprovals) : pendingApprovals;
        if (walletSigner.type === "api-key" && signable.length === 0) {
            return signature;
        }

        // If an external signature is provided, use it to approve the transaction
        if (options?.approval != null) {
            const approvals = [options.approval];

            return await this.executeApproveSignatureWithErrorHandling(signatureId, approvals);
        }

        const signing = this.#approvalSigning(walletSigner, options, signable, (signer, message) =>
            signer.signMessage(message)
        );
        const approvals = await collectApprovals(this.#requireSupportedApprovals(signable), signing);

        // Nothing this client holds is pending: a held member already signed, or no held key is a member at all.
        if (approvals.length === 0) {
            if (requireHeldMember) {
                this.#requireHeldMember(signable, signing.held);
            }
            return signature;
        }

        return await this.executeApproveSignatureWithErrorHandling(signatureId, approvals);
    }

    protected async approveTransactionInternal(
        transactionId: string,
        options?: ApproveOptions,
        { requireHeldMember = false }: { requireHeldMember?: boolean } = {}
    ) {
        const transaction = await this.#apiClient.getTransaction(this.walletLocator, transactionId);

        if ("error" in transaction) {
            throwIfCrossmintApiAuthError(transaction);
            throwIfRequestExpired(transaction, { transactionId });
            throw new TransactionNotAvailableError(JSON.stringify(transaction));
        }

        await this.#options?.callbacks?.onTransactionStart?.();

        const walletSigner = this.#signerManager.require();
        const pendingApprovals = transaction.approvals?.pending ?? [];

        const signable = walletSigner.type === "api-key" ? this.#apiKeySignable(pendingApprovals) : pendingApprovals;
        if (walletSigner.type === "api-key" && signable.length === 0) {
            return transaction;
        }

        // If an external signature is provided, use it to approve the transaction
        if (options?.approval != null) {
            const approvals = [options.approval];

            return await this.executeApproveTransactionWithErrorHandling(transactionId, approvals);
        }

        const approvalAdapter = getApprovalAdapter(transaction.chainType, this.chainAdapter);
        const signing = this.#approvalSigning(walletSigner, options, signable, (signer, message) =>
            approvalAdapter.signApproval(signer, transaction, message)
        );
        const approvals = await collectApprovals(this.#requireSupportedApprovals(signable), signing);

        // Nothing this client holds is pending: a held member already signed, or no held key is a member at all.
        if (approvals.length === 0) {
            if (requireHeldMember) {
                this.#requireHeldMember(signable, signing.held);
            }
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
