import type React from "react";
import { useEffect, createContext, useContext, useState } from "react";
import twindConfig from "@/twind.config";
import { install } from "@twind/core";

const TwindContext = createContext<boolean>(false);

function useTwindContext() {
    return useContext(TwindContext);
}

function TwindProviderInternal({ children }: { children: React.ReactNode }) {
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (!isInstalled) {
            install(twindConfig);
            setIsInstalled(true);
        }
    }, [isInstalled]);

    return <TwindContext.Provider value={true}>{children}</TwindContext.Provider>;
}

export function TwindProvider({ children }: { children: React.ReactNode }) {
    const isTwindAlreadyProvided = useTwindContext();

    if (isTwindAlreadyProvided) {
        return <>{children}</>;
    }

    return <TwindProviderInternal>{children}</TwindProviderInternal>;
}
