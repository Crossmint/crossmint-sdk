import type React from "react";
import type { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import DynamicContextProviderWrapper from "@/components/dynamic-xyz/DynamicContextProviderWrapper";
import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";
import { useAuthForm } from "../AuthFormProvider";
import { dynamicChainToCrossmintChain } from "@/utils/dynamic/dynamicChainToCrossmintChain";
import { clearEOASigner, setEOASigner } from "@/utils/eoaSignerStorage";

export function DynamicWeb3WalletConnect({
    children,
    apiKeyEnvironment,
}: { children: React.ReactNode; apiKeyEnvironment: APIKeyEnvironmentPrefix }) {
    const { crossmintAuth } = useCrossmintAuth();
    const { appearance, loginMethods } = useAuthForm();

    let connectors = [EthereumWalletConnectors, SolanaWalletConnectors];
    if (loginMethods.includes("web3:evm-only")) {
        connectors = [EthereumWalletConnectors];
    } else if (loginMethods.includes("web3:solana-only")) {
        connectors = [SolanaWalletConnectors];
    }

    const cssOverrides = `.powered-by-dynamic { display: none !important; } .wallet-list__scroll-container { padding: 0px !important; } .wallet-list__search-container { padding-left: 0px !important; padding-right: 0px !important; } .dynamic-footer { display: none !important; } h1 { color: ${appearance?.colors?.textPrimary} !important; } * { color: ${appearance?.colors?.textSecondary} !important; }`;

    return (
        <DynamicContextProviderWrapper
            apiKeyEnvironment={apiKeyEnvironment}
            settings={{
                walletConnectors: connectors,
                cssOverrides,
                events: {
                    onWalletRemoved() {
                        console.log("[CryptoWalletConnectionHandler] onWalletRemoved");
                        clearEOASigner();
                    },
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
                    handleConnectedWallet: async (args) => {
                        console.log("[CryptoWalletConnectionHandler] handleConnectedWallet", args);
                        const address = args.address;
                        if (!address) {
                            console.error("[CryptoWalletConnectionHandler] handleConnectedWallet: address is missing");
                            return false;
                        }

                        const chain = await dynamicChainToCrossmintChain(args);
                        const type = chain === "solana" ? "solana" : "ethereum";

                        console.log({ chain, type, args });

                        try {
                            const res = await crossmintAuth?.signInWithSmartWallet(address, type);
                            const signature = (await args.connector?.proveOwnership(address, res.challenge)) as string;
                            const authResponse = (await crossmintAuth?.authenticateSmartWallet(
                                address,
                                type,
                                signature
                            )) as {
                                oneTimeSecret: string;
                            };
                            const oneTimeSecret = authResponse.oneTimeSecret;
                            await crossmintAuth?.handleRefreshAuthMaterial(oneTimeSecret);

                            console.log("Setting eoaSignerAddress from onWalletAdded event");
                            setEOASigner({ type: type === "ethereum" ? "evm-keypair" : "solana-keypair", address });
                        } catch (error) {
                            console.error("[CryptoWalletConnectionHandler] Error authenticating wallet:", error);
                            false;
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
