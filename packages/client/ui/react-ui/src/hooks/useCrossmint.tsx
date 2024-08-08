import { Dispatch, SetStateAction, createContext, useState } from "react";

import { Crossmint, createCrossmint } from "@crossmint/common-sdk-base";

export interface CrossmintContext {
    crossmint: Crossmint;
    setCrossmint: Dispatch<SetStateAction<Crossmint>>;
}

const CrossmintContext = createContext<CrossmintContext | null>(null);

export function CrossmintProvider({
    children,
    ...createCrossmintParams
}: { children: React.ReactNode } & Parameters<typeof createCrossmint>[0]) {
    const [crossmint, setCrossmint] = useState<Crossmint>(createCrossmint(createCrossmintParams));
    return <CrossmintContext.Provider value={{ crossmint, setCrossmint }} />;
}
