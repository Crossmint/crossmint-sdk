import type { ApiClient, GetSignatureResponse, GetTransactionSuccessResponse, WalletLocator } from "../../api";
import { awaitsQuorumOnly, splitPendingApprovals, toQuorumProgress } from "../../quorum/approvals";
import type { QuorumApprovalProgress, Signature, Transaction } from "../types";
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
    throwIfRequestExpired,
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

const AWAITING_APPROVAL_MESSAGE =
    "Transaction is awaiting approval. Please submit required approvals before waiting for completion.";

/** Only quorum members can still approve the transaction; `quorums` is each quorum's progress. */
export type AwaitingApproval = {
    status: "awaiting-approval";
    transactionId: string;
    quorums: QuorumApprovalProgress[];
};

export type TransactionOutcome = { status: "success"; transaction: Transaction<false> } | AwaitingApproval;

/** Waits for the transaction to land; throws `TransactionAwaitingApprovalError` while it still needs approvals. */
export async function waitForTransactionCompletion(
    apiClient: ApiClient,
    walletLocator: WalletLocator,
    transactionId: string,
    options?: PollingOptions
): Promise<Transaction<false>> {
    const outcome = await waitForTransactionOutcome(apiClient, walletLocator, transactionId, options);
    if (outcome.status === "awaiting-approval") {
        throw new TransactionAwaitingApprovalError(AWAITING_APPROVAL_MESSAGE, { transactionId });
    }
    return outcome.transaction;
}

/** Waits for the transaction to land, or until only quorum members can still approve it. */
export async function waitForTransactionOutcome(
    apiClient: ApiClient,
    walletLocator: WalletLocator,
    transactionId: string,
    options?: PollingOptions
): Promise<TransactionOutcome> {
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
            throwIfRequestExpired(transactionResponse, { transactionId });
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
        return awaitingApprovalOf(transactionResponse, transactionId);
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
        status: "success",
        transaction: {
            hash: transactionHash,
            explorerLink: transactionResponse.onChain.explorerLink ?? "",
            transactionId: transactionResponse.id,
        },
    };
}

function awaitingApprovalOf(transaction: GetTransactionSuccessResponse, transactionId: string): AwaitingApproval {
    if (transaction.approvals == null || !awaitsQuorumOnly(transaction)) {
        throw new TransactionAwaitingApprovalError(AWAITING_APPROVAL_MESSAGE, { transactionId });
    }
    const { quorums } = splitPendingApprovals(transaction.approvals.pending);
    return { status: "awaiting-approval", transactionId, quorums: quorums.map(toQuorumProgress) };
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
            throwIfRequestExpired(signatureResponse, { signatureId });
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
