import { isValidAddress, WithLoggerContext } from "@crossmint/common-sdk-base";
import type {
    Transfers,
    ApiClient,
    GetSignatureResponse,
    GetBalanceSuccessResponse,
    WalletLocator,
    RegisterSignerChain,
    RegisterSignerPasskeyParams,
    GetTransactionSuccessResponse,
    GetTransactionsResponse,
    FundWalletResponse,
} from "../api";
import type {
    AddSignerOptions,
    AddSignerReturnType,
    DelegatedSigner,
    WalletOptions,
    UserLocator,
    Transaction,
    Balances,
    TokenBalance,
    ApproveParams,
    ApproveOptions,
    Approval,
    Signature,
    ApproveResult,
    PrepareOnly,
    SendTokenTransactionOptions,
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
import { validateChainForEnvironment, type Chain } from "../chains/chains";
import type {
    DeviceSignerConfig,
    DeviceSignerLocator,
    InternalSignerConfig,
    PasskeySignerConfig,
    Signer,
    SignerConfigForChain,
    SignerLocator,
} from "../signers/types";
import { assembleSigner } from "../signers";
import { NonCustodialSigner } from "../signers/non-custodial";
import { walletsLogger } from "../logger";
import { DeviceSigner } from "@/signers/device";
import { getSignerLocator, parseSignerLocator } from "../utils/signer-locator";

type WalletContructorType<C extends Chain> = {
    chain: C;
    address: string;
    owner?: string;
    alias?: string;
    options?: WalletOptions;
    recovery: SignerConfigForChain<C>;
};

export class Wallet<C extends Chain> {
    chain: C;
    address: string;
    owner?: string;
    alias?: string;
    #signer?: Signer;
    #options?: WalletOptions;
    #apiClient: ApiClient;
    #recovery: SignerConfigForChain<C>;
    #needsRecovery = false;
    #deviceSignerReady: Promise<void>;
    #recovering: Promise<void> | null = null;

    constructor(args: WalletContructorType<C>, apiClient: ApiClient) {
        const { chain, address, owner, options, alias, recovery } = args;
        this.#apiClient = apiClient;
        this.chain = chain;
        this.address = address;
        this.owner = owner;
        this.#options = options;
        this.alias = alias;
        this.#recovery = recovery;
        this.#deviceSignerReady = this.initDeviceSigner();
    }

    public get signer(): Signer | undefined {
        return this.#signer;
    }

    /**
     * Initialize the device signer by resolving key availability.
     * If a device key is found locally, assembles the signer immediately.
     * If not, flags the wallet for recovery so a key is generated during the next transaction.
     */
    private async initDeviceSigner(): Promise<void> {
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null) {
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

        // Assemble the device signer with the resolved config
        const internalConfig = this.buildInternalSignerConfig(deviceConfig as SignerConfigForChain<C>);
        this.#signer = assembleSigner(this.chain, internalConfig, deviceSignerKeyStorage);
    }

    protected static getApiClient<C extends Chain>(wallet: Wallet<C>): ApiClient {
        return wallet.apiClient;
    }

    protected static getOptions<C extends Chain>(wallet: Wallet<C>): WalletOptions | undefined {
        return wallet.options;
    }

    protected static getRecovery<C extends Chain>(wallet: Wallet<C>): SignerConfigForChain<C> {
        return wallet.#recovery;
    }

    protected get apiClient(): ApiClient {
        return this.#apiClient;
    }

    protected get options(): WalletOptions | undefined {
        return this.#options;
    }

    /**
     * Get the recovery signer config
     * @returns The recovery signer config
     * @experimental This API is experimental and may change in the future
     */
    public get recovery(): SignerConfigForChain<C> {
        return this.#recovery;
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
            chains: [resolvedChain],
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
                chainSpecificField = {
                    contractAddress: chainData.contractAddress,
                };
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
            return (
                token.symbol !== nativeTokenSymbol &&
                token.symbol !== "usdc" &&
                (requestedTokens == null || requestedTokens.includes(token.symbol ?? ""))
            );
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
    public async transfers(params: { tokens: string; status: "successful" | "failed" }): Promise<Transfers> {
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

        walletsLogger.info("wallet.send.start", {
            recipient,
            token: tokenLocator,
            amount,
            ...(options?.transactionType != null ? { transactionType: options.transactionType } : {}),
        });

        await this.preAuthIfNeeded();
        const signer = this.requireSigner();

        const sendParams = {
            recipient,
            amount,
            ...(options?.signer != null ? { signer: options.signer } : { signer: signer.locator() }),
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

        if (options?.prepareOnly) {
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
     * @param params.transactionId - The transaction id or
     * @param params.signatureId - The signature id
     * @param params.options - The options for the transaction
     * @param params.options.approval - The approval
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
        this.requireSigner();
        walletsLogger.info("wallet.approve.start", {
            transactionId: params.transactionId,
            signatureId: params.signatureId,
        });

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
     * @param signer - The signer. For Solana, it must be a string. For EVM, it can be a string or a passkey.
     * @param options - The options for the operation
     * @param options.prepareOnly - If true, returns prepared state without auto-approving.
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.addSigner",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async addSigner<T extends AddSignerOptions | undefined = undefined>(
        signer: SignerLocator | RegisterSignerPasskeyParams | Exclude<SignerConfigForChain<C>, PasskeySignerConfig>,
        options?: T
    ): Promise<T extends PrepareOnly<true> ? AddSignerReturnType<C> : void> {
        walletsLogger.info("wallet.addSigner.start");

        // Store original signer and swap to recovery signer for the registration
        const originalSigner = this.signer;
        const recoveryInternalConfig = {
            ...this.#recovery,
            address: this.address,
            crossmint: this.#apiClient.crossmint,
            clientTEEConnection: this.#options?.clientTEEConnection,
            onAuthRequired: this.#options?._callbacks?.onAuthRequired,
        } as InternalSignerConfig<C>;
        this.#signer = assembleSigner(this.chain, recoveryInternalConfig, this.#options?.deviceSignerKeyStorage);

        try {
            const response = await this.#apiClient.registerSigner(this.walletLocator, {
                signer,
                chain:
                    this.chain === "solana" || this.chain === "stellar"
                        ? undefined
                        : (this.chain as RegisterSignerChain),
            });

            if ("error" in response) {
                walletsLogger.error("wallet.addSigner.error", {
                    error: response,
                });
                throw new Error(`Failed to register signer: ${JSON.stringify(response.message)}`);
            }

            if (this.chain === "solana" || this.chain === "stellar") {
                if (!("transaction" in response) || response.transaction == null) {
                    walletsLogger.error("wallet.addSigner.error", {
                        error: "Expected transaction in response for Solana/Stellar chain",
                    });
                    throw new Error("Expected transaction in response for Solana/Stellar chain");
                }

                const transactionId = response.transaction.id;

                if (options?.prepareOnly) {
                    walletsLogger.info("wallet.addSigner.prepared", {
                        transactionId,
                    });
                    return { transactionId } as any;
                }

                await this.approveTransactionAndWait(transactionId);
                walletsLogger.info("wallet.addSigner.success", {
                    transactionId,
                });
            } else {
                if (!("chains" in response)) {
                    walletsLogger.error("wallet.addSigner.error", {
                        error: "Expected chains in response for EVM chain",
                    });
                    throw new Error("Expected chains in response for EVM chain");
                }

                const chainResponse = response.chains?.[this.chain];

                if (options?.prepareOnly) {
                    const signatureId = chainResponse?.status !== "success" ? chainResponse?.id : undefined;
                    walletsLogger.info("wallet.addSigner.prepared", {
                        signatureId,
                    });
                    return { signatureId } as any;
                }

                if (chainResponse?.status === "awaiting-approval") {
                    await this.approveSignatureAndWait(chainResponse.id);
                    walletsLogger.info("wallet.addSigner.success", {
                        signatureId: chainResponse.id,
                    });
                } else if (chainResponse?.status === "pending") {
                    await this.waitForSignature(chainResponse.id);
                    walletsLogger.info("wallet.addSigner.success", {
                        signatureId: chainResponse.id,
                    });
                } else {
                    walletsLogger.info("wallet.addSigner.success");
                }
            }

            return undefined as any;
        } finally {
            this.#signer = originalSigner;
        }
    }

    /**
     * Set the active signer for this wallet.
     * Accepts a signer locator string (e.g. "email:user@example.com") or a signer config object.
     *
     * For passkey signers: if no `id` is provided, the wallet will auto-select the passkey
     * if exactly one passkey signer is registered. If multiple passkeys exist, an `id` must be specified.
     *
     * For device signers: if no device key is found locally, the signer will be created
     * automatically during the next transaction (via recovery).
     *
     * For all other signer types: the signer must already be registered on the wallet.
     *
     * @param signer - The signer to use, by locator or config
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.useSigner",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async useSigner(signer: SignerLocator | SignerConfigForChain<C>): Promise<void> {
        walletsLogger.info("wallet.useSigner.start");

        // Parse signer input into a config and locator
        const signerConfig = this.resolveSignerInput(signer);

        // Validate that required values are set for each signer type
        this.validateSignerInput(signerConfig);

        // Passkey auto-selection: if no id provided, auto-select if exactly one passkey exists
        if (
            signerConfig.type === "passkey" &&
            (!("id" in signerConfig) || signerConfig.id == null || signerConfig.id === "")
        ) {
            const existingSigners = await this.signers();
            const passkeySigners = existingSigners.filter((s) => s.signer.startsWith("passkey:"));

            if (passkeySigners.length === 0) {
                throw new Error("No passkey signer is registered on this wallet.");
            }
            if (passkeySigners.length > 1) {
                throw new Error(
                    'Multiple passkey signers are registered on this wallet. Please specify the credential id: wallet.useSigner({ type: "passkey", id: "<credential-id>" })'
                );
            }

            // Auto-select the single passkey
            const credentialId = passkeySigners[0].signer.replace("passkey:", "");
            signerConfig.id = credentialId;
        }

        // Device signers: check availability and flag for recovery if needed
        if (signerConfig.type === "device") {
            await this.resolveDeviceSignerAvailability(signerConfig);
        } else {
            // All non-device signers must already be registered
            const signerLocator = getSignerLocator(signerConfig);
            const isRegistered = await this.signerIsRegistered(signerLocator);
            if (!isRegistered) {
                throw new Error(`Signer "${signerLocator}" is not registered in this wallet.`);
            }
            this.#needsRecovery = false;
        }

        // Assemble and set the signer
        const internalConfig = this.buildInternalSignerConfig(signerConfig);
        const signerLocator = typeof signer === "string" ? signer : getSignerLocator(signerConfig);
        this.#signer = assembleSigner(this.chain, internalConfig, this.#options?.deviceSignerKeyStorage);
        walletsLogger.info("wallet.useSigner.success", { signerLocator });
    }

    /**
     * Check if a signer is registered (delegated) in this wallet.
     * @param signerLocator - The locator of the signer to check
     * @returns true if the signer is registered
     */
    public async signerIsRegistered(signerLocator: SignerLocator | string): Promise<boolean> {
        const existingSigners = await this.signers();
        return existingSigners.some((s) => s.signer === signerLocator);
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
     * Returns early if needsRecovery() is false.
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
        if (!this.needsRecovery()) {
            walletsLogger.info("wallet.recover.skipped", { reason: "Wallet does not need recovery" });
            return;
        }

        if (this.#signer == null) {
            await this.initDeviceSigner();
        }
        const signer = this.requireSigner();
        if (!(signer instanceof DeviceSigner)) {
            walletsLogger.warn("wallet.recover.skipped", { reason: "Recovery is only supported for device signers" });
            return;
        }

        // Generate a new device signer key
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null) {
            throw new Error("Device signer key storage is required to recover a device signer");
        }
        const publicKey = await deviceSignerKeyStorage.generateKey({ address: this.address });
        const signerLocator: DeviceSignerLocator = `device:${publicKey}`;

        try {
            await this.addSigner(signerLocator);
        } catch (error) {
            walletsLogger.error("wallet.recover.device.error", { error });
            await deviceSignerKeyStorage.deleteKey(this.address);
            throw error;
        }

        // Reassemble device signer with the new locator
        this.#signer = assembleSigner(
            this.chain,
            {
                type: "device",
                locator: signerLocator as SignerLocator,
                address: this.address,
            } as InternalSignerConfig<C>,
            deviceSignerKeyStorage
        );
        walletsLogger.info("wallet.recover.device.success", { signerLocator });

        this.#needsRecovery = false;
    }

    /**
     * List the signers for this wallet.
     * @returns {Promise<DelegatedSigner[]>} The signers
     */
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "wallet.signers",
        buildContext(thisArg: Wallet<Chain>) {
            return { chain: thisArg.chain, address: thisArg.address };
        },
    })
    public async signers(): Promise<DelegatedSigner[]> {
        walletsLogger.info("wallet.signers.start");

        const walletResponse = await this.#apiClient.getWallet(this.walletLocator);
        if ("error" in walletResponse) {
            walletsLogger.error("wallet.signers.error", {
                error: walletResponse,
            });
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }

        if (
            walletResponse.type !== "smart" ||
            (walletResponse.chainType !== "evm" &&
                walletResponse.chainType !== "solana" &&
                walletResponse.chainType !== "stellar")
        ) {
            walletsLogger.error("wallet.signers.error", {
                error: `Wallet type ${walletResponse.type} not supported`,
            });
            throw new WalletTypeNotSupportedError(`Wallet type ${walletResponse.type} not supported`);
        }

        // Map wallet-type to simply wallet
        const signers =
            walletResponse?.config?.delegatedSigners?.map((signer) => {
                const colonIndex = signer.locator.indexOf(":");
                if (colonIndex !== -1) {
                    return { signer: signer.locator };
                }
                return {
                    signer: `external-wallet:${signer.locator}`,
                };
            }) ?? [];

        walletsLogger.info("wallet.signers.success", {
            count: signers.length,
        });
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

    /**
     * Ensures that a signer is available. Throws if the wallet is read-only.
     */
    protected requireSigner(): Signer {
        if (this.#signer == null) {
            throw new Error(
                "This wallet is read-only because no signer was provided. Operations that require signing (send, approve, addSigner, etc.) are not available."
            );
        }
        return this.#signer;
    }

    protected async preAuthIfNeeded(): Promise<void> {
        await this.#deviceSignerReady;
        if (this.#recovering == null) {
            this.#recovering = this.recover();
        }
        try {
            await this.#recovering;
        } finally {
            this.#recovering = null;
        }
        const signer = this.requireSigner();
        if (signer instanceof NonCustodialSigner) {
            await signer.ensureAuthenticated();
        }
    }

    /**
     * Parse a signer locator string or config object into a SignerConfigForChain.
     */
    private resolveSignerInput(signer: SignerLocator | SignerConfigForChain<C>): SignerConfigForChain<C> {
        if (typeof signer === "string") {
            const { type, value } = parseSignerLocator(signer as SignerLocator);
            switch (type) {
                case "email":
                    return { type: "email", email: value } as SignerConfigForChain<C>;
                case "phone":
                    return { type: "phone", phone: value } as SignerConfigForChain<C>;
                case "passkey":
                    return { type: "passkey", id: value } as SignerConfigForChain<C>;
                case "device":
                    return {
                        type: "device",
                        ...(value ? { locator: signer as SignerLocator } : {}),
                    } as SignerConfigForChain<C>;
                case "external-wallet":
                    return { type: "external-wallet", address: value } as SignerConfigForChain<C>;
                case "api-key":
                    return { type: "api-key" } as SignerConfigForChain<C>;
                default:
                    throw new Error(`Unknown signer type: ${type}`);
            }
        }
        return signer;
    }

    /**
     * Validate that the signer input has the required values for its type.
     */
    private validateSignerInput(config: SignerConfigForChain<C> | RegisterSignerPasskeyParams): void {
        switch (config.type) {
            case "email":
                if (!("email" in config) || config.email == null) {
                    throw new Error("Email signer requires an email address");
                }
                break;
            case "phone":
                if (!("phone" in config) || config.phone == null) {
                    throw new Error("Phone signer requires a phone number");
                }
                break;
            case "external-wallet":
                if (!("address" in config) || config.address == null) {
                    throw new Error("External wallet signer requires a wallet address");
                }
                break;
            case "passkey":
            case "device":
            case "api-key":
                // These are allowed without id/locator
                break;
            default:
                break;
        }
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
        const deviceSigners = existingSigners.filter((s) => s.signer.startsWith("device:"));

        for (const walletSigner of deviceSigners) {
            const publicKeyBase64 = walletSigner.signer.replace("device:", "");
            const hasKey = await deviceSignerKeyStorage.hasKey(publicKeyBase64);
            if (hasKey) {
                await deviceSignerKeyStorage.mapAddressToKey(this.address, publicKeyBase64);
                config.locator = walletSigner.signer;
                return;
            }
        }

        // No device signer available — will be created during next transaction
        this.#needsRecovery = true;
    }

    /**
     * Build an InternalSignerConfig from a SignerConfigForChain.
     */
    private buildInternalSignerConfig(config: SignerConfigForChain<C>): InternalSignerConfig<C> {
        switch (config.type) {
            case "email":
                return {
                    type: "email",
                    email: config.email,
                    locator: `email:${config.email}` as SignerLocator,
                    address: this.address,
                    crossmint: this.#apiClient.crossmint,
                    clientTEEConnection: this.#options?.clientTEEConnection,
                    onAuthRequired: this.#options?._callbacks?.onAuthRequired,
                } as InternalSignerConfig<C>;
            case "phone":
                return {
                    type: "phone",
                    phone: config.phone,
                    locator: `phone:${config.phone}` as SignerLocator,
                    address: this.address,
                    crossmint: this.#apiClient.crossmint,
                    clientTEEConnection: this.#options?.clientTEEConnection,
                    onAuthRequired: this.#options?._callbacks?.onAuthRequired,
                } as InternalSignerConfig<C>;
            case "passkey": {
                const id = "id" in config && config.id ? config.id : "";
                return {
                    type: "passkey",
                    id,
                    locator: `passkey:${id}` as SignerLocator,
                    name: "name" in config ? config.name : undefined,
                    publicKey: "publicKey" in config ? config.publicKey : undefined,
                    onCreatePasskey: config.onCreatePasskey,
                    onSignWithPasskey: config.onSignWithPasskey,
                } as InternalSignerConfig<C>;
            }
            case "device": {
                const locator = "locator" in config && config.locator ? config.locator : undefined;
                return {
                    type: "device",
                    locator,
                    address: this.address,
                } as InternalSignerConfig<C>;
            }
            case "external-wallet":
                return {
                    ...config,
                    locator: `external-wallet:${config.address}` as SignerLocator,
                } as InternalSignerConfig<C>;
            case "api-key":
                return {
                    type: "api-key",
                    locator: "api-key" as SignerLocator,
                    address: this.address,
                } as InternalSignerConfig<C>;
            default:
                throw new Error(`Unknown signer type: ${(config as unknown as { type?: string })?.type}`);
        }
    }

    protected get isSolanaWallet(): boolean {
        return this.chain === "solana";
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
        if (this.isSolanaWallet) {
            throw new Error("Approving signatures is only supported for EVM smart wallets");
        }

        const walletSigner = this.requireSigner();

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

        if (pendingApprovals == null) {
            return signature;
        }

        const signers = [...(options?.additionalSigners ?? []), walletSigner];

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

        await this.#options?._callbacks?.onTransactionStart?.();

        const walletSigner = this.requireSigner();

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

        if (pendingApprovals == null) {
            return transaction;
        }

        const signers = [...(options?.additionalSigners ?? []), walletSigner];

        const approvals = await Promise.all(
            pendingApprovals.map(async (pendingApproval) => {
                const signer = signers.find((s) => s.locator() === pendingApproval.signer.locator);
                if (signer == null) {
                    throw new InvalidSignerError(`Signer ${pendingApproval.signer} not found in pending approvals`);
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
        walletsLogger.info("wallet.approve: waiting for transaction confirmation", { transactionId, timeoutMs });
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
