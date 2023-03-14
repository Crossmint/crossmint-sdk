export enum clientNames {
    reactUi = "client-sdk-react-ui",
    vanillaUi = "client-sdk-vanilla-ui",
}

export enum baseUrls {
    prod = "https://www.crossmint.com",
    staging = "https://staging.crossmint.com",
    dev = "http://localhost:3001",
}

export enum customHeaders {
    clientVersion = "X-Client-Version",
    clientName = "X-Client-Name",
}

type theme = "light" | "dark";

export type paymentMethods = "fiat" | "ETH" | "SOL";
export const paymentMethodIsEth = (paymentMethod?: paymentMethods) => paymentMethod === "ETH";
export const paymentMethodIsSol = (paymentMethod?: paymentMethods) => paymentMethod === "SOL";

export type SigninMethods = "metamask" | "solana";

export enum mintingContractTypes {
    CANDY_MACHINE = "candy-machine",
    SOLANA_AUCTION = "solana-auction",
    ERC_721 = "erc-721",
}

export enum onboardingRequestStatusResponse {
    WAITING_SUBMISSION = "waiting-submission",
    PENDING = "pending",
    REJECTED = "rejected",
    ACCEPTED = "accepted",
    INVALID = "invalid",
}

export interface PayButtonConfig {
    type: string;

    [propName: string]: any;
}

interface StatusButtonConfig {
    [propName: string]: any;
}

export type Locale = "en-US" | "es-ES";
export type Currency = "USD" | "EUR" | "AUD";

export interface BaseButtonProps {
    className?: string;
    disabled?: boolean;
    tabIndex?: number;
    clientId: string;
    auctionId?: string;
    theme?: theme;
    platformId?: string;
    mintConfig?: StatusButtonConfig;
    environment?: string;
    locale?: Locale;
    currency?: Currency;
}

export interface CrossmintPayButtonProps extends BaseButtonProps {
    mintTo?: string;
    emailTo?: string;
    listingId?: string;
    showOverlay?: boolean;
    dismissOverlayOnClick?: boolean;
    hideMintOnInactiveClient?: boolean;
    mintConfig?: PayButtonConfig | PayButtonConfig[];
    whPassThroughArgs?: any;
    paymentMethod?: paymentMethods;
    preferredSigninMethod?: SigninMethods;
    prepay?: boolean;
    successCallbackURL?: string;
    failureCallbackURL?: string;
}

export type OnboardingQueryParams = {
    clientId: string;
    platformId?: string;
    auctionId?: string;
    mintConfig?: string;
};

export interface Wallet {
    chain: string;
    publicKey: string;
}

interface Colors {
    textPrimary?: string;
    textSecondary?: string;
    accent?: string;
    background?: string;
    backgroundSecondary?: string;
    border?: string;
}

interface UIConfig {
    colors?: Colors;
}

interface CommonProps {
    projectId: string;
    uiConfig?: UIConfig;
    environment?: string;
}

export interface NFTCollectionViewProps extends CommonProps {
    wallets: Wallet[];
}

export interface NFT {
    address: string;
    chain: string;
    tokenId?: string;
}

export interface NFTDetailProps extends CommonProps {
    nft: NFT;
}

export enum Environments {
    PRODUCTION = "production",
    STAGING = "staging",
}
