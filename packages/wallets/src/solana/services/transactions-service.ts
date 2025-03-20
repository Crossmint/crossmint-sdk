import type { ApiClient, SolanaWalletLocator } from "../../api";
import type { SolanaNonCustodialSigner } from "../types/signers";
import type { VersionedTransaction } from "@solana/web3.js";
import { SolanaApprovalsService } from "./approvals-service";
import bs58 from "bs58";
import { STATUS_POLLING_INTERVAL_MS } from "../../utils/constants";
import { sleep } from "../../utils";
import type { Callbacks } from "../../utils/options";

export class SolanaTransactionsService {
    constructor(
        private readonly walletLocator: SolanaWalletLocator,
        private readonly apiClient: ApiClient,
        private readonly approvalsService: SolanaApprovalsService = new SolanaApprovalsService(
            walletLocator,
            apiClient
        ),
        private readonly callbacks: Callbacks = {}
    ) {}

    async createSignAndConfirm(params: {
        transaction: VersionedTransaction;
        signer?: SolanaNonCustodialSigner;
        additionalSigners?: SolanaNonCustodialSigner[];
    }) {
        this.callbacks.onTransactionStart?.(params.transaction);
        const transaction = await this.create(params);
        await this.approveTransaction(transaction.id, [
            ...(params.signer != null ? [params.signer] : []),
            ...(params.additionalSigners || []),
        ]);
        const transactionHash = await this.waitForTransaction(transaction.id);
        this.callbacks.onTransactionComplete?.(params.transaction);
        return transactionHash;
    }

    async getTransactions() {
        return await this.apiClient.getTransactions(this.walletLocator);
    }

    async approveTransaction(transactionId: string, signers: SolanaNonCustodialSigner[]) {
        const transaction = await this.apiClient.getTransaction(this.walletLocator, transactionId);
        if (transaction.status === "awaiting-approval") {
            await this.approvalsService.approve(transaction.id, transaction.approvals?.pending || [], signers);
        }
    }

    private async create(params: {
        transaction: VersionedTransaction;
        signer?: SolanaNonCustodialSigner;
        additionalSigners?: SolanaNonCustodialSigner[];
    }) {
        const { transaction, signer, additionalSigners } = params;
        const transactionParams = {
            transaction: bs58.encode(transaction.serialize()),
            ...(signer ? { signer: signer.address } : {}),
            ...(additionalSigners
                ? {
                      additionalSigners: additionalSigners.map((s) => s.address),
                  }
                : {}),
        };

        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: transactionParams,
        });
        return transactionCreationResponse;
    }

    async waitForTransaction(transactionId: string, timeoutMs = 60000): Promise<string> {
        const startTime = Date.now();
        let transactionResponse;

        do {
            if (Date.now() - startTime > timeoutMs) {
                const error = new Error("Transaction confirmation timeout");
                this.callbacks.onTransactionFail?.(error);
                throw error;
            }

            transactionResponse = await this.apiClient.getTransaction(this.walletLocator, transactionId);
            await sleep(STATUS_POLLING_INTERVAL_MS);
        } while (transactionResponse.status === "pending");

        if (transactionResponse.status === "failed") {
            const error = new Error(`Transaction sending failed: ${JSON.stringify(transactionResponse.error)}`);
            this.callbacks.onTransactionFail?.(error);
            throw error;
        }

        if (transactionResponse.status === "awaiting-approval") {
            const error = new Error(
                `Transaction is awaiting approval. Please submit required approvals before waiting for completion.`
            );
            this.callbacks.onTransactionFail?.(error);
            throw error;
        }

        const transactionHash = transactionResponse.onChain.txId;
        if (transactionHash == null) {
            const error = new Error("Transaction hash not found on transaction response");
            this.callbacks.onTransactionFail?.(error);
            throw error;
        }
        return transactionHash;
    }
}
