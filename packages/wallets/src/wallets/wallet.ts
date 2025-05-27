import { ApiClient, Balances, GetSignatureResponse } from "../api";
import { PendingApproval, Permission, WalletOptions } from "./types";
import {
    InvalidSignerError,
    SignatureNotAvailableError,
    SigningFailedError,
    TransactionAwaitingApprovalError,
    TransactionConfirmationTimeoutError,
    TransactionFailedError,
    TransactionHashNotFoundError,
    TransactionNotAvailableError,
    TransactionSendingFailedError,
    WalletTypeNotSupportedError,
} from "../utils/errors";
import { WalletNotAvailableError } from "../utils/errors";
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
    protected options?: WalletOptions;
    protected apiClient: ApiClient;

    constructor({ chain, address, owner, signer, options }: WalletContructorType<C>, apiClient: ApiClient) {
        this.apiClient = apiClient;
        this.chain = chain;
        this.address = address;
        this.owner = owner;
        this.signer = signer;
        this.options = options;
    }

    public static fromAPIResponse<C extends Chain>(args: WalletContructorType<C>, apiClient: ApiClient) {
        return new Wallet(args, apiClient);
    }

    protected static getApiClient<C extends Chain>(wallet: Wallet<C>): ApiClient {
        return wallet.apiClient;
    }

    protected static getOptions<C extends Chain>(wallet: Wallet<C>): WalletOptions | undefined {
        return wallet.options;
    }

    /**
     * Get the wallet balances
     * @param {string[]} params.tokens - The tokens
     * @returns {Promise<Balances>} The balances
     * @throws {Error} If the balances cannot be retrieved
     */
    public async balances(tokens: string[]): Promise<Balances> {
        const response = await this.apiClient.getBalance(this.address, {
            chains: [this.chain],
            tokens,
        });
        if ("error" in response) {
            throw new Error(`Failed to get balances for wallet: ${JSON.stringify(response.error)}`);
        }
        return response;
    }

    /**
     * Get the wallet NFTs
     * @param {Object} params - The parameters
     * @param {number} params.perPage - The number of NFTs per page
     * @param {number} params.page - The page number
     * @param {EvmWalletLocator} [params.locator] - The locator
     * @returns The NFTs
     * @unstable This API is unstable and may change in the future
     */
    public async unstable_nfts(params: { perPage: number; page: number }) {
        return await this.apiClient.unstable_getNfts({
            ...params,
            chain: this.chain,
            address: this.address,
        });
    }

    /**
     * Get the wallet transactions
     * @returns The transactions
     */
    public async unstable_transactions() {
        return await this.apiClient.getTransactions(this.walletLocator);
    }

    /**
     * Add a delegated signer to the wallet
     * @param signer - The signer
     * @returns The delegated signer
     */
    public async updatePermissions({ signer }: { signer: string }) {
        const response = await this.apiClient.registerSigner(
            this.walletLocator,
            {
                signer: signer,
                chain: this.chain === "solana" ? undefined : this.chain,
            }
        );

        if ("error" in response) {
            throw new Error(`Failed to register signer: ${JSON.stringify(response.error)}`);
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

    public async permissions(): Promise<Permission[]> {
        const walletResponse = await this.apiClient.getWallet(this.walletLocator);
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
                // If there's a colon, keep everything after it; otherwise treat the whole string as “rest”
                const address = colonIndex >= 0 ? signer.locator.slice(colonIndex + 1) : signer.locator;
                return {
                    signer: `external-wallet:${address}`,
                };
            }) ?? []
        );
    }

    protected get walletLocator(): string {
        if (this.apiClient.isServerSide) {
            return this.address;
        } else {
            return `me:${this.isSolanaWallet ? "solana-smart-wallet" : "evm-smart-wallet"}`;
        }
    }

    protected get isSolanaWallet(): boolean {
        return this.chain === "solana";
    }

    protected async approveAndWait(transactionId: string) {
        await this.approveTransaction(transactionId);
        return await this.waitForTransaction(transactionId);
    }

    // TODO: Fix signWithAdditionalSigners parameter
    protected async approveTransaction(
        transactionId: string,
        signWithAdditionalSigners?: (approval: PendingApproval) => Promise<{ signer: string; signature: string }[]>
    ) {
        const transaction = await this.apiClient.getTransaction(this.walletLocator, transactionId);

        if (transaction.error) {
            throw new TransactionNotAvailableError(JSON.stringify(transaction));
        }

        await this.options?.experimental_callbacks?.onTransactionStart?.();

        // API key signers approve automatically
        if (this.signer.type === "api-key") {
            return transaction;
        }

        const pendingApprovals = transaction.approvals?.pending;

        if (pendingApprovals == null) {
            return transaction;
        }

        const signerLocator = this.signer.locator();

        const pendingApproval = pendingApprovals.find(({ signer }: { signer: string }) => signer === signerLocator);

        if (!pendingApproval) {
            throw new InvalidSignerError(`Signer ${signerLocator} not found in pending approvals`);
        }

        const transactionToSign =
            transaction.walletType === "solana-smart-wallet"
                ? transaction.onChain.transaction
                : pendingApproval.message;

        const signature = await this.signer.signTransaction(transactionToSign);

        const approvedTransaction = await this.apiClient.approveTransaction(this.walletLocator, transaction.id, {
            approvals: [
                // @ts-ignore the generated types are wrong
                {
                    signer: signerLocator,
                    ...signature,
                },
                ...(signWithAdditionalSigners ? await signWithAdditionalSigners(pendingApproval) : []),
            ],
        });

        if (approvedTransaction.error) {
            throw new TransactionFailedError(JSON.stringify(approvedTransaction));
        }

        return approvedTransaction;
    }

    // This method is only applicable to EVM smart wallets
    protected async approveSignature(pendingApprovals: Array<PendingApproval>, signatureId: string) {
        const pendingApproval = pendingApprovals.find((approval) => approval.signer === this.signer.locator());
        if (!pendingApproval) {
            throw new InvalidSignerError(`Signer ${this.signer.locator()} not found in pending approvals`);
        }

        const signature = await this.signer.signMessage(pendingApproval.message);

        await this.apiClient.approveSignature(this.walletLocator, signatureId, {
            approvals: [
                // @ts-ignore the generated types are wrong
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
            signatureResponse = await this.apiClient.getSignature(
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

    protected async waitForTransaction(transactionId: string, timeoutMs = 60000): Promise<string> {
        const startTime = Date.now();
        let transactionResponse;

        do {
            if (Date.now() - startTime > timeoutMs) {
                const error = new TransactionConfirmationTimeoutError("Transaction confirmation timeout");
                throw error;
            }

            transactionResponse = await this.apiClient.getTransaction(this.walletLocator, transactionId);
            if (transactionResponse.error) {
                throw new TransactionNotAvailableError(JSON.stringify(transactionResponse));
            }
            // Wait for the polling interval
            await new Promise((resolve) => setTimeout(resolve, STATUS_POLLING_INTERVAL_MS));
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

        return transactionHash;
    }
}
