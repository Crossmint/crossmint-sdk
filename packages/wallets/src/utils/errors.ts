import {
    CrossmintSDKError,
    JWTDecryptionError,
    JWTExpiredError,
    JWTIdentifierError,
    JWTInvalidError,
    NotAuthorizedError,
    ApiClientError,
    WalletErrorCode,
} from "@crossmint/common-sdk-base";
import type { QuorumLocator } from "../signers/types";

export {
    NotAuthorizedError,
    JWTExpiredError,
    JWTInvalidError,
    JWTDecryptionError,
    JWTIdentifierError,
} from "@crossmint/common-sdk-base";

export class InvalidApiKeyError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.API_KEY_INVALID, details);
    }
}

export class InvalidEnvironmentError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.ENVIRONMENT_INVALID, details);
    }
}

export class InvalidChainError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.WALLET_CREATION_FAILED, details);
    }
}

export class WalletTypeNotSupportedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.WALLET_TYPE_INVALID, details);
    }
}

export class WalletNotAvailableError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.WALLET_NOT_AVAILABLE, details);
    }
}

export class InvalidWalletConfigError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.WALLET_NOT_AVAILABLE, details);
    }
}

export class WalletCreationError extends CrossmintSDKError {
    constructor(
        message: string,
        details?: string,
        /** The `code` returned by the wallets API, when it sent one. */
        public readonly apiErrorCode?: string
    ) {
        super(message, WalletErrorCode.WALLET_CREATION_FAILED, details);
    }
}

export class WalletTypeMismatchError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.WALLET_TYPE_INVALID, details);
    }
}

export class SignerTypeMismatchError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export class InvalidSignerError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export class UnknownSignerTypeError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

/**
 * Stable error code returned by the wallets API when a Solana smart wallet's underlying
 * provider does not support device signers. The SDK catches this code in `recover()` and
 * transparently falls back to the recovery signer so seamless provider-aware defaults work
 * without exposing the provider name on the API response. Must match the backend constant
 * `DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE`.
 */
export const DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE = "DEVICE_SIGNER_NOT_SUPPORTED";

export class DeviceSignerNotSupportedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

/** This device's signer still waits for quorum members to approve its registration; `request` is what they approve. */
export class DeviceSignerAwaitingApprovalError extends CrossmintSDKError {
    readonly request: { transactionId: string } | { signatureId: string };

    constructor(request: { transactionId: string } | { signatureId: string }, details?: string) {
        super(
            "This device's signer still awaits the recovery quorum's approval. Have its members approve the registration with approve(), then try again.",
            WalletErrorCode.SIGNER_INVALID,
            details
        );
        this.request = request;
    }
}

export const SIGNER_LIMIT_EXCEEDED_ERROR_CODE = "SIGNER_LIMIT_EXCEEDED";

/** The SDK throws this error when a new signer would put the wallet over its signer limit. */
export class SignerLimitExceededError extends InvalidSignerError {}

export class QuorumSignerNotSupportedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export function quorumSignerNotSupported(quorumLocators: string[]): QuorumSignerNotSupportedError {
    return new QuorumSignerNotSupportedError(
        `Signing as quorum signer ${quorumLocators.join(", ")} is not yet supported by this SDK version`
    );
}

/** The held key is a member of several quorums, so the SDK cannot tell which one it acts as. */
export class QuorumSelectionAmbiguousError extends CrossmintSDKError {
    readonly quorumLocators: QuorumLocator[];

    constructor(quorumLocators: QuorumLocator[], details?: string) {
        super(
            `This signer is a member of several quorums (${quorumLocators.join(", ")}); choose the quorum to act as`,
            WalletErrorCode.SIGNER_INVALID,
            details
        );
        this.quorumLocators = quorumLocators;
    }
}

/** On Solana a quorum's request names the members that approve it: pass `approvingMembers`, exactly its threshold. */
export class QuorumApprovingMembersRequiredError extends CrossmintSDKError {
    readonly quorumLocator: QuorumLocator;

    constructor(quorumLocator: QuorumLocator, details?: string) {
        super(
            `Requests of quorum ${quorumLocator} on this chain need approvingMembers: the members that will approve it, as many as its threshold`,
            WalletErrorCode.SIGNER_INVALID,
            details
        );
        this.quorumLocator = quorumLocator;
    }
}

