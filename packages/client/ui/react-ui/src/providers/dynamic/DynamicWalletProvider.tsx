import { useEffect, useMemo, type ReactNode } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { isSolanaWallet } from "@dynamic-labs/solana";
import type { SignableMessage } from "viem";
import type { VersionedTransaction } from "@solana/web3.js";
import type { Chain, ExternalWalletSignerConfigForChain } from "@crossmint/wallets-sdk";
import base58 from "bs58";
import type {
    APIKeyEnvironmentPrefix,
    EvmExternalWalletSignerConfig,
    SolanaExternalWalletSignerConfig,
} from "@crossmint/common-sdk-base";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import DynamicContextProviderWrapper from "@/components/dynamic-xyz/DynamicContextProviderWrapper";
import { dynamicChainToCrossmintChain } from "@/utils/dynamic/dynamicChainToCrossmintChain";
import { useCrossmintAuth } from "@/hooks";

type DynamicWalletProviderProps = {
    children: ReactNode;
    enabled?: boolean;
    apiKeyEnvironment: APIKeyEnvironmentPrefix;
    loginMethods?: string[];
    appearance?: {
        colors?: {
            textPrimary?: string;
            textSecondary?: string;
        };
    };
    onSdkLoaded?: (loaded: boolean) => void;
    onWalletConnected: (externalWalletSigner: ExternalWalletSignerConfigForChain<Chain>) => void;
};

type DynamicWalletStateProviderProps = {
    children: ReactNode;
    enabled: boolean;
    jwt?: string;
    onSdkLoaded?: (loaded: boolean) => void;
    onWalletConnected: (externalWalletSigner: ExternalWalletSignerConfigForChain<Chain>) => void;
};

function DynamicWalletStateProvider({
    children,
    enabled,
    onSdkLoaded,
    onWalletConnected,
    jwt,
}: DynamicWalletStateProviderProps) {
    const {
        primaryWallet: connectedDynamicWallet,
        sdkHasLoaded,
        removeWallet,
        handleUnlinkWallet,
    } = useDynamicContext();

    const hasDynamicSdkLoaded = !enabled || sdkHasLoaded;

    useEffect(() => {
        if (hasDynamicSdkLoaded) {
            onSdkLoaded?.(hasDynamicSdkLoaded);
        }
    }, [hasDynamicSdkLoaded, onSdkLoaded]);

    useEffect(() => {
        if (jwt == null && hasDynamicSdkLoaded && connectedDynamicWallet != null) {
            removeWallet(connectedDynamicWallet.id);
            handleUnlinkWallet(connectedDynamicWallet.id);
        }
    }, [jwt, hasDynamicSdkLoaded, connectedDynamicWallet, removeWallet, handleUnlinkWallet]);

    useEffect(() => {
        async function handleSettingExternalWalletSigner() {
            try {
                if (isEthereumWallet(connectedDynamicWallet!)) {
                    const dynamicClient = await connectedDynamicWallet.getWalletClient();
                    const externalWalletSigner = {
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
                    onWalletConnected(externalWalletSigner);
                } else if (isSolanaWallet(connectedDynamicWallet!)) {
                    const signer = await connectedDynamicWallet.getSigner();
                    const externalWalletSigner = {
                        type: "external-wallet",
                        address: connectedDynamicWallet.address,
                        onSignTransaction: async (transaction: VersionedTransaction) => {
                            return await signer.signTransaction(transaction);
                        },
                    } as SolanaExternalWalletSignerConfig;
                    onWalletConnected(externalWalletSigner);
                } else {
                    throw new Error("Unsupported wallet type");
                }
            } catch (error) {
                console.error("Failed to get admin signer", error);
                throw new Error("Failed to get admin signer");
            }
        }

        if (connectedDynamicWallet != null && jwt != null) {
            handleSettingExternalWalletSigner();
        }
    }, [connectedDynamicWallet, jwt, onWalletConnected]);

    return children;
}

export function DynamicWalletProvider({
    children,
    enabled = true,
    apiKeyEnvironment,
    loginMethods = ["web3"],
    appearance,
    onSdkLoaded,
    onWalletConnected,
}: DynamicWalletProviderProps) {
    const { crossmintAuth, jwt } = useCrossmintAuth();
    const cssOverrides = useMemo(
        () =>
            `.powered-by-dynamic { display: none !important; }
            .wallet-list__scroll-container { padding: 0px !important; }
            .wallet-list__search-container { padding-left: 0px !important; padding-right: 0px !important; }
            .dynamic-footer { display: none !important; }
            h1 { color: ${appearance?.colors?.textPrimary} !important; }
            * { color: ${appearance?.colors?.textSecondary} !important; }`,
        [appearance?.colors?.textPrimary, appearance?.colors?.textSecondary]
    );

    const connectors = useMemo(() => {
        if (!enabled) {
            return undefined;
        }
        if (loginMethods.includes("web3:evm-only")) {
            return [EthereumWalletConnectors];
        }
        if (loginMethods.includes("web3:solana-only")) {
            return [SolanaWalletConnectors];
        }
        return [EthereumWalletConnectors, SolanaWalletConnectors];
    }, [enabled, loginMethods]);

    return (
        <DynamicContextProviderWrapper
            key={`${apiKeyEnvironment}-${loginMethods.join(",")}`}
            apiKeyEnvironment={apiKeyEnvironment}
            settings={{
                walletConnectors: connectors,
                cssOverrides,
                events: {
                    onAuthFailure(data, reason) {
                        console.error("[DynamicWalletProvider] onAuthFailure", data, reason);
                    },
                },
                handlers: {
                    handleConnectedWallet: async (args) => {
                        if (!crossmintAuth) {
                            console.error("[DynamicWalletProvider] crossmintAuth is not available");
                            return false;
                        }

                        const address = args.address;
                        if (address == null) {
                            console.error("[DynamicWalletProvider] handleConnectedWallet: address is missing");
                            return false;
                        }

                        try {
                            const chain = await dynamicChainToCrossmintChain(args);
                            const type = chain === "solana" ? "solana" : "evm";

                            // Handle the authentication flow
                            const res = await crossmintAuth.signInWithSmartWallet(address, type);
                            if (res?.challenge == null) {
                                throw new Error("No challenge received from signInWithSmartWallet");
                            }

                            const rawSignature = await args.connector?.proveOwnership(address, res.challenge);
                            if (rawSignature == null) {
                                throw new Error("Failed to get signature from wallet");
                            }

                            let signature = rawSignature;
                            if (type === "solana") {
                                const signatureBuffer = Buffer.from(rawSignature, "base64");
                                signature = base58.encode(signatureBuffer);
                            }

                            const authResponse = await crossmintAuth.authenticateSmartWallet(address, type, signature);
                            if (authResponse?.oneTimeSecret == null) {
                                throw new Error("No oneTimeSecret received from authenticateSmartWallet");
                            }

                            await crossmintAuth.handleRefreshAuthMaterial(authResponse.oneTimeSecret);
                            return true;
                        } catch (error) {
                            console.error("[DynamicWalletProvider] Error handling wallet connection:", error);
                            return false;
                        }
                    },
                },
            }}
        >
            <DynamicWalletStateProvider
                enabled={enabled}
                onSdkLoaded={onSdkLoaded}
                onWalletConnected={onWalletConnected}
                jwt={jwt}
            >
                {children}
            </DynamicWalletStateProvider>
        </DynamicContextProviderWrapper>
    );
}
