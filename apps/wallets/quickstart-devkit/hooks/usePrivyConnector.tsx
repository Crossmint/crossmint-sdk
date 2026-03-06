"use client";

import { useEffect } from "react";
import { useCrossmint, useWallet as useCrossmintWallet } from "@crossmint/client-sdk-react-ui";
import { usePrivy, useSolanaWallets, useWallets as usePrivyWallets } from "@privy-io/react-auth";

/* ============================================================ */
/*                    EVM PRIVY CONNECTOR                       */
/* ============================================================ */
export const useEVMPrivyConnector = () => {
    const { setJwt } = useCrossmint();
    const { status: crossmintWalletStatus, wallet: crossmintWallet } = useCrossmintWallet();

    const { ready, authenticated, getAccessToken, user } = usePrivy();
    const { wallets: privyWallets, ready: privyReady } = usePrivyWallets();
    const privyEmbeddedWallet = privyWallets?.find((wallet) => wallet.walletClientType === "privy") ?? null;

    useEffect(() => {
        const syncPrivyJwt = async () => {
            try {
                const privyJwt = await getAccessToken();
                if (privyJwt != null) {
                    setJwt(privyJwt);
                }
            } catch (error) {
                setJwt(undefined);
                console.error("Failed to get Privy JWT:", error);
            }
        };

        if (ready && authenticated && privyEmbeddedWallet) {
            syncPrivyJwt();
        }
    }, [ready, authenticated, getAccessToken, setJwt, privyEmbeddedWallet, user]);

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
    const { setJwt } = useCrossmint();
    const { status: crossmintWalletStatus, wallet: crossmintWallet } = useCrossmintWallet();

    const { ready, authenticated, getAccessToken, user } = usePrivy();
    const { wallets: privyWallets, ready: privyReady } = useSolanaWallets();
    const privyEmbeddedWallet = privyWallets?.find((wallet) => wallet.walletClientType === "privy") ?? null;

    useEffect(() => {
        const syncPrivyJwt = async () => {
            try {
                const privyJwt = await getAccessToken();
                if (privyJwt != null && privyEmbeddedWallet) {
                    setJwt(privyJwt);
                }
            } catch (error) {
                setJwt(undefined);
                console.error("Failed to get Privy JWT:", error);
            }
        };

        if (ready && authenticated && privyEmbeddedWallet) {
            syncPrivyJwt();
        }
    }, [ready, authenticated, getAccessToken, setJwt, privyEmbeddedWallet, user]);

    return {
        privyEmbeddedWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !privyReady,
    };
};
