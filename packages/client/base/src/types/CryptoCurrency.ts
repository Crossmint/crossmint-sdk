// Keep in sync with crossmint-main @crossmint/common-types/payments/currencies/CryptoCurrency.ts

import type { ObjectValues } from "@crossmint/common-sdk-base";

export const StableCoin = {
    USDC: "usdc",
    USDCE: "usdce",
    BUSD: "busd",
} as const;
export type StableCoin = ObjectValues<typeof StableCoin>;

export const Erc20Currency = {
    ...StableCoin,
    WETH: "weth",
    DEGEN: "degen",
    BRETT: "brett",
    TOSHI: "toshi",
    EURC: "eurc",
    PIRATE: "pirate",
} as const;
export type Erc20Currency = ObjectValues<typeof Erc20Currency>;

export const SplTokenCurrency = {
    USDXM: "usdxm",
    BONK: "bonk",
    WIF: "wif",
    MOTHER: "mother",
    EURC: "eurc",
} as const;
export type SplTokenCurrency = ObjectValues<typeof SplTokenCurrency>;

export const EvmNativeCurrency = {
    ETH: "eth",
    MATIC: "matic",
    POL: "pol",
    SEI: "sei",
    CHZ: "chz",
    AVAX: "avax",
    XAI: "xai",
    FUEL: "fuel",
} as const;
export type EvmNativeCurrency = ObjectValues<typeof EvmNativeCurrency>;

export const CryptoCurrency = {
    ...EvmNativeCurrency,
    ...Erc20Currency,
    ...SplTokenCurrency,
    SOL: "sol",
    BNB: "bnb",
    SUI: "sui",
    APT: "apt",
    SFUEL: "sfuel",
} as const;
export type CryptoCurrency = ObjectValues<typeof CryptoCurrency>;
