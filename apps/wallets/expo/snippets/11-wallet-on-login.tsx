import { useEffect, useRef } from "react";
import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-native-ui";
import { DEFAULT_CHAIN, useLoadWallet } from "./09-chain-switcher";

export function useWalletOnLogin() {
    const { user, getUser } = useCrossmintAuth();
    const { status } = useWallet();
    const loadWallet = useLoadWallet();
    const loadedFor = useRef<string | null>(null);

    useEffect(() => {
        if (user == null) {
            loadedFor.current = null;
            return;
        }
        if (user.email == null) {
            getUser();
            return;
        }
        if (status !== "not-loaded" || loadedFor.current === user.email) {
            return;
        }
        loadedFor.current = user.email;
        loadWallet(DEFAULT_CHAIN);
    }, [user, getUser, status, loadWallet]);
}
