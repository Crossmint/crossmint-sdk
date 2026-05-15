/**
 * Public types for the B2B Treasury surface. These mirror the
 * `2026-05-11/treasury/*` REST contracts; defined locally rather than
 * imported from the backend monorepo since `@crossmint/server-sdk` ships
 * to public npm without that workspace dependency.
 *
 * Keep these in sync with `crossbit-main/libraries/products/payments/types/
 * src/treasury/TreasuryApi.ts`. When the backend contract bumps to a new
 * dated version, add a parallel set here under the new version namespace —
 * don't mutate the existing one (consumers pin SDK versions).
 */

export type TreasuryRegion = "us" | "eu";
export type TreasuryVendor = "hifi" | "openpayd";

export type TreasuryChain = "polygon" | "ethereum" | "solana" | "base" | "arbitrum" | "tron" | "stellar";

export interface TreasuryAmount {
    value: string;
    currency: string;
}

// ---------------------------------------------------------------------------
// Payouts (R0 — `POST /treasury/payouts`)
// ---------------------------------------------------------------------------

export type TreasuryPayoutStatus =
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "requires_approval";

export interface TreasuryPayoutDestination {
    type: "wallet";
    chain: TreasuryChain;
    walletAddress: string;
    userId?: string;
}

export interface CreateTreasuryPayoutRequest {
    amount: TreasuryAmount;
    destination: TreasuryPayoutDestination;
    requireApproval?: boolean;
    purposeOfPayment?: string;
}

export interface TreasuryPayout {
    id: string;
    status: TreasuryPayoutStatus;
    amount: TreasuryAmount;
    destination: TreasuryPayoutDestination;
    region: TreasuryRegion;
    vendor: TreasuryVendor;
    createdAt: string;
    updatedAt: string;
    failureReason?: string;
}

// ---------------------------------------------------------------------------
// Offramps (R2 — `POST /treasury/offramps`)
// ---------------------------------------------------------------------------

export type TreasuryOfframpStatus =
    | "quoted"
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "returned";

export interface CreateTreasuryOfframpRequest {
    amount: TreasuryAmount;
    destinationAccountId: string;
    sourceChain: TreasuryChain;
    purposeOfPayment?: string;
    sameDayAch?: boolean;
    supportingDocumentType?: string;
    supportingDocumentUrl?: string;
    description?: string;
}

export interface TreasuryOfframpQuote {
    sendGross: string;
    sendNet: string;
    receiveGross: string;
    receiveNet: string;
    rate: string;
    expiresAt: string;
}

export interface TreasuryOfframp {
    id: string;
    status: TreasuryOfframpStatus;
    amount: TreasuryAmount;
    destinationAccountId: string;
    sourceChain: TreasuryChain;
    region: TreasuryRegion;
    vendor: TreasuryVendor;
    purposeOfPayment?: string;
    quote?: TreasuryOfframpQuote;
    createdAt: string;
    updatedAt: string;
    failureReason?: string;
}

// ---------------------------------------------------------------------------
// Read endpoints
// ---------------------------------------------------------------------------

export interface TreasuryAccount {
    id: string;
    region: TreasuryRegion;
    vendor: TreasuryVendor;
    status: string;
    /** Vendor-shaped deposit instructions (IBAN/BIC for OpenPayd; routing+account for HiFi). */
    depositInstructions: unknown;
    createdAt: string;
}

export interface ListTreasuryAccountsResponse {
    items: TreasuryAccount[];
}

export interface TreasuryBalance {
    chain: TreasuryChain;
    currency: string;
    available: string;
    pending: string;
}

export interface ListTreasuryBalancesResponse {
    balances: TreasuryBalance[];
}

export type TreasuryTransactionKind = "deposit" | "transfer" | "onramp" | "offramp" | "payout";

export interface TreasuryTransaction {
    id: string;
    kind: TreasuryTransactionKind;
    status: string;
    amount: TreasuryAmount;
    chain: string;
    createdAt: string;
}

export interface ListTreasuryTransactionsResponse {
    items: TreasuryTransaction[];
    nextCursor?: string;
}

export interface ListTreasuryTransactionsQuery {
    kind?: TreasuryTransactionKind;
    limit?: number;
    cursor?: string;
}

// ---------------------------------------------------------------------------
// Offramp account registration (HiFi side — `POST /offramp-accounts`)
// ---------------------------------------------------------------------------

export interface RegisterOfframpAccountRequest {
    transferType: "ach" | "wire" | "swift";
    accountType: "Checking" | "Savings";
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    accountHolderName: string;
    accountHolderType?: "individual" | "business";
    address: {
        addressLine1: string;
        addressLine2?: string;
        city: string;
        stateProvinceRegion: string;
        postalCode: string;
        country: string;
    };
}

export interface RegisteredOfframpAccount {
    id: string;
    bankName: string;
    last4: string;
    transferType: "ach" | "wire" | "swift";
    accountType: "Checking" | "Savings";
    currency: "usd";
    status: "active" | "closed";
}

// ---------------------------------------------------------------------------
// Beneficiary registration (OpenPayd side — `POST /beneficiaries`)
// ---------------------------------------------------------------------------

export interface RegisterOpenPaydBeneficiaryRequest {
    bankAccountHolderName: string;
    bankAccountCountry: string;
    currency: "USD" | "EUR" | "GBP";
    bankName?: string;
    bankAddress?: string;
    /** SEPA — supply iban + bic. */
    iban?: string;
    bic?: string;
    /** Non-IBAN rails — supply accountNumber + routing codes. */
    accountNumber?: string;
    bankRoutingCodes?: Array<{ routingCodeKey: string; routingCodeValue: string }>;
    friendlyName?: string;
}

export interface RegisteredOpenPaydBeneficiary {
    id: string;
    bankAccountHolderName: string;
    bankAccountCountry: string;
    currency: "USD" | "EUR" | "GBP";
    last4: string;
    bic: string | null;
    status: "active" | "closed";
}
