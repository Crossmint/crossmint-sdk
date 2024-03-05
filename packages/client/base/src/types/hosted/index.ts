import { Currency, Locale, PaymentMethod } from "..";
import { CaseInsensitive } from "../system";

export type MintConfig = Record<string, any> | Record<string, any>[];
export type MintConfigs = MintConfig | MintConfig[];

export type CrossmintPayButtonTheme = "light" | "dark";

export type CollectionOrClientId = { clientId: string } | { collectionId: string };

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
} & CollectionOrClientId;

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
    checkoutProps?: CheckoutProps;
    // TODO: Enable when events are ready in crossbit-main and docs are updated
    // onEvent?: (event: CrossmintEvents, metadata?: Record<string, any>) => void;
};

export type CheckoutProps = {
    experimental?: boolean;
    display?: "same-tab" | "new-tab" | "popup";
    delivery?: "custodial" | "non-custodial" | "all";
    paymentMethods?: PaymentMethod[];
};
export type SigninMethods = "metamask" | "solana";
