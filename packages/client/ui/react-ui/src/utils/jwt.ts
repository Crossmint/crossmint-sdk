import { SESSION_PREFIX } from "./constants";

export function getCachedJwt(): string | undefined {
    if (typeof document === "undefined") {
        return undefined; // Check if we're on the client-side
    }
    const crossmintSession = document.cookie.split("; ").find((row) => row.startsWith(SESSION_PREFIX));
    return crossmintSession ? crossmintSession.split("=")[1] : undefined;
}
