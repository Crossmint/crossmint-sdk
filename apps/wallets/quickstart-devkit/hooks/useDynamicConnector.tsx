"use client";

import { useEffect } from "react";
import {
    EVMSmartWalletChain,
    useCrossmint,
    useWallet as useCrossmintWallet,
} from "@crossmint/client-sdk-react-ui";
import {
    getAuthToken,
    useDynamicContext,
    useIsLoggedIn,
} from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { SignableMessage } from "viem";

/* ============================================================ */
/*                    EVM DYNAMIC CONNECTOR                     */
/* ============================================================ */
export const useEVMDynamicConnector = () => {
    const { crossmint, setJwt } = useCrossmint();
    const {
        getOrCreateWallet: getOrCreateCrossmintWallet,
        status: crossmintWalletStatus,
        error: crossmintWalletError,
        wallet: crossmintWallet,
        type: crossmintWalletType,
    } = useCrossmintWallet();

    const { primaryWallet: dynamicPrimaryWallet, sdkHasLoaded } =
        useDynamicContext();
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
                const dynamicClient =
                    await dynamicPrimaryWallet.getWalletClient();
                await getOrCreateCrossmintWallet({
                    type: "evm-smart-wallet",
                    args: {
                        chain: process.env
                            .NEXT_PUBLIC_EVM_CHAIN as EVMSmartWalletChain,
                        adminSigner: {
                            address: dynamicPrimaryWallet.address,
                            type: "evm-keypair",
                            signer: {
                                type: "viem_v2",
                                // @ts-ignore todo: fix type issue in Wallets SDK
                                account: {
                                    ...dynamicClient.account,
                                    signMessage: async (data: {
                                        message: SignableMessage;
                                    }) => {
                                        return await dynamicClient.signMessage({
                                            message: data.message,
                                        });
                                    },
                                },
                            },
                        },
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
        crossmintWalletError,
        isLoading: crossmintWalletStatus === "in-progress" || !sdkHasLoaded,
        type: crossmintWalletType,
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
        error: crossmintWalletError,
        wallet: crossmintWallet,
        type: crossmintWalletType,
    } = useCrossmintWallet();

    const { primaryWallet: dynamicPrimaryWallet, sdkHasLoaded } =
        useDynamicContext();
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
                !isSolanaWallet(dynamicPrimaryWallet)
            ) {
                return null;
            }

            try {
                const dynamicSigner = await dynamicPrimaryWallet.getSigner();
                await getOrCreateCrossmintWallet({
                    type: "solana-smart-wallet",
                    args: {
                        adminSigner: {
                            address: dynamicPrimaryWallet.address,
                            signer: {
                                signMessage: async (message: Uint8Array) => {
                                    const signedMessage =
                                        await dynamicSigner.signMessage(
                                            message
                                        );
                                    return new Uint8Array(
                                        signedMessage.signature
                                    );
                                },
                                // @ts-ignore todo: unsure what this type error is fix later!
                                signTransaction: dynamicSigner.signTransaction,
                            },
                            type: "solana-keypair",
                        },
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
        crossmintWalletError,
        isLoading: crossmintWalletStatus === "in-progress" || !sdkHasLoaded,
        type: crossmintWalletType,
    };
};
