import { useContext } from "react";
import { AuthContext, type AuthContextType } from "../providers/CrossmintAuthProvider";

export function useCrossmintAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useCrossmintAuth must be used within a CrossmintAuthProvider");
    }
    return context;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within a CrossmintAuthProvider");
    }
    return context;
}
