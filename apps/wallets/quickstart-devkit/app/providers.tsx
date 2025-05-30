"use client";

import { CrossmintAuthProvider, CrossmintProvider, CrossmintWalletProvider } from "@crossmint/client-sdk-react-ui";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { PrivyProvider } from "@privy-io/react-auth";

const crossmintApiKey = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? "";
if (!crossmintApiKey) {
    throw new Error("NEXT_PUBLIC_CROSSMINT_API_KEY is not set");
}

export function Providers({ children }: { children: React.ReactNode }) {
    /* @TODO update to your desired provider here */
    return <SolanaCrossmintAuthProvider>{children}</SolanaCrossmintAuthProvider>;
}

/* ============================================================ */
/*                    ALL EVM WALLET PROVIDERS                  */
/* ============================================================ */
function EVMCrossmintAuthProvider({ children }: { children: React.ReactNode }) {
    if (!process.env.NEXT_PUBLIC_EVM_CHAIN) {
        console.error("NEXT_PUBLIC_EVM_CHAIN is not set");
        return;
    }
    return (
        <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY || ""}>
            <CrossmintAuthProvider
                authModalTitle="EVM Wallets Quickstart"
                loginMethods={["google", "twitter", "web3:evm-only"]}
            >
                <CrossmintWalletProvider
                    showPasskeyHelpers={false}
                    createOnLogin={{ chain: process.env.NEXT_PUBLIC_EVM_CHAIN as any }}
                >
                    {children}
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}

function EVMPrivyProvider({ children }: { children: React.ReactNode }) {
    if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
        throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
    }
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
            config={{
                loginMethods: ["wallet", "email", "google", "passkey"],
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: "users-without-wallets",
                    },
                },
            }}
        >
            <CrossmintProvider apiKey={crossmintApiKey}>
                <CrossmintWalletProvider showPasskeyHelpers={false}>{children}</CrossmintWalletProvider>
            </CrossmintProvider>
        </PrivyProvider>
    );
}

function EVMDynamicLabsProvider({ children }: { children: React.ReactNode }) {
    if (!process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID) {
        throw new Error("NEXT_PUBLIC_DYNAMIC_ENV_ID is not set");
    }
    return (
        <DynamicContextProvider
            settings={{
                environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
                walletConnectors: [EthereumWalletConnectors],
            }}
        >
            <CrossmintProvider apiKey={crossmintApiKey}>
                <CrossmintWalletProvider>{children}</CrossmintWalletProvider>
            </CrossmintProvider>
        </DynamicContextProvider>
    );
}

/* ============================================================ */
/*                    ALL SOLANA WALLET PROVIDERS               */
/* ============================================================ */
function SolanaCrossmintAuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY || ""}>
            <CrossmintAuthProvider
                authModalTitle="Solana Wallets Quickstart"
                loginMethods={["google", "twitter", "web3:solana-only", "email"]}
            >
                <CrossmintWalletProvider showPasskeyHelpers={false} createOnLogin={{ chain: "solana" }}>
                    {children}
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}

function SolanaPrivyProvider({ children }: { children: React.ReactNode }) {
    if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
        throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
    }
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
            config={{
                loginMethods: ["wallet", "email", "google", "passkey"],
                embeddedWallets: {
                    solana: {
                        createOnLogin: "users-without-wallets",
                    },
                },
            }}
        >
            <CrossmintProvider apiKey={crossmintApiKey}>
                <CrossmintWalletProvider showPasskeyHelpers={false}>{children}</CrossmintWalletProvider>
            </CrossmintProvider>
        </PrivyProvider>
    );
}

function SolanaDynamicLabsProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    if (!process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID) {
        throw new Error("NEXT_PUBLIC_DYNAMIC_ENV_ID is not set");
    }
    return (
        <DynamicContextProvider
            settings={{
                environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID,
                walletConnectors: [SolanaWalletConnectors],
            }}
        >
            <CrossmintProvider apiKey={crossmintApiKey}>
                <CrossmintWalletProvider>{children}</CrossmintWalletProvider>
            </CrossmintProvider>
        </DynamicContextProvider>
    );
}
