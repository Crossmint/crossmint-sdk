import { createContext, useContext } from "react";

export interface CrossMintModalContextState {
    visible: boolean;
    setVisible: (open: boolean) => void;
}

export const CrossMintModalContext = createContext<CrossMintModalContextState>({} as CrossMintModalContextState);

export function useCrossMintModal(): CrossMintModalContextState {
    return useContext(CrossMintModalContext);
}
