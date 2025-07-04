import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
    type Chain,
    CrossmintWallets,
    type EmailSignerConfig,
    type Wallet,
    type WalletArgsFor,
} from "@crossmint/wallets-sdk";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";

import { useCrossmint } from "@/hooks";
import type { CreateOnLogin } from "@/types";

export type CrossmintWalletBaseContext = {
    wallet: Wallet<Chain> | undefined;
    status: "not-loaded" | "in-progress" | "loaded" | "error";
    getOrCreateWallet: <C extends Chain>(props: WalletArgsFor<C>) => Promise<Wallet<Chain> | undefined>;
    onAuthRequired?: EmailSignerConfig["onAuthRequired"];
    clientTEEConnection?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
};

export const CrossmintWalletBaseContext = createContext<CrossmintWalletBaseContext>({
    wallet: undefined,
    status: "not-loaded",
    getOrCreateWallet: () => Promise.resolve(undefined),
    onAuthRequired: undefined,
    clientTEEConnection: undefined,
});

export interface CrossmintWalletBaseProviderProps {
    children: ReactNode;
    createOnLogin?: CreateOnLogin;
    callbacks?: {
        onWalletCreationStart?: () => Promise<void>;
        onTransactionStart?: () => Promise<void>;
    };
    onAuthRequired?: EmailSignerConfig["onAuthRequired"];
    clientTEEConnection?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
}

export function CrossmintWalletBaseProvider({
    children,
    createOnLogin,
    callbacks,
    onAuthRequired,
    clientTEEConnection,
}: CrossmintWalletBaseProviderProps) {
    const { crossmint, experimental_customAuth } = useCrossmint(
        "CrossmintWalletBaseProvider must be used within CrossmintProvider"
    );
    const [wallet, setWallet] = useState<Wallet<Chain> | undefined>(undefined);
    const [walletStatus, setWalletStatus] = useState<"not-loaded" | "in-progress" | "loaded" | "error">("not-loaded");

    const getOrCreateWallet = useCallback(
        async <C extends Chain>(args: WalletArgsFor<C>) => {
            if (experimental_customAuth?.jwt == null || walletStatus === "in-progress") {
                return undefined;
            }
            if (wallet != null) {
                return wallet;
            }

            try {
                setWalletStatus("in-progress");
                const wallets = CrossmintWallets.from(crossmint);

                const _onWalletCreationStart = args.options?.experimental_callbacks?.onWalletCreationStart;
                const _onTransactionStart = args.options?.experimental_callbacks?.onTransactionStart;

                if (args?.signer?.type === "email") {
                    const _onAuthRequired = args.signer.onAuthRequired ?? onAuthRequired;
                    args.signer = {
                        ...args.signer,
                        onAuthRequired: _onAuthRequired,
                    };
                }

                const wallet = await wallets.getOrCreateWallet<C>({
                    chain: args.chain,
                    signer: args.signer,
                    owner: args.owner,
                    options: {
                        clientTEEConnection: clientTEEConnection?.(),
                        experimental_callbacks: {
                            onWalletCreationStart: _onWalletCreationStart ?? callbacks?.onWalletCreationStart,
                            onTransactionStart: _onTransactionStart ?? callbacks?.onTransactionStart,
                        },
                    },
                });
                setWallet(wallet);
                setWalletStatus("loaded");
                return wallet;
            } catch (error) {
                console.error("Failed to create wallet:", error);
                setWallet(undefined);
                setWalletStatus("error");
                return undefined;
            }
        },
        [crossmint, experimental_customAuth]
    );

    useEffect(() => {
        if (createOnLogin != null) {
            getOrCreateWallet(createOnLogin);
        }
    }, [createOnLogin, getOrCreateWallet]);

    useEffect(() => {
        if (experimental_customAuth?.jwt == null && walletStatus !== "not-loaded") {
            setWalletStatus("not-loaded");
            setWallet(undefined);
        }
    }, [experimental_customAuth?.jwt, walletStatus]);

    const contextValue = useMemo(
        () => ({
            wallet,
            status: walletStatus,
            getOrCreateWallet,
            onAuthRequired,
            clientTEEConnection,
        }),
        [getOrCreateWallet, wallet, walletStatus, onAuthRequired, clientTEEConnection]
    );

    return <CrossmintWalletBaseContext.Provider value={contextValue}>{children}</CrossmintWalletBaseContext.Provider>;
}
