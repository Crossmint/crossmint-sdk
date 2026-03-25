import { isValidAddress, WithLoggerContext } from "@crossmint/common-sdk-base";
import type {
    Transfers,
    ApiClient,
    GetSignerResponse,
    GetSignatureResponse,
    GetBalanceSuccessResponse,
    WalletLocator,
    RegisterSignerChain,
    RegisterSignerParams,
    RegisterSignerPasskeyParams,
    GetTransactionSuccessResponse,
    GetTransactionsResponse,
    FundWalletResponse,
} from "../api";
import type {
    AddSignerOptions,
    AddSignerReturnType,
    Signer as WalletSigner,
    WalletOptions,
    UserLocator,
    Transaction,
    Balances,
    TokenBalance,
    SignerStatus,
    ApproveParams,
    ApproveOptions,
    Approval,
    Signature,
    ApproveResult,
    PrepareOnly,
    SendTokenTransactionOptions,
} from "./types";
import { getPendingSignerOperation, mapApiSignerToSigner } from "../utils/signer-mapping";
import {
    InvalidAddressError,
    InvalidSignerError,
    InvalidTransferAmountError,
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
    ExternalWalletRegistrationConfig,
    InternalSignerConfig,
    PasskeySignerConfig,
    ServerSignerConfig,
    ServerSignerLocator,
    SignerAdapter,
    SignerConfigForChain,
    SignerLocator,
} from "../signers/types";
import { assembleSigner } from "../signers";
import { NonCustodialSigner } from "../signers/non-custodial";
import { deriveServerSignerDetails } from "../signers/server";
import { walletsLogger } from "../logger";

import { getSignerLocator } from "../utils/signer-locator";
import { createDeviceSigner } from "@/utils/device-signers";

type WalletContructorType<C extends Chain> = {
    chain: C;
    address: string;
    owner?: string;
    alias?: string;
    options?: WalletOptions;
    recovery: SignerConfigForChain<C>;
    signers?: SignerConfigForChain<C>[];
    signer?: SignerAdapter;
};

export class Wallet<C extends Chain> {
    chain: C;
    address: string;
    owner?: string;
    alias?: string;
    #signer?: SignerAdapter;
    #options?: WalletOptions;
    #apiClient: ApiClient;
    #recovery: SignerConfigForChain<C>;
    #initialSigners: SignerConfigForChain<C>[];
    #needsRecovery = false;
    #deviceSignerApproved = false;
    #signerInitialization: Promise<void>;
    #recovering: Promise<void> | null = null;

    constructor(args: WalletContructorType<C>, apiClient: ApiClient) {
        const { chain, address, owner, options, alias, recovery, signers, signer } = args;
        this.#apiClient = apiClient;
        this.chain = chain;
        this.address = address;
        this.owner = owner;
        this.#options = options;
        this.alias = alias;
        this.#recovery = recovery;
        this.#initialSigners = signers ?? [];
        this.#signer = signer; // Can be set by useSigner
        this.#signerInitialization = this.initDefaultSigner();
    }

    public get signer(): SignerAdapter | undefined {
        return this.#signer;
    }

