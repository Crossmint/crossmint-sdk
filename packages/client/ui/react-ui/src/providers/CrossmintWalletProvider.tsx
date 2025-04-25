import { type Dispatch, type ReactNode, type SetStateAction, createContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CrossmintWallets, type EVMSmartWallet, type SolanaSmartWallet } from "@crossmint/wallets-sdk";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import type { PasskeySigner } from "@/types/passkey";
import { useCrossmint } from "../hooks";
import type { GetOrCreateWalletProps } from "@/types/wallet";
import { createWebAuthnPasskeySigner } from "@/utils/createPasskeySigner";
import { CrossmintSignerProvider, useCrossmintSigner } from "./non-custodial-signer/CrossmintSignerProvider";
import { TwindProvider } from "./TwindProvider";
import { deriveWalletErrorState } from "@/utils/errorUtils";

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
    | { status: "loaded"; wallet: SolanaSmartWallet; type: "solana-smart-wallet" }
    | { status: "loading-error"; error: string };

type WalletContextFunctions = {
    getOrCreateWallet: (args: GetOrCreateWalletProps) => Promise<{ startedCreation: boolean; reason?: string }>;
    createPasskeySigner: (name: string, promptType?: ValidPasskeyPromptType) => Promise<PasskeySigner | null>;
    clearWallet: () => void;
    experimental_getOrCreateWalletWithNonCustodialSigner?: (args: { type: "solana" }) => Promise<void>;
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

export const WalletContext = createContext<WalletContext>({
    status: "not-loaded",
    getOrCreateWallet: () => Promise.resolve({ startedCreation: false }),
    createPasskeySigner: () => Promise.resolve(null),
    clearWallet: () => {},
});

export function CrossmintWalletProvider({
    children,
    showPasskeyHelpers = true,
    appearance,
}: {
    children: ReactNode;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
}) {
    const [walletState, setWalletState] = useState<ValidWalletState>({
        status: "not-loaded",
    });
    return (
        <TwindProvider>
            <CrossmintSignerProvider walletState={walletState} setWalletState={setWalletState} appearance={appearance}>
                <WalletProvider
                    walletState={walletState}
                    setWalletState={setWalletState}
                    showPasskeyHelpers={showPasskeyHelpers}
                    appearance={appearance}
                >
                    {children}
                </WalletProvider>
            </CrossmintSignerProvider>
        </TwindProvider>
    );
}

function WalletProvider({
    children,
    showPasskeyHelpers = true,
    appearance,
    walletState,
    setWalletState,
}: {
    children: ReactNode;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
    walletState: ValidWalletState;
    setWalletState: Dispatch<SetStateAction<ValidWalletState>>;
}) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const { getOrCreateWalletWithNonCustodialSigner } = useCrossmintSigner();

    const smartWalletSDK = useMemo(
        () => CrossmintWallets.from({ apiKey: crossmint.apiKey, jwt: crossmint?.jwt }),
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
                        adminSigner: props.args.adminSigner ?? { type: "evm-passkey" },
                        linkedUser: props.args.linkedUser,
                    };
                    const wallet = await smartWalletSDK.getOrCreateWallet("evm-smart-wallet", walletArgs, {
                        experimental_callbacks:
                            walletArgs.adminSigner?.type === "evm-passkey" ? passkeyPromptCallbacks : undefined,
                    });
                    setWalletState({ status: "loaded", wallet, type: "evm-smart-wallet" });
                    break;
                }
                case "solana-smart-wallet": {
                    const wallet = await smartWalletSDK.getOrCreateWallet("solana-smart-wallet", props.args);
                    setWalletState({ status: "loaded", wallet, type: "solana-smart-wallet" });
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
            experimental_getOrCreateWalletWithNonCustodialSigner: getOrCreateWalletWithNonCustodialSigner,
        }),
        [walletState, getOrCreateWalletWithNonCustodialSigner]
    );

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
            {passkeyPromptState.open
                ? createPortal(<PasskeyPrompt state={passkeyPromptState} appearance={appearance} />, document.body)
                : null}
        </WalletContext.Provider>
    );
}
