import { useContext } from "react";
import { AuthContext } from "../providers/CrossmintAuthProvider";

export function useCrossmintAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useCrossmintAuth must be used within a CrossmintAuthProvider");
    }

    return context;
}
