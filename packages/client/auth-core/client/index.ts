export { useAuth, AuthProvider, type AuthProviderParams } from "../src/contexts/authlogin";
export const getJwtFromCookie = (): string | null => {
    if (typeof document === "undefined") {
        return null; // Check if we're on the client-side
    }
    const crossmintSession = document.cookie.split("; ").find((row) => row.startsWith("crossmint-session"));
    return crossmintSession ? crossmintSession.split("=")[1] : null;
};
