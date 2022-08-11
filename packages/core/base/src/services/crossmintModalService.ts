import { PayButtonConfig, SigninMethods, clientNames, paymentMethods } from "../models/types";
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
    paymentMethod?: paymentMethods;
    preferredSigninMethod?: SigninMethods;
};

const overlayId = "__crossmint-overlay__";

const getChromeVersion = () => {
    const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    return raw ? parseInt(raw[2]) : null;
};

function createPopupString() {
    const left = window.innerWidth / 2 - 200;
    const top = window.innerHeight / 2 - 375;

    // In newer versions of chrome (>99) you need to add the `popup=true` for the new window to actually open in a popup
    const chromeVersion = getChromeVersion();
    const chromeVersionGreaterThan99 = chromeVersion && chromeVersion > 99;
    const popupStringBase = chromeVersionGreaterThan99 ? "popup=true," : "";

    return `${popupStringBase}height=750,width=400,left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=yes,menubar=true,location=no,directories=no, status=yes`;
}

const addLoadingOverlay = (dissmissableOverlayOnClick?: boolean): void => {
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

    if (dissmissableOverlayOnClick) {
        overlayEl.addEventListener("click", () => {
            removeLoadingOverlay();
        });
    }
};

const removeLoadingOverlay = (): void => {
    const overlayEl = document.getElementById(overlayId);
    if (overlayEl) overlayEl.remove();
};

interface CrossmintModalServiceParams {
    clientId: string;
    libVersion: string;
    showOverlay: boolean;
    dismissOverlayOnClick?: boolean;
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
        whPassThroughArgs?: any,
        paymentMethod?: paymentMethods,
        preferredSigninMethod?: SigninMethods
    ) => void;
}

export function crossmintModalService({
    clientId,
    libVersion,
    showOverlay,
    dismissOverlayOnClick,
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
        whPassThroughArgs?: any,
        paymentMethod?: paymentMethods,
        preferredSigninMethod?: SigninMethods
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
            if (paymentMethod) mintQueryParams.paymentMethod = paymentMethod;
            if (preferredSigninMethod) mintQueryParams.preferredSigninMethod = preferredSigninMethod;

            return new URLSearchParams(mintQueryParams).toString();
        };
        const callbackUrl = encodeURIComponent(`${urlOrigin}/checkout/mint?${getMintQueryParams()}`);
        const url = `${urlOrigin}/signin?callbackUrl=${callbackUrl}`;

        const pop = window.open(url, "popUpWindow", createPopupString());
        if (pop) {
            registerListeners(pop);
            if (showOverlay) {
                addLoadingOverlay(dismissOverlayOnClick);
            }
            return;
        }
        setConnecting(false);
        const newTab = window.open(url, "_blank");
        if (!newTab) {
            console.error("Failed to open popup window and new tab");
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
        whPassThroughArgs?: any,
        paymentMethod?: paymentMethods,
        preferredSigninMethod?: SigninMethods
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
            whPassThroughArgs,
            paymentMethod,
            preferredSigninMethod
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
