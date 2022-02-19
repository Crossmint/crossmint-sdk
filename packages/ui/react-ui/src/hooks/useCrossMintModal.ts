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

type MintQueryParams = {
    clientId: string;
    closeOnSuccess: string;
    collectionTitle?: string;
    collectionDescription?: string;
    collectionPhoto?: string;
    mintTo?: string;
    emailTo?: string;
    listingId?: string;
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
        const urlOrigin = development ? DEV_URL : PROD_URL;
        const getMintQueryParams = ():string => {
            const mintQueryParams:MintQueryParams = {
                clientId: encodeURIComponent(clientId),
                closeOnSuccess: 'false',
            };

            if (collectionTitle) mintQueryParams.collectionTitle = encodeURIComponent(collectionTitle);
            if (collectionDescription) mintQueryParams.collectionDescription = encodeURIComponent(collectionDescription);
            if (collectionPhoto) mintQueryParams.collectionPhoto = encodeURIComponent(collectionPhoto);
            if (mintTo) mintQueryParams.mintTo = encodeURIComponent(mintTo);
            if (emailTo) mintQueryParams.emailTo = encodeURIComponent(emailTo);
            if (listingId) mintQueryParams.listingId = encodeURIComponent(listingId);

            return new URLSearchParams(mintQueryParams).toString()
        };
        const callbackUrl = encodeURIComponent(`${urlOrigin}/checkout/mint?${getMintQueryParams()}`);
        const url = `${urlOrigin}/signin?callbackUrl=${callbackUrl}`;

        const pop = window.open(
            url,
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
