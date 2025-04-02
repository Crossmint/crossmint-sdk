import type React from "react";
import base58 from "bs58";
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
    enabled,
}: { children: React.ReactNode; apiKeyEnvironment: APIKeyEnvironmentPrefix; enabled: boolean }) {
    const { crossmintAuth } = useCrossmintAuth();
    const { appearance, loginMethods } = useAuthForm();

    let connectors = enabled ? [EthereumWalletConnectors, SolanaWalletConnectors] : undefined;
    if (loginMethods.includes("web3:evm-only")) {
        connectors = [EthereumWalletConnectors];
    } else if (loginMethods.includes("web3:solana-only")) {
        connectors = [SolanaWalletConnectors];
    }

    return (
        <DynamicContextProviderWrapper
            key={`${apiKeyEnvironment}-${loginMethods.join(",")}`}
            apiKeyEnvironment={apiKeyEnvironment}
            settings={{
                walletConnectors: connectors,
                cssOverrides: `.powered-by-dynamic { display: none !important; } .wallet-list__scroll-container { padding: 0px !important; } .wallet-list__search-container { padding-left: 0px !important; padding-right: 0px !important; } .dynamic-footer { display: none !important; } h1 { color: ${appearance?.colors?.textPrimary} !important; } * { color: ${appearance?.colors?.textSecondary} !important; }`,
                events: {
                    onWalletRemoved() {
                        console.log("[CryptoWalletConnectionHandler] onWalletRemoved");
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
                        try {
                            const res = await crossmintAuth?.signInWithSmartWallet(address, type);
                            const rawSignature = (await args.connector?.proveOwnership(
                                address,
                                res.challenge
                            )) as string;

                            let signature = rawSignature;
                            if (type === "solana") {
                                const signatureBuffer = Buffer.from(rawSignature, "base64");
                                signature = base58.encode(signatureBuffer);
                            }
                            const authResponse = (await crossmintAuth?.authenticateSmartWallet(
                                address,
                                type,
                                signature
                            )) as {
                                oneTimeSecret: string;
                            };
                            const oneTimeSecret = authResponse.oneTimeSecret;
                            await crossmintAuth?.handleRefreshAuthMaterial(oneTimeSecret);
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
