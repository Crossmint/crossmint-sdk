import type { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { type DynamicContextProps, DynamicContextProvider, mergeNetworks } from "@dynamic-labs/sdk-react-core";
import type { ReactNode } from "react";

export interface DynamicContextProviderWrapperProps {
    children?: ReactNode;
    settings: Omit<DynamicContextProps["settings"], "initialAuthenticationMode" | "environmentId">;
    apiKeyEnvironment: APIKeyEnvironmentPrefix;
}

export default function DynamicContextProviderWrapper({
    children,
    settings,
    apiKeyEnvironment,
}: DynamicContextProviderWrapperProps) {
    return (
        <DynamicContextProvider
            settings={{
                initialAuthenticationMode: "connect-only",
                environmentId:
                    apiKeyEnvironment === "production"
                        ? "3fc6c24e-6a8e-45f8-aae1-a87d7a027e12"
                        : "cd53135a-b32b-4704-bfca-324b665e9329",
                cssOverrides: `.powered-by-dynamic { display: none !important; }`,
                ...(apiKeyEnvironment === "production"
                    ? {
                          overrides: {
                              evmNetworks: (defaultNetworks) =>
                                  mergeNetworks(additionalEvmMainnetNetworks, defaultNetworks),
                          },
                      }
                    : {}),
                ...settings,
            }}
        >
            {children}
        </DynamicContextProvider>
    );
}

const additionalEvmMainnetNetworks = [
    {
        blockExplorerUrls: ["ttps://explorer-proofofplay-boss-mainnet.t.conduit.xyz/"],
        chainId: 70701,
        chainName: "Boss Mainnet",
        iconUrls: ["https:/www.crossmint.com/assets/ui/logos/apex.svg"],
        name: "Boss",
        nativeCurrency: {
            decimals: 18,
            name: "Ether",
            symbol: "ETH",
            iconUrl: "https://app.dynamic.xyz/assets/networks/eth.svg",
        },
        networkId: 70701,

        rpcUrls: ["https://rpc.boss.proofofplay.com/"],
        vanityName: "Boss",
    },
];
