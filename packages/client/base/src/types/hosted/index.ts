import { ObjectValues } from "@crossmint/common-sdk-base";

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

export const VerificationCollectionType = {
    LOYALTY: "loyalty",
    ART: "art",
    MUSIC: "music",
    GAMING: "gaming",
    TICKETING: "ticketing",
    CHARITY: "charity",
    OTHER: "other",
} as const;
export type VerificationCollectionType = ObjectValues<typeof VerificationCollectionType>;

type CrossmintVerificationFields = {
    collectionType?: VerificationCollectionType;
    collectionDescription?: string;
    socials?: {
        website?: string;
        twitter?: string;
        discord?: string;
    };
};

export const VerificationProducts = {
    PAYMENTS_CREDIT_CARD: "payments:credit-card",
    PAYMENTS_CROSS_CHAIN: "payments:cross-chain",
};
export type VerificationProducts = ObjectValues<typeof VerificationProducts>;

export type CrossmintVerificationButtonProps = {
    collectionId: string;
    products: VerificationProducts[];
    fields: CrossmintVerificationFields;
    environment?: string;
};
