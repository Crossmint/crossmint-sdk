import { createContext, useContext } from "react";

export interface PopupContextState {
    connecting: boolean;
    connect: (
        collectionTitle?: string,
        collectionDescription?: string,
        collectionPhoto?: string,
        mintTo?: string,
        emailTo?: string,
        listingId?: string
    ) => void;

    popup: Window | null;
}

export const PopupContext = createContext<PopupContextState>({} as PopupContextState);

export function useCrossMintPopup(): PopupContextState {
    return useContext(PopupContext);
}
