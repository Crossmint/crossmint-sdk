import { useEffect, useRef, useState } from "react";
import { useCrossmint, useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-native-ui";
import { DEFAULT_CHAIN, useLoadWallet } from "./09-chain-switcher";

export function useWalletOnLogin() {
    const { user, jwt, getUser } = useCrossmintAuth();
    const { crossmint } = useCrossmint();
    const { status } = useWallet();
    const loadWallet = useLoadWallet();
    const [session, setSession] = useState<string | null>(null);
    const loadedFor = useRef<string | null>(null);

    // One render behind the auth state on purpose: the wallet provider receives the
    // JWT from a parent effect, which runs after this hook's effects in the same render.
    useEffect(() => {
        if (jwt != null && user != null && user.email == null) {
            getUser();
        }
        setSession(jwt != null && user?.email != null ? jwt : null);
    }, [jwt, user, getUser]);

    useEffect(() => {
        if (session == null) {
            loadedFor.current = null;
            return;
        }
        if (status !== "not-loaded" || loadedFor.current === session || crossmint.jwt !== session) {
            return;
        }
        loadedFor.current = session;
        loadWallet(DEFAULT_CHAIN);
    }, [session, status, loadWallet, crossmint]);
}
