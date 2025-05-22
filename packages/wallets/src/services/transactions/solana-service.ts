import type { VersionedTransaction } from "@solana/web3.js";
import type { ApiClient } from "../../api";
import type { SolanaSigner } from "@/types";
import { TransactionConfirmationTimeoutError } from "@/utils/errors";
import { STATUS_POLLING_INTERVAL_MS } from "@/utils/constants";
import { sleep } from "@/utils";

interface TransactionResponse {
    status: "pending" | "confirmed" | "failed";
    hash?: string;
    error?: string;
}

export class SolanaTransactionsService {
    constructor(
        private readonly walletLocator: string,
        private readonly apiClient: ApiClient
    ) {}

    public async getTransactions() {
        const transactions = await this.apiClient.getTransactions(this.walletLocator);
        if ("error" in transactions) {
            throw new Error(`Failed to get transactions: ${JSON.stringify(transactions.error)}`);
        }
        return transactions.transactions.filter((transaction) => transaction.walletType === "solana-smart-wallet");
    }

    public async createSignAndConfirm(params: {
        transaction: VersionedTransaction;
        signer?: SolanaSigner;
        additionalSigners?: SolanaSigner[];
    }): Promise<string> {
        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                transaction: Buffer.from(params.transaction.serialize()).toString("hex"),
                signer: params.signer?.address,
                requiredSigners: params.additionalSigners?.map((signer) => signer.address),
            },
        });

        if ("error" in transactionCreationResponse) {
            throw new Error(`Failed to create transaction: ${JSON.stringify(transactionCreationResponse.error)}`);
        }

        const transactionId = transactionCreationResponse.id;

        // Sign the transaction with admin signer if provided
        if (params.signer?.type === "external-wallet") {
            const signedTransaction = await params.signer.onSignTransaction(params.transaction);
            const signature = Buffer.from(signedTransaction.signatures[0]).toString("hex");

            await this.apiClient.approveTransaction(this.walletLocator, transactionId, {
                approvals: [
                    {
                        signer: params.signer.address,
                        signature,
                    },
                ],
            });
        }

        // Wait for transaction to be ready
        const startTime = Date.now();
        const timeoutMs = 60000; // 60 seconds timeout

        while (true) {
            if (Date.now() - startTime > timeoutMs) {
                throw new TransactionConfirmationTimeoutError("Transaction confirmation timeout");
            }

            const transactionResponse = await this.apiClient.getTransaction(this.walletLocator, transactionId);
            if ("error" in transactionResponse) {
                throw new Error(`Failed to get transaction: ${JSON.stringify(transactionResponse.error)}`);
            }

            const response = transactionResponse as TransactionResponse;
            if (response.status === "confirmed" && response.hash) {
                return response.hash;
            }
            if (response.status === "failed") {
                throw new Error(`Transaction failed: ${response.error || "Unknown error"}`);
            }

            await sleep(STATUS_POLLING_INTERVAL_MS);
        }
    }
}
