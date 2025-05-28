import { type Dispatch, type SetStateAction, useCallback, useEffect } from "react";
import type { Chain, CreateOnLogin, ValidWalletState } from "@crossmint/client-sdk-react-base";
import type { WalletArgsFor } from "@crossmint/wallets-sdk";
import type { AuthContextType } from "./CrossmintAuthProvider";
import { useDynamicConnect } from "@/hooks/useDynamicConnect";

export function CrossmintAuthWalletManager({
    authContext,
    createOnLogin,
    getOrCreateWallet,
    walletState,
    setWalletState,
}: {
    authContext: AuthContextType;
    createOnLogin?: CreateOnLogin;
    walletState: ValidWalletState;
    setWalletState: Dispatch<SetStateAction<ValidWalletState>>;
    getOrCreateWallet: <C extends Chain>(
        props: WalletArgsFor<C>
    ) => Promise<{ startedCreation: boolean; reason?: string }>;
}) {
    const { setIsDynamicSdkLoaded, jwt } = authContext;
    const { sdkHasLoaded, getAdminSigner, cleanup, isDynamicWalletConnected } = useDynamicConnect(
        setIsDynamicSdkLoaded,
        jwt
    );

    const canGetOrCreateWallet =
        createOnLogin != null && walletState.status === "not-loaded" && jwt != null && sdkHasLoaded;

    const handleWalletCreation = useCallback(async () => {
        if (!canGetOrCreateWallet) {
            return;
        }

        const signer = isDynamicWalletConnected ? await getAdminSigner() : createOnLogin.signer;
        await getOrCreateWallet({ chain: createOnLogin.chain, signer, owner: createOnLogin.owner });
    }, [canGetOrCreateWallet, getOrCreateWallet, getAdminSigner, createOnLogin, isDynamicWalletConnected]);

    const handleWalletCleanup = useCallback(() => {
        if (jwt == null && walletState.status === "loaded") {
            setWalletState({ status: "not-loaded" });
        }
        cleanup();
    }, [walletState.status, jwt, cleanup]);

    useEffect(() => {
        handleWalletCreation();
        handleWalletCleanup();
    }, [handleWalletCreation, handleWalletCleanup]);

    return null;
}
