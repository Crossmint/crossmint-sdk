export function getCachedJwt(): string | undefined {
    if (typeof document === "undefined") {
        return undefined; // Check if we're on the client-side
    }
    const crossmintSession = document.cookie.split("; ").find((row) => row.startsWith("crossmint-session"));
    return crossmintSession ? crossmintSession.split("=")[1] : undefined;
}
