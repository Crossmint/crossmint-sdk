import { type ReactNode, createContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
    CrossmintWallet,
    type WalletTypeToArgs,
    type EVMSignerInput,
    type EVMSmartWallet,
} from "@crossmint/wallets-sdk";

import type { UIConfig } from "@crossmint/common-sdk-base";
import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import { createWebAuthnPasskeySigner } from "@/utils/createPasskeySigner";
import type { PasskeySigner } from "@/types/passkey";
import { useCrossmint } from "../hooks";
import type { GetOrCreateWalletProps } from "@/types/wallet";
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
    | { status: "loading-error"; error: string };

type WalletContext = {
    status: WalletStatus;
    wallet?: EVMSmartWallet;
    passkeySigner?: PasskeySigner;
    error?: string;
    getOrCreateWallet: (args: GetOrCreateWalletProps) => Promise<{ startedCreation: boolean; reason?: string }>;
    createPasskeySigner: (name: string) => Promise<PasskeySigner | null>;
    clearWallet: () => void;
};

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
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const smartWalletSDK = useMemo(
        () => CrossmintWallet.from({ apiKey: crossmint.apiKey, jwt: crossmint?.jwt }),
        [crossmint.apiKey, crossmint.jwt]
    );

    const [walletState, setWalletState] = useState<ValidWalletState>({
        status: "not-loaded",
    });

    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });

    const createPasskeySigner = async (name: string) => {
        await createPasskeyPrompt("create-wallet")();
        const signer = await createWebAuthnPasskeySigner(name);
        return signer;
    };

    const getOrCreateWallet = async (props: GetOrCreateWalletProps) => {
        if (walletState.status == "in-progress") {
            console.log("Wallet already loading");
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

            if (props.type === "evm-smart-wallet") {
                const evmArgs = props.args as WalletTypeToArgs["evm-smart-wallet"];
                let wallet: EVMSmartWallet | null = null;
                const walletArgs: WalletTypeToArgs["evm-smart-wallet"] = {
                    chain: evmArgs.chain,
                    adminSigner: evmArgs.adminSigner,
                    linkedUser: evmArgs.linkedUser,
                };
                wallet = await smartWalletSDK.getOrCreateWallet("evm-smart-wallet", walletArgs);
                // If wallet doesn't exist, create it and pass adminSigner
                if (wallet == null) {
                    wallet = await smartWalletSDK.getOrCreateWallet("evm-smart-wallet", {
                        ...walletArgs,
                        adminSigner: evmArgs.adminSigner ?? (await getEVMWalletPasskeySigner()),
                    });
                }
                setWalletState({ status: "loaded", wallet: wallet as EVMSmartWallet });
            }
        } catch (error: unknown) {
            console.error("There was an error creating a wallet ", error);
            setWalletState(deriveErrorState(error));
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

    const getEVMWalletPasskeySigner = async (): Promise<EVMSignerInput> => {
        const passkeyName = "Crossmint Wallet";
        const passkeySigner = await createPasskeySigner(passkeyName);

        return {
            type: "evm-passkey",
            id: passkeySigner.credential.id,
            name: passkeyName,
            publicKey: {
                x: passkeySigner.credential.publicKey.x.toString(),
                y: passkeySigner.credential.publicKey.y.toString(),
            },
        };
    };

    return (
        <WalletContext.Provider
            value={{
                ...walletState,
                getOrCreateWallet,
                createPasskeySigner,
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
    error: string;
} {
    const message = error instanceof Error ? error.message : String(error);
    return {
        status: "loading-error",
        error: message,
    };
}
