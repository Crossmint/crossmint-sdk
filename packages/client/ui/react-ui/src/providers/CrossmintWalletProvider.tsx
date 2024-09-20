import { type ReactNode, createContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
    type EVMSmartWallet,
    type EVMSmartWalletChain,
    type PasskeySigner,
    SmartWalletError,
    SmartWalletSDK,
    type WalletParams,
} from "@crossmint/client-sdk-smart-wallet";

import { PasskeyPrompt } from "../components";
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
    getOrCreateWallet: (
        config?: Omit<WalletConfig, "onCreateWalletPasskeyCallback" | "onErrorCreateWalletCallback">
    ) => Promise<{ startedCreation: boolean; reason?: string }>;
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
    enablePasskeyPrompt = false,
}: {
    children: ReactNode;
    defaultChain: EVMSmartWalletChain;
    enablePasskeyPrompt?: boolean;
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

        if (enablePasskeyPrompt && config.signer && "type" in config.signer && config.signer.type === "PASSKEY") {
            const passkeySigner = config.signer as PasskeySigner;
            if (passkeySigner.onPrePasskeyRegistration == null) {
                passkeySigner.onPrePasskeyRegistration = () =>
                    new Promise<void>((resolve) => {
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

            if (passkeySigner.onPasskeyRegistrationError == null) {
                passkeySigner.onPasskeyRegistrationError = () => {
                    return new Promise<void>((resolve) => {
                        setPasskeyPromptState({
                            type: "create-wallet-error",
                            open: true,
                            primaryActionOnClick: async () => {
                                setPasskeyPromptState({ open: false });
                                // When retrying, we don't want to show the passkey prompt again so unset the wallet creation callback
                                passkeySigner.onPrePasskeyRegistration = undefined;
                                await initializeWallet();
                                resolve();
                            },
                        });
                    });
                };
            }
        }

        const initializeWallet = async () => {
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
            }
        };

        await initializeWallet();

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
