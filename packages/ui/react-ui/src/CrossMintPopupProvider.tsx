import React, { FC, ReactNode, useState } from "react";
import { useCrossMintModal, useCrossMintStatus } from ".";
import { PopupContext } from "./useCrossMintPopup";

export interface PopupProviderProps {
    development: boolean;
    children: ReactNode;
}

const PROD_URL = "https://www.crossmint.io";
const DEV_URL = "http://localhost:3001";

export const CrossMintPopupProvider: FC<PopupProviderProps> = ({ development, children }) => {
    const [connecting, setConnecting] = useState(false);
    const [popup, setPopup] = useState<Window | null>(null);

    const { clientId } = useCrossMintStatus();

    const { setVisible } = useCrossMintModal();

    const createPopup = (
        collectionTitle?: string,
        collectionDescription?: string,
        collectionPhoto?: string,
        mintTo?: string,
        emailTo?: string,
        listingId?: string
    ) => {
        const pop = window.open(
                `${development ? DEV_URL : PROD_URL}/signin?callbackUrl=${encodeURIComponent(
                        `${development ? DEV_URL : PROD_URL}/checkout/mint?clientId=${encodeURIComponent(clientId)}&closeOnSuccess=false&${
                                collectionTitle ? `collectionTitle=${encodeURIComponent(collectionTitle)}` : ""
                                }${collectionDescription ? `&collectionDescription=${encodeURIComponent(collectionDescription)}` : ""}${
                                collectionPhoto ? `&collectionPhoto=${encodeURIComponent(collectionPhoto)}` : ""
                                }${mintTo ? `&mintTo=${encodeURIComponent(mintTo)}` : ""}${emailTo ? `&emailTo=${encodeURIComponent(emailTo)}` : ""}${
                                listingId ? `&listingId=${encodeURIComponent(listingId)}` : ""
                                }`
                )}`,
            "popUpWindow",
            createPopupString()
        );
        if (pop) {
            setVisible(true);
            setPopup(pop);
            registerListeners(pop);
        } else {
            setConnecting(false);
            console.log("Failed to open popup window");
        }
    };

    const connect = (
        collectionTitle?: string,
        collectionDescription?: string,
        collectionPhoto?: string,
        mintTo?: string,
        emailTo?: string,
        listingId?: string
    ) => {
        if (connecting) return;

        setConnecting(true);

        createPopup(collectionTitle, collectionDescription, collectionPhoto, mintTo, emailTo, listingId);
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
