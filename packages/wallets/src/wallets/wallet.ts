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
} from "../utils/errors";
import { STATUS_POLLING_INTERVAL_MS } from "../utils/constants";
import { validateChainForEnvironment, type Chain } from "../chains/chains";
import { type ChainAdapter, type ChainType, getChainAdapter, isSupportedChainType } from "../chains/chain-adapter";
import type {
    DeviceSignerConfig,
    ExternalWalletRegistrationConfig,
    InternalSignerConfig,
    PasskeySignerConfig,
    RecoverySignerConfigForChain,
    ServerSignerConfig,
    SignerAdapter,
    SignerConfigForChain,
    SignerLocator,
} from "../signers/types";
import {
    type ApiSourcedServerSignerConfig,
    isApiSourcedServerSignerConfig,
    AuthRejectedError,
    OtpValidationError,
} from "../signers/types";
import { assembleSigner } from "../signers";
import { NonCustodialSigner } from "../signers/non-custodial";
import { ServerSignerResolver } from "../signers/server/resolver";
import { getSignerDescriptor } from "../signers/descriptors";
import { walletsLogger } from "../logger";

import { getSignerLocator } from "../utils/signer-locator";
import { toRecipientLocator, toTokenLocator } from "../utils/locators";
import { formatBalanceResponse } from "./services/balance-formatter";
import { SignerManager } from "./services/signer-manager";
import { waitForSignatureCompletion, waitForTransactionCompletion } from "./services/operation-poller";
import { createDeviceSigner } from "@/utils/device-signers";
import type { DeviceSignerKeyStorage } from "@/utils/device-signers/DeviceSignerKeyStorage";

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
    #needsRecovery = false;
    #deviceSignerApproved = false;
    #serverSignerResolver: ServerSignerResolver;
    #signerManager: SignerManager<C>;
    #apiDelegatedServerSignerAddresses: string[] = [];
    #signerInitialization: Promise<void>;
    #recovering: Promise<void> | null = null;
    /**
     * Cached once `recover()` learns from the backend that this wallet's Solana provider does
     * not support device signers (via the stable `DEVICE_SIGNER_NOT_SUPPORTED` error code).
     * Used to short-circuit subsequent recover() calls without retrying registration.
     */
    #deviceSignerUnsupported = false;

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
     * Initialize the device signer by resolving key availability.
     * If a device key is found locally, assembles the signer immediately.
     * If not, flags the wallet for recovery so a key is generated during the next transaction.
     * Device signer support depends on the wallet provider; validation is handled server-side.
     */
    private async initDeviceSigner(): Promise<void> {
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null) {
            return;
        }

        // If a previous recover() learned the backend doesn't support device signers for this
        // wallet (DEVICE_SIGNER_NOT_SUPPORTED), short-circuit without setting needsRecovery so
        // initDefaultSigner falls back to the recovery signer instead of retrying registration.
        if (this.#deviceSignerUnsupported) {
            return;
        }

        const deviceConfig: DeviceSignerConfig = { type: "device" };
        try {
            await this.resolveDeviceSignerAvailability(deviceConfig);
        } catch (error) {
            walletsLogger.error("wallet.initDeviceSigner.error", {
                error,
            });
            this.#needsRecovery = true;
            return;
        }

        // If no local key was found, skip signer assembly — recovery will handle it
        if (this.#needsRecovery) {
            return;
        }

        // Assemble the device signer with the resolved config
        const internalConfig = getSignerDescriptor<C>(deviceConfig.type).buildInternalConfig(
            deviceConfig as SignerConfigForChain<C>,
            this.#signerManager.descriptorContext()
        );
        const deviceSigner = await this.#signerManager.assemble(internalConfig);
        this.#signerManager.setActiveSigner(deviceSigner);

        // If the backend signer isn't approved yet (e.g. a previous recover() was
        // interrupted mid-approval), flag for recovery so the next recover() call
        // resumes the pending operation via checkAndResumeDeviceSigner. The signer
        // is kept assigned so recover() takes the device fast-path and resumes
        // rather than creating a new device signer.
        if (!this.#signerManager.isApprovedSignerStatus(deviceSigner.status)) {
            walletsLogger.info("wallet.initDeviceSigner.pendingApproval", {
                signerLocator: deviceSigner.locator(),
                status: deviceSigner.status,
            });
            this.#needsRecovery = true;
            this.#deviceSignerApproved = false;
        }
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
        await this.initDeviceSigner();

        // If device signer was found or recovery is pending, we're done
        if (this.#signerManager.activeSigner != null || this.#needsRecovery) {
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

    /**
     * Attempt to auto-assemble the recovery signer onto the wallet. Used as the fallback
     * when device-signer registration is rejected by the backend with `DEVICE_SIGNER_NOT_SUPPORTED`
     * so the consumer's next transaction has a usable signer without re-routing through
     * initDefaultSigner.
     */
    private async assembleRecoverySignerFallback(): Promise<void> {
        const recovery = this.#signerManager.recovery;
        const signerDescriptor = getSignerDescriptor<C>(recovery.type);
        const signerDescriptorContext = this.#signerManager.descriptorContext();
        if (!signerDescriptor.canAutoAssemble(recovery, signerDescriptorContext)) {
            return;
        }
        try {
            const internalConfig = signerDescriptor.buildInternalConfig(recovery, signerDescriptorContext);
            this.#signerManager.setActiveSigner(
                await this.#signerManager.assemble(internalConfig, { isAdminSigner: true })
            );
        } catch (error) {
            walletsLogger.warn("wallet.recover.device.unsupportedFallback.autoAssemblyFailed", {
                recoveryType: recovery.type,
                error,
            });
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
        return await this.#apiClient.getNfts({
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
            throw new Error(`Failed to get transaction: ${JSON.stringify(response.error)}`);
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
        const resolvedChain = this.resolveChainForEnvironment();
        const recipient = toRecipientLocator(to);
        const tokenLocator = toTokenLocator(token, resolvedChain);

        const parsedAmount = Number(amount);
        if (Number.isNaN(parsedAmount) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            throw new InvalidTransferAmountError(
                `Invalid transfer amount: "${amount}". Amount must be a positive number greater than zero.`
            );
        }

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
                    walletsLogger.info("wallet.addSigner.alreadyApproved");
                    return this.completeSignerRegistration(existingState.signer, null, options);
                }

                // Pending operation from a previous attempt — resume instead of re-registering
                if (existingState.pendingOperation != null) {
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

            const response = await this.#apiClient.registerSigner(this.walletLocator, {
                signer: signerInput as RegisterSignerParams["signer"],
                chain: this.chainAdapter.addSignerChain(this.chain),
                ...(options?.scopes != null && { scopes: options.scopes }),
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
            await this.resolveDeviceSignerAvailability(signer);
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
            this.#needsRecovery = false;
            return true;
        }

        // Passkey without id: try to auto-select from registered signers
        if (signer.type === "passkey" && this.isPasskeyMissingId(signer)) {
            const selected = await this.tryAutoSelectPasskey(signer);
            if (!selected) {
                // No registered passkeys — use recovery if this is the recovery signer
                if (this.isRecoverySigner(signer)) {
                    this.#needsRecovery = false;
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
            this.#needsRecovery = false;
            return false;
        }

        // Not a registered signer — fall back to recovery
        if (this.isRecoverySigner(signer)) {
            this.#needsRecovery = false;
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
                this.#needsRecovery = false;
                return false;
            case "recovery":
                this.#signerManager.stripSecretFromRecovery();
                this.#needsRecovery = false;
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
        return this.#needsRecovery;
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
        walletsLogger.info("wallet.recover.start");

        // Fast-path: skip the API call if we've already verified the device signer is approved
        if (this.#deviceSignerApproved) {
            walletsLogger.info("wallet.recover.skipped", { reason: "Device signer already approved (cached)" });
            return;
        }

        // Wallets whose provider does not support device signers have nothing to recover —
        // signing relies on the recovery signer instead. We learn this from the backend by
        // catching DEVICE_SIGNER_NOT_SUPPORTED on a previous addSigner attempt and caching
        // the result on the wallet instance.
        if (this.#deviceSignerUnsupported) {
            walletsLogger.info("wallet.recover.skipped", {
                reason: "device signer not supported (cached)",
            });
            this.#needsRecovery = false;
            this.#deviceSignerApproved = true;
            return;
        }

        const markDeviceSignerApproved = () => {
            this.#needsRecovery = false;
            this.#deviceSignerApproved = true;
        };

        // If we already have a valid device signer assembled, check its status
        const activeSigner = this.#signerManager.activeSigner;
        if (activeSigner?.type === "device") {
            if (await this.checkAndResumeDeviceSigner(activeSigner)) {
                markDeviceSignerApproved();
                return;
            }
        }

        // If the current signer is a non-device type (e.g., user explicitly called useSigner
        // with email/passkey/server), skip device recovery to avoid overwriting their choice.
        if (activeSigner != null && activeSigner.type !== "device") {
            walletsLogger.warn("wallet.recover.skipped", { reason: "Recovery is only supported for device signers" });
            this.#needsRecovery = false;
            return;
        }

        // No usable device signer assembled yet. Search all registered device signers
        // to find one whose private key exists on this device, or generate a new one.
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null) {
            if (!this.#needsRecovery) {
                return; // No device signer was configured — nothing to recover
            }
            throw new Error("Device signer key storage is required to recover a device signer");
        }

        const matchedSigner = await this.findLocalDeviceSigner(deviceSignerKeyStorage);
        if (matchedSigner != null) {
            if (await this.checkAndResumeDeviceSigner(matchedSigner)) {
                // Assign signer and mark approved before the non-critical mapAddressToKey call,
                // so a storage I/O error doesn't leave the wallet without a usable signer.
                this.#signerManager.setActiveSigner(matchedSigner);
                markDeviceSignerApproved();
                const publicKeyBase64 = matchedSigner.locator().replace("device:", "");
                try {
                    await deviceSignerKeyStorage.mapAddressToKey(this.address, publicKeyBase64);
                } catch (error) {
                    walletsLogger.warn("wallet.recover.mapAddressToKey.error", { error });
                }
                return;
            }
        }

        // No existing device signer matches this device — generate a new key and register it
        const newDeviceSigner = await createDeviceSigner(deviceSignerKeyStorage, this.address);

        try {
            await this.addSigner(newDeviceSigner as SignerConfigForChain<C>);
        } catch (error) {
            const isAlreadyApproved =
                error instanceof Error &&
                error.message.toLowerCase().includes("delegated signer") &&
                error.message.toLowerCase().includes("already") &&
                error.message.toLowerCase().includes("approved");

            if (error instanceof DeviceSignerNotSupportedError) {
                // Backend says this wallet's provider doesn't support device signers.
                // Swallow the error and fall back to the recovery signer so the consumer's
                // first transaction works seamlessly without needing to know about providers.
                walletsLogger.info("wallet.recover.device.unsupportedFallback", {
                    signerLocator: newDeviceSigner.locator,
                });
                await deviceSignerKeyStorage.deleteKey(this.address);
                this.#deviceSignerUnsupported = true;
                this.#needsRecovery = false;
                this.#deviceSignerApproved = true;
                await this.assembleRecoverySignerFallback();
                return;
            } else if (isAlreadyApproved) {
                walletsLogger.info("wallet.recover.skipped", {
                    reason: "Device signer already approved",
                    signerLocator: newDeviceSigner.locator,
                });
            } else if (
                error instanceof AuthRejectedError ||
                (error instanceof Error && error.name === "AuthRejectedError")
            ) {
                // User canceled OTP — keep the local key so findLocalDeviceSigner()
                // can match the server-side pending signer on the next recover() attempt.
                walletsLogger.info("wallet.recover.device.authRejected", {
                    signerLocator: newDeviceSigner.locator,
                });
                throw error;
            } else if (
                error instanceof OtpValidationError ||
                (error instanceof Error && error.name === "OtpValidationError")
            ) {
                // OTP verification failed (wrong code, expired, server-side rejection).
                // Keep the local key so the user can retry the OTP flow on the next
                // recover() attempt without re-registering the device signer.
                walletsLogger.warn("wallet.recover.device.otpValidationFailed", {
                    signerLocator: newDeviceSigner.locator,
                    code: error instanceof OtpValidationError ? error.code : undefined,
                });
                throw error;
            } else {
                walletsLogger.error("wallet.recover.device.error", { error });
                await deviceSignerKeyStorage.deleteKey(this.address);
                throw error;
            }
        }

        // Reassemble device signer with the resolved locator. This also covers the
        // idempotent case where the backend reports the signer is already approved.
        const reassembledSigner = await this.#signerManager.assemble({
            type: "device",
            locator: newDeviceSigner.locator as SignerLocator,
            address: this.address,
        } as InternalSignerConfig<C>);
        this.#signerManager.setActiveSigner(reassembledSigner);
        if (reassembledSigner.type === "device") {
            reassembledSigner.status = "success";
        }
        walletsLogger.info("wallet.recover.device.success", { signerLocator: newDeviceSigner.locator });

        markDeviceSignerApproved();
    }

    /**
     * Check if a device signer is already approved or has a pending operation that can be resumed.
     * Returns true if the signer is now approved (either already was, or pending op was completed).
     */
    private async checkAndResumeDeviceSigner(deviceSigner: SignerAdapter): Promise<boolean> {
        if (this.#signerManager.isApprovedSignerStatus(deviceSigner.status)) {
            walletsLogger.info("wallet.recover.skipped", { reason: "Device signer already approved" });
            return true;
        }

        const signerState = await this.#signerManager.getSignerState(deviceSigner.locator());
        deviceSigner.status = signerState.signer?.status;

        if (signerState.pendingOperation != null) {
            await this.resumePendingDeviceSignerApproval(deviceSigner, signerState.pendingOperation);
            return true;
        }

        if (this.#signerManager.isApprovedSignerStatus(deviceSigner.status)) {
            walletsLogger.info("wallet.recover.skipped", { reason: "Device signer already approved" });
            return true;
        }

        return false;
    }

    /**
     * Resume a pending approval operation for a device signer.
     * Temporarily swaps to the recovery signer, approves the pending operation,
     * then restores the device signer.
     */
    private async resumePendingDeviceSignerApproval(
        deviceSigner: SignerAdapter,
        pendingOperation: { type: "signature" | "transaction"; id: string }
    ): Promise<void> {
        const originalSigner = this.#signerManager.activeSigner;
        const recovery = this.#signerManager.recovery;
        if (isApiSourcedServerSignerConfig(recovery) && !this.#serverSignerResolver.hasRecoveryResolution) {
            throw new Error(
                "Cannot resume pending approval: no secret available. " +
                    'Call wallet.useSigner({ type: "server", secret: ... }) first with the recovery server secret.'
            );
        }
        const signerDescriptor = getSignerDescriptor<C>(recovery.type);
        const signerDescriptorContext = this.#signerManager.descriptorContext();
        if (
            recovery != null &&
            recovery.type === "external-wallet" &&
            !signerDescriptor.canAutoAssemble(recovery, signerDescriptorContext)
        ) {
            throw new Error(
                "Cannot resume pending approval: no onSign callback available. " +
                    'Call wallet.useSigner({ type: "external-wallet", address: "0x...", onSign: async (tx) => ... }) first.'
            );
        }
        const recoveryInternalConfig = signerDescriptor.buildInternalConfig(recovery, signerDescriptorContext);
        this.#signerManager.setActiveSigner(
            assembleSigner(this.chain, recoveryInternalConfig, this.#options?.deviceSignerKeyStorage)
        );

        try {
            if (pendingOperation.type === "signature") {
                await this.approveSignatureAndWait(pendingOperation.id);
            } else {
                await this.approveTransactionAndWait(pendingOperation.id);
            }
        } catch (error) {
            // Restore the device signer (not null) so the caller has a reference to the
            // signer that was being recovered, rather than masking the failure behind a
            // generic "read-only wallet" error from signerManager.require().
            this.#signerManager.setActiveSigner(deviceSigner);
            throw error;
        } finally {
            // On the success path, restore the original signer — the caller (recover)
            // will reassign the active signer to the device signer after mapAddressToKey.
            if (this.#signerManager.activeSigner !== deviceSigner) {
                this.#signerManager.setActiveSigner(originalSigner);
            }
        }
        deviceSigner.status = "success";
        walletsLogger.info("wallet.recover.device.success", {
            signerLocator: deviceSigner.locator(),
            resumed: true,
        });
    }

    /**
     * Search registered device signers to find one whose private key exists locally.
     * Returns an assembled SignerAdapter (without pre-fetched status) if found, or null.
     * The caller is responsible for checking status via checkAndResumeDeviceSigner.
     */
    private async findLocalDeviceSigner(deviceSignerKeyStorage: DeviceSignerKeyStorage): Promise<SignerAdapter | null> {
        // Fetch registered signers — let network errors propagate so we don't
        // accidentally generate a new key when an existing one is on the device.
        const existingSigners = await this.signers();
        const deviceSigners = existingSigners.filter((s) => s.locator.startsWith("device:"));

        for (const walletSigner of deviceSigners) {
            const publicKeyBase64 = walletSigner.locator.replace("device:", "");
            try {
                const hasKey = await deviceSignerKeyStorage.hasKey(publicKeyBase64);
                if (hasKey) {
                    // Don't call mapAddressToKey here — the caller (recover) will do it
                    // only after confirming the signer is usable, to avoid poisoning
                    // the key mapping if we fall through to new-key generation.
                    const signer = assembleSigner(
                        this.chain,
                        {
                            type: "device",
                            locator: walletSigner.locator as SignerLocator,
                            address: this.address,
                        } as InternalSignerConfig<C>,
                        deviceSignerKeyStorage
                    );
                    walletsLogger.info("wallet.recover.foundLocalDeviceSigner", {
                        signerLocator: walletSigner.locator,
                    });
                    return signer;
                }
            } catch (error) {
                // hasKey / assembleSigner failures for individual keys are non-fatal;
                // continue checking other device signers.
                walletsLogger.warn("wallet.recover.findLocalDeviceSigner.keyCheckError", {
                    signerLocator: walletSigner.locator,
                    error,
                });
            }
        }
        return null;
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
                } catch {
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

    /**
     * Check if a device signer key is available locally, or flag for recovery.
     * Looks up device key storage by wallet address, then by matching registered device signers.
     * If no key is found, sets needsRecovery so a new device key is generated during the next transaction.
     */
    private async resolveDeviceSignerAvailability(config: DeviceSignerConfig): Promise<void> {
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;

        if (deviceSignerKeyStorage == null) {
            throw new Error("Device signer key storage is required for device signers");
        }

        // Check if device signer key exists for this wallet address
        const existingKey = await deviceSignerKeyStorage.getKey(this.address);
        if (existingKey != null) {
            config.locator = `device:${existingKey}`;
            return;
        }

        const existingSigners = await this.signers();
        const deviceSigners = existingSigners.filter((s) => s.locator.startsWith("device:"));

        for (const walletSigner of deviceSigners) {
            const publicKeyBase64 = walletSigner.locator.replace("device:", "");
            const hasKey = await deviceSignerKeyStorage.hasKey(publicKeyBase64);
            if (hasKey) {
                await deviceSignerKeyStorage.mapAddressToKey(this.address, publicKeyBase64);
                config.locator = walletSigner.locator;
                return;
            }
        }

        // No device signer available — will be created during next transaction
        this.#needsRecovery = true;
        this.#deviceSignerApproved = false;
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

    protected async approveSignatureInternal(signatureId: string, options?: ApproveOptions) {
        if (!this.chainAdapter.supportsSignatures) {
            throw new Error("Approving signatures is only supported for EVM smart wallets");
        }

        const walletSigner = this.#signerManager.require();

        const signature = await this.#apiClient.getSignature(this.walletLocator, signatureId);

        if ("error" in signature) {
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

        const approvals = await Promise.all(
            pendingApprovals.map(async (pendingApproval) => {
                const signer = signers.find((s) => s.locator() === pendingApproval.signer.locator);
                if (signer == null) {
                    throw new InvalidSignerError(
                        `Signer ${pendingApproval.signer.locator} not found in pending approvals`
                    );
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

        const approvals = await Promise.all(
            pendingApprovals.map(async (pendingApproval) => {
                const signer = signers.find((s) => s.locator() === pendingApproval.signer.locator);
                if (signer == null) {
                    throw new InvalidSignerError(
                        `Signer ${pendingApproval.signer.locator} not found in pending approvals`
                    );
                }

                // For Solana device signers (secp256r1), the SWIG precompile expects a signature
                // over the keccak256 hash, which is provided in pendingApproval.message.
                // For other Solana signers (ed25519), the full serialized transaction is signed.
                const isDeviceSigner = signer.type === "device";
                const transactionToSign =
                    transaction.chainType === "solana" && "transaction" in transaction.onChain && !isDeviceSigner
                        ? (transaction.onChain.transaction as string)
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
        walletsLogger.info("wallet.approve: submitting approval to API", { transactionId });
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
        return await waitForSignatureCompletion(this.#apiClient, this.walletLocator, signatureId);
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
        return await waitForTransactionCompletion(this.#apiClient, this.walletLocator, transactionId, {
            timeoutMs,
            backoffMultiplier,
            maxBackoffMs,
            initialBackoffMs,
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
