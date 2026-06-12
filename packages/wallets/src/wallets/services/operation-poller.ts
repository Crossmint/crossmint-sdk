import type { ApiClient, GetSignatureResponse, WalletLocator } from "../../api";
import type { Signature, Transaction } from "../types";
import {
    SignatureNotAvailableError,
    SigningFailedError,
    TransactionAwaitingApprovalError,
    TransactionConfirmationTimeoutError,
    TransactionHashNotFoundError,
    TransactionNotAvailableError,
    TransactionSendingFailedError,
} from "../../utils/errors";
import { STATUS_POLLING_INTERVAL_MS } from "../../utils/constants";
import { walletsLogger } from "../../logger";

export type PollingOptions = {
    timeoutMs?: number;
    initialBackoffMs?: number;
    backoffMultiplier?: number;
    maxBackoffMs?: number;
};

export async function waitForTransactionCompletion(
    apiClient: ApiClient,
    walletLocator: WalletLocator,
    transactionId: string,
    options?: PollingOptions
): Promise<Transaction<false>> {
    const { timeoutMs = 60_000, backoffMultiplier = 1.1, maxBackoffMs = 2_000 } = options ?? {};
    let { initialBackoffMs = STATUS_POLLING_INTERVAL_MS } = options ?? {};

    walletsLogger.info("wallet.approve: waiting for transaction confirmation", { transactionId, timeoutMs });
    const startTime = Date.now();
    let transactionResponse;

    do {
        if (Date.now() - startTime > timeoutMs) {
            const error = new TransactionConfirmationTimeoutError("Transaction confirmation timeout");
            throw error;
        }

        transactionResponse = await apiClient.getTransaction(walletLocator, transactionId);
        if (transactionResponse.error) {
            throw new TransactionNotAvailableError(JSON.stringify(transactionResponse));
        }
        await sleep(initialBackoffMs);
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

export async function waitForSignatureCompletion(
    apiClient: ApiClient,
    walletLocator: WalletLocator,
    signatureId: string
): Promise<Signature<false>> {
    let signatureResponse: GetSignatureResponse | null = null;

    do {
        await new Promise((resolve) => setTimeout(resolve, STATUS_POLLING_INTERVAL_MS));
        signatureResponse = await apiClient.getSignature(walletLocator, signatureId);
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

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
