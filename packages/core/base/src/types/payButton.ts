import { Currency, Locale, PaymentMethod } from ".";
import { CaseInsensitive } from "./system";

export type MintConfig = Record<string, any> | Record<string, any>[];
export type MintConfigs = MintConfig | MintConfig[];

export type CrossmintPayButtonTheme = "light" | "dark";

export type CollectionId = { clientId: string } | { collectionId: string };

export type BaseButtonProps = {
    projectId?: string;
    className?: string;
    disabled?: boolean;
    tabIndex?: number;
    auctionId?: string;
    theme?: CrossmintPayButtonTheme;
    platformId?: string;
    mintConfig?: MintConfigs;
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
    whPassThroughArgs?: any;
    paymentMethod?: PaymentMethod;
    preferredSigninMethod?: SigninMethods;
    prepay?: boolean;
    successCallbackURL?: string;
    failureCallbackURL?: string;
    loginEmail?: string;
    getButtonText?: (connecting: boolean, paymentMethod: PaymentMethod) => string;
    // TODO: Enable when events are ready in crossbit-main and docs are updated
    // onEvent?: (event: CheckoutEvents, metadata?: Record<string, any>) => void;
};

export type SigninMethods = "metamask" | "solana";
