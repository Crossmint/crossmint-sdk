import type React from "react";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import type { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import DynamicContextProviderWrapper from "@/components/dynamic-xyz/DynamicContextProviderWrapper";
import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";
import { useAuthForm } from "../AuthFormProvider";
import { dynamicChainToCrossmintChain } from "@/utils/dynamic/dynamicChainToCrossmintChain";

export function DynamicWeb3WalletConnect({
    children,
    apiKeyEnvironment,
}: { children: React.ReactNode; apiKeyEnvironment: APIKeyEnvironmentPrefix }) {
    const { crossmintAuth } = useCrossmintAuth();
    const { appearance } = useAuthForm();

    const cssOverrides = `.powered-by-dynamic { display: none !important; } .wallet-list__scroll-container { padding: 0px !important; } .wallet-list__search-container { padding-left: 0px !important; padding-right: 0px !important; } .dynamic-footer { display: none !important; } h1 { color: ${appearance?.colors?.textPrimary} !important; } * { color: ${appearance?.colors?.textSecondary} !important; }`;

    return (
        <DynamicContextProviderWrapper
            apiKeyEnvironment={apiKeyEnvironment}
            settings={{
                cssOverrides,
                walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
                events: {
                    onAuthFlowCancel() {
                        console.log("[CryptoWalletConnectionHandler] onAuthFlowCancel");
                    },
                    onAuthFlowClose() {
                        console.log("[CryptoWalletConnectionHandler] onAuthFlowClose");
                    },
                    onAuthFailure(data, reason) {
                        console.error("[CryptoWalletConnectionHandler] onAuthFailure", data, reason);
                    },
                    onAuthSuccess(data) {
                        console.log("[CryptoWalletConnectionHandler] onAuthSuccess", data);
                    },
                },
                handlers: {
                    handleConnectedWallet: async (wallet) => {
                        console.log("[CryptoWalletConnectionHandler] handleConnectedWallet", wallet);

                        const address = wallet.address;
                        if (!address) {
                            console.error("[CryptoWalletConnectionHandler] handleConnectedWallet: address is missing");
                            return false;
                        }

                        const chain = await dynamicChainToCrossmintChain(wallet);
                        console.log({ chain });

                        try {
                            const res = await crossmintAuth?.signInWithSmartWallet(address);
                            const signature = (await wallet.connector?.signMessage(res.challenge)) as `0x${string}`;
                            const authResponse = (await crossmintAuth?.authenticateSmartWallet(address, signature)) as {
                                oneTimeSecret: string;
                            };
                            const oneTimeSecret = authResponse.oneTimeSecret;
                            await crossmintAuth?.handleRefreshAuthMaterial(oneTimeSecret);
                        } catch (error) {
                            console.error("[CryptoWalletConnectionHandler] Error authenticating wallet:", error);
                            return false;
                        }

                        return true;
                    },
                },
            }}
        >
            {children}
        </DynamicContextProviderWrapper>
    );
}
