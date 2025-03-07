import { type ReactNode, createContext, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";

import {
    type EVMSmartWallet,
    type EVMSmartWalletChain,
    SmartWalletError,
    SmartWalletSDK,
    type WalletParams,
    type PasskeySigner,
} from "@crossmint/client-sdk-smart-wallet";

import { useCrossmint } from "../hooks";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";

type WalletStatus = "not-loaded" | "in-progress" | "loaded" | "loading-error";

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
    | { status: "loaded"; wallet: EVMSmartWallet }
    | { status: "loading-error"; error: SmartWalletError };

type WalletContext = {
    status: WalletStatus;
    wallet?: EVMSmartWallet;
    passkeySigner?: PasskeySigner;
    error?: SmartWalletError;
    getOrCreateWallet: (
        config?: Pick<WalletConfig, "signer" | "type">
    ) => Promise<ValidWalletState & { startedCreation: boolean; reason?: string }>;
    createPasskeySigner: () => Promise<PasskeySigner | null>;
    clearWallet: () => void;
};

export const WalletContext = createContext<WalletContext>({
    status: "not-loaded",
    getOrCreateWallet: () => Promise.resolve({ status: "not-loaded", startedCreation: false }),
    createPasskeySigner: () => Promise.resolve(null),
    clearWallet: () => {},
});

export type WalletConfig = WalletParams & { type: "evm-smart-wallet" };

export function CrossmintWalletProvider({
    children,
    defaultChain,
    appearance,
}: {
    children: ReactNode;
    defaultChain: EVMSmartWalletChain;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
}) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const smartWalletSDK = useMemo(() => SmartWalletSDK.init({ clientApiKey: crossmint.apiKey }), [crossmint.apiKey]);

    const [walletState, setWalletState] = useState<ValidWalletState>({
        status: "not-loaded",
    });
    const [passkeySigner, setPasskeySigner] = useState<PasskeySigner | undefined>(undefined);
    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });

    const createPasskeySigner = useCallback(async () => {
        const signer = await smartWalletSDK.createPasskeySigner("Crossmint Wallet");
        setPasskeySigner(signer);
        return signer;
    }, [smartWalletSDK]);

    const getOrCreateWallet = useCallback(async (config?: WalletConfig) => {
        if (walletState.status === "in-progress") {
            console.log("Wallet already loading");
            return {
                status: "not-loaded" as const,
                startedCreation: false,
                reason: "Wallet is already loading.",
            };
        }

        if (!crossmint.jwt) {
            return {
                status: "not-loaded" as const,
                startedCreation: false,
                reason: `Jwt not set in "CrossmintProvider".`,
            };
        }

        try {
            setWalletState({ status: "in-progress" });
            const signer = config?.signer ?? (await createPasskeySigner());
            const wallet = await smartWalletSDK.getOrCreateWallet(
                { jwt: crossmint.jwt as string },
                defaultChain,
                config ?? {
                    signer,
                }
            );
            const newState = { status: "loaded" as const, wallet };
            setWalletState(newState);
            return { ...newState, startedCreation: true };
        } catch (error: unknown) {
            console.error("There was an error creating a wallet ", error);
            const errorState = deriveErrorState(error);
            setWalletState(errorState);
            return { ...errorState, startedCreation: true };
        }
    }, [walletState.status, crossmint.jwt, smartWalletSDK, createPasskeySigner, defaultChain]);

    const clearWallet = () => {
        setWalletState({ status: "not-loaded" });
    };

    return (
        <WalletContext.Provider
            value={{
                ...walletState,
                getOrCreateWallet,
                createPasskeySigner,
                passkeySigner,
                clearWallet,
            }}
        >
            {children}
            {passkeyPromptState.open
                ? createPortal(<PasskeyPrompt state={passkeyPromptState} appearance={appearance} />, document.body)
                : null}
        </WalletContext.Provider>
    );
}

function deriveErrorState(error: unknown): {
    status: "loading-error";
    error: SmartWalletError;
} {
    if (error instanceof SmartWalletError) {
        return { status: "loading-error", error };
    }

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return {
        status: "loading-error",
        error: new SmartWalletError(`Unknown Wallet Error: ${message}`, stack),
    };
}
