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
    const { crossmint, setJwt } = useCrossmint();
    const {
        getOrCreateWallet: getOrCreateCrossmintWallet,
        status: crossmintWalletStatus,
        wallet: crossmintWallet,
    } = useCrossmintWallet();

    const { primaryWallet: dynamicPrimaryWallet, sdkHasLoaded } = useDynamicContext();
    const isAuthenticated = useIsLoggedIn();
    const jwt = getAuthToken();

    useEffect(() => {
        setJwt(jwt);
    }, [jwt]);

    useEffect(() => {
        const fetchCrossmintWallet = async () => {
            if (
                !crossmint.jwt ||
                !isAuthenticated ||
                !dynamicPrimaryWallet ||
                !isEthereumWallet(dynamicPrimaryWallet)
            ) {
                return null;
            }

            try {
                const dynamicClient = await dynamicPrimaryWallet.getWalletClient();
                await getOrCreateCrossmintWallet({
                    chain: "story",
                    signer: {
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
    }, [jwt, isAuthenticated, dynamicPrimaryWallet, crossmint.jwt]);

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
    const { crossmint, setJwt } = useCrossmint();
    const {
        getOrCreateWallet: getOrCreateCrossmintWallet,
        status: crossmintWalletStatus,
        wallet: crossmintWallet,
    } = useCrossmintWallet();

    const { primaryWallet: dynamicPrimaryWallet, sdkHasLoaded } = useDynamicContext();
    const isAuthenticated = useIsLoggedIn();
    const jwt = getAuthToken();

    useEffect(() => {
        setJwt(jwt);
    }, [jwt]);

    useEffect(() => {
        const fetchCrossmintWallet = async () => {
            if (!crossmint.jwt || !isAuthenticated || !dynamicPrimaryWallet || !isSolanaWallet(dynamicPrimaryWallet)) {
                return null;
            }

            try {
                const dynamicSigner = await dynamicPrimaryWallet.getSigner();
                await getOrCreateCrossmintWallet({
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: dynamicPrimaryWallet.address,
                        onSignTransaction: dynamicSigner.signTransaction,
                    },
                });
            } catch (error) {
                console.error("Failed to create Crossmint wallet:", error);
            }
        };

        fetchCrossmintWallet();
    }, [jwt, isAuthenticated, dynamicPrimaryWallet, crossmint.jwt]);

    return {
        dynamicPrimaryWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !sdkHasLoaded,
    };
};
