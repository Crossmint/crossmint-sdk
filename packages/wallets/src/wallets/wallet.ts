import { getEnvironmentForKey, isValidAddress } from "@crossmint/common-sdk-base";
import type {
    Activity,
    ApiClient,
    GetSignatureResponse,
    GetTransactionSuccessResponse,
    GetBalanceSuccessResponse,
} from "../api";
import type {
    PendingApproval,
    DelegatedSigner,
    WalletOptions,
    UserLocator,
    Transaction,
    Balances,
    TokenBalance,
} from "./types";
import {
    InvalidSignerError,
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

    constructor({ chain, address, owner, signer, options }: WalletContructorType<C>, apiClient: ApiClient) {
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
     * Get the wallet balances - always includes USDC and native token (ETH/SOL)
     * @param {string[]} tokens - Additional tokens to request (optional: native token and usdc are always included)
     * @param {Chain[]} chains - The chains (optional)
     * @returns {Promise<Balances>} The balances returns nativeToken, usdc, tokens
     * @throws {Error} If the balances cannot be retrieved
     */
    public async balances(tokens?: string[], chains?: Chain[]): Promise<Balances> {
        const nativeToken = this.chain === "solana" ? "sol" : "eth";
        const allTokens = [nativeToken, "usdc", ...(tokens ?? [])];

        const response = await this.#apiClient.getBalance(this.address, {
            chains: chains ?? [this.chain],
            tokens: allTokens.map((token) => token.toLowerCase()),
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
        nativeTokenSymbol: TokenBalance["symbol"],
        requestedTokens?: string[]
    ): Balances {
        const transformTokenBalance = (tokenData: GetBalanceSuccessResponse[number]): TokenBalance => {
            let contractAddress: string | undefined;
            const chainData = tokenData.forChain?.[this.chain];
            if (chainData && "contractAddress" in chainData) {
                contractAddress = chainData.contractAddress;
            }

            return {
                symbol: tokenData.token,
                name: tokenData.token, // API doesn't provide name, using symbol as fallback
                amount: tokenData.amount ?? "0",
                contractAddress,
                decimals: tokenData.decimals,
                rawAmount: tokenData.rawAmount ?? "0",
            };
        };

        const nativeTokenData = apiResponse.find(
            (token) => token.token === nativeTokenSymbol || token.token.toLowerCase().includes(nativeTokenSymbol)
        );
        const usdcData = apiResponse.find((token) => token.token.toLowerCase().includes("usdc"));

        const otherTokens = apiResponse.filter((token) => {
            const tokenLower = token.token.toLowerCase();
            return (
                !tokenLower.includes(nativeTokenSymbol) &&
                !tokenLower.includes("usdc") &&
                requestedTokens?.some((reqToken) => tokenLower.includes(reqToken.toLowerCase()))
            );
        });

        const createDefaultToken = (symbol: TokenBalance["symbol"]): TokenBalance => ({
            symbol,
            name: symbol,
            amount: "0",
            contractAddress: undefined,
            decimals: 0,
            rawAmount: "0",
        });

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
     * @param {EvmWalletLocator} [params.locator] - The locator
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
     */
    public async experimental_transactions() {
        return await this.#apiClient.getTransactions(this.walletLocator);
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
     * @returns {Transaction} The transaction
     */
    public async send(to: string | UserLocator, token: string, amount: string) {
        const recipient = toRecipientLocator(to);
        const tokenLocator = toTokenLocator(token, this.chain);
        const params = { recipient, amount };
        const transactionCreationResponse = await this.#apiClient.send(this.walletLocator, tokenLocator, params);
        if ("message" in transactionCreationResponse) {
            throw new TransactionNotCreatedError(
                `Failed to send token: ${JSON.stringify(transactionCreationResponse.message)}`
            );
        }
        return await this.approveAndWait(transactionCreationResponse.id);
    }

    /**
     * Add a delegated signer to the wallet
     * @param signer - The signer
     * @returns The delegated signer
     */
    public async addDelegatedSigner({ signer }: { signer: string }) {
        const response = await this.#apiClient.registerSigner(this.walletLocator, {
            signer: signer,
            chain: this.chain === "solana" ? undefined : this.chain,
        });

        if ("error" in response) {
            throw new Error(`Failed to register signer: ${JSON.stringify(response.message)}`);
        }

        if ("transaction" in response) {
            // Solana has "transaction" in response
            const transactionId = response.transaction.id;
            await this.approveAndWait(transactionId);
        } else {
            // EVM has "chains" in response
            const chainResponse = response.chains?.[this.chain];
            if (chainResponse?.status === "awaiting-approval") {
                const pendingApproval = chainResponse.approvals?.pending || [];
                await this.approveSignature(pendingApproval, chainResponse.id);
                await this.waitForSignature(chainResponse.id);
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

        if (walletResponse.type !== "solana-smart-wallet" && walletResponse.type !== "evm-smart-wallet") {
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

    protected get walletLocator(): string {
        if (this.#apiClient.isServerSide) {
            return this.address;
        } else {
            return `me:${this.isSolanaWallet ? "solana-smart-wallet" : "evm-smart-wallet"}`;
        }
    }

    protected get isSolanaWallet(): boolean {
        return this.chain === "solana";
    }

    protected async approveAndWait(transactionId: string, additionalSigners?: Signer[]) {
        await this.approveTransaction(transactionId, additionalSigners);
        await this.sleep(1_000); // Rule of thumb: tx won't be confirmed in less than 1 second
        return await this.waitForTransaction(transactionId);
    }

    protected async approveTransaction(transactionId: string, additionalSigners?: Signer[]) {
        const transaction = await this.#apiClient.getTransaction(this.walletLocator, transactionId);

        if (transaction.error) {
            throw new TransactionNotAvailableError(JSON.stringify(transaction));
        }

        await this.#options?.experimental_callbacks?.onTransactionStart?.();

        // API key signers approve automatically
        if (this.signer.type === "api-key") {
            return transaction;
        }

        const pendingApprovals = transaction.approvals?.pending;

        if (pendingApprovals == null) {
            return transaction;
        }

        const signers = [...(additionalSigners ?? []), this.signer];

        const signedApprovals = await Promise.all(
            pendingApprovals.map((pendingApproval) => {
                const signer = signers.find((s) => s.locator() === pendingApproval.signer);
                if (signer == null) {
                    throw new InvalidSignerError(`Signer ${pendingApproval.signer} not found in pending approvals`);
                }
                const transactionToSign =
                    transaction.walletType === "solana-smart-wallet"
                        ? transaction.onChain.transaction
                        : pendingApproval.message;

                return signer.signTransaction(transactionToSign);
            })
        );

        const approvedTransaction = await this.#apiClient.approveTransaction(this.walletLocator, transaction.id, {
            approvals: signedApprovals.map((signature) => ({
                signer: this.signer.locator(),
                ...signature,
            })),
        });

        if (approvedTransaction.error) {
            throw new TransactionFailedError(JSON.stringify(approvedTransaction));
        }

        return approvedTransaction;
    }

    // This method is only applicable to EVM smart wallets
    protected async approveSignature(pendingApprovals: Array<PendingApproval>, signatureId: string) {
        if (this.isSolanaWallet) {
            throw new Error("Approving signatures is only supported for EVM smart wallets");
        }

        const pendingApproval = pendingApprovals.find((approval) => approval.signer === this.signer.locator());
        if (!pendingApproval) {
            throw new InvalidSignerError(`Signer ${this.signer.locator()} not found in pending approvals`);
        }

        const signature = await this.signer.signMessage(pendingApproval.message);

        await this.#apiClient.approveSignature(this.walletLocator, signatureId, {
            approvals: [
                {
                    signer: this.signer.locator(),
                    ...signature,
                },
            ],
        });

        return signature;
    }

    protected async waitForSignature(signatureId: string): Promise<string> {
        let signatureResponse: GetSignatureResponse | null = null;

        do {
            await new Promise((resolve) => setTimeout(resolve, STATUS_POLLING_INTERVAL_MS));
            signatureResponse = await this.#apiClient.getSignature(
                // @ts-ignore id type is wrong
                this.walletLocator,
                signatureId
            );
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

        return signatureResponse.outputSignature;
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
    ): Promise<Transaction> {
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
            explorerLink: toTxExplorerLink(transactionResponse, this.apiClient.crossmint.apiKey),
        };
    }

    protected async sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

function toTxExplorerLink(transactionResponse: GetTransactionSuccessResponse, apiKey: string) {
    let explorerLink: string | undefined;
    if (transactionResponse.walletType === "evm-smart-wallet") {
        explorerLink = transactionResponse.onChain.explorerLink;
    } else if (transactionResponse.walletType === "solana-smart-wallet") {
        const queryParams = new URLSearchParams();
        const env = getEnvironmentForKey(apiKey);
        if (env !== "production") {
            queryParams.append("cluster", "devnet");
        }
        explorerLink = `https://explorer.solana.com/tx/${transactionResponse.onChain.txId}?${queryParams.toString()}`;
    }
    if (explorerLink == null || explorerLink === "") {
        explorerLink = "Explorer link not available";
    }
    return explorerLink;
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
