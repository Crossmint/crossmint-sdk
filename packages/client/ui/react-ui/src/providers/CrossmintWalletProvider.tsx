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
import { CrossmintWallets, type EVMSmartWallet, type SolanaSmartWallet } from "@crossmint/wallets-sdk";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import type { PasskeySigner } from "@/types/passkey";
import { useCrossmint } from "../hooks";
import type {
    CrossmintAuthEmbeddedWallets,
    GetOrCreateWalletAdminSigner,
    GetOrCreateWalletProps,
} from "@/types/wallet";
import { createWebAuthnPasskeySigner } from "@/utils/createPasskeySigner";
import { CrossmintSignerProvider, useCrossmintSigner } from "./signers/CrossmintSignerProvider";
import { TwindProvider } from "./TwindProvider";
import { deriveWalletErrorState } from "@/utils/errorUtils";
import { AuthContext, type AuthContextType } from "./CrossmintAuthProvider";
import { useDynamicConnect } from "@/hooks/useDynamicConnect";
import { mapSignerToWalletType } from "@/utils/mapSignerToWalletType";

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
    | { status: "loaded"; wallet: EVMSmartWallet; type: "evm-smart-wallet" }
    | {
          status: "loaded";
          wallet: SolanaSmartWallet;
          type: "solana-smart-wallet";
      }
    | { status: "loading-error"; error: string };

type WalletContextFunctions = {
    getOrCreateWallet: (args: GetOrCreateWalletProps) => Promise<{ startedCreation: boolean; reason?: string }>;
    createPasskeySigner: (name: string, promptType?: ValidPasskeyPromptType) => Promise<PasskeySigner | null>;
    clearWallet: () => void;
    experimental_getOrCreateWalletWithRecoveryKey?: (args: {
        type: "solana-smart-wallet";
        email: string;
    }) => Promise<void>;
    passkeySigner?: PasskeySigner;
};

type WalletType = {
    "evm-smart-wallet": EVMSmartWallet;
    "solana-smart-wallet": SolanaSmartWallet;
};

type LoadedWalletState<T extends keyof WalletType> = {
    status: "loaded";
    wallet: WalletType[T];
    type: T;
    error?: undefined;
};

type WalletContext =
    | ({
          status: "not-loaded" | "in-progress";
          wallet?: undefined;
          type?: undefined;
          error?: undefined;
      } & WalletContextFunctions)
    | ({
          status: "loading-error";
          wallet?: undefined;
          type?: undefined;
          error: string;
      } & WalletContextFunctions)
    | (LoadedWalletState<"evm-smart-wallet"> & WalletContextFunctions)
    | (LoadedWalletState<"solana-smart-wallet"> & WalletContextFunctions);

type CreateOnLogin = {
    walletType: CrossmintAuthEmbeddedWallets["type"];
    walletAuth?: unknown;
    adminSigner?: GetOrCreateWalletAdminSigner;
    linkedUser?: string;
};

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

    return experimental_enableRecoveryKeys ? (
        <TwindProvider>
            <CrossmintSignerProvider
                walletState={walletState}
                setWalletState={setWalletState}
                appearance={appearance}
                signersURL={experimental_signersURL}
            >
                <WalletProvider {...walletProviderProps}>{children}</WalletProvider>
            </CrossmintSignerProvider>
        </TwindProvider>
    ) : (
        <WalletProvider {...walletProviderProps}>{children}</WalletProvider>
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

    const smartWalletSDK = useMemo(
        () =>
            CrossmintWallets.from({
                apiKey: crossmint.apiKey,
                jwt: crossmint?.jwt,
            }),
        [crossmint.apiKey, crossmint.jwt]
    );

    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });

    const getOrCreateWallet = async (props: GetOrCreateWalletProps) => {
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
            const passkeyPromptCallbacks = {
                onWalletCreationStart: createPasskeyPrompt("create-wallet"),
                onWalletCreationFail: createPasskeyPrompt("create-wallet-error"),
                onTransactionStart: createPasskeyPrompt("transaction"),
                onTransactionFail: createPasskeyPrompt("transaction-error"),
            };

            switch (props.type) {
                case "evm-smart-wallet": {
                    const walletArgs = {
                        adminSigner: props.args.adminSigner ?? {
                            type: "evm-passkey",
                        },
                        linkedUser: props.args.linkedUser,
                    };
                    const wallet = await smartWalletSDK.getOrCreateWallet("evm-smart-wallet", walletArgs, {
                        experimental_callbacks:
                            walletArgs.adminSigner?.type === "evm-passkey" ? passkeyPromptCallbacks : undefined,
                    });
                    setWalletState({
                        status: "loaded",
                        wallet,
                        type: "evm-smart-wallet",
                    });
                    break;
                }
                case "solana-smart-wallet": {
                    const wallet = await smartWalletSDK.getOrCreateWallet("solana-smart-wallet", props.args);
                    setWalletState({
                        status: "loaded",
                        wallet,
                        type: "solana-smart-wallet",
                    });
                    break;
                }
            }
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

    // skip wallet creation if using CrossmintAuthProvider
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
                adminSigner: createOnLogin?.adminSigner,
                linkedUser: createOnLogin?.linkedUser,
            },
        } as GetOrCreateWalletProps);
    }, [canAutomaticallyGetOrCreateWallet, getOrCreateWallet]);

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
                <WalletProviderWithCrossmintAuthManager
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

function WalletProviderWithCrossmintAuthManager({
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

        let adminSigner: GetOrCreateWalletAdminSigner = createOnLogin?.adminSigner;
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
                linkedUser: createOnLogin?.linkedUser,
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
