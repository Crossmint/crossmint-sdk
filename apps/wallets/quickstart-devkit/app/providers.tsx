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
    return <EVMCrossmintAuthProvider>{children}</EVMCrossmintAuthProvider>;
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
                // loginMethods={["google", "twitter", "email"]}
            >
                {/* <CrossmintWalletProvider
                    showPasskeyHelpers={false}
                    createOnLogin={{ chain: process.env.NEXT_PUBLIC_EVM_CHAIN as any, signer: { type: "passkey" } }}
                > */}
                {children}
                {/* </CrossmintWalletProvider> */}
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
                loginMethods: ["email", "google"],
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: "users-without-wallets",
                    },
                },
            }}
        >
            <CrossmintProvider apiKey={crossmintApiKey}>
                <CrossmintWalletProvider
                    showPasskeyHelpers={false}
                    createOnLogin={{
                        chain: process.env.NEXT_PUBLIC_EVM_CHAIN as any,
                        signer: { type: "email" },
                    }}
                >
                    {children}
                </CrossmintWalletProvider>
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

function EVMFirebaseProvider({ children }: { children: React.ReactNode }) {
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        console.error("Make sure to set all firebase .env vars for Firebase BYOA");
        return;
    }
    return (
        <CrossmintProvider apiKey={crossmintApiKey}>
            <CrossmintWalletProvider
                createOnLogin={{ chain: process.env.NEXT_PUBLIC_EVM_CHAIN as any, signer: { type: "email" } }}
            >
                {children}
            </CrossmintWalletProvider>
        </CrossmintProvider>
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
                <CrossmintWalletProvider
                    showPasskeyHelpers={false}
                    createOnLogin={{ chain: "solana", signer: { type: "email" } }}
                >
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
                loginMethods: ["email", "google"],
                embeddedWallets: {
                    solana: {
                        createOnLogin: "users-without-wallets",
                    },
                },
            }}
        >
            <CrossmintProvider apiKey={crossmintApiKey}>
                <CrossmintWalletProvider
                    showPasskeyHelpers={false}
                    createOnLogin={{ chain: "solana", signer: { type: "external-wallet" } }}
                >
                    {children}
                </CrossmintWalletProvider>
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
                <CrossmintWalletProvider createOnLogin={{ chain: "solana", signer: { type: "external-wallet" } }}>
                    {children}
                </CrossmintWalletProvider>
            </CrossmintProvider>
        </DynamicContextProvider>
    );
}

function SolanaFirebaseProvider({ children }: { children: React.ReactNode }) {
    return (
        <CrossmintProvider apiKey={crossmintApiKey}>
            <CrossmintWalletProvider createOnLogin={{ chain: "solana", signer: { type: "email" } }}>
                {children}
            </CrossmintWalletProvider>
        </CrossmintProvider>
    );
}
