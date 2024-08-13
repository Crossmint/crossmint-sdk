import { WalletContext } from "@/providers/CrossmintAuthProvider";
import { useContext } from "react";

import { useAuth as useAuthCore } from "@crossmint/client-sdk-auth-core";

export function useAuth() {
    const walletContext = useContext(WalletContext);

    if (!walletContext) {
        throw new Error("useAuth must be used within an WalletProvider");
    }

    const authContext = useAuthCore();
    return { ...authContext, ...walletContext };
}
