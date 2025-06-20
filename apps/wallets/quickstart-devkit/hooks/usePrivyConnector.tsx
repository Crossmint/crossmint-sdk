"use client";

import { useEffect } from "react";
import { useCrossmint, useWallet as useCrossmintWallet } from "@crossmint/client-sdk-react-ui";
import { usePrivy, useSolanaWallets, useWallets as usePrivyWallets } from "@privy-io/react-auth";
import { VersionedTransaction } from "@solana/web3.js";

/* ============================================================ */
/*                    EVM PRIVY CONNECTOR                       */
/* ============================================================ */
export const useEVMPrivyConnector = () => {
    const { experimental_setCustomAuth } = useCrossmint();
    const { status: crossmintWalletStatus, wallet: crossmintWallet } = useCrossmintWallet();

    const { ready, authenticated, getAccessToken, user } = usePrivy();
    const { wallets: privyWallets, ready: privyReady } = usePrivyWallets();
    const privyEmbeddedWallet = privyWallets?.find((wallet) => wallet.walletClientType === "privy") ?? null;

    useEffect(() => {
        const syncPrivyJwt = async () => {
            try {
                const privyJwt = await getAccessToken();
                const privyProvider = await privyEmbeddedWallet?.getEthereumProvider();
                if (privyJwt != null) {
                    experimental_setCustomAuth({
                        jwt: privyJwt,
                        email: user?.email?.address,
                        externalWalletSigner: {
                            type: "external-wallet",
                            address: privyEmbeddedWallet?.address,
                            provider: privyProvider,
                        },
                    });
                }
            } catch (error) {
                experimental_setCustomAuth(undefined);
                console.error("Failed to get Privy JWT:", error);
            }
        };

        if (ready && authenticated && privyEmbeddedWallet) {
            syncPrivyJwt();
        }
    }, [ready, authenticated, getAccessToken, experimental_setCustomAuth, privyEmbeddedWallet, user]);

    return {
        privyEmbeddedWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !privyReady,
    };
};

/* ============================================================ */
/*                    SOLANA PRIVY CONNECTOR                    */
/* ============================================================ */
export const useSolanaPrivyConnector = () => {
    const { experimental_setCustomAuth } = useCrossmint();
    const { status: crossmintWalletStatus, wallet: crossmintWallet } = useCrossmintWallet();

    const { ready, authenticated, getAccessToken, user } = usePrivy();
    const { wallets: privyWallets, ready: privyReady } = useSolanaWallets();
    const privyEmbeddedWallet = privyWallets?.find((wallet) => wallet.walletClientType === "privy") ?? null;

    useEffect(() => {
        const syncPrivyJwt = async () => {
            try {
                const privyJwt = await getAccessToken();
                if (privyJwt != null && privyEmbeddedWallet) {
                    experimental_setCustomAuth({
                        jwt: privyJwt,
                        email: user?.email?.address,
                        externalWalletSigner: {
                            type: "external-wallet",
                            address: privyEmbeddedWallet?.address,
                            onSignTransaction: (transaction: VersionedTransaction) => {
                                return privyEmbeddedWallet?.signTransaction(transaction);
                            },
                        },
                    });
                }
            } catch (error) {
                experimental_setCustomAuth(undefined);
                console.error("Failed to get Privy JWT:", error);
            }
        };

        if (ready && authenticated && privyEmbeddedWallet) {
            syncPrivyJwt();
        }
    }, [ready, authenticated, getAccessToken, experimental_setCustomAuth, privyEmbeddedWallet, user]);

    return {
        privyEmbeddedWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !privyReady,
    };
};
