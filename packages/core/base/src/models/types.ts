import { CssFontSource, CustomFontSource } from "./fonts";

export const EVM_CHAINS = ["ethereum", "polygon", "bsc"] as const;
export const ALL_CHAINS = ["solana", "cardano", ...EVM_CHAINS] as const;
export type EVMChain = (typeof EVM_CHAINS)[number];
export type Blockchain = (typeof ALL_CHAINS)[number];

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

export type PaymentMethod = "fiat" | "ETH" | "SOL";
export const paymentMethodIsEth = (paymentMethod?: PaymentMethod) => paymentMethod === "ETH";
export const paymentMethodIsSol = (paymentMethod?: PaymentMethod) => paymentMethod === "SOL";

export type SigninMethods = "metamask" | "solana";

export enum mintingContractTypes {
    CANDY_MACHINE = "candy-machine",
    SOLANA_AUCTION = "solana-auction",
    ERC_721 = "erc-721",
}

export interface PayButtonConfig {
    type: string;

    [propName: string]: any;
}

interface StatusButtonConfig {
    [propName: string]: any;
}

export type Locale =
    | "en-US"
    | "es-ES"
    | "fr-FR"
    | "it-IT"
    | "ko-KR"
    | "pt-PT"
    | "zh-CN"
    | "zh-TW"
    | "de-DE"
    | "ru-RU"
    | "tr-TR"
    | "uk-UA"
    | "th-TH"
    | "Klingon";

export type Currency = "usd" | "eur" | "gbp" | "aud" | "sgd" | "hkd" | "krw";
export type CaseInsensitive<T extends string> = T | Uppercase<T> | Lowercase<T>;

export type CollectionId = { clientId: string } | { collectionId: string };

export type BaseButtonProps = {
    projectId?: string;
    className?: string;
    disabled?: boolean;
    tabIndex?: number;
    auctionId?: string;
    theme?: theme;
    platformId?: string;
    mintConfig?: StatusButtonConfig;
    environment?: string;
    locale?: Locale;
    currency?: CaseInsensitive<Currency>;
} & CollectionId;

export type CrossmintPayButtonProps = BaseButtonProps & {
    mintTo?: string;
    emailTo?: string;
    listingId?: string;
    showOverlay?: boolean;
    dismissOverlayOnClick?: boolean;
    mintConfig?: PayButtonConfig | PayButtonConfig[];
    whPassThroughArgs?: any;
    paymentMethod?: PaymentMethod;
    preferredSigninMethod?: SigninMethods;
    prepay?: boolean;
    successCallbackURL?: string;
    failureCallbackURL?: string;
    loginEmail?: string;
    // TODO: Enable when events are ready in crossbit-main and docs are updated
    // onEvent?: (event: CheckoutEvents, metadata?: Record<string, any>) => void;
};

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
    backgroundTertiary?: string;
    border?: string;
    danger?: string;
    textLink?: string;
}

export type UiConfigFonts = (CssFontSource | CustomFontSource)[];

export interface UIConfig {
    colors?: Colors;
    fontSizeBase?: string;
    spacingUnit?: string;
    borderRadius?: string;
    fontWeightPrimary?: string;
    fontWeightSecondary?: string;
    fonts?: UiConfigFonts;
}

interface CommonProps {
    uiConfig?: UIConfig;
    environment?: string;
}

export interface NFTCollectionViewProps extends CommonProps {
    wallets: Wallet[];
}

export interface CardanoNFT {
    chain: "cardano";
    assetId: string;
}

export interface EVMNFT {
    chain: EVMChain;
    contractAddress: string;
    tokenId: string;
}

export interface SolanaNFT {
    mintHash: string;
    chain: "solana";
}

export type NFTLocator<T extends Blockchain> = `${T}:${string}${T extends EVMChain ? `:${string}` : ""}`;

export type NFT =
    | CardanoNFT
    | EVMNFT
    | SolanaNFT
    | NFTLocator<"solana">
    | NFTLocator<"ethereum">
    | NFTLocator<"polygon">
    | NFTLocator<"bsc">
    | NFTLocator<"cardano">;

export interface NFTDetailProps extends CommonProps {
    nft: NFT;
}
