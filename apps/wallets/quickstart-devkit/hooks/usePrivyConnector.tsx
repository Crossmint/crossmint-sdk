"use client";

import { useEffect } from "react";
import {
    useCrossmint,
    useWallet as useCrossmintWallet,
} from "@crossmint/client-sdk-react-ui";
import { usePrivy, useSolanaWallets, useWallets } from "@privy-io/react-auth";

/* ============================================================ */
/*                    EVM PRIVY CONNECTOR                       */
/* ============================================================ */
export const useEVMPrivyConnector = () => {
    const { setJwt } = useCrossmint();
    const {
        getOrCreateWallet: getOrCreateCrossmintWallet,
        status: crossmintWalletStatus,
        error: crossmintWalletError,
        wallet: crossmintWallet,
        type: crossmintWalletType,
    } = useCrossmintWallet();

    const { ready, authenticated, getAccessToken } = usePrivy();
    const { wallets: privyWallets, ready: privyReady } = useWallets();

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

    const privyEmbeddedWallet =
        privyWallets?.find((wallet) => wallet.walletClientType === "privy") ??
        null;

    useEffect(() => {
        const createCrossmintWallet = async () => {
            if (!privyEmbeddedWallet || !authenticated || !ready) {
                return;
            }
            const privyProvider =
                await privyEmbeddedWallet.getEthereumProvider();
            try {
                await getOrCreateCrossmintWallet({
                    type: "evm-smart-wallet",
                    args: {
                        adminSigner: {
                            type: "evm-keypair",
                            address: privyEmbeddedWallet.address,
                            signer: {
                                type: "provider",
                                provider: {
                                    // @ts-ignore something wrong with EIP1193Provider type from our wallets sdk
                                    on: privyProvider.on.bind(privyProvider),
                                    removeListener:
                                        privyProvider.removeListener.bind(
                                            privyProvider
                                        ),
                                    // @ts-ignore something wrong with EIP1193Provider type from our wallets sdk
                                    request:
                                        privyProvider.request.bind(
                                            privyProvider
                                        ),
                                },
                            },
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
        crossmintWalletError,
        isLoading: crossmintWalletStatus === "in-progress" || !privyReady,
        type: crossmintWalletType,
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
        error: crossmintWalletError,
        wallet: crossmintWallet,
        type: crossmintWalletType,
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

    const privyEmbeddedWallet =
        privyWallets?.find((wallet) => wallet.walletClientType === "privy") ??
        null;

    useEffect(() => {
        const createCrossmintWallet = async () => {
            if (!privyEmbeddedWallet || !authenticated || !ready) {
                return;
            }
            try {
                await getOrCreateCrossmintWallet({
                    type: "solana-smart-wallet",
                    args: {
                        adminSigner: {
                            address: privyEmbeddedWallet.address,
                            signer: {
                                signMessage: privyEmbeddedWallet.signMessage,
                                signTransaction:
                                    privyEmbeddedWallet.signTransaction as any,
                            },
                            type: "solana-keypair",
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
        crossmintWalletError,
        isLoading: crossmintWalletStatus === "in-progress" || !privyReady,
        type: crossmintWalletType,
    };
};