// The quorum error codes the wallets API defines; `QuorumRequestError.reason` is one of them.
const QUORUM_REQUEST_ERROR_REASONS = [
    "QUORUM_SIGNER_UNSUPPORTED",
    "QUORUM_SIZE_INVALID",
    "QUORUM_MEMBER_DUPLICATED",
    "QUORUM_MEMBER_TYPE_UNSUPPORTED",
    "QUORUM_MEMBER_TYPE_NOT_ALLOWED",
    "NESTED_QUORUM_NOT_ALLOWED",
    "QUORUM_TOO_FEW_MEMBERS",
    "QUORUM_THRESHOLD_EXCEEDS_MEMBERS",
    "SIGNER_IS_QUORUM_MEMBER",
    "QUORUM_APPROVING_MEMBERS_COUNT_MISMATCH",
    "QUORUM_APPROVING_MEMBER_INVALID",
    "APPROVING_MEMBERS_NOT_APPLICABLE",
    "SCOPED_QUORUM_CANNOT_SIGN",
    // Removing the wallet's only recovery method.
    "LAST_RECOVERY_SIGNER",
    "QUORUM_APPROVING_MEMBERS_REQUIRED",
    "QUORUM_MEMBER_NOT_DESIGNATED",
    "QUORUM_TOO_MANY_ENVELOPE_SIGNERS",
    "SIGNER_KEY_IN_USE",
    "QUORUM_THRESHOLD_TOO_HIGH_FOR_CHAIN",
    "QUORUM_THRESHOLD_UNSUPPORTED",
    "PENDING_QUORUM_TRANSACTIONS_CAP_EXCEEDED",
] as const;

export type QuorumRequestErrorReason = (typeof QUORUM_REQUEST_ERROR_REASONS)[number];

function isQuorumRequestErrorReason(code: string): code is QuorumRequestErrorReason {
    return QUORUM_REQUEST_ERROR_REASONS.some((reason) => reason === code);
}

/** The wallets API rejected a quorum request; `reason` is the API error code. */
export class QuorumRequestError extends CrossmintSDKError {
    readonly reason: QuorumRequestErrorReason;

    constructor(message: string, reason: QuorumRequestErrorReason, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
        this.reason = reason;
    }
}

/**
 * The wallets API rejected a signer add/remove or recovery-method change with a `code` the SDK
 * does not map to a narrower error, or with no `code` at all. `apiErrorCode` is the body's `code`.
 */
export class SignerOperationRejectedError extends CrossmintSDKError {
    constructor(
        message: string,
        details?: string,
        public readonly apiErrorCode?: string
    ) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

/** Builds the error for a signer-operation rejection: the API `message` or `fallbackMessage`. */
export function signerOperationRejectedError(response: unknown, fallbackMessage: string): SignerOperationRejectedError {
    const body = isResponseBody<CrossmintApiErrorBody>(response) ? response : {};
    return new SignerOperationRejectedError(body.message ?? fallbackMessage, JSON.stringify(response), body.code);
}

/** Thrown for recovery configurations the SDK can reject before calling the API. */
export class InvalidRecoveryConfigError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export class RecoverySignerLimitExceededError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export class DuplicateRecoverySignerError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export class RecoverySignerConflictError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export class SignerRequiredError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export class RecoveryMethodRequiredError extends SignerRequiredError {}

export class RecoveryNotSupportedOnChainError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export class NotSupportedOnApiVersionError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export class RecoveryAdminSignerConflictError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

/**
 * Thrown when the browser does not support third-party storage partitioning,
 * making it unsafe to store device-signer keys in IndexedDB. Consumers should
 * either prompt the user to upgrade their browser or fall back to a non-device
 * signer (e.g. recovery signer).
 */
export class UnsupportedBrowserError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.ENVIRONMENT_INVALID, details);
    }
}

export class InvalidMessageFormatError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.MESSAGE_INVALID, details);
    }
}

export class InvalidTypedDataError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.MESSAGE_INVALID, details);
    }
}

export class SignatureNotFoundError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNING_FAILED, details);
    }
}

export class SigningFailedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNING_FAILED, details);
    }
}

export class MessageSigningNotSupportedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNING_FAILED, details);
    }
}

export class SignatureNotCreatedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.NO_SIGNATURE, details);
    }
}

export class SignatureNotAvailableError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.NO_SIGNATURE, details);
    }
}

