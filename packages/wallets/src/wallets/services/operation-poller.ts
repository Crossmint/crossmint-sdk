import type { ApiClient, GetSignatureResponse, WalletLocator } from "../../api";
import type { Signature, Transaction } from "../types";
import {
    SignatureConfirmationTimeoutError,
    SignatureNotAvailableError,
    SigningFailedError,
    TransactionAwaitingApprovalError,
    TransactionConfirmationTimeoutError,
    TransactionHashNotFoundError,
    TransactionNotAvailableError,
    TransactionSendingFailedError,
    throwIfCrossmintApiAuthError,
} from "../../utils/errors";
import { STATUS_POLLING_INTERVAL_MS } from "../../utils/constants";
import { walletsLogger } from "../../logger";

export type PollingOptions = {
    timeoutMs?: number;
    initialBackoffMs?: number;
    backoffMultiplier?: number;
    maxBackoffMs?: number;
    fastWindowMs?: number;
};

export async function waitForTransactionCompletion(
    apiClient: ApiClient,
    walletLocator: WalletLocator,
    transactionId: string,
    options?: PollingOptions
): Promise<Transaction<false>> {
    const {
        timeoutMs = 60_000,
        initialBackoffMs = 500,
        backoffMultiplier = 1.5,
        maxBackoffMs = 2_000,
        fastWindowMs = 5_000,
    } = options ?? {};

    walletsLogger.info("wallet.approve: waiting for transaction confirmation", { transactionId, timeoutMs });
    const startTime = Date.now();
    let backoffMs = initialBackoffMs;
    let transactionResponse;

    do {
        if (Date.now() - startTime > timeoutMs) {
            const error = new TransactionConfirmationTimeoutError("Transaction confirmation timeout");
            throw error;
        }

        const pollStartedAt = Date.now();
        transactionResponse = await apiClient.getTransaction(walletLocator, transactionId);
        if (transactionResponse.error) {
            throwIfCrossmintApiAuthError(transactionResponse);
            throw new TransactionNotAvailableError(JSON.stringify(transactionResponse));
        }
        if (transactionResponse.status !== "pending") {
            break;
        }

        // Fixed cadence while confirmation is most likely, exponential backoff afterwards.
        const elapsedMs = Date.now() - startTime;
        if (elapsedMs > fastWindowMs) {
            backoffMs = Math.min(Math.round(backoffMs * backoffMultiplier), maxBackoffMs);
        }
        // The poll's own duration counts toward the cadence, and the sleep never
        // extends past the timeout deadline.
        const pollDurationMs = Date.now() - pollStartedAt;
        await sleep(Math.max(1, Math.min(backoffMs - pollDurationMs, timeoutMs - elapsedMs)));
    } while (true);

    if (transactionResponse.status === "failed") {
        const error = new TransactionSendingFailedError(
            `Transaction sending failed: ${JSON.stringify(transactionResponse)}`
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
    signatureId: string,
    options?: PollingOptions
): Promise<Signature<false>> {
    const { timeoutMs = 60_000 } = options ?? {};
    const startTime = Date.now();
    let signatureResponse: GetSignatureResponse | null = null;

    do {
        if (Date.now() - startTime > timeoutMs) {
            throw new SignatureConfirmationTimeoutError("Signature confirmation timeout");
        }
        await new Promise((resolve) => setTimeout(resolve, STATUS_POLLING_INTERVAL_MS));
        signatureResponse = await apiClient.getSignature(walletLocator, signatureId);
        if ("error" in signatureResponse) {
            throwIfCrossmintApiAuthError(signatureResponse);
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
