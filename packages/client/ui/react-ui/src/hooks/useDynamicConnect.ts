import { useCallback, useEffect } from "react";
import type { SignableMessage } from "viem";
import type { VersionedTransaction } from "@solana/web3.js";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import type { EvmExternalWalletSignerConfig, SolanaExternalWalletSignerConfig } from "@crossmint/wallets-sdk";

export function useDynamicConnect(setIsDynamicSdkLoaded: (sdkHasLoaded: boolean) => void, accessToken?: string) {
    const {
        primaryWallet: connectedDynamicWallet,
        sdkHasLoaded,
        removeWallet,
        handleUnlinkWallet,
    } = useDynamicContext();

    useEffect(() => {
        setIsDynamicSdkLoaded(sdkHasLoaded);
    }, [sdkHasLoaded]);

    const getAdminSigner = async () => {
        if (!connectedDynamicWallet) {
            throw new Error("No connected wallet");
        }

        try {
            if (isEthereumWallet(connectedDynamicWallet)) {
                const dynamicClient = await connectedDynamicWallet.getWalletClient();
                return {
                    type: "external-wallet",
                    address: dynamicClient.account.address,
                    viemAccount: {
                        ...dynamicClient.account,
                        signMessage: async (data: { message: SignableMessage }) => {
                            return await dynamicClient.signMessage({
                                message: data.message,
                            });
                        },
                    },
                } as EvmExternalWalletSignerConfig;
            }
            if (isSolanaWallet(connectedDynamicWallet)) {
                const signer = await connectedDynamicWallet.getSigner();
                return {
                    type: "external-wallet",
                    address: connectedDynamicWallet.address,
                    onSignTransaction: async (transaction: VersionedTransaction) => {
                        return await signer.signTransaction(transaction);
                    },
                } as SolanaExternalWalletSignerConfig;
            }
            throw new Error("Unsupported wallet type");
        } catch (error) {
            console.error("Failed to get admin signer", error);
            throw new Error("Failed to get admin signer");
        }
    };

    const cleanup = useCallback(() => {
        if (!accessToken && connectedDynamicWallet) {
            removeWallet(connectedDynamicWallet.id);
            handleUnlinkWallet(connectedDynamicWallet.id);
        }
    }, [accessToken, connectedDynamicWallet, removeWallet, handleUnlinkWallet]);

    return {
        sdkHasLoaded,
        getAdminSigner,
        cleanup,
        isDynamicWalletConnected: !!connectedDynamicWallet,
    };
}
