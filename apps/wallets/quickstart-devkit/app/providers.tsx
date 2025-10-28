"use client";

import { Suspense } from "react";
import {
  CrossmintAuthProvider,
  CrossmintProvider,
  CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-ui";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { PrivyProvider } from "@privy-io/react-auth";
import { useSearchParams } from "next/navigation";

const ALIAS_CONFIG =
  process.env.NEXT_PUBLIC_WALLET_ALIAS != null
    ? {
        alias: process.env.NEXT_PUBLIC_WALLET_ALIAS,
      }
    : {};

const crossmintApiKey = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? "";
if (!crossmintApiKey) {
  throw new Error("NEXT_PUBLIC_CROSSMINT_API_KEY is not set");
}

export function Providers({ children }: { children: React.ReactNode }) {
  /*
    @TODO update to your desired provider inside QueryParamsProvider.
    (Ignore this, it's used for e2e testing - Do not remove this)
    */
  return (
    <Suspense>
      <QueryParamsProvider>{children}</QueryParamsProvider>
    </Suspense>
  );
}

/* ============================================================ */
/*                    ALL EVM WALLET PROVIDERS                  */
/* ============================================================ */
function EVMCrossmintAuthProvider({
  children,
  apiKey,
  createOnLogin,
}: {
  children: React.ReactNode;
  apiKey?: string;
  createOnLogin?: any;
}) {
  if (!process.env.NEXT_PUBLIC_EVM_CHAIN) {
    console.error("NEXT_PUBLIC_EVM_CHAIN is not set");
    return;
  }

  return (
    <CrossmintProvider apiKey={apiKey ?? crossmintApiKey}>
      <CrossmintAuthProvider
        authModalTitle="EVM Wallets Quickstart"
        loginMethods={["google", "twitter", "email"]}
      >
        <CrossmintWalletProvider
          showPasskeyHelpers={false}
          createOnLogin={
            createOnLogin != null
              ? createOnLogin
              : {
                  chain: process.env.NEXT_PUBLIC_EVM_CHAIN as any,
                  signer: { type: "email" },
                  ...ALIAS_CONFIG,
                }
          }
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}

function EVMPrivyProvider({
  children,
  apiKey,
}: {
  children: React.ReactNode;
  apiKey?: string;
}) {
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
      <CrossmintProvider apiKey={apiKey ?? crossmintApiKey}>
        <CrossmintWalletProvider
          showPasskeyHelpers={false}
          createOnLogin={{
            chain: process.env.NEXT_PUBLIC_EVM_CHAIN as any,
            signer: { type: "email" },
            ...ALIAS_CONFIG,
          }}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintProvider>
    </PrivyProvider>
  );
}

function EVMDynamicLabsProvider({
  children,
  apiKey,
}: {
  children: React.ReactNode;
  apiKey?: string;
}) {
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
      <CrossmintProvider apiKey={apiKey ?? crossmintApiKey}>
        <CrossmintWalletProvider>{children}</CrossmintWalletProvider>
      </CrossmintProvider>
    </DynamicContextProvider>
  );
}

function EVMFirebaseProvider({
  children,
  apiKey,
}: {
  children: React.ReactNode;
  apiKey?: string;
}) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.error("Make sure to set all firebase .env vars for Firebase BYOA");
    return;
  }
  return (
    <CrossmintProvider apiKey={apiKey ?? crossmintApiKey}>
      <CrossmintWalletProvider
        createOnLogin={{
          chain: process.env.NEXT_PUBLIC_EVM_CHAIN as any,
          signer: { type: "email" },
          ...ALIAS_CONFIG,
        }}
      >
        {children}
      </CrossmintWalletProvider>
    </CrossmintProvider>
  );
}

/* ============================================================ */
/*                    ALL SOLANA WALLET PROVIDERS               */
/* ============================================================ */
function SolanaCrossmintAuthProvider({
  children,
  apiKey,
  createOnLogin,
}: {
  children: React.ReactNode;
  apiKey?: string;
  createOnLogin?: any;
}) {
  return (
    <CrossmintProvider apiKey={apiKey ?? crossmintApiKey}>
      <CrossmintAuthProvider
        authModalTitle="Solana Wallets Quickstart"
        loginMethods={["google", "twitter", "web3:solana-only", "email"]}
      >
        <CrossmintWalletProvider
          showPasskeyHelpers={false}
          createOnLogin={
            createOnLogin != null
              ? createOnLogin
              : {
                  chain: "solana",
                  signer: { type: "email" },
                  ...ALIAS_CONFIG,
                }
          }
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}

function SolanaPrivyProvider({
  children,
  apiKey,
}: {
  children: React.ReactNode;
  apiKey?: string;
}) {
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
      <CrossmintProvider apiKey={apiKey ?? crossmintApiKey}>
        <CrossmintWalletProvider
          showPasskeyHelpers={false}
          createOnLogin={{
            chain: "solana",
            signer: { type: "external-wallet" },
            ...ALIAS_CONFIG,
          }}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintProvider>
    </PrivyProvider>
  );
}

