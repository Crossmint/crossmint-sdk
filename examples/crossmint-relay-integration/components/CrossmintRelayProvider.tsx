"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { 
    useCrossmint, 
    useAuth, 
    useWallet,
    CrossmintProvider,
    CrossmintAuthProvider,
    CrossmintWalletProvider
} from "@crossmint/client-sdk-react-ui";
import { 
    createClient,
    TESTNET_RELAY_API,
    MAINNET_RELAY_API,
    getClient,
    convertViemChainToRelayChain,
    GetQuoteParameters,
    Execute
} from "@reservoir0x/relay-sdk";
import { base, polygon, arbitrum, mainnet } from "viem/chains";
import { createWalletClient, http, parseEther } from "viem";

createClient({
    baseApiUrl: process.env.NODE_ENV === "production" ? MAINNET_RELAY_API : TESTNET_RELAY_API,
    source: "crossmint-relay-example",
    chains: [
        convertViemChainToRelayChain(mainnet),
        convertViemChainToRelayChain(polygon),
        convertViemChainToRelayChain(arbitrum),
        convertViemChainToRelayChain(base),
    ],
});

interface RelayQuote {
    quote: Execute | null;
    loading: boolean;
    error: string | null;
}

interface CrossmintRelayContextType {
    getRelayQuote: (params: {
        fromChain: string;
        toChain: string;
        amount: string;
        currency: string;
        recipient: string;
    }) => Promise<Execute | null>;
    executeRelayBridge: (quote: Execute) => Promise<string | null>;
    relayQuote: RelayQuote;
}

const CrossmintRelayContext = createContext<CrossmintRelayContextType | null>(null);

export function useCrossmintRelay() {
    const context = useContext(CrossmintRelayContext);
    if (!context) {
        throw new Error("useCrossmintRelay must be used within CrossmintRelayProvider");
    }
    return context;
}

interface CrossmintRelayProviderProps {
    children: ReactNode;
    apiKey: string;
}

export function CrossmintRelayProvider({ children, apiKey }: CrossmintRelayProviderProps) {
    return (
        <CrossmintProvider apiKey={apiKey}>
            <CrossmintAuthProvider
                loginMethods={["email", "google", "twitter"]}
                authModalTitle="Sign in to Bridge Assets"
            >
                <CrossmintWalletProvider>
                    <RelayIntegrationProvider>
                        {children}
                    </RelayIntegrationProvider>
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}

function RelayIntegrationProvider({ children }: { children: ReactNode }) {
    const { wallet } = useWallet();
    const [relayQuote, setRelayQuote] = useState<RelayQuote>({
        quote: null,
        loading: false,
        error: null
    });

    const getRelayQuote = useCallback(async (params: {
        fromChain: string;
        toChain: string;
        amount: string;
        currency: string;
        recipient: string;
    }) => {
        if (!wallet) {
            throw new Error("Wallet not connected");
        }

        setRelayQuote(prev => ({ ...prev, loading: true, error: null }));

        try {
            const chainIdMap: Record<string, number> = {
                "ethereum": 1,
                "polygon": 137,
                "arbitrum": 42161,
                "base": 8453,
            };

            const fromChainId = chainIdMap[params.fromChain];
            const toChainId = chainIdMap[params.toChain];

            if (!fromChainId || !toChainId) {
                throw new Error("Unsupported chain");
            }

            const getQuoteInput: GetQuoteParameters = {
                chainId: fromChainId,
                toChainId: toChainId,
                currency: params.currency.toLowerCase(),
                toCurrency: params.currency.toLowerCase(),
                amount: parseEther(params.amount).toString(),
                recipient: params.recipient,
                tradeType: "EXACT_INPUT",
                wallet: createWalletClient({
                    chain: fromChainId === 1 ? mainnet : fromChainId === 137 ? polygon : fromChainId === 42161 ? arbitrum : base,
                    transport: http(),
                    account: wallet.address as `0x${string}`,
                }),
            };

            const quote = await getClient()?.actions.getQuote(getQuoteInput);
            
            if (!quote) {
                throw new Error("Failed to get quote from Relay");
            }

            setRelayQuote({ quote, loading: false, error: null });
            return quote;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            setRelayQuote({ quote: null, loading: false, error: errorMessage });
            throw error;
        }
    }, [wallet]);

    const executeRelayBridge = useCallback(async (quote: Execute): Promise<string | null> => {
        if (!wallet) {
            throw new Error("Wallet not connected");
        }

        try {
            const result = await getClient()?.actions.execute({
                quote,
                wallet: createWalletClient({
                    chain: base, // Default to base for execution
                    transport: http(),
                    account: wallet.address as `0x${string}`,
                }),
            });

            return result?.hash || null;
        } catch (error) {
            console.error("Failed to execute relay bridge:", error);
            throw error;
        }
    }, [wallet]);

    const contextValue: CrossmintRelayContextType = {
        getRelayQuote,
        executeRelayBridge,
        relayQuote,
    };

    return (
        <CrossmintRelayContext.Provider value={contextValue}>
            {children}
        </CrossmintRelayContext.Provider>
    );
}
