import React, { FC, ReactNode, useState } from 'react';
import { useCrossMintModal } from '.';
import { PopupContext } from './useCrossMintPopup';

export interface PopupProviderProps {
    children: ReactNode;
}

export const CrossMintPopupProvider: FC<PopupProviderProps> = ({ children }) => {
    const [connecting, setConnecting] = useState(false);
    const [popup, setPopup] = useState<Window | null>(null);

    const { setVisible } = useCrossMintModal();

    const createPopup = (candyMachineId: string) => {
        const pop = window.open(
            `http://localhost:3001/signin?callbackUrl=${encodeURIComponent(
                `http://localhost:3001/checkout/mint?candyMachineId=${candyMachineId}&closeOnSuccess=true`
            )}`,
            'popUpWindow',
            createPopupString()
        );
        if (pop) {
            setVisible(true);
            setPopup(pop);
            registerListeners(pop);
        } else {
            setConnecting(false);
            console.log('Failed to open popup window');
        }
    };

    const connect = (candyMachineId: string) => {
        if (connecting) return;

        setConnecting(true);

        createPopup(candyMachineId);
    };

    function registerListeners(pop: Window) {
        const timer = setInterval(function () {
            if (pop.closed) {
                clearInterval(timer);
                setConnecting(false);
                setVisible(false);
            }
        }, 500);
    }

    function createPopupString() {
        return `height=750,width=400,left=${window.innerWidth / 2 - 200},top=${
            window.innerHeight / 2 - 375
        },resizable=yes,scrollbars=yes,toolbar=yes,menubar=true,location=no,directories=no, status=yes`;
    }

    return (
        <PopupContext.Provider
            value={{
                connecting,
                popup,
                connect,
            }}
        >
            {children}
        </PopupContext.Provider>
    );
};
