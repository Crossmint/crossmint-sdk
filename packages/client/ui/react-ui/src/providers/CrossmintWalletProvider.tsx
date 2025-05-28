import {
    type Dispatch,
    type ReactNode,
    type SetStateAction,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { createPortal } from "react-dom";
import { CrossmintWallets, type Wallet, type WalletArgsFor } from "@crossmint/wallets-sdk";
import type { Chain } from "@crossmint/wallets-sdk";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import type { PasskeySigner } from "@/types/passkey";
import { useCrossmint } from "../hooks";
import type { CreateOnLogin, GetOrCreateWalletProps } from "@/types/wallet";
import { createWebAuthnPasskeySigner } from "@/utils/createPasskeySigner";
import { deriveWalletErrorState } from "@/utils/errorUtils";
import { AuthContext } from "./CrossmintAuthProvider";
import { CrossmintAuthWalletManager } from "./CrossmintAuthWalletManager";
import { TwindProvider } from "./TwindProvider";
import { CrossmintSignerProvider, useCrossmintSigner } from "./signers/CrossmintSignerProvider";

type ValidPasskeyPromptType =
    | "create-wallet"
    | "transaction"
    | "not-supported"
    | "create-wallet-error"
    | "transaction-error";
type PasskeyPromptState =
    | {
          type: ValidPasskeyPromptType;
          open: true;
          primaryActionOnClick: () => void;
          secondaryActionOnClick?: () => void;
      }
    | { open: false };

type ValidWalletState =
    | { status: "not-loaded" | "in-progress" }
    | { status: "loaded"; wallet: Wallet<Chain> }
    | { status: "loading-error"; error: string };

type WalletContextFunctions = {
    getOrCreateWallet: <C extends Chain>(
        props: WalletArgsFor<C>
    ) => Promise<{ startedCreation: boolean; reason?: string }>;
    createPasskeySigner: (name: string, promptType?: ValidPasskeyPromptType) => Promise<PasskeySigner | null>;
    clearWallet: () => void;
    experimental_getOrCreateWalletWithRecoveryKey?: (args: { email: string }) => Promise<void>;
    passkeySigner?: PasskeySigner;
};

type LoadedWalletState<C extends Chain> = {
    status: "loaded";
    wallet: Wallet<C>;
    error?: undefined;
};

type WalletContext<C extends Chain = Chain> =
    | ({
          status: "not-loaded" | "in-progress";
          wallet?: undefined;
          error?: undefined;
      } & WalletContextFunctions)
    | ({
          status: "loading-error";
          wallet?: undefined;
          error: string;
      } & WalletContextFunctions)
    | (LoadedWalletState<C> & WalletContextFunctions);

export const WalletContext = createContext<WalletContext>({
    status: "not-loaded",
    getOrCreateWallet: () => Promise.resolve({ startedCreation: false }),
    createPasskeySigner: () => Promise.resolve(null),
    clearWallet: () => {},
});

export function CrossmintWalletProvider({
    children,
    createOnLogin = undefined,
    showPasskeyHelpers = true,
    appearance,
    experimental_enableRecoveryKeys = false,
    experimental_signersURL = undefined,
}: {
    children: ReactNode;
    createOnLogin?: CreateOnLogin;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
    experimental_enableRecoveryKeys?: boolean;
    experimental_signersURL?: string;
}) {
    const [walletState, setWalletState] = useState<ValidWalletState>({
        status: "not-loaded",
    });

    const walletProviderProps = {
        walletState,
        setWalletState,
        showPasskeyHelpers,
        appearance,
        experimental_enableRecoveryKeys,
        createOnLogin,
    };

    return (
        <TwindProvider>
            {experimental_enableRecoveryKeys ? (
                <CrossmintSignerProvider
                    walletState={walletState}
                    setWalletState={setWalletState}
                    appearance={appearance}
                    signersURL={experimental_signersURL}
                >
                    <WalletProvider {...walletProviderProps}>{children}</WalletProvider>
                </CrossmintSignerProvider>
            ) : (
                <WalletProvider {...walletProviderProps}>{children}</WalletProvider>
            )}
        </TwindProvider>
    );
}

function WalletProvider({
    children,
    createOnLogin = undefined,
    showPasskeyHelpers = true,
    appearance,
    walletState,
    setWalletState,
    experimental_enableRecoveryKeys,
}: {
    children: ReactNode;
    createOnLogin?: CreateOnLogin;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
    walletState: ValidWalletState;
    setWalletState: Dispatch<SetStateAction<ValidWalletState>>;
    experimental_enableRecoveryKeys?: boolean;
}) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const crossmintAuthContext = useContext(AuthContext);
    const isUsingCrossmintAuthProvider = crossmintAuthContext?.isWeb3Enabled ?? false;

    const { experimental_getOrCreateWalletWithRecoveryKey } = useCrossmintSigner({
        enabled: experimental_enableRecoveryKeys ?? false,
    });

    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });

    const getOrCreateWallet = async <C extends Chain>(props: WalletArgsFor<C>) => {
        if (walletState.status == "in-progress") {
            return {
                startedCreation: false,
                reason: "Wallet is already loading.",
            };
        }

        if (crossmint.jwt == null) {
            return {
                startedCreation: false,
                reason: `Jwt not set in "CrossmintProvider".`,
            };
        }

        try {
            setWalletState({ status: "in-progress" });

            const smartWalletSDK = CrossmintWallets.from({
                apiKey: crossmint.apiKey,
                jwt: crossmint.jwt,
            });

            const wallet = await smartWalletSDK.getOrCreateWallet({
                ...props,
                options: {
                    experimental_callbacks: {
                        onWalletCreationStart: createPasskeyPrompt("create-wallet"),
                        onTransactionStart: createPasskeyPrompt("transaction"),
                    },
                },
            });
            setWalletState({
                status: "loaded",
                wallet,
            });
        } catch (error: unknown) {
            console.error("There was an error creating a wallet ", error);
            setWalletState(deriveWalletErrorState(error));
        }
        return { startedCreation: true };
    };

    const createPasskeyPrompt = (type: ValidPasskeyPromptType) => () =>
        new Promise<void>((resolve) => {
            if (!showPasskeyHelpers) {
                resolve();
                return;
            }
            setPasskeyPromptState({
                type,
                open: true,
                primaryActionOnClick: () => {
                    setPasskeyPromptState({ open: false });
                    resolve();
                },
                secondaryActionOnClick: () => {
                    setPasskeyPromptState({ open: false });
                    resolve();
                },
            });
        });

    const clearWallet = () => {
        setWalletState({ status: "not-loaded" });
    };

    const createPasskeySigner = async (name: string, promptType?: ValidPasskeyPromptType) => {
        if (promptType != null) {
            await createPasskeyPrompt(promptType)();
        }
        return await createWebAuthnPasskeySigner(name);
    };

    const contextValue = useMemo(
        () => ({
            ...walletState,
            getOrCreateWallet,
            createPasskeySigner,
            clearWallet,
            experimental_getOrCreateWalletWithRecoveryKey,
        }),
        [walletState, experimental_getOrCreateWalletWithRecoveryKey]
    );

    /**
     * This is only used for Bring Your Own Auth (BYOA).
     * Defer to <CrossmintAuthWalletManager/> for automatic wallet creation if using CrossmintAuthProvider.
     */
    const canAutomaticallyGetOrCreateWallet =
        createOnLogin?.walletType != null &&
        walletState.status === "not-loaded" &&
        crossmint.jwt != null &&
        !isUsingCrossmintAuthProvider;

    const handleAutomaticWalletCreation = useCallback(async () => {
        if (!canAutomaticallyGetOrCreateWallet) {
            return;
        }
        await getOrCreateWallet({
            type: createOnLogin?.walletType,
            args: {
                adminSigner: createOnLogin?.signer,
                linkedUser: createOnLogin?.owner,
            },
        } as GetOrCreateWalletProps);
    }, [canAutomaticallyGetOrCreateWallet]);

    const handleWalletCleanup = useCallback(() => {
        if (crossmint.jwt == null && walletState.status === "loaded") {
            clearWallet();
        }
    }, [walletState.status, crossmint.jwt, clearWallet]);

    useEffect(() => {
        handleAutomaticWalletCreation();
        handleWalletCleanup();
    }, [handleAutomaticWalletCreation, handleWalletCleanup]);

    return (
        <WalletContext.Provider value={contextValue}>
            {isUsingCrossmintAuthProvider && createOnLogin != null ? (
                <CrossmintAuthWalletManager
                    authContext={crossmintAuthContext}
                    createOnLogin={createOnLogin}
                    walletState={walletState}
                    setWalletState={setWalletState}
                    getOrCreateWallet={getOrCreateWallet}
                />
            ) : null}
            {children}
            {passkeyPromptState.open
                ? createPortal(<PasskeyPrompt state={passkeyPromptState} appearance={appearance} />, document.body)
                : null}
        </WalletContext.Provider>
    );
}
