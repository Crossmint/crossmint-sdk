import type { Account, Chain, SignableMessage, Transport, WalletClient } from "viem";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { type IEmbeddedWalletSolanaSigner, isSolanaWallet } from "@dynamic-labs/solana";
import { useCallback, useEffect } from "react";

type EVMWalletClient = WalletClient<Transport, Chain, Account>;

export type CustomEVMAdminSigner = EVMWalletClient & {
    type: "evm-keypair";
    address: `0x${string}`;
    signer: {
        type: "viem_v2";
        signMessage: (data: {
            message: SignableMessage;
        }) => Promise<`0x${string}`>;
        account: Account;
    };
};

export type CustomSolanaAdminSigner = IEmbeddedWalletSolanaSigner & {
    type: "solana-keypair";
    address: string;
    signer: IEmbeddedWalletSolanaSigner;
};

export function useDynamicConnect(
    isWeb3Enabled: boolean,
    setIsDynamicSdkLoaded: (sdkHasLoaded: boolean) => void,
    accessToken?: string
) {
    const {
        primaryWallet: connectedDynamicWallet,
        sdkHasLoaded,
        removeWallet,
        handleUnlinkWallet,
    } = useDynamicContext();
    const dynamicSdkHasLoaded = !isWeb3Enabled || sdkHasLoaded;

    useEffect(() => {
        if (isWeb3Enabled) {
            setIsDynamicSdkLoaded(dynamicSdkHasLoaded);
        }
    }, [dynamicSdkHasLoaded, isWeb3Enabled]);

    const getAdminSigner = async () => {
        if (!connectedDynamicWallet) {
            return null;
        }

        try {
            if (isEthereumWallet(connectedDynamicWallet)) {
                const dynamicClient = await connectedDynamicWallet.getWalletClient();
                return {
                    ...dynamicClient,
                    address: dynamicClient.account.address,
                    signer: {
                        type: "viem_v2",
                        account: {
                            ...dynamicClient.account,
                            signMessage: async (data: { message: SignableMessage }) => {
                                return await dynamicClient.signMessage({
                                    message: data.message,
                                });
                            },
                        },
                    },
                    type: "evm-keypair",
                } as CustomEVMAdminSigner;
            }
            if (isSolanaWallet(connectedDynamicWallet)) {
                const signer = await connectedDynamicWallet.getSigner();
                return {
                    ...signer,
                    address: connectedDynamicWallet.address,
                    signer: {
                        ...signer,
                    },
                    type: "solana-keypair",
                } as CustomSolanaAdminSigner;
            }
            return null;
        } catch (error) {
            console.error("Failed to get admin signer", error);
            return null;
        }
    };

    const cleanup = useCallback(() => {
        if (!accessToken && connectedDynamicWallet) {
            removeWallet(connectedDynamicWallet.id);
            handleUnlinkWallet(connectedDynamicWallet.id);
        }
    }, [accessToken, connectedDynamicWallet, removeWallet, handleUnlinkWallet]);

    return {
        sdkHasLoaded: dynamicSdkHasLoaded,
        getAdminSigner,
        cleanup,
        isDynamicWalletConnected: !!connectedDynamicWallet,
    };
}
