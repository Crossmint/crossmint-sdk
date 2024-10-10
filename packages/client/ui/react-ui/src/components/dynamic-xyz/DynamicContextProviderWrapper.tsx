import { type DynamicContextProps, DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import type { ReactNode } from "react";

export interface DynamicContextProviderWrapperProps {
    children?: ReactNode;
    settings: Omit<DynamicContextProps["settings"], "initialAuthenticationMode" | "environmentId">;
}

export default function DynamicContextProviderWrapper({ children, settings }: DynamicContextProviderWrapperProps) {
    return (
        <DynamicContextProvider
            settings={{
                initialAuthenticationMode: "connect-only",
                environmentId: "cd53135a-b32b-4704-bfca-324b665e9329", // TODO: Key per env
                ...settings,
            }}
        >
            {children}
        </DynamicContextProvider>
    );
}
