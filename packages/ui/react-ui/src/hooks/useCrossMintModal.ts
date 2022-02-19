import { useState } from 'react';

function createPopupString() {
    return `height=750,width=400,left=${window.innerWidth / 2 - 200},top=${
        window.innerHeight / 2 - 375
    },resizable=yes,scrollbars=yes,toolbar=yes,menubar=true,location=no,directories=no, status=yes`;
}

interface IProps {
    development: boolean;
    clientId: string;
    crossmintOpened?: () => any,
    crossmintClosed?: () => any,
}

interface IReturn {
    connecting: boolean;
    connect: (
        collectionTitle?: string,
        collectionDescription?: string,
        collectionPhoto?: string,
        mintTo?: string,
        emailTo?: string,
        listingId?: string
    ) => void;
}

const PROD_URL = "https://www.crossmint.io";
const DEV_URL = "http://localhost:3001";

const executeIfExists = (fn?: () => any | undefined):void => {
    if (fn && typeof fn === 'function') fn();
}

export default function useCrossMintModal({ development, clientId, crossmintOpened, crossmintClosed }: IProps): IReturn {
    const [connecting, setConnecting] = useState(false);

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
            registerListeners(pop);
            executeIfExists(crossmintOpened);
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
                executeIfExists(crossmintClosed);
            }
        }, 500);
    }

    return { connecting, connect };
}
