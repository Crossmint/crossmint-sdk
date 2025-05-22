import { ApiClient, Balances, GetSignatureResponse } from "../api";
import { PendingApproval, Permission } from "./types";
import {
    InvalidSignerError,
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
import { Chain } from "../chains/chains";
import { Signer } from "../signers/types";

type WalletContructorType<C extends Chain> = {
    chain: C;
    address: string;
    owner?: string;
    signer: Signer;
};

export class Wallet<C extends Chain> {
    chain: C;
    address: string;
    owner?: string;
    signer: Signer;
    protected apiClient: ApiClient;

    constructor(
        { chain, address, owner, signer }: WalletContructorType<C>,
        apiClient: ApiClient
    ) {
        this.apiClient = apiClient;
        this.chain = chain;
        this.address = address;
        this.owner = owner;
        this.signer = signer;
    }

    public static fromAPIResponse<C extends Chain>(
        { chain, address, owner, signer }: WalletContructorType<C>,
        apiClient: ApiClient
    ) {
        return new Wallet(
            {
                chain,
                address,
                owner,
                signer,
            },
            apiClient
        );
    }

    protected static getApiClient<C extends Chain>(
        wallet: Wallet<C>
    ): ApiClient {
        return wallet.apiClient;
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
            throw new Error(
                `Failed to get balances for wallet: ${JSON.stringify(
                    response.error
                )}`
            );
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
    public async grantPermission({ to }: { to: string }) {
        const response = await this.apiClient.registerSigner(
            this.walletLocator,
            {
                signer: to,
                chain: this.chain === "solana" ? undefined : this.chain,
            }
        );

        if ("transaction" in response && response.transaction?.id) {
            const transactionId = response.transaction.id;
            await this.approveAndWait(transactionId);
        } else {
            throw new Error("Failed to register signer");
        }
    }

    public async permissions(): Promise<Permission[]> {
        const walletResponse = await this.apiClient.getWallet(
            this.walletLocator
        );
        if ("error" in walletResponse) {
            throw new WalletNotAvailableError(JSON.stringify(walletResponse));
        }

        if (
            walletResponse.type !== "solana-smart-wallet" &&
            walletResponse.type !== "evm-smart-wallet"
        ) {
            throw new WalletTypeNotSupportedError(
                `Wallet type ${walletResponse.type} not supported`
            );
        }

        // Map wallet-type to simply wallet
        return (
            walletResponse?.config?.delegatedSigners?.map((signer) => {
                const colonIndex = signer.locator.indexOf(":");
                // If there's a colon, keep everything after it; otherwise treat the whole string as “rest”
                const address =
                    colonIndex >= 0
                        ? signer.locator.slice(colonIndex + 1)
                        : signer.locator;
                return {
                    to: `wallet:${address}`,
                };
            }) ?? []
        );
    }

    protected get walletLocator(): string {
        if (this.apiClient.isServerSide) {
            return this.address;
        } else {
            return `me:${
                this.isSolanaWallet ? "solana-smart-wallet" : "evm-smart-wallet"
            }`;
        }
    }

    protected get isSolanaWallet(): boolean {
        return this.chain === "solana";
    }

    protected async approveAndWait(transactionId: string) {
        await this.approve(transactionId);
        return await this.waitForTransaction(transactionId);
    }

    // TODO: Fix signWithAdditionalSigners parameter
    protected async approve(
        transactionId: string,
        signWithAdditionalSigners?: (
            approval: PendingApproval
        ) => Promise<{ signer: string; signature: string }[]>
    ) {
        const transaction = await this.apiClient.getTransaction(
            this.walletLocator,
            transactionId
        );

        if (transaction.error) {
            throw new TransactionNotAvailableError(JSON.stringify(transaction));
        }

        // API key signers approve automatically
        if (this.signer.type === "api-key") {
            return transaction;
        }

        const pendingApprovals = transaction.approvals?.pending;

        if (pendingApprovals == null) {
            return transaction;
        }

        const signerLocator = this.signer.legacyLocator();

        const pendingApproval = pendingApprovals.find(
            ({ signer }: { signer: string }) => signer === signerLocator
        );

        if (!pendingApproval) {
            throw new InvalidSignerError(
                `Signer ${signerLocator} not found in pending approvals`
            );
        }

        const signature = await this.signer.sign(pendingApproval.message);

        const approvedTransaction = await this.apiClient.approveTransaction(
            this.walletLocator,
            transaction.id,
            {
                approvals: [
                    {
                        signer: signerLocator,
                        // @ts-ignore it's the proper signature expected by the API
                        signature,
                    },
                    ...(signWithAdditionalSigners
                        ? await signWithAdditionalSigners(pendingApproval)
                        : []),
                ],
            }
        );

        if (approvedTransaction.error) {
            throw new TransactionFailedError(
                JSON.stringify(approvedTransaction)
            );
        }

        return approvedTransaction;
    }

    protected async waitForTransaction(
        transactionId: string,
        timeoutMs = 60000
    ): Promise<string> {
        const startTime = Date.now();
        let transactionResponse;

        do {
            if (Date.now() - startTime > timeoutMs) {
                const error = new TransactionConfirmationTimeoutError(
                    "Transaction confirmation timeout"
                );
                throw error;
            }

            transactionResponse = await this.apiClient.getTransaction(
                this.walletLocator,
                transactionId
            );
            if (transactionResponse.error) {
                throw new TransactionNotAvailableError(
                    JSON.stringify(transactionResponse)
                );
            }
            // Wait for the polling interval
            await new Promise((resolve) =>
                setTimeout(resolve, STATUS_POLLING_INTERVAL_MS)
            );
        } while (transactionResponse.status === "pending");

        if (transactionResponse.status === "failed") {
            const error = new TransactionSendingFailedError(
                `Transaction sending failed: ${JSON.stringify(
                    transactionResponse.error
                )}`
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
            const error = new TransactionHashNotFoundError(
                "Transaction hash not found on transaction response"
            );
            throw error;
        }

        return transactionHash;
    }
}