function SolanaDynamicLabsProvider({
  const signerType = searchParams.getchildren,
  apiKey,
}: {
  children: React.ReactNode;
  apiKey?: string;
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
      <CrossmintProvider apiKey={apiKey ?? crossmintApiKey}>
        <CrossmintWalletProvider
          createOnLogin={{
            chain: "solana",
            signer: { type: "external-wallet" },
            ...ALIAS_CONFIG,
          }}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintProvider>
    </DynamicContextProvider>
  );
}

function SolanaFirebaseProvider({
  children,
  apiKey,
}: {
  children: React.ReactNode;
  apiKey?: string;
}) {
  return (
    <CrossmintProvider apiKey={apiKey ?? crossmintApiKey}>
      <CrossmintWalletProvider
        createOnLogin={{
          chain: "solana",
          signer: { type: "email" },
          ...ALIAS_CONFIG,
        }}
      >
        {children}
      </CrossmintWalletProvider>
    </CrossmintProvider>
  );
}

function StellarCrossmintAuthProvider({
  children,
  apiKey,
  createOnLogin,
}: {
  children: React.ReactNode;
  apiKey?: string;
  createOnLogin?: any;
}) {
  return (
    <CrossmintProvider apiKey={apiKey ?? crossmintApiKey}>
      <CrossmintAuthProvider
        authModalTitle="Stellar Wallets Quickstart"
        loginMethods={["google", "twitter", "email", "web3"]}
      >
        <CrossmintWalletProvider
          showPasskeyHelpers={false}
          createOnLogin={
            createOnLogin != null
              ? createOnLogin
              : {
                  chain: "stellar",
                  signer: { type: "email", email: "user@example.com" },
                  ...ALIAS_CONFIG,
                  delegatedSigners: [
                    {
                      signer:
                        "external-wallet:GDUNAPJW6JYL4JEBFR7B5RZZD6B4TOUEWPFTT3V47IHI7QJPA43UFEY6",
                    },
                  ],
                }
          }
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}

// This provider is used for testing and development purposes
// It allows you to specify the provider, chain, signer, and chainId via URL params
function QueryParamsProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();

  const providerType = searchParams.get("provider") || "crossmint"; // default to crossmint
  const chainType = searchParams.get("chain");
  const signerType = searchParams.get("signer") || "email";
  const chainId =
    searchParams.get("chainId") || process.env.NEXT_PUBLIC_EVM_CHAIN;
  const phoneNumber = searchParams.get("phoneNumber");
  const crossmintApiKey = searchParams.get("crossmintApiKey") || undefined;
  const alias = searchParams.get("alias") || undefined;

  if (chainType === "evm") {
    switch (providerType) {
      case "privy":
        return <EVMPrivyProvider>{children}</EVMPrivyProvider>;
      case "dynamic":
        return <EVMDynamicLabsProvider>{children}</EVMDynamicLabsProvider>;
      case "firebase":
        return <EVMFirebaseProvider>{children}</EVMFirebaseProvider>;
      case "crossmint":
      default:
        const createOnLogin: any = {
          chain: chainId,
          signer: { type: signerType },
          ...(alias != null ? { alias } : {}),
        };
        if (signerType === "phone" && phoneNumber != null) {
          createOnLogin.signer = {
            type: signerType,
            phone: decodeURIComponent(phoneNumber),
          };
        }
        return (
          <EVMCrossmintAuthProvider
            apiKey={crossmintApiKey}
            createOnLogin={createOnLogin}
          >
            {children}
          </EVMCrossmintAuthProvider>
        );
    }
  } else if (chainType === "solana") {
    switch (providerType) {
      case "privy":
        return <SolanaPrivyProvider>{children}</SolanaPrivyProvider>;
      case "dynamic":
        return (
          <SolanaDynamicLabsProvider>{children}</SolanaDynamicLabsProvider>
        );
      case "firebase":
        return <SolanaFirebaseProvider>{children}</SolanaFirebaseProvider>;
      case "crossmint":
      default:
        const createOnLogin: any = {
          chain: "solana",
          signer: { type: signerType },
          ...(alias != null ? { alias } : {}),
        };
        if (signerType === "phone" && phoneNumber != null) {
          createOnLogin.signer = {
            type: signerType,
            phone: decodeURIComponent(phoneNumber),
          };
        }
        return (
          <SolanaCrossmintAuthProvider
            apiKey={crossmintApiKey}
            createOnLogin={createOnLogin}
          >
            {children}
          </SolanaCrossmintAuthProvider>
        );
    }
  } else if (chainType === "stellar") {
    const createOnLogin: any = {
      chain: "stellar",
      signer: { type: signerType },
      ...(alias != null ? { alias } : {}),
    };
    if (signerType === "phone" && phoneNumber != null) {
      createOnLogin.signer = {
        type: signerType,
        phone: decodeURIComponent(phoneNumber),
      };
    }
    return (
      <StellarCrossmintAuthProvider
        apiKey={crossmintApiKey}
        createOnLogin={createOnLogin}
      >
        {children}
      </StellarCrossmintAuthProvider>
    );
  }

  return <EVMCrossmintAuthProvider>{children}</EVMCrossmintAuthProvider>;
}
