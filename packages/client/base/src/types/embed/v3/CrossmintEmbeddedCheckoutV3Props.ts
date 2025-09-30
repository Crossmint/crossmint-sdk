import type { Currency as FiatCurrency, Locale } from "@/types";
import type { CryptoCurrency } from "@/types/CryptoCurrency";

import type { BlockchainIncludingTestnet, PayerSupportedBlockchains, JSONObject } from "@crossmint/common-sdk-base";

interface CrossmintEmbeddedCheckoutV3CommonProps {
    appearance?: EmbeddedCheckoutV3Appearance;
    payment: EmbeddedCheckoutV3Payment;
}

export interface CrossmintEmbeddedCheckoutV3ExistingOrderProps extends CrossmintEmbeddedCheckoutV3CommonProps {
    orderId: string;
    clientSecret?: string;
    lineItems?: never;
    recipient?: never;
    locale?: never;
}

export interface CrossmintEmbeddedCheckoutV3NewOrderProps extends CrossmintEmbeddedCheckoutV3CommonProps {
    orderId?: never;
    lineItems: EmbeddedCheckoutV3LineItem | EmbeddedCheckoutV3LineItem[];
    recipient?: EmbeddedCheckoutV3Recipient;
    locale?: Locale;
    metadata?: JSONObject;
}

export type CrossmintEmbeddedCheckoutV3Props =
    | CrossmintEmbeddedCheckoutV3ExistingOrderProps
    | CrossmintEmbeddedCheckoutV3NewOrderProps;

export type EmbeddedCheckoutV3Recipient = EmbeddedCheckoutV3EmailRecipient | EmbeddedCheckoutV3WalletAddressRecipient;

export type EmbeddedCheckoutV3PhysicalAddress = {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: "US";
};

export type EmbeddedCheckoutV3EmailRecipient = {
    email: string;
    walletAddress?: never;
    physicalAddress?: EmbeddedCheckoutV3PhysicalAddress;
};
export type EmbeddedCheckoutV3WalletAddressRecipient = {
    walletAddress: string;
    email?: never;
    physicalAddress?: EmbeddedCheckoutV3PhysicalAddress;
};

export type EmbeddedCheckoutV3LineItem =
    | {
          collectionLocator: string;
          callData?: Record<string, any>;
      }
    | {
          tokenLocator: string;
          callData?: Record<string, any>;
          executionParameters?: never;
      }
    | {
          tokenLocator: string;
          callData?: never;
          executionParameters?: Record<string, any>;
      }
    | {
          productLocator: string;
      };

export type EmbeddedCheckoutV3Appearance = {
    fonts?: Array<{ cssSrc: string }>;
    variables?: EmbeddedCheckoutV3AppearanceVariables;
    rules?: EmbeddedCheckoutV3AppearanceRules;
};

export type EmbeddedCheckoutV3AppearanceVariables = {
    fontFamily?: string;
    spacingUnit?: string;
    fontSizeUnit?: string;
    borderRadius?: string;
    colors?: {
        borderPrimary?: string;
        backgroundPrimary?: string;
        textPrimary?: string;
        textSecondary?: string;
        danger?: string;
        warning?: string;
        accent?: string;
    };
};

export type EmbeddedCheckoutV3AppearanceRules = {
    DestinationInput?: {
        display?: "hidden";
    };
    ReceiptEmailInput?: {
        display?: "hidden";
    };
    Label?: {
        font?: {
            family?: string;
            size?: string;
            weight?: string;
        };
        colors?: {
            text?: string;
        };
    };
    Input?: {
        borderRadius?: string;
        font?: {
            family?: string;
            size?: string;
            weight?: string;
        };
        colors?: {
            text?: string;
            background?: string;
            border?: string;
            boxShadow?: string;
            placeholder?: string;
        };
        hover?: {
            colors?: {
                text?: string;
                background?: string;
                border?: string;
                boxShadow?: string;
            };
        };
        focus?: {
            colors?: {
                background?: string;
                border?: string;
                boxShadow?: string;
            };
        };
    };
    Tab?: {
        borderRadius?: string;
        font?: {
            family?: string;
            size?: string;
            weight?: string;
        };
        colors?: {
            text?: string;
            background?: string;
            border?: string;
            boxShadow?: string;
        };
        hover?: {
            colors?: {
                text?: string;
                background?: string;
                border?: string;
                boxShadow?: string;
            };
        };
        selected?: {
            colors?: {
                text?: string;
                background?: string;
                border?: string;
                boxShadow?: string;
            };
        };
    };
    PrimaryButton?: {
        borderRadius?: string;
        font?: {
            family?: string;
            size?: string;
            weight?: string;
        };
        colors?: {
            text?: string;
            background?: string;
        };
        hover?: {
            colors?: {
                text?: string;
                background?: string;
            };
        };
        disabled?: {
            colors?: {
                text?: string;
                background?: string;
            };
        };
    };
};

export type EmbeddedCheckoutV3Payment = {
    receiptEmail?: string;
    fiat: EmbeddedCheckoutV3FiatPayment;
    crypto: EmbeddedCheckoutV3CryptoPayment;
    defaultMethod?: "fiat" | "crypto";
};

export type EmbeddedCheckoutV3FiatPayment = {
    enabled: boolean;
    defaultCurrency?: FiatCurrency;
    allowedMethods?: {
        card?: boolean;
        applePay?: boolean;
        googlePay?: boolean;
    };
};

export type EmbeddedCheckoutV3CryptoPayment = {
    enabled: boolean;
    defaultChain?: BlockchainIncludingTestnet;
    defaultCurrency?: CryptoCurrency;
    payer?: EmbeddedCheckoutPayer;
    // allowedCurrencies?: Partial<Record<BlockchainIncludingTestnet, false | CryptoCurrency[]>>; // TODO: Add this back when supported on crossmint-main
};

export type TransactionResponse =
    | {
          success: true;
          txId: string;
      }
    | {
          success: false;
          errorMessage: string;
      };

export type EmbeddedCheckoutPayer = {
    address: string;
    initialChain: PayerSupportedBlockchains;
    supportedChains?: PayerSupportedBlockchains[];
    handleSignAndSendTransaction(serializedTransaction: string): Promise<TransactionResponse>;
    handleChainSwitch(chain: PayerSupportedBlockchains): Promise<void>;
};
