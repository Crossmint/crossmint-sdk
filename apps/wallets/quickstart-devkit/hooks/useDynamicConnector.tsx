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
    const { status: crossmintWalletStatus, wallet: crossmintWallet, createWallet, getWallet } = useCrossmintWallet();

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
            crossmintWallet != null ||
            crossmintWalletStatus === "in-progress" ||
            !dynamicPrimaryWallet ||
            !isEthereumWallet(dynamicPrimaryWallet) ||
            chain == null
        ) {
            return;
        }

        const fetchWallet = async () => {
            try {
                const wallet = await getWallet({ chain });
                if (wallet != null) {
                    return wallet;
                }

                const dynamicClient = await dynamicPrimaryWallet.getWalletClient();
                if (dynamicClient.account == null) {
                    return;
                }

                return await createWallet({
                    chain,
                    recovery: {
                        type: "external-wallet",
                        address: dynamicPrimaryWallet.address,
                        onSign: async (payload: string) => {
                            return await dynamicClient.signMessage({
                                message: payload,
                                account: dynamicClient.account,
                            });
                        },
                    },
                });
            } catch (error) {
                console.error("Failed to get or create Crossmint EVM wallet:", error);
            }
        };

        fetchWallet();
    }, [createWallet, getWallet, dynamicPrimaryWallet, crossmint.jwt, crossmintWallet, crossmintWalletStatus]);

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
    const { status: crossmintWalletStatus, wallet: crossmintWallet, createWallet, getWallet } = useCrossmintWallet();

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
            crossmintWallet != null ||
            crossmintWalletStatus === "in-progress" ||
            !dynamicPrimaryWallet ||
            !isSolanaWallet(dynamicPrimaryWallet)
        ) {
            return;
        }

        const fetchWallet = async () => {
            try {
                const wallet = await getWallet({ chain: "solana" });
                if (wallet != null) {
                    return wallet;
                }

                const dynamicSigner = await dynamicPrimaryWallet.getSigner();
                return await createWallet({
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
                console.error("Failed to get or create Crossmint Solana wallet:", error);
            }
        };
        fetchWallet();
    }, [crossmint.jwt, dynamicPrimaryWallet, createWallet, getWallet, crossmintWallet, crossmintWalletStatus]);

    return {
        dynamicPrimaryWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !sdkHasLoaded,
    };
};