export class SignatureFailedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNING_FAILED, details);
    }
}

export class SignatureConfirmationTimeoutError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNING_FAILED, details);
    }
}

/** A key did not sign an approval in time; the request is still open and can be approved again. */
export class ApprovalSigningTimeoutError extends CrossmintSDKError {
    constructor(
        public readonly signerLocator: string,
        timeoutMs: number
    ) {
        super(
            `Signer ${signerLocator} did not sign the approval within ${timeoutMs / 1000} seconds`,
            WalletErrorCode.SIGNING_FAILED
        );
    }
}

export class InvalidTransferAmountError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.NO_TRANSACTION, details);
    }
}

export class TransactionNotCreatedError extends CrossmintSDKError {
    /** Whether the same request can be expected to succeed if retried shortly. */
    readonly retryable: boolean = false;

    constructor(
        message: string,
        details?: string,
        /** The `code` returned by the wallets API, when it sent one. */
        public readonly apiErrorCode?: string
    ) {
        super(message, WalletErrorCode.NO_TRANSACTION, details);
    }
}

/**
 * Funds were just moved into the card's collateral (deposit or auto top-up) and the card provider
 * has not credited them as spending power yet. Retry shortly.
 */
export class CollateralFundsInTransitError extends TransactionNotCreatedError {
    override readonly retryable = true;

    constructor(message: string, details?: string) {
        super(message, details, COLLATERAL_FUNDS_IN_TRANSIT_ERROR_CODE);
    }
}

/** The card provider could not arrange collateral funding this attempt (5xx, timeout, pending). Retry shortly. */
export class CollateralFundingTemporarilyUnavailableError extends TransactionNotCreatedError {
    override readonly retryable = true;

    constructor(message: string, details?: string) {
        super(message, details, COLLATERAL_FUNDING_TEMPORARILY_UNAVAILABLE_ERROR_CODE);
    }
}

/** The card provider refused the collateral withdrawal; the developer must act. */
export class CollateralWithdrawalUnavailableError extends TransactionNotCreatedError {
    constructor(message: string, details?: string) {
        super(message, details, COLLATERAL_WITHDRAWAL_UNAVAILABLE_ERROR_CODE);
    }
}

/** The card provider's withdrawal authorization failed Crossmint's integrity checks; contact support. */
export class CollateralWithdrawalIntegrityError extends TransactionNotCreatedError {
    constructor(message: string, details?: string) {
        super(message, details, COLLATERAL_WITHDRAWAL_INTEGRITY_ERROR_CODE);
    }
}

export const COLLATERAL_FUNDS_IN_TRANSIT_ERROR_CODE = "COLLATERAL_FUNDS_IN_TRANSIT";
export const COLLATERAL_FUNDING_TEMPORARILY_UNAVAILABLE_ERROR_CODE = "COLLATERAL_FUNDING_TEMPORARILY_UNAVAILABLE";
export const COLLATERAL_WITHDRAWAL_UNAVAILABLE_ERROR_CODE = "COLLATERAL_WITHDRAWAL_UNAVAILABLE";
export const COLLATERAL_WITHDRAWAL_INTEGRITY_ERROR_CODE = "COLLATERAL_WITHDRAWAL_INTEGRITY_ERROR";

export class TransactionNotAvailableError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.NO_TRANSACTION, details);
    }
}

export class TransactionConfirmationTimeoutError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
    }
}

export class TransactionSendingFailedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
    }
}

export class TransactionAwaitingApprovalError extends CrossmintSDKError {
    readonly transactionId: string;

    constructor(message: string, request: { transactionId: string }, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
        this.transactionId = request.transactionId;
    }
}

export class TransactionHashNotFoundError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
    }
}

export class TransactionFailedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
    }
}

/**
 * The API rejected one quorum member's approval (e.g. an invalid member signature). The request
 * stays `awaiting-approval` and the other members can still complete it, so this is not a failed
 * transaction: `signerLocator` is the member whose approval was rejected.
 */
export class QuorumApprovalRejectedError extends CrossmintSDKError {
    readonly signerLocator?: string;
    readonly transactionId?: string;
    readonly signatureId?: string;

    constructor(message: string, request: ExpiredRequest = {}, signerLocator?: string, details?: string) {
        super(message, WalletErrorCode.SIGNING_FAILED, details);
        this.signerLocator = signerLocator;
        this.transactionId = request.transactionId;
        this.signatureId = request.signatureId;
    }
}

