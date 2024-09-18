import { PasskeyPrompt } from "@/components";
import { ReactNode, createContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
    EVMSmartWallet,
    EVMSmartWalletChain,
    SmartWalletError,
    SmartWalletSDK,
    WalletParams,
} from "@crossmint/client-sdk-smart-wallet";

import { useCrossmint } from "../hooks";

type WalletStatus = "not-loaded" | "in-progress" | "loaded" | "loading-error";

type PasskeyPromptState =
    | {
          type: "create-wallet" | "transaction" | "not-supported" | "create-wallet-error" | "transaction-error";
          open: true;
          primaryActionOnClick: () => void;
          secondaryActionOnClick?: () => void;
      }
    | { open: false };

type ValidWalletState =
    | { status: "not-loaded" | "in-progress" }
    | { status: "loaded"; wallet: EVMSmartWallet }
    | { status: "loading-error"; error: SmartWalletError };

type WalletContext = {
    status: WalletStatus;
    wallet?: EVMSmartWallet;
    error?: SmartWalletError;
    getOrCreateWallet: (config?: WalletConfig) => Promise<{ startedCreation: boolean; reason?: string }>;
    clearWallet: () => void;
};

export const WalletContext = createContext<WalletContext>({
    status: "not-loaded",
    getOrCreateWallet: () => Promise.resolve({ startedCreation: false }),
    clearWallet: () => {},
});

export type WalletConfig = WalletParams & { type: "evm-smart-wallet" };

export function CrossmintWalletProvider({
    children,
    defaultChain,
}: {
    children: ReactNode;
    defaultChain: EVMSmartWalletChain;
}) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const smartWalletSDK = useMemo(() => SmartWalletSDK.init({ clientApiKey: crossmint.apiKey }), [crossmint.apiKey]);

    const [walletState, setWalletState] = useState<ValidWalletState>({ status: "not-loaded" });
    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });

    const getOrCreateWallet = async (
        config: WalletConfig = { type: "evm-smart-wallet", signer: { type: "PASSKEY" } }
    ) => {
        if (walletState.status == "in-progress") {
            console.log("Wallet already loading");
            return { startedCreation: false, reason: "Wallet is already loading." };
        }

        if (crossmint.jwt == null) {
            return { startedCreation: false, reason: `Jwt not set in "CrossmintProvider".` };
        }

        // Flag to track if wallet exists, updated during passkey prompt flow
        let hasWallet = false;
        const handleWalletPasskeyPromptStuff = async () => {
            const walletExists = await smartWalletSDK.checkWalletExists({ jwt: crossmint.jwt as string }, defaultChain);
            hasWallet = walletExists;

            if (!walletExists) {
                // If no wallet yet, prompt the user a pre browser passkey prompt.
                return new Promise<void>((resolve) => {
                    setPasskeyPromptState({
                        type: "create-wallet",
                        open: true,
                        primaryActionOnClick: () => {
                            setPasskeyPromptState({ open: false });
                            resolve();
                        },
                    });
                });
            }
        };

        const handleWalletStuff = async () => {
            try {
                setWalletState({ status: "in-progress" });
                const wallet = await smartWalletSDK.getOrCreateWallet(
                    { jwt: crossmint.jwt as string },
                    defaultChain,
                    config
                );
                setWalletState({ status: "loaded", wallet });
            } catch (error: unknown) {
                console.error("There was an error creating a wallet ", error);
                setWalletState(deriveErrorState(error));

                // If an error occurs during wallet creation, show the user a passkey prompt.
                if (!hasWallet) {
                    setPasskeyPromptState({
                        type: "create-wallet-error",
                        open: true,
                        primaryActionOnClick: async () => {
                            // Retrying wallet creation will close the passkey prompt and re-attempt wallet creation flow.
                            setPasskeyPromptState({ open: false });
                            await handleWalletStuff();
                        },
                        secondaryActionOnClick: () =>
                            console.error("__TROUBLESHOOT__\n\nA BUNCH OF TROUBLESHOOT STUFF"),
                    });
                }
            }
        };

        await handleWalletPasskeyPromptStuff();
        await handleWalletStuff();

        return { startedCreation: true };
    };

    const clearWallet = () => {
        setWalletState({ status: "not-loaded" });
    };

    return (
        <WalletContext.Provider value={{ ...walletState, getOrCreateWallet, clearWallet }}>
            {children}
            {passkeyPromptState.open ? createPortal(<PasskeyPrompt state={passkeyPromptState} />, document.body) : null}
        </WalletContext.Provider>
    );
}

function deriveErrorState(error: unknown): { status: "loading-error"; error: SmartWalletError } {
    if (error instanceof SmartWalletError) {
        return { status: "loading-error", error };
    }

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return { status: "loading-error", error: new SmartWalletError(`Unknown Wallet Error: ${message}`, stack) };
}
