import { type ReactNode, createContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
    type EVMSmartWallet,
    SmartWalletError,
    SmartWalletSDK,
    type WalletParams,
    type PasskeySigner,
    SmartWalletErrorCode,
} from "@crossmint/client-sdk-smart-wallet";

import { useCrossmint } from "../hooks";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import type { CrossmintAuthWalletConfig } from "./CrossmintAuthProvider";
import { getOnClosePasskeyPromptError } from "@/utils/errorUtils";

type WalletStatus = "not-loaded" | "in-progress" | "loaded" | "loading-error";

export type ValidPasskeyPromptType =
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
          onClose?: () => void;
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
        config?: Pick<WalletConfig, "signer" | "type">
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
    embeddedWallets,
    appearance,
}: {
    children: ReactNode;
    embeddedWallets: CrossmintAuthWalletConfig;
    appearance?: UIConfig;
}) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const smartWalletSDK = useMemo(() => SmartWalletSDK.init({ clientApiKey: crossmint.apiKey }), [crossmint.apiKey]);

    const [walletState, setWalletState] = useState<ValidWalletState>({ status: "not-loaded" });
    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });
    const showWalletModals = embeddedWallets.showWalletModals ?? true;

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

        try {
            setWalletState({ status: "in-progress" });
            const wallet = await smartWalletSDK.getOrCreateWallet(
                { jwt: crossmint.jwt as string },
                embeddedWallets.defaultChain,
                enhanceConfigWithPasskeyPrompts(config)
            );
            setWalletState({ status: "loaded", wallet });
        } catch (error: unknown) {
            if (didUserClosePasskeyPrompt(error)) {
                console.error({ type: error.details, message: error.message });
                setWalletState({ status: "not-loaded" });
                return { startedCreation: false, reason: "User closed passkey prompt." };
            }

            console.error("There was an error creating a wallet ", error);
            setWalletState(deriveErrorState(error));
        }
        return { startedCreation: true };
    };

    const enhanceConfigWithPasskeyPrompts = (config: WalletConfig) => {
        if (showWalletModals && (config.signer as PasskeySigner).type === "PASSKEY") {
            return {
                ...config,
                signer: {
                    ...config.signer,
                    onPrePasskeyRegistration: createPasskeyPrompt(
                        "create-wallet",
                        embeddedWallets.createOnLogin === "off"
                    ),
                    onPasskeyRegistrationError: createPasskeyPrompt("create-wallet-error"),
                    onFirstTimePasskeySigning: createPasskeyPrompt("transaction"),
                    onFirstTimePasskeySigningError: createPasskeyPrompt("transaction-error"),
                },
            };
        }
        return config;
    };

    const createPasskeyPrompt =
        (type: ValidPasskeyPromptType, isClosable = true) =>
        () => {
            return new Promise<void>((resolve, reject) => {
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
                    onClose: isClosable ? () => handleClosePasskeyPrompt(type, reject) : undefined,
                });
            });
        };

    const handleClosePasskeyPrompt = (type: ValidPasskeyPromptType, reject: (reason?: any) => void) => {
        setPasskeyPromptState({ open: false });
        const error = getOnClosePasskeyPromptError(type);
        reject(new SmartWalletError(error.message, error.type, SmartWalletErrorCode.PASSKEY_PROMPT_CLOSED));
    };

    const clearWallet = () => {
        setWalletState({ status: "not-loaded" });
    };

    return (
        <WalletContext.Provider value={{ ...walletState, getOrCreateWallet, clearWallet }}>
            {children}
            {passkeyPromptState.open
                ? createPortal(<PasskeyPrompt state={passkeyPromptState} appearance={appearance} />, document.body)
                : null}
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

function didUserClosePasskeyPrompt(error: unknown): error is SmartWalletError {
    if (error instanceof SmartWalletError) {
        return error.code === SmartWalletErrorCode.PASSKEY_PROMPT_CLOSED;
    }
    return false;
}
