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

type theme = "light" | "dark";

export enum mintingContractTypes {
    CANDY_MACHINE = "candy-machine",
    SOLANA_AUCTION = "solana-auction",
    ERC_721 = "erc-721",
}

export interface PayButtonConfig {
    type: string;

    [propName: string]: any;
}

export interface StatusButtonConfig {
    [propName: string]: any;
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
    development?: boolean;
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
    mintConfig?: PayButtonConfig;
}

export interface CrossmintStatusButtonProps extends BaseButtonProps {
    platformId?: string;
    mintConfig?: StatusButtonConfig;
}