    /**
     * Initialize the device signer by resolving key availability.
     * If a device key is found locally, assembles the signer immediately.
     * If not, flags the wallet for recovery so a key is generated during the next transaction.
     * Device signers are not supported for Solana (Squads does not support device signer registration).
     */
    private async initDeviceSigner(): Promise<void> {
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null || this.chain === "solana") {
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
        this.#signer = await this.assembleFullSigner(internalConfig, deviceSignerKeyStorage);
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
        if (this.#signer != null) {
            return;
        }
        // Step 1: Try device signer (existing behavior)
        await this.initDeviceSigner();

        // If device signer was found or recovery is pending, we're done
        if (this.#signer != null || this.#needsRecovery) {
            return;
        }

        try {
            if (this.#initialSigners.length === 0) {
                // No delegated signers → try to use recovery signer (common on Solana and server-side)
                const internalConfig = this.buildInternalSignerConfig(this.#recovery);
                this.#signer = await this.assembleFullSigner(internalConfig);
            } else if (this.#initialSigners.length === 1) {
                // Exactly 1 auto-assemblable signer → use it
                const internalConfig = this.buildInternalSignerConfig(this.#initialSigners[0]);
                this.#signer = await this.assembleFullSigner(internalConfig);
            }
            // >1 signers → leave #signer undefined, user must call useSigner()
        } catch (error) {
            walletsLogger.warn("wallet.initDefaultSigner.autoAssemblyFailed", {
                recoveryType: this.#recovery.type,
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

    protected static getRecovery<C extends Chain>(wallet: Wallet<C>): SignerConfigForChain<C> {
        return wallet.#recovery;
    }

    protected static getInitialSigners<C extends Chain>(wallet: Wallet<C>): SignerConfigForChain<C>[] {
        return wallet.#initialSigners;
    }

    public get apiClient(): ApiClient {
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
    public async transfers(params?: { tokens?: string; status?: "successful" | "failed" }): Promise<Transfers> {
        const resolvedChain = this.resolveChainForEnvironment();
        const response = await this.apiClient.getTransfers(this.walletLocator, {
            chain: resolvedChain,
            tokens: params?.tokens,
            status: params?.status,
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
        const walletSigner = this.requireSigner();

        let signer: string;
        if (options?.signer == null) {
            signer = walletSigner.locator();
        } else if (typeof options.signer === "string") {
            signer = options.signer;
        } else {
            signer = `server:${deriveServerSignerDetails(options.signer, this.chain, this.#apiClient.projectId, this.#apiClient.environment).derivedAddress}`;
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

        // Device signers are not supported for Solana wallets
        if (signer.type === "device" && this.chain === "solana") {
            throw new InvalidSignerError(
                "Device signers are not currently supported for Solana wallets. Contact sales (https://www.crossmint.com/contact/sales) for access."
            );
        }

        // Resolve server signer config to locator string
        const resolvedSigner =
            typeof signer === "object" && "type" in signer && signer.type === "server"
                ? (`server:${deriveServerSignerDetails(signer, this.chain, this.#apiClient.projectId, this.#apiClient.environment).derivedAddress}` as const)
                : signer;

        // Store original signer and swap to recovery signer for the registration
        const originalSigner = this.signer;
        const recoveryInternalConfig = this.buildInternalSignerConfig(this.#recovery);
        this.#signer = assembleSigner(this.chain, recoveryInternalConfig, this.#options?.deviceSignerKeyStorage);

        try {
            // For server signers, resolvedSigner is already a locator string.
            // For passkeys, always pass the full config so the API receives the publicKey.
            // For everything else, convert to a locator string via getSignerLocator.
            const signerInput =
                typeof resolvedSigner === "string"
                    ? resolvedSigner
                    : resolvedSigner.type === "passkey"
                      ? resolvedSigner
                      : resolvedSigner.type === "device" &&
                          "publicKey" in resolvedSigner &&
                          resolvedSigner.publicKey != null
                        ? {
                              type: "device" as const,
                              publicKey: resolvedSigner.publicKey,
                              name: (resolvedSigner as DeviceSignerConfig).name,
                          }
                        : getSignerLocator(resolvedSigner);

            const response = await this.#apiClient.registerSigner(this.walletLocator, {
                signer: signerInput as RegisterSignerParams["signer"],
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

            const registeredSigner = mapApiSignerToSigner(response, this.chain);

            if (this.chain === "solana" || this.chain === "stellar") {
                if (!("transaction" in response) || response.transaction == null) {
                    walletsLogger.error("wallet.addSigner.error", {
                        error: "Expected transaction in response for Solana/Stellar chain",
                    });
                    throw new Error("Expected transaction in response for Solana/Stellar chain");
                }

                const transactionId = response.transaction.id;

                if (registeredSigner == null) {
                    throw new Error(`No approval found for chain ${this.chain} in register signer response`);
                }

                if (options?.prepareOnly) {
                    walletsLogger.info("wallet.addSigner.prepared", {
                        transactionId,
                    });
                    return { ...registeredSigner, transactionId } as any;
                }

                await this.approveTransactionAndWait(transactionId);
                walletsLogger.info("wallet.addSigner.success", {
                    transactionId,
                });
                return { ...registeredSigner, status: "success" as const } as any;
            } else {
                if (!("chains" in response)) {
                    walletsLogger.error("wallet.addSigner.error", {
                        error: "Expected chains in response for EVM chain",
                    });
                    throw new Error("Expected chains in response for EVM chain");
                }

                const chainResponse = response.chains?.[this.chain];

                if (registeredSigner == null) {
                    throw new Error(`No approval found for chain ${this.chain} in register signer response`);
                }

                const pendingOperation = getPendingSignerOperation(response, this.chain);

                if (options?.prepareOnly) {
                    const signatureId = pendingOperation?.type === "signature" ? pendingOperation.id : undefined;
                    walletsLogger.info("wallet.addSigner.prepared", {
                        signatureId,
                    });
                    return { ...registeredSigner, signatureId } as any;
                }

                if (pendingOperation?.type === "signature") {
                    await this.approveSignatureAndWait(pendingOperation.id);
                    walletsLogger.info("wallet.addSigner.success", {
                        signatureId: pendingOperation.id,
                    });
                } else if (chainResponse?.status === "failed") {
                    throw new Error(`Signer registration failed for chain ${this.chain}`);
                } else {
                    walletsLogger.info("wallet.addSigner.success");
                }

                return { ...registeredSigner, status: "success" as const } as any;
            }
        } finally {
            this.#signer = originalSigner;
        }
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
        this.validateSignerInput(signer);

        if (signer.type === "device") {
            await this.resolveDeviceSignerAvailability(signer);
        } else {
            await this.resolveNonDeviceSigner(signer);
        }

        const internalConfig = this.buildInternalSignerConfig(signer);
        const signerLocator = getSignerLocator(signer);
        this.#signer = await this.assembleFullSigner(internalConfig);
        walletsLogger.info("wallet.useSigner.success", { signerLocator });
    }

    /**
     * Resolve a non-device signer: check registration first, then fall back to recovery.
     * For passkeys without an explicit credential id, auto-selects from registered signers.
     */
    private async resolveNonDeviceSigner(signer: SignerConfigForChain<C>): Promise<void> {
        // Passkey without id: try to auto-select from registered signers
        if (signer.type === "passkey" && this.isPasskeyMissingId(signer)) {
            const selected = await this.tryAutoSelectPasskey(signer);
            if (!selected) {
                // No registered passkeys — use recovery if this is the recovery signer
                if (this.isRecoverySigner(signer)) {
                    this.#needsRecovery = false;
                    return;
                }
                throw new Error("No passkey signer is registered on this wallet.");
            }
        }

        // Check if this is a registered signer
        const locator = this.resolveSignerLocator(signer);
        if (await this.signerIsRegistered(locator)) {
            this.#needsRecovery = false;
            return;
        }

        // Not a registered signer — fall back to recovery
        if (this.isRecoverySigner(signer)) {
            this.#needsRecovery = false;
            return;
        }

        throw new Error(`Signer "${locator}" is not registered in this wallet.`);
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
    private resolveSignerLocator(signer: SignerConfigForChain<C>): string {
        if (signer.type === "server") {
            const { derivedAddress } = deriveServerSignerDetails(
                signer,
                this.chain,
                this.#apiClient.projectId,
                this.#apiClient.environment
            );
            return `server:${derivedAddress}`;
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
        const existingSigners = await this.signers();
        return existingSigners.some((s) => s.locator === signerLocator);
    }

    /**
     * Check if a signer is approved and usable for the current wallet chain.
     * @param signerLocator - The locator of the signer to check
     * @returns true if the signer is approved for this chain
     */
    public async isSignerApproved(signerLocator: SignerLocator | string): Promise<boolean> {
        const signerState = await this.getSignerState(signerLocator as SignerLocator);
        return this.isApprovedSignerStatus(signerState.signer?.status);
    }

    private isApprovedSignerStatus(status: SignerStatus | undefined): boolean {
        return status === "success" || status === "active";
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

        if (this.#signer == null) {
            await this.initDeviceSigner();
        }

        if (this.#signer?.type !== "device") {
            walletsLogger.warn("wallet.recover.skipped", { reason: "Recovery is only supported for device signers" });
            return;
        }

        // Fast-path: skip the API call if we've already verified the device signer is approved
        if (this.#deviceSignerApproved) {
            walletsLogger.info("wallet.recover.skipped", { reason: "Device signer already approved (cached)" });
            return;
        }

        const deviceSigner = this.#signer;
        const markDeviceSignerApproved = () => {
            this.#needsRecovery = false;
            this.#deviceSignerApproved = true;
        };
        const isAlreadyApprovedDeviceSignerError = (error: unknown): boolean => {
            if (!(error instanceof Error)) {
                return false;
            }

            return error.message.includes("Delegated signer") && error.message.includes("already 'approved'");
        };

        if (this.isApprovedSignerStatus(deviceSigner.status)) {
            walletsLogger.info("wallet.recover.skipped", { reason: "Device signer already approved" });
            markDeviceSignerApproved();
            return;
        }

        const signerState = await this.getSignerState(deviceSigner.locator());
        deviceSigner.status = signerState.signer?.status;

        if (signerState.pendingOperation != null) {
            const originalSigner = this.#signer;
            const recoveryInternalConfig = this.buildInternalSignerConfig(this.#recovery);
            this.#signer = assembleSigner(this.chain, recoveryInternalConfig, this.#options?.deviceSignerKeyStorage);

            try {
                if (signerState.pendingOperation.type === "signature") {
                    await this.approveSignatureAndWait(signerState.pendingOperation.id);
                } else {
                    await this.approveTransactionAndWait(signerState.pendingOperation.id);
                }
            } finally {
                this.#signer = originalSigner;
            }
            deviceSigner.status = "success";
            walletsLogger.info("wallet.recover.device.success", {
                signerLocator: deviceSigner.locator(),
                resumed: true,
            });
            markDeviceSignerApproved();
            return;
        }

        if (this.isApprovedSignerStatus(deviceSigner.status)) {
            walletsLogger.info("wallet.recover.skipped", { reason: "Device signer already approved" });
            markDeviceSignerApproved();
            return;
        }

        // Generate a new device signer key
        const deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage;
        if (deviceSignerKeyStorage == null) {
            throw new Error("Device signer key storage is required to recover a device signer");
        }
        const newDeviceSigner = await createDeviceSigner(deviceSignerKeyStorage, this.address);

        try {
            await this.addSigner(newDeviceSigner as SignerConfigForChain<C>);
        } catch (error) {
            if (isAlreadyApprovedDeviceSignerError(error)) {
                walletsLogger.info("wallet.recover.skipped", {
                    reason: "Device signer already approved",
                    signerLocator: newDeviceSigner.locator,
                });
            } else {
                walletsLogger.error("wallet.recover.device.error", { error });
                await deviceSignerKeyStorage.deleteKey(this.address);
                throw error;
            }
        }

        // Reassemble device signer with the resolved locator. This also covers the
        // idempotent case where the backend reports the signer is already approved.
        this.#signer = await this.assembleFullSigner(
            {
                type: "device",
                locator: newDeviceSigner.locator as SignerLocator,
                address: this.address,
            } as InternalSignerConfig<C>,
            deviceSignerKeyStorage
        );
        if (this.#signer.type === "device") {
            this.#signer.status = "success";
        }
        walletsLogger.info("wallet.recover.device.success", { signerLocator: newDeviceSigner.locator });

        markDeviceSignerApproved();
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

        const configSigners = walletResponse?.config?.delegatedSigners ?? [];

        const signersWithStatus = await Promise.all(
            configSigners.map(async (configSigner) => {
                try {
                    const signerState = await this.getSignerState(configSigner.locator as SignerLocator);
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
    protected requireSigner(): SignerAdapter {
        if (this.#signer == null) {
            if (this.#initialSigners.length > 1) {
                throw new Error(
                    "No signer is set. This wallet has multiple signers configured. " +
                        "Call wallet.useSigner() to select which signer to use before signing operations."
                );
            }
            if (this.#recovery.type === "server") {
                throw new Error(
                    "No signer is set. Server wallets require calling wallet.useSigner() with the server secret before signing operations.\n" +
                        'Example: wallet.useSigner({ type: "server", secret: process.env.YOUR_SERVER_SECRET })'
                );
            }
            if (this.#recovery.type === "external-wallet") {
                throw new Error(
                    "No signer is set. External wallet signers require calling wallet.useSigner() with the onSign callback before signing operations.\n" +
                        'Example: wallet.useSigner({ type: "external-wallet", address: "0x...", onSign: async (tx) => ... })'
                );
            }
            throw new Error(
                "This wallet is read-only because no signer was provided. Operations that require signing (send, approve, addSigner, etc.) are not available."
            );
        }
        return this.#signer;
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
        const signer = this.requireSigner();
        if (signer instanceof NonCustodialSigner) {
            await signer.ensureAuthenticated();
        }
    }

    /**
     * Check if a signer config matches the wallet's recovery signer.
     */
    private isRecoverySigner(signerConfig: SignerConfigForChain<C>): boolean {
        const recovery = this.#recovery;
        if (recovery == null) {
            return false;
        }
        if (recovery.type !== signerConfig.type) {
            return false;
        }

        // Device signers cannot be recovery signers
        if (signerConfig.type === "device") {
            return false;
        }

        // For passkey signers, compare by type only.
        // The API-sourced recovery config has shape {type: "passkey"} without a credential id,
        // so locator comparison would fail ("passkey" vs "passkey:{id}").
        // We can't distinguish recovery vs delegated passkeys by id alone since the
        // developer may pass an id that belongs to either the recovery or a delegated passkey.
        if (signerConfig.type === "passkey") {
            return true; // type already matches from the check above
        }

        // For server signers, compare derived addresses.
        // The API-sourced recovery config has shape {type: "server", address: "0x..."} (no secret),
        // so we use the address directly instead of re-deriving it.
        if (signerConfig.type === "server" && recovery.type === "server") {
            const inputDerived = deriveServerSignerDetails(
                signerConfig,
                this.chain,
                this.#apiClient.projectId,
                this.#apiClient.environment
            ).derivedAddress;
            const recoveryDerived = deriveServerSignerDetails(
                recovery,
                this.chain,
                this.#apiClient.projectId,
                this.#apiClient.environment
            ).derivedAddress;
            return inputDerived === recoveryDerived;
        }

        // For other types, compare locators
        return getSignerLocator(signerConfig) === getSignerLocator(recovery);
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
                if (!("onSign" in config) || typeof config.onSign !== "function") {
                    throw new Error("External wallet signer requires an onSign callback");
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

    private async assembleFullSigner(
        internalConfig: InternalSignerConfig<C>,
        deviceSignerKeyStorage = this.#options?.deviceSignerKeyStorage
    ): Promise<SignerAdapter> {
        const signer = assembleSigner(this.chain, internalConfig, deviceSignerKeyStorage);
        const signerState = await this.getSignerState(signer.locator());
        signer.status = signerState.signer?.status;
        return signer;
    }

    private async getSignerState(signerLocator: SignerLocator): Promise<{
        response: GetSignerResponse | null;
        signer: WalletSigner | null;
        pendingOperation: { type: "signature" | "transaction"; id: string } | null;
    }> {
        let signerResponse: GetSignerResponse | null = null;
        try {
            signerResponse = await this.#apiClient.getSigner(this.walletLocator, signerLocator);
        } catch {
            return { response: null, signer: null, pendingOperation: null };
        }

        if (signerResponse == null || typeof signerResponse !== "object" || "error" in signerResponse) {
            return { response: null, signer: null, pendingOperation: null };
        }

        const signer = mapApiSignerToSigner(signerResponse, this.chain);
        return {
            response: signerResponse,
            signer,
            pendingOperation: getPendingSignerOperation(signerResponse, this.chain),
        };
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
                    onAuthRequired: this.#options?.callbacks?.onAuthRequired,
                } as InternalSignerConfig<C>;
            case "phone":
                return {
                    type: "phone",
                    phone: config.phone,
                    locator: `phone:${config.phone}` as SignerLocator,
                    address: this.address,
                    crossmint: this.#apiClient.crossmint,
                    clientTEEConnection: this.#options?.clientTEEConnection,
                    onAuthRequired: this.#options?.callbacks?.onAuthRequired,
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
            case "server": {
                const { derivedKeyBytes, derivedAddress } = deriveServerSignerDetails(
                    config,
                    this.chain,
                    this.#apiClient.projectId,
                    this.#apiClient.environment
                );
                return {
                    type: "server",
                    derivedKeyBytes,
                    locator: `server:${derivedAddress}` as ServerSignerLocator,
                    address: derivedAddress,
                } as InternalSignerConfig<C>;
            }
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

        const stellarTransactionHash =
            "txHash" in transactionResponse.onChain && typeof transactionResponse.onChain.txHash === "string"
                ? transactionResponse.onChain.txHash
                : undefined;
        const transactionHash = transactionResponse.onChain.txId ?? stellarTransactionHash;
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
        if (!isValidAddress(to)) {
            throw new InvalidAddressError(
                `Invalid recipient address: "${to}". Expected a valid EVM (0x...), Solana (base58), or Stellar (G.../C...) address.`
            );
        }
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
