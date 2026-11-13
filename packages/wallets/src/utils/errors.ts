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
    constructor(message: string, details?: string) {
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
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
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

/** The request a call site was acting on; the API error body does not carry its id. */
export type ExpiredRequest = { transactionId?: string; signatureId?: string };

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

function isCrossmintApiErrorBody(response: unknown): response is CrossmintApiErrorBody {
    return typeof response === "object" && response != null;
}

/**
 * Inspects a Crossmint wallets API error response and, when it carries a recognized auth error
 * code, throws the corresponding typed error so callers surface the real failure (e.g. an expired
 * JWT) instead of masking it behind a generic wallet error. Returns without throwing when the
 * response is not a recognized auth error, letting callers throw their own contextual error.
 */
export function throwIfCrossmintApiAuthError(response: unknown): void {
    if (!isCrossmintApiErrorBody(response) || response.code == null) {
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
    if (!isCrossmintApiErrorBody(response) || response.code == null) {
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

/** Throws the typed error for a quorum API code or `TRANSACTION_EXPIRED`; returns for any other response. */
export function throwIfQuorumApiError(response: unknown, request: ExpiredRequest = {}): void {
    if (!isCrossmintApiErrorBody(response) || response.code == null) {
        return;
    }

    const details = JSON.stringify(response);
    const code = response.code;
    if (code === "TRANSACTION_EXPIRED") {
        throw new TransactionExpiredError(
            response.message ?? "The transaction expired before it could be submitted. Create a new transaction.",
            request,
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
    | SignerLimitExceededError
    | QuorumSelectionAmbiguousError
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
    | TransactionExpiredError
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
    if (!isCrossmintApiErrorBody(response) || response.code == null) {
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
    if (!isCrossmintApiErrorBody(body) || body.code == null) {
        return undefined;
    }
    return transactionNotCreatedError(body, context);
}
