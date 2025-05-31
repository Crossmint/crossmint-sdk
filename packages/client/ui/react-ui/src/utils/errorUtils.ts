export function deriveWalletErrorState(error: unknown): {
    status: "error";
    error: string;
} {
    const message = error instanceof Error ? error.message : String(error);
    return {
        status: "error",
        error: message,
    };
}
