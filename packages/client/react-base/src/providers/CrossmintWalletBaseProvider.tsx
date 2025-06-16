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
    getHandshakeParent?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
};

export const CrossmintWalletBaseContext = createContext<CrossmintWalletBaseContext>({
    wallet: undefined,
    status: "not-loaded",
    getOrCreateWallet: () => Promise.resolve(undefined),
    onAuthRequired: undefined,
    getHandshakeParent: undefined,
});

export interface CrossmintWalletBaseProviderProps {
    children: ReactNode;
    createOnLogin?: CreateOnLogin;
    callbacks?: {
        onWalletCreationStart?: () => Promise<void>;
        onTransactionStart?: () => Promise<void>;
    };
    onAuthRequired?: EmailSignerConfig["onAuthRequired"];
    getHandshakeParent?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
}

export function CrossmintWalletBaseProvider({
    children,
    createOnLogin,
    callbacks,
    onAuthRequired,
    getHandshakeParent,
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
                // Return existing wallet
                return wallet;
            }

            try {
                setWalletStatus("in-progress");
                const wallets = CrossmintWallets.from(crossmint);

                const _onWalletCreationStart = args.options?.experimental_callbacks?.onWalletCreationStart;
                const _onTransactionStart = args.options?.experimental_callbacks?.onTransactionStart;

                if (args?.signer?.type === "email") {
                    const email = args.signer.email ?? experimental_customAuth?.email;
                    const _onAuthRequired = args.signer.onAuthRequired ?? onAuthRequired;
                    if (email == null) {
                        throw new Error(
                            "Email not found in customAuth or signer. Please set email in customAuth or signer."
                        );
                    }
                    args.signer = {
                        ...args.signer,
                        email,
                        onAuthRequired: _onAuthRequired,
                        _handshakeParent: getHandshakeParent?.(),
                    };
                }

                if (args?.signer?.type === "external-wallet") {
                    const signer =
                        args.signer?.address != null ? args.signer : experimental_customAuth.externalWalletSigner;

                    if (signer == null) {
                        throw new Error(
                            "External wallet config not found in customAuth or signer. Please set it in customAuth or signer."
                        );
                    }

                    // TODO: detect runtime error - maybe move this signer logic to the Wallets SDK
                    // if externalWallet is Evm and chain is Solana => throw
                    // if externalWallet is Solana and chain is Evm => throw
                    // @ts-expect-error fix this
                    args.signer = signer;
                }

                const wallet = await wallets.getOrCreateWallet<C>({
                    chain: args.chain,
                    signer: args.signer,
                    options: {
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
    }, [createOnLogin, experimental_customAuth]);

    useEffect(() => {
        if (crossmint.jwt == null && walletStatus !== "not-loaded") {
            setWalletStatus("not-loaded");
            setWallet(undefined);
        }
    }, [crossmint.jwt, walletStatus]);

    const contextValue = useMemo(
        () => ({
            wallet,
            status: walletStatus,
            getOrCreateWallet,
            onAuthRequired,
            getHandshakeParent,
        }),
        [getOrCreateWallet, wallet, walletStatus, onAuthRequired, getHandshakeParent]
    );

    return <CrossmintWalletBaseContext.Provider value={contextValue}>{children}</CrossmintWalletBaseContext.Provider>;
}
