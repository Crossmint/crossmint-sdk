"use client";

import { useEffect } from "react";
import { useCrossmint, useWallet as useCrossmintWallet } from "@crossmint/client-sdk-react-ui";
import { getAuthToken, useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import type { VersionedTransaction } from "@solana/web3.js";

/* ============================================================ */
/*                    EVM DYNAMIC CONNECTOR                     */
/* ============================================================ */
export const useEVMDynamicConnector = () => {
    const { experimental_setCustomAuth } = useCrossmint();
    const { status: crossmintWalletStatus, wallet: crossmintWallet } = useCrossmintWallet();

    const { primaryWallet: dynamicPrimaryWallet, sdkHasLoaded } = useDynamicContext();
    const isAuthenticated = useIsLoggedIn();
    const dynamicJwt = getAuthToken();

    useEffect(() => {
        const fetchCrossmintWallet = async () => {
            if (!isAuthenticated || !dynamicPrimaryWallet || !isEthereumWallet(dynamicPrimaryWallet)) {
                return null;
            }
            try {
                const dynamicClient = await dynamicPrimaryWallet.getWalletClient();
                experimental_setCustomAuth({
                    jwt: dynamicJwt,
                    externalWalletSigner: {
                        type: "external-wallet",
                        address: dynamicPrimaryWallet.address,
                        // @ts-ignore not sure why type is wrong
                        viemAccount: dynamicClient.account,
                    },
                });
            } catch (error) {
                console.error("Failed to create Crossmint wallet:", error);
            }
        };

        fetchCrossmintWallet();
    }, [dynamicJwt, isAuthenticated, dynamicPrimaryWallet]);

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
    const { experimental_setCustomAuth } = useCrossmint();
    const { status: crossmintWalletStatus, wallet: crossmintWallet } = useCrossmintWallet();

    const { primaryWallet: dynamicPrimaryWallet, sdkHasLoaded } = useDynamicContext();
    const isAuthenticated = useIsLoggedIn();
    const dynamicJwt = getAuthToken();

    useEffect(() => {
        const fetchCrossmintWallet = async () => {
            if (!isAuthenticated || !dynamicPrimaryWallet || !isSolanaWallet(dynamicPrimaryWallet)) {
                return null;
            }
            try {
                const dynamicSigner = await dynamicPrimaryWallet.getSigner();
                experimental_setCustomAuth({
                    jwt: dynamicJwt,
                    externalWalletSigner: {
                        type: "external-wallet",
                        address: dynamicPrimaryWallet.address,
                        onSignTransaction: async (transaction: VersionedTransaction) => {
                            return await dynamicSigner.signTransaction(transaction);
                        },
                    },
                });
            } catch (error) {
                console.error("Failed to create Crossmint wallet:", error);
            }
        };
        fetchCrossmintWallet();
    }, [dynamicJwt, isAuthenticated, dynamicPrimaryWallet]);

    return {
        dynamicPrimaryWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !sdkHasLoaded,
    };
};