/** The approval window of a transaction or signature request closed; create a new request. */
export class TransactionExpiredError extends TransactionFailedError {
    readonly transactionId?: string;
    readonly signatureId?: string;

    constructor(message: string, request: ExpiredRequest, details?: string) {
        super(message, details);
        this.transactionId = request.transactionId;
        this.signatureId = request.signatureId;
    }
}

/** The transaction was cancelled while it awaited approval (its approval window ended or a signer changed); create a new one. */
export class TransactionCancelledError extends TransactionFailedError {
    readonly transactionId?: string;

    constructor(message: string, transactionId: string | undefined, details?: string) {
        super(message, details);
        this.transactionId = transactionId;
    }
}

export const TRANSACTION_CANCELLED_MESSAGE =
    "The transaction was cancelled before it could be submitted. Create a new transaction.";

/** Throws `TransactionCancelledError` for a stored transaction whose status is `cancelled`. */
export function throwIfTransactionCancelled(response: unknown, transactionId: string): void {
    if (isResponseBody<{ status?: unknown }>(response) && response.status === "cancelled") {
        throw new TransactionCancelledError(TRANSACTION_CANCELLED_MESSAGE, transactionId, JSON.stringify(response));
    }
}

/** The request a call site was acting on; the API error body does not carry its id. */
export type ExpiredRequest = { transactionId?: string; signatureId?: string };

/** The wallets API's message for an expired request; a stored expired request carries it as its revert reason. */
export const TRANSACTION_EXPIRED_MESSAGE =
    "The transaction expired before it could be submitted. Create a new transaction.";

export class PendingApprovalsError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
    }
}

export class InvalidAddressError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.RECIPIENT_ADDRESS_INVALID, details);
    }
}

/**
 * Shape of the structured error body returned by the Crossmint wallets API. `code` carries a
 * stable identifier for the failure and, for auth failures, extra fields (e.g. `expiredAt`) are
 * spread onto the top level of the response by the backend exception filter.
 */
type CrossmintApiErrorBody = {
    error?: boolean;
    message?: string;
    code?: string;
    expiredAt?: string;
    identifierKey?: string;
};

// Every field the readers use is optional, so any object can be read as a response body.
function isResponseBody<T extends object>(response: unknown): response is T {
    return typeof response === "object" && response != null;
}

/**
 * Inspects a Crossmint wallets API error response and, when it carries a recognized auth error
 * code, throws the corresponding typed error so callers surface the real failure (e.g. an expired
 * JWT) instead of masking it behind a generic wallet error. Returns without throwing when the
 * response is not a recognized auth error, letting callers throw their own contextual error.
 */
export function throwIfCrossmintApiAuthError(response: unknown): void {
    if (!isResponseBody<CrossmintApiErrorBody>(response) || response.code == null) {
        return;
    }

    const details = JSON.stringify(response);
    switch (response.code) {
        case "ERROR_JWT_EXPIRED":
            throw new JWTExpiredError(response.expiredAt, details);
        case "ERROR_JWT_INVALID":
            throw new JWTInvalidError(details);
        case "ERROR_JWT_DECRYPTION":
            throw new JWTDecryptionError(details);
        case "ERROR_JWT_IDENTIFIER_ERROR":
            throw new JWTIdentifierError(response.identifierKey, details);
        case "ERROR_JWT_AUDIENCE_MISMATCH":
            throw new NotAuthorizedError(response.message ?? "JWT audience mismatch", details);
    }
}

/**
 * Inspects a Crossmint wallets API error response and, when it carries a recognized recovery-signer
 * error code, throws the corresponding typed error. Returns without throwing for every other
 * response so callers can fall back to their own contextual error.
 */
