import type { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { type DynamicContextProps, DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import type { ReactNode } from "react";

export interface DynamicContextProviderWrapperProps {
    children?: ReactNode;
    settings: Omit<DynamicContextProps["settings"], "environmentId">;
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
                suppressEndUserConsoleWarning: true,
                ...settings,
            }}
        >
            {children}
        </DynamicContextProvider>
    );
}
