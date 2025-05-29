import type { ApiClient, CreateTransactionSuccessResponse, SolanaWalletLocator } from "../../api";
import type { SolanaNonCustodialSigner } from "../types/signers";
import type { VersionedTransaction } from "@solana/web3.js";
import { SolanaApprovalsService } from "./approvals-service";
import bs58 from "bs58";
import { STATUS_POLLING_INTERVAL_MS } from "../../utils/constants";
import { sleep } from "../../utils";
import type { Callbacks } from "../../utils/options";
import {
    TransactionAwaitingApprovalError,
    TransactionConfirmationTimeoutError,
    TransactionHashNotFoundError,
    TransactionNotAvailableError,
    TransactionNotCreatedError,
    TransactionSendingFailedError,
} from "../../utils/errors";

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
        await this.callbacks.onTransactionStart?.(params.transaction);
        const transaction = await this.create(params);
        await this.approveTransaction(transaction, [
            ...(params.signer != null ? [params.signer] : []),
            ...(params.additionalSigners || []),
        ]);
        const transactionHash = await this.waitForTransaction(transaction.id);
        await this.callbacks.onTransactionComplete?.(params.transaction);
        return transactionHash;
    }

    async getTransactions() {
        return await this.apiClient.getTransactions(this.walletLocator);
    }

    async approveTransaction(transaction: CreateTransactionSuccessResponse, signers: SolanaNonCustodialSigner[]) {
        if (transaction.status === "awaiting-approval") {
            await this.approvalsService.approve(transaction, transaction.approvals?.pending || [], signers);
        }
    }

    private async create(params: {
        transaction: VersionedTransaction;
        signer?: SolanaNonCustodialSigner;
        additionalSigners?: SolanaNonCustodialSigner[];
    }): Promise<CreateTransactionSuccessResponse> {
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
        if (transactionCreationResponse.error) {
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }
        return transactionCreationResponse;
    }

    async waitForTransaction(transactionId: string, timeoutMs = 60_000): Promise<string> {
        const startTime = Date.now();
        let transactionResponse;

        do {
            if (Date.now() - startTime > timeoutMs) {
                const error = new TransactionConfirmationTimeoutError("Transaction confirmation timeout");
                await this.callbacks.onTransactionFail?.(error);
                throw error;
            }

            transactionResponse = await this.apiClient.getTransaction(this.walletLocator, transactionId);
            if (transactionResponse.error) {
                throw new TransactionNotAvailableError(JSON.stringify(transactionResponse));
            }
            await sleep(STATUS_POLLING_INTERVAL_MS);
        } while (transactionResponse.status === "pending");

        if (transactionResponse.status === "failed") {
            const error = new TransactionSendingFailedError(
                `Transaction sending failed: ${JSON.stringify(transactionResponse.error)}`
            );
            await this.callbacks.onTransactionFail?.(error);
            throw error;
        }

        if (transactionResponse.status === "awaiting-approval") {
            const error = new TransactionAwaitingApprovalError(
                `Transaction is awaiting approval. Please submit required approvals before waiting for completion.`
            );
            await this.callbacks.onTransactionFail?.(error);
            throw error;
        }

        const transactionHash = transactionResponse.onChain.txId;
        if (transactionHash == null) {
            const error = new TransactionHashNotFoundError("Transaction hash not found on transaction response");
            await this.callbacks.onTransactionFail?.(error);
            throw error;
        }
        return transactionHash;
    }
}
