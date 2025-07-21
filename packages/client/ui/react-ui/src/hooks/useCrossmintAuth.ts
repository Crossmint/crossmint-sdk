import { useContext } from "react";
import { AuthContext } from "@/providers/CrossmintAuthProviderInternal";

export const useCrossmintAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useCrossmintAuth must be used within CrossmintAuthProvider");
    }
    return context;
};
