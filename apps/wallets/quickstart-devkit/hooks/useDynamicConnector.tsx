"use client";

import { useEffect } from "react";
import { useCrossmint, useWallet as useCrossmintWallet } from "@crossmint/client-sdk-react-ui";
import { getAuthToken, useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { isEthereumWallet } from "@dynamic-labs/ethereum";

/* ============================================================ */
/*                    EVM DYNAMIC CONNECTOR                     */
/* ============================================================ */
export const useEVMDynamicConnector = () => {
    const { setJwt } = useCrossmint();
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
                setJwt(dynamicJwt);
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
    const { setJwt } = useCrossmint();
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
                setJwt(dynamicJwt);
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
