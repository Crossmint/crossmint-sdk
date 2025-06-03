import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { isSolanaWallet } from "@dynamic-labs/solana";
import type { SignableMessage } from "viem";
import type { VersionedTransaction } from "@solana/web3.js";
import type { EvmExternalWalletSignerConfig, SolanaExternalWalletSignerConfig } from "@crossmint/wallets-sdk";
import type { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import DynamicContextProviderWrapper from "@/components/dynamic-xyz/DynamicContextProviderWrapper";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { dynamicChainToCrossmintChain } from "@/utils/dynamic/dynamicChainToCrossmintChain";
import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";
import base58 from "bs58";

type DynamicWalletContextType = {
    isDynamicWalletConnected: boolean;
    isDynamicProviderAvailable: boolean;
    hasDynamicSdkLoaded: boolean;
    getAdminSigner: () => Promise<EvmExternalWalletSignerConfig | SolanaExternalWalletSignerConfig>;
    initialize: (jwt?: string, onSdkLoaded?: (loaded: boolean) => void) => void;
    cleanup: () => void;
};

const DynamicWalletContext = createContext<DynamicWalletContextType | null>(null);

export function useDynamicWallet() {
    const context = useContext(DynamicWalletContext);
    if (!context) {
        return {
            isDynamicWalletConnected: false,
            isDynamicProviderAvailable: false,
            hasDynamicSdkLoaded: true,
            getAdminSigner: () => {
                throw new Error("useDynamicWallet must be used within DynamicWalletProvider");
            },
            initialize: () => {},
            cleanup: () => {},
        };
    }
    return context;
}

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
};

type DynamicWalletStateProviderProps = {
    children: ReactNode;
    enabled: boolean;
    onSdkLoaded?: (loaded: boolean) => void;
};

function DynamicWalletStateProvider({ children, enabled, onSdkLoaded }: DynamicWalletStateProviderProps) {
    const [jwt, setJwt] = useState<string | undefined>();
    const [onSdkLoadedCallback, setOnSdkLoadedCallback] = useState<((loaded: boolean) => void) | undefined>();
    const [isInitialized, setIsInitialized] = useState(false);

    const {
        primaryWallet: connectedDynamicWallet,
        sdkHasLoaded,
        removeWallet,
        handleUnlinkWallet,
    } = useDynamicContext();

    const isDynamicWalletConnected = !!connectedDynamicWallet;
    const hasDynamicSdkLoaded = !enabled || sdkHasLoaded;

    const initialize = useCallback((newJwt?: string, onSdkLoaded?: (loaded: boolean) => void) => {
        setJwt(newJwt);
        setOnSdkLoadedCallback(() => onSdkLoaded);
        setIsInitialized(true);
    }, []);

    const cleanup = useCallback(() => {
        if (jwt == null && connectedDynamicWallet) {
            removeWallet(connectedDynamicWallet.id);
            handleUnlinkWallet(connectedDynamicWallet.id);
        }
    }, [jwt, connectedDynamicWallet, removeWallet, handleUnlinkWallet]);

    useEffect(() => {
        if (enabled) {
            onSdkLoadedCallback?.(hasDynamicSdkLoaded);
            onSdkLoaded?.(hasDynamicSdkLoaded);
        }
    }, [hasDynamicSdkLoaded, enabled, onSdkLoadedCallback, onSdkLoaded]);

    useEffect(() => {
        if (jwt == null && isInitialized) {
            cleanup();
        }
    }, [jwt, cleanup, isInitialized]);

    const getAdminSigner = useCallback(async () => {
        if (connectedDynamicWallet == null) {
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
    }, [connectedDynamicWallet]);

    const contextValue = useMemo(
        () => ({
            isDynamicWalletConnected,
            isDynamicProviderAvailable: true,
            hasDynamicSdkLoaded,
            getAdminSigner,
            initialize,
            cleanup,
        }),
        [isDynamicWalletConnected, hasDynamicSdkLoaded, getAdminSigner, initialize, cleanup]
    );

    return <DynamicWalletContext.Provider value={contextValue}>{children}</DynamicWalletContext.Provider>;
}

export function DynamicWalletProvider({
    children,
    enabled = true,
    apiKeyEnvironment,
    loginMethods = ["web3"],
    appearance,
    onSdkLoaded,
}: DynamicWalletProviderProps) {
    const { crossmintAuth } = useCrossmintAuth();
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
                    onWalletRemoved() {
                        console.log("[DynamicWalletProvider] onWalletRemoved");
                    },
                    onAuthFlowCancel() {
                        console.log("[DynamicWalletProvider] onAuthFlowCancel");
                    },
                    onAuthFlowClose() {
                        console.log("[DynamicWalletProvider] onAuthFlowClose");
                    },
                    onAuthFailure(data, reason) {
                        console.error("[DynamicWalletProvider] onAuthFailure", data, reason);
                    },
                    onAuthSuccess(data) {
                        console.log("[DynamicWalletProvider] onAuthSuccess", data);
                    },
                },
                handlers: {
                    handleConnectedWallet: async (args) => {
                        if (!crossmintAuth) {
                            console.error("[DynamicWalletProvider] crossmintAuth is not available");
                            return false;
                        }

                        console.log("[DynamicWalletProvider] handleConnectedWallet", args);
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
            <DynamicWalletStateProvider enabled={enabled} onSdkLoaded={onSdkLoaded}>
                {children}
            </DynamicWalletStateProvider>
        </DynamicContextProviderWrapper>
    );
}