export function throwIfRecoverySignerApiError(response: unknown): void {
    if (!isResponseBody<CrossmintApiErrorBody>(response) || response.code == null) {
        return;
    }

    const details = JSON.stringify(response);
    const message = response.message;
    switch (response.code) {
        case SIGNER_LIMIT_EXCEEDED_ERROR_CODE:
            throw new RecoverySignerLimitExceededError(
                message ?? "The wallet exceeds the maximum number of recovery signers",
                details
            );
        case "RECOVERY_DUPLICATE_SIGNER":
            throw new DuplicateRecoverySignerError(
                message ?? "The recovery list contains the same signer more than once",
                details
            );
        case "RECOVERY_SIGNER_CONFLICT":
            throw new RecoverySignerConflictError(
                message ?? "A recovery signer cannot also be registered as an operational signer",
                details
            );
        case "SIGNER_REQUIRED":
            throw new SignerRequiredError(
                message ??
                    "This wallet has multiple recovery signers, so the signer to authorize with must be specified explicitly",
                details
            );
        case "RECOVERY_NOT_SUPPORTED_ON_CHAIN":
            throw new RecoveryNotSupportedOnChainError(
                message ?? "Multiple recovery signers are not supported on this chain yet",
                details
            );
        case "NOT_SUPPORTED_ON_API_VERSION":
            throw new NotSupportedOnApiVersionError(
                message ?? "Multiple recovery signers are not supported on this API version",
                details
            );
        case "RECOVERY_ADMIN_SIGNER_CONFLICT":
            throw new RecoveryAdminSignerConflictError(
                message ?? "Only one of `adminSigner` and `recovery` can be provided",
                details
            );
    }
}

