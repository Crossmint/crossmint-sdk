import { type ReactNode, createContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CrossmintWallet } from "@crossmint/wallets-sdk";
import type { WalletTypeToArgs } from "@crossmint/wallets-sdk/dist/services/types";
import type { EVMSignerInput } from "@crossmint/wallets-sdk/dist/evm/wallet";
import type { EVMSmartWallet } from "@crossmint/wallets-sdk";

import type { UIConfig } from "@crossmint/common-sdk-base";
import { PasskeyPrompt } from "@/components/auth/PasskeyPrompt";
import { createWebAuthnPasskeySigner } from "@/utils/createPasskeySigner";
import type { PasskeySigner } from "@/types/passkey";
import { useAuth, useCrossmint, useWalletCache } from "../hooks";
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
    const { user } = useAuth();
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const smartWalletSDK = useMemo(
        () => CrossmintWallet.from({ apiKey: crossmint.apiKey, jwt: crossmint?.jwt }),
        [crossmint.apiKey, crossmint.jwt]
    );
    const walletCache = useWalletCache(user?.id);

    const [walletState, setWalletState] = useState<ValidWalletState>({
        status: "not-loaded",
    });
    const [passkeyPromptState, setPasskeyPromptState] = useState<PasskeyPromptState>({ open: false });

    const createPasskeySigner = async (name: string) => {
        await createPasskeyPrompt("create-wallet")();
        const signer = await createWebAuthnPasskeySigner(name);
        walletCache.setPasskey(signer);
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
            switch (props.type) {
                case "evm-smart-wallet": {
                    const evmArgs = props.args as WalletTypeToArgs["evm-smart-wallet"];
                    const wallet = await smartWalletSDK.getOrCreateWallet("evm-smart-wallet", {
                        chain: evmArgs.chain,
                        adminSigner: evmArgs.adminSigner ?? (await getEVMWalletPasskeySigner()),
                        linkedUser: evmArgs.linkedUser,
                    });
                    walletCache.setWalletAddress(wallet.getAddress());
                    setWalletState({ status: "loaded", wallet });
                    break;
                }
                case "evm-mpc-wallet": {
                    return {
                        startedCreation: false,
                        reason: "EVM MPC wallets are not supported yet.",
                    };
                }
                case "solana-smart-wallet": {
                    return {
                        startedCreation: false,
                        reason: "Solana smart wallets are not supported yet.",
                    };
                }
                case "solana-mpc-wallet": {
                    return {
                        startedCreation: false,
                        reason: "Solana MPC wallets are not supported yet.",
                    };
                }
                default:
                    throw new Error(`Unsupported wallet type: ${props.type}`);
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
        const cachedPasskey = walletCache.passkey;
        let passkeySigner: PasskeySigner | undefined;
        const passkeyName = "Crossmint Wallet";
        if (cachedPasskey === undefined) {
            passkeySigner = await createPasskeySigner(passkeyName);
        } else {
            passkeySigner = cachedPasskey;
        }

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
