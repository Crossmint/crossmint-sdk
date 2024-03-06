import { ObjectValues } from "@crossmint/common-sdk-base";

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

type VerificationFields = {
    collectionType?: VerificationCollectionType;
    collectionDescription?: string;
    socials?: {
        website?: string;
        twitter?: string;
        discord?: string;
    };
};

export const VerificationScopes = {
    PAYMENTS_CREDIT_CARD: "payments:credit-card",
    PAYMENTS_CROSS_CHAIN: "payments:cross-chain",
} as const;
export type VerificationScopes = ObjectValues<typeof VerificationScopes>;

export type CrossmintVerificationButtonProps = {
    collectionId: string;
    scopes: VerificationScopes[];
    fields: VerificationFields;
    environment?: string;
};
