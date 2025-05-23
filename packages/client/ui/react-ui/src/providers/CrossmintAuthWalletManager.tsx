import { type Dispatch, type SetStateAction, useCallback, useEffect } from "react";
import type { GetOrCreateWalletProps, ValidWalletState } from "@crossmint/client-sdk-react-base";
import type { AuthContextType } from "./CrossmintAuthProvider";
import type { CreateOnLogin, GetOrCreateWalletAdminSigner } from "@/types/wallet";
import { useDynamicConnect } from "@/hooks/useDynamicConnect";
import { mapSignerToWalletType } from "@/utils/mapSignerToWalletType";

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
    getOrCreateWallet: (props: GetOrCreateWalletProps) => Promise<{ startedCreation: boolean; reason?: string }>;
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

        let adminSigner: GetOrCreateWalletAdminSigner = createOnLogin?.signer;
        let walletType = createOnLogin.walletType;

        if (isDynamicWalletConnected) {
            adminSigner = (await getAdminSigner()) ?? adminSigner;
            walletType = mapSignerToWalletType(adminSigner?.type) ?? walletType;
        }

        // If an external wallet is not connected, the type is required
        if (!isDynamicWalletConnected && walletType == null) {
            console.error(
                "[CrossmintAuthProvider] ⚠️ createOnLogin.walletType is required when no external wallet is connected"
            );
            return;
        }

        getOrCreateWallet({
            type: walletType,
            args: {
                adminSigner,
                linkedUser: createOnLogin?.owner,
            },
        } as GetOrCreateWalletProps);
    }, [canGetOrCreateWallet, getOrCreateWallet, createOnLogin, getAdminSigner]);

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
