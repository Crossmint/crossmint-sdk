import { PayButtonConfig, clientNames } from "../models/types";
import { getEnvironmentBaseUrl } from "../utils/ui";

type MintQueryParams = {
    clientId: string;
    closeOnSuccess: string;
    collectionTitle?: string;
    collectionDescription?: string;
    collectionPhoto?: string;
    mintTo?: string;
    emailTo?: string;
    listingId?: string;
    clientName: string;
    clientVersion: string;
    mintConfig: string;
    whPassThroughArgs?: string;
};

const overlayId = "__crossmint-overlay__";

function createPopupString() {
    return `height=750,width=400,left=${window.innerWidth / 2 - 200},top=${
        window.innerHeight / 2 - 375
    },resizable=yes,scrollbars=yes,toolbar=yes,menubar=true,location=no,directories=no, status=yes`;
}

const addLoadingOverlay = (): void => {
    const overlayEl = document.createElement("div");
    overlayEl.setAttribute("id", overlayId);
    const overlayStyles = {
        width: "100vw",
        height: "100vh",
        "background-color": "rgba(0, 0, 0, 0.5)",
        position: "fixed",
        "z-index": "99999999",
        top: "0",
        left: "0",
    };
    Object.assign(overlayEl.style, overlayStyles);
    document.body.appendChild(overlayEl);
};

const removeLoadingOverlay = (): void => {
    const overlayEl = document.getElementById(overlayId);
    if (overlayEl) overlayEl.remove();
};

interface CrossmintModalServiceParams {
    clientId: string;
    libVersion: string;
    showOverlay: boolean;
    setConnecting: (connecting: boolean) => void;
    environment?: string;
    clientName: clientNames;
}

export interface CrossmintModalServiceReturn {
    connect: (
        mintConfig: PayButtonConfig,
        collectionTitle?: string,
        collectionDescription?: string,
        collectionPhoto?: string,
        mintTo?: string,
        emailTo?: string,
        listingId?: string,
        whPassThroughArgs?: any
    ) => void;
}

export function crossmintModalService({
    clientId,
    libVersion,
    showOverlay,
    setConnecting,
    environment,
    clientName,
}: CrossmintModalServiceParams): CrossmintModalServiceReturn {
    const createPopup = (
        mintConfig: PayButtonConfig,
        collectionTitle?: string,
        collectionDescription?: string,
        collectionPhoto?: string,
        mintTo?: string,
        emailTo?: string,
        listingId?: string,
        whPassThroughArgs?: any
    ) => {
        const urlOrigin = getEnvironmentBaseUrl(environment);
        const getMintQueryParams = (): string => {
            const mintQueryParams: MintQueryParams = {
                clientId: clientId,
                closeOnSuccess: "false",
                clientName,
                clientVersion: libVersion,
                mintConfig: JSON.stringify(mintConfig),
            };

            if (collectionTitle) mintQueryParams.collectionTitle = collectionTitle;
            if (collectionDescription) mintQueryParams.collectionDescription = collectionDescription;
            if (collectionPhoto) mintQueryParams.collectionPhoto = collectionPhoto;
            if (mintTo) mintQueryParams.mintTo = mintTo;
            if (emailTo) mintQueryParams.emailTo = emailTo;
            if (listingId) mintQueryParams.listingId = listingId;
            if (whPassThroughArgs) mintQueryParams.whPassThroughArgs = JSON.stringify(whPassThroughArgs);

            return new URLSearchParams(mintQueryParams).toString();
        };
        const callbackUrl = encodeURIComponent(`${urlOrigin}/checkout/mint?${getMintQueryParams()}`);
        const url = `${urlOrigin}/signin?callbackUrl=${callbackUrl}`;

        const pop = window.open(url, "popUpWindow", createPopupString());
        if (pop) {
            registerListeners(pop);
            if (showOverlay) {
                addLoadingOverlay();
            }
        } else {
            setConnecting(false);
            console.error("Failed to open popup window");
        }
    };

    const connect = (
        mintConfig: PayButtonConfig,
        collectionTitle?: string,
        collectionDescription?: string,
        collectionPhoto?: string,
        mintTo?: string,
        emailTo?: string,
        listingId?: string,
        whPassThroughArgs?: any
    ) => {
        setConnecting(true);

        createPopup(
            mintConfig,
            collectionTitle,
            collectionDescription,
            collectionPhoto,
            mintTo,
            emailTo,
            listingId,
            whPassThroughArgs
        );
    };

    function registerListeners(pop: Window) {
        const timer = setInterval(function () {
            if (pop.closed) {
                clearInterval(timer);
                setConnecting(false);
                if (showOverlay) {
                    removeLoadingOverlay();
                }
            }
        }, 500);
    }

    return {
        connect,
    };
}
