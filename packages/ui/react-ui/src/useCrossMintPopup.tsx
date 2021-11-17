import { createContext, useContext } from 'react';

export interface PopupContextState {
    connecting: boolean;
    connect: (arg0: string) => void;

    popup: Window | null;
}

export const PopupContext = createContext<PopupContextState>({} as PopupContextState);

export function useCrossMintPopup(): PopupContextState {
    return useContext(PopupContext);
}
