import { CSSProperties, MouseEvent } from "react";

export enum clientNames {
    reactUi = "client-sdk-react-ui",
}

export enum baseUrls {
    prod = "https://www.crossmint.io",
    dev = "http://localhost:3001",
}

export enum customHeaders {
    clientVersion = "X-Client-Version",
    clientName = "X-Client-Name",
}

enum theme {
    light = "light",
    dark = "dark",
}

export enum payButtonTypes {
    solanaCandyMachine = "solana-candy-machine",
}

export interface PayButtonConfig {
    type: payButtonTypes;
}

export interface BaseButtonProps {
    className?: string;
    disabled?: boolean;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    style?: CSSProperties;
    tabIndex?: number;
    clientId: string;
    auctionId?: string;
    theme?: theme;
    development: boolean;
}

export interface CrossmintPayButtonProps extends BaseButtonProps {
    collectionTitle?: string;
    collectionDescription?: string;
    collectionPhoto?: string;
    mintTo?: string;
    emailTo?: string;
    listingId?: string;
    showOverlay?: boolean;
    hideMintOnInactiveClient?: boolean;
    config?: PayButtonConfig;
}
