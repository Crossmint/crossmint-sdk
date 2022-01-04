import { createContext, useContext } from "react";

export interface PopupContextState {
    connecting: boolean;
    connect: (
        candyMachineId: string,
        collectionTitle?: string,
        collectionDescription?: string,
        collectionPhoto?: string,
        mintTo?: string,
        emailTo?: string,
    ) => void;

    popup: Window | null;
}

export const PopupContext = createContext<PopupContextState>({} as PopupContextState);

export function useCrossMintPopup(): PopupContextState {
    return useContext(PopupContext);
}