// The API messages for a rejected member approval: one for a signature by the wrong key, one for a malformed signature.
const APPROVAL_REJECTED_MESSAGES = [
    /^Invalid signature for signer (\S+?)\.?(\s|$)/,
    /^Signature '[^']*' on the approval for signer '([^']+)' is invalid/,
];

/**
 * Throws `QuorumApprovalRejectedError` when the API rejected a submitted approval for one quorum member's
 * signature (the request itself is still awaiting the other members). Returns for any other body, and for a
 * rejected signer that `isQuorumMember` does not recognise.
 */
export function throwIfApprovalRejected(
    response: unknown,
    request: ExpiredRequest,
    isQuorumMember: (signerLocator: string) => boolean
): void {
    if (!isResponseBody<CrossmintApiErrorBody>(response) || response.message == null) {
        return;
    }
    const message = response.message;
    const rejectedSigner = APPROVAL_REJECTED_MESSAGES.map((pattern) => pattern.exec(message)?.[1]).find(
        (locator) => locator != null
    );
    if (rejectedSigner == null || !isQuorumMember(rejectedSigner)) {
        return;
    }
    throw new QuorumApprovalRejectedError(response.message, request, rejectedSigner, JSON.stringify(response));
}

/** Throws the typed error for a quorum API code, `TRANSACTION_EXPIRED` or `TRANSACTION_CANCELLED`; returns for any other. */
export function throwIfQuorumApiError(response: unknown, request: ExpiredRequest = {}): void {
    if (!isResponseBody<CrossmintApiErrorBody>(response) || response.code == null) {
        return;
    }

    const details = JSON.stringify(response);
    const code = response.code;
    if (code === "TRANSACTION_EXPIRED") {
        throw new TransactionExpiredError(response.message ?? TRANSACTION_EXPIRED_MESSAGE, request, details);
    }
    if (code === "TRANSACTION_CANCELLED") {
        throw new TransactionCancelledError(
            response.message ?? TRANSACTION_CANCELLED_MESSAGE,
            request.transactionId,
            details
        );
    }
    if (isQuorumRequestErrorReason(code)) {
        throw new QuorumRequestError(
            response.message ?? `The wallets API rejected the quorum request: ${code}`,
            code,
            details
        );
    }
}

/** The fields of a stored transaction or signature request that the expiry check reads. */
type StoredRequestBody = {
    status?: unknown;
    error?: { revert?: { reason?: unknown; reasonData?: { code?: unknown } | string | null } } | null;
};

/** Throws `TransactionExpiredError` for a stored request that failed because its approval window closed. */
export function throwIfRequestExpired(response: unknown, request: ExpiredRequest): void {
    if (!isResponseBody<StoredRequestBody>(response) || response.status !== "failed") {
        return;
    }
    // The API stores the code in `reasonData`; the message alone identifies records stored before it did.
    const revert = response.error?.revert;
    const code = typeof revert?.reasonData === "object" ? revert.reasonData?.code : undefined;
    if (code !== "TRANSACTION_EXPIRED" && revert?.reason !== TRANSACTION_EXPIRED_MESSAGE) {
        return;
    }
    throw new TransactionExpiredError(TRANSACTION_EXPIRED_MESSAGE, request, JSON.stringify(response));
}

export type WalletError =
    | InvalidTransferAmountError
    | InvalidApiKeyError
    | InvalidEnvironmentError
    | InvalidChainError
    | WalletTypeNotSupportedError
    | WalletNotAvailableError
    | InvalidWalletConfigError
    | WalletCreationError
    | WalletTypeMismatchError
    | SignerTypeMismatchError
    | InvalidSignerError
    | UnknownSignerTypeError
    | DeviceSignerNotSupportedError
    | DeviceSignerAwaitingApprovalError
    | SignerLimitExceededError
    | QuorumSelectionAmbiguousError
    | QuorumApprovingMembersRequiredError
    | QuorumRequestError
    | InvalidRecoveryConfigError
    | RecoverySignerLimitExceededError
    | DuplicateRecoverySignerError
    | RecoverySignerConflictError
    | SignerRequiredError
    | RecoveryMethodRequiredError
    | RecoveryNotSupportedOnChainError
    | NotSupportedOnApiVersionError
    | RecoveryAdminSignerConflictError
    | InvalidMessageFormatError
    | InvalidTypedDataError
    | SignatureNotFoundError
    | SigningFailedError
    | MessageSigningNotSupportedError
    | SignatureNotCreatedError
    | SignatureNotAvailableError
    | SignatureFailedError
    | TransactionNotCreatedError
    | TransactionNotAvailableError
    | TransactionConfirmationTimeoutError
    | TransactionSendingFailedError
    | TransactionAwaitingApprovalError
    | TransactionHashNotFoundError
    | TransactionFailedError
    | QuorumApprovalRejectedError
    | ApprovalSigningTimeoutError
    | SignerOperationRejectedError
    | TransactionExpiredError
    | TransactionCancelledError
    | PendingApprovalsError
    | InvalidAddressError
    | UnsupportedBrowserError
    | NotAuthorizedError
    | JWTExpiredError
    | JWTInvalidError
    | JWTDecryptionError
    | JWTIdentifierError;

/**
 * Builds the error for a failed transaction-creation call: a typed subclass when the wallets API
 * returned a recognized `code`, otherwise a plain `TransactionNotCreatedError` that still exposes
 * the code (if any) as `apiErrorCode`. The message is `${context}: ${JSON body}`.
 */
export function transactionNotCreatedError(response: unknown, context: string): TransactionNotCreatedError {
    const details = JSON.stringify(response);
    const message = `${context}: ${details}`;
    if (!isResponseBody<CrossmintApiErrorBody>(response) || response.code == null) {
        return new TransactionNotCreatedError(message, details);
    }
    switch (response.code) {
        case COLLATERAL_FUNDS_IN_TRANSIT_ERROR_CODE:
            return new CollateralFundsInTransitError(message, details);
        case COLLATERAL_FUNDING_TEMPORARILY_UNAVAILABLE_ERROR_CODE:
            return new CollateralFundingTemporarilyUnavailableError(message, details);
        case COLLATERAL_WITHDRAWAL_UNAVAILABLE_ERROR_CODE:
            return new CollateralWithdrawalUnavailableError(message, details);
        case COLLATERAL_WITHDRAWAL_INTEGRITY_ERROR_CODE:
            return new CollateralWithdrawalIntegrityError(message, details);
        default:
            return new TransactionNotCreatedError(message, details, response.code);
    }
}

/**
 * The HTTP layer turns every 5xx into an `ApiClientError` before the body reaches the caller, which
 * is exactly how the retryable collateral codes arrive (503). Maps such an error to the typed
 * `TransactionNotCreatedError` when its body carries a wallets API `code`; returns undefined for
 * anything else (HTML from a load balancer, no body) so the caller can rethrow the transport error.
 */
export function transactionNotCreatedErrorFromApiClientError(
    error: unknown,
    context: string
): TransactionNotCreatedError | undefined {
    if (!(error instanceof ApiClientError) || error.responseBody == null) {
        return undefined;
    }
    let body: unknown;
    try {
        body = JSON.parse(error.responseBody);
    } catch {
        return undefined;
    }
    if (!isResponseBody<CrossmintApiErrorBody>(body) || body.code == null) {
        return undefined;
    }
    return transactionNotCreatedError(body, context);
}
