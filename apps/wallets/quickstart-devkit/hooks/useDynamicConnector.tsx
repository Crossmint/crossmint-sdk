"use client";

import { useEffect } from "react";
import { type Chain, useCrossmint, useWallet as useCrossmintWallet } from "@crossmint/client-sdk-react-ui";
import { getAuthToken, useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import type { VersionedTransaction } from "@solana/web3.js";

const chain = process.env.NEXT_PUBLIC_EVM_CHAIN as Chain;

/* ============================================================ */
/*                    EVM DYNAMIC CONNECTOR                     */
/* ============================================================ */
export const useEVMDynamicConnector = () => {
    const { setJwt, crossmint } = useCrossmint();
    const { status: crossmintWalletStatus, wallet: crossmintWallet, createWallet } = useCrossmintWallet();

    const { primaryWallet: dynamicPrimaryWallet, sdkHasLoaded } = useDynamicContext();
    const isAuthenticated = useIsLoggedIn();
    const dynamicJwt = getAuthToken();

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }
        setJwt(dynamicJwt);
    }, [setJwt, isAuthenticated, dynamicJwt]);

    useEffect(() => {
        if (
            crossmint.jwt == null ||
            !dynamicPrimaryWallet ||
            !isEthereumWallet(dynamicPrimaryWallet) ||
            chain == null
        ) {
            return;
        }

        const fetchWallet = async () => {
            try {
                const dynamicClient = await dynamicPrimaryWallet.getWalletClient();
                if (dynamicClient.account == null) {
                    return;
                }

                createWallet({
                    chain,
                    recovery: {
                        type: "external-wallet",
                        address: dynamicPrimaryWallet.address,
                        onSign: async (payload: string) => {
                            const signature = await dynamicClient.signMessage({ message: payload, account: dynamicClient.account! });
                            return signature;
                        },
                    },
                });
            } catch (error) {
                console.error("Failed to create Crossmint wallet:", error);
            }
        };

        fetchWallet();
    }, [createWallet, dynamicPrimaryWallet, crossmint.jwt]);

    return {
        dynamicPrimaryWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !sdkHasLoaded,
    };
};

/* ============================================================ */
/*                    SOLANA DYNAMIC CONNECTOR                  */
/* ============================================================ */
export const useSolanaDynamicConnector = () => {
    const { setJwt, crossmint } = useCrossmint();
    const { status: crossmintWalletStatus, wallet: crossmintWallet, createWallet } = useCrossmintWallet();

    const { primaryWallet: dynamicPrimaryWallet, sdkHasLoaded } = useDynamicContext();
    const isAuthenticated = useIsLoggedIn();
    const dynamicJwt = getAuthToken();

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }
        setJwt(dynamicJwt);
    }, [setJwt, isAuthenticated, dynamicJwt]);

    useEffect(() => {
        if (crossmint.jwt == null || !dynamicPrimaryWallet || !isSolanaWallet(dynamicPrimaryWallet)) {
            return;
        }

        const fetchWallet = async () => {
            try {
                const dynamicSigner = await dynamicPrimaryWallet.getSigner();
                createWallet({
                    chain: "solana",
                    recovery: {
                        type: "external-wallet",
                        address: dynamicPrimaryWallet.address,
                        onSign: async (transaction: VersionedTransaction) => {
                            return await dynamicSigner.signTransaction(transaction);
                        },
                    },
                });
            } catch (error) {
                console.error("Failed to create Crossmint wallet:", error);
            }
        };
        fetchWallet();
    }, [crossmint.jwt, dynamicPrimaryWallet, createWallet]);

    return {
        dynamicPrimaryWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !sdkHasLoaded,
    };
};
