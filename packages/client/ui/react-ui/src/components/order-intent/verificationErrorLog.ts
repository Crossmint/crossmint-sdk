export type VerificationErrorType =
    | "cancelled"
    | "popup_closed"
    | "popup_blocked"
    | "not_supported"
    | "timeout"
    | "api_error"
    | "configuration"
    | "unknown";

export type VerificationErrorLog = {
    level: "info" | "warn" | "error";
    context: {
        "error.type": VerificationErrorType;
        "basisTheory.errorType"?: string;
        "basisTheory.traceId"?: string;
        "http.response.status_code"?: number;
    };
};

// Keyed by `error.name`, which `@basis-theory/web-agentic` sets on every error class it throws.
// Info: the buyer chose or caused it. Warn: Basis Theory or the network failed. Error: our integration is wrong.
const ERRORS_BY_NAME: Record<string, Pick<VerificationErrorLog, "level"> & { type: VerificationErrorType }> = {
    VerificationCancelledError: { type: "cancelled", level: "info" },
    PopupClosedError: { type: "popup_closed", level: "info" },
    PopupBlockedError: { type: "popup_blocked", level: "info" },
    VerificationNotSupportedError: { type: "not_supported", level: "info" },
    CeremonyTimeoutError: { type: "timeout", level: "warn" },
    ApiError: { type: "api_error", level: "warn" },
    ConfigurationError: { type: "configuration", level: "error" },
};

type ApiErrorFields = { status?: unknown; type?: unknown; traceId?: unknown };

/** What to log about a rejected `verifyAllowance`: only the error class and Basis Theory's error identifiers. */
export function describeVerificationError(error: unknown): VerificationErrorLog {
    const name = error instanceof Error ? error.name : undefined;
    const known = name == null ? undefined : ERRORS_BY_NAME[name];
    if (known == null) {
        return { level: "error", context: { "error.type": "unknown" } };
    }
    const apiError: ApiErrorFields | undefined =
        name === "ApiError"
            ? (error as ApiErrorFields)
            : (error as { apiError?: ApiErrorFields }).apiError ?? undefined;
    return {
        level: known.level,
        context: {
            "error.type": known.type,
            ...(typeof apiError?.type === "string" ? { "basisTheory.errorType": apiError.type } : {}),
            ...(typeof apiError?.traceId === "string" ? { "basisTheory.traceId": apiError.traceId } : {}),
            ...(typeof apiError?.status === "number" ? { "http.response.status_code": apiError.status } : {}),
        },
    };
}
