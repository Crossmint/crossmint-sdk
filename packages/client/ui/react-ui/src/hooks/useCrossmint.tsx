import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useState } from "react";

import { Crossmint, CrossmintConfig } from "@crossmint/common-sdk-base";

export interface CrossmintContext {
    crossmint: Crossmint;
    updateConfig: (cb: (oldConfig: CrossmintConfig) => CrossmintConfig) => void;
}
const CrossmintContext = createContext<CrossmintContext | null>(null);

export function CrossmintProvider({ children, ...initialConfig }: { children: ReactNode } & CrossmintConfig) {
    const [config, setConfig] = useState<CrossmintConfig>(initialConfig);
    const crossmint = new Crossmint(config);

    const updateConfig = (cb: (oldConfig: CrossmintConfig) => CrossmintConfig) => {
        const newConfig = cb(config);
        crossmint.updateConfig(newConfig);
        setConfig(newConfig);
    };

    return (
        <CrossmintContext.Provider
            value={{
                crossmint,
                updateConfig,
            }}
        >
            {children}
        </CrossmintContext.Provider>
    );
}

// Combined useCrossmint Hook
export function useCrossmint() {
    const context = useContext(CrossmintContext);
    if (!context) {
        throw new Error("useCrossmint must be used within a CrossmintProvider");
    }
    return context;
}
