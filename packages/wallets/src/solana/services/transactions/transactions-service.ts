import type { ApiClient, SolanaWalletLocator } from "../../../api";
import type { SolanaNonCustodialSigner } from "../../types/signers";
import type { VersionedTransaction } from "@solana/web3.js";
import { SolanaApprovalsService } from "../approvals/approvals-service";
import bs58 from "bs58";
import { STATUS_POLLING_INTERVAL_MS } from "../../../utils/constants";
import { sleep } from "../../../utils";

export class SolanaTransactionsService {
    constructor(
        private readonly walletLocator: SolanaWalletLocator,
        private readonly apiClient: ApiClient,
        private readonly approvalsService: SolanaApprovalsService = new SolanaApprovalsService(
            walletLocator,
            apiClient
        )
    ) {}

    public async createSignAndConfirm(params: {
        transaction: VersionedTransaction;
        signer?: SolanaNonCustodialSigner;
        additionalSigners?: SolanaNonCustodialSigner[];
    }) {
        const transaction = await this.create(params);
        if (
            transaction.approvals?.pending != null &&
            transaction.approvals?.pending.length > 0
        ) {
            await this.approvalsService.approve(
                transaction.id,
                transaction.approvals?.pending || [],
                [
                    ...(params.signer != null ? [params.signer] : []),
                    ...(params.additionalSigners || []),
                ]
            );
        }
        return this.waitForTransaction(transaction.id);
    }

    public async getTransactions() {
        return await this.apiClient.getTransactions(this.walletLocator);
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
                      additionalSigners: additionalSigners.map(
                          (s) => s.address
                      ),
                  }
                : {}),
        };

        const transactionCreationResponse =
            await this.apiClient.createTransaction(this.walletLocator, {
                params: transactionParams,
            });
        return transactionCreationResponse;
    }

    private async waitForTransaction(
        transactionId: string,
        timeoutMs = 60000
    ): Promise<string> {
        const startTime = Date.now();
        let transactionResponse;

        do {
            if (Date.now() - startTime > timeoutMs) {
                throw new Error("Transaction confirmation timeout");
            }

            transactionResponse = await this.apiClient.getTransaction(
                this.walletLocator,
                transactionId
            );
            await sleep(STATUS_POLLING_INTERVAL_MS);
        } while (transactionResponse.status === "pending");

        if (transactionResponse.status === "failed") {
            throw new Error(
                `Transaction sending failed: ${JSON.stringify(
                    transactionResponse.error
                )}`
            );
        }

        const transactionHash = transactionResponse.onChain.txId;
        if (transactionHash == null) {
            throw new Error(
                "Transaction hash not found on transaction response"
            );
        }
        return transactionHash;
    }
}
