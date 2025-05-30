"use client";

import { useEffect } from "react";
import { useCrossmint, useWallet as useCrossmintWallet } from "@crossmint/client-sdk-react-ui";
import { usePrivy, useSolanaWallets, useWallets as usePrivyWallets } from "@privy-io/react-auth";
import type { VersionedTransaction } from "@solana/web3.js";

/* ============================================================ */
/*                    EVM PRIVY CONNECTOR                       */
/* ============================================================ */
export const useEVMPrivyConnector = () => {
    const {
        setJwt,
        crossmint: { jwt },
    } = useCrossmint();
    const {
        getOrCreateWallet: getOrCreateCrossmintWallet,
        status: crossmintWalletStatus,
        wallet: crossmintWallet,
    } = useCrossmintWallet();

    const { ready, authenticated, getAccessToken } = usePrivy();
    const { wallets: privyWallets, ready: privyReady } = usePrivyWallets();

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

        if (ready && authenticated) {
            syncPrivyJwt();
        }
    }, [ready, authenticated, getAccessToken, setJwt]);

    const privyEmbeddedWallet = privyWallets?.find((wallet) => wallet.walletClientType === "privy") ?? null;

    useEffect(() => {
        const createCrossmintWallet = async () => {
            if (!privyEmbeddedWallet || !authenticated || !ready || !jwt) {
                return;
            }
            const privyProvider = await privyEmbeddedWallet.getEthereumProvider();
            try {
                await getOrCreateCrossmintWallet({
                    chain: process.env.NEXT_PUBLIC_EVM_CHAIN as any,
                    signer: {
                        type: "external-wallet",
                        address: privyEmbeddedWallet.address,
                        provider: privyProvider,
                    },
                });
            } catch (error) {
                console.error("Failed to create Crossmint wallet:", error);
            }
        };
        createCrossmintWallet();
    }, [privyEmbeddedWallet, authenticated, ready, jwt]);

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
    const {
        getOrCreateWallet: getOrCreateCrossmintWallet,
        status: crossmintWalletStatus,
        wallet: crossmintWallet,
    } = useCrossmintWallet();

    const { ready, authenticated, getAccessToken } = usePrivy();
    const { wallets: privyWallets, ready: privyReady } = useSolanaWallets();

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

        if (ready && authenticated) {
            syncPrivyJwt();
        }
    }, [ready, authenticated, getAccessToken, setJwt]);

    const privyEmbeddedWallet = privyWallets?.find((wallet) => wallet.walletClientType === "privy") ?? null;

    useEffect(() => {
        const createCrossmintWallet = async () => {
            if (!privyEmbeddedWallet || !authenticated || !ready) {
                return;
            }
            try {
                await getOrCreateCrossmintWallet({
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: privyEmbeddedWallet.address,
                        onSignTransaction: (transaction: VersionedTransaction) => {
                            return privyEmbeddedWallet.signTransaction(transaction);
                        },
                    },
                });
            } catch (error) {
                console.error("Failed to create Crossmint wallet:", error);
            }
        };
        createCrossmintWallet();
    }, [privyEmbeddedWallet, authenticated, ready]);

    return {
        privyEmbeddedWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !privyReady,
    };
};
