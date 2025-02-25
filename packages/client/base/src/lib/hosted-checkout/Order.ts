import type z from "zod";

// Keep in sync with @crossmint/products-payments-headless-checkout/dist/schemas/order/Order.d.ts
declare const orderSchema: z.ZodObject<
    {
        orderId: z.ZodString;
        phase: z.ZodEnum<["quote", "payment", "delivery", "completed"]>;
        locale: z.ZodNativeEnum<{
            readonly EN_US: "en-US";
            readonly ES_ES: "es-ES";
            readonly FR_FR: "fr-FR";
            readonly IT_IT: "it-IT";
            readonly KO_KR: "ko-KR";
            readonly PT_PT: "pt-PT";
            readonly JA_JP: "ja-JP";
            readonly ZH_CN: "zh-CN";
            readonly ZH_TW: "zh-TW";
            readonly DE_DE: "de-DE";
            readonly RU_RU: "ru-RU";
            readonly TR_TR: "tr-TR";
            readonly UK_UA: "uk-UA";
            readonly TH_TH: "th-TH";
            readonly VI_VN: "vi-VN";
            readonly KLINGON: "Klingon";
        }>;
        lineItems: z.ZodArray<
            z.ZodObject<
                {
                    chain: z.ZodNativeEnum<{
                        readonly ETHEREUM: "ethereum";
                        readonly POLYGON: "polygon";
                        readonly BSC: "bsc";
                        readonly OPTIMISM: "optimism";
                        readonly ARBITRUM: "arbitrum";
                        readonly BASE: "base";
                        readonly ZORA: "zora";
                        readonly ARBITRUM_NOVA: "arbitrumnova";
                        readonly ASTAR_ZKEVM: "astar-zkevm";
                        readonly APECHAIN: "apechain";
                        readonly APEX: "apex";
                        readonly BOSS: "boss";
                        readonly LIGHTLINK: "lightlink";
                        readonly SKALE_NEBULA: "skale-nebula";
                        readonly SEI_PACIFIC_1: "sei-pacific-1";
                        readonly CHILIZ: "chiliz";
                        readonly AVALANCHE: "avalanche";
                        readonly XAI: "xai";
                        readonly SHAPE: "shape";
                        readonly RARI: "rari";
                        readonly SCROLL: "scroll";
                        readonly VICTION: "viction";
                        readonly MODE: "mode";
                        readonly SPACE: "space";
                        readonly SONEIUM: "soneium";
                        readonly ARBITRUM_SEPOLIA: "arbitrum-sepolia";
                        readonly AVALANCHE_FUJI: "avalanche-fuji";
                        readonly CURTIS: "curtis";
                        readonly BARRET_TESTNET: "barret-testnet";
                        readonly BASE_GOERLI: "base-goerli";
                        readonly BASE_SEPOLIA: "base-sepolia";
                        readonly BSC_TESTNET: "bsc-testnet";
                        readonly CHILIZ_SPICY_TESTNET: "chiliz-spicy-testnet";
                        readonly ETHEREUM_GOERLI: "ethereum-goerli";
                        readonly ETHEREUM_SEPOLIA: "ethereum-sepolia";
                        readonly HYPERSONIC_TESTNET: "hypersonic-testnet";
                        readonly LIGHTLINK_PEGASUS: "lightlink-pegasus";
                        readonly OPTIMISM_GOERLI: "optimism-goerli";
                        readonly OPTIMISM_SEPOLIA: "optimism-sepolia";
                        readonly POLYGON_AMOY: "polygon-amoy";
                        readonly POLYGON_MUMBAI: "polygon-mumbai";
                        readonly PRIVATE_TESTNET_ETHEREUM: "crossmint-private-testnet-ethereum";
                        readonly PRIVATE_TESTNET_POLYGON: "crossmint-private-testnet-polygon";
                        readonly RARI_TESTNET: "rari-testnet";
                        readonly SCROLL_SEPOLIA: "scroll-sepolia";
                        readonly SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet";
                        readonly SHAPE_SEPOLIA: "shape-sepolia";
                        readonly SKALE_NEBULA_TESTNET: "skale-nebula-testnet";
                        readonly SONEIUM_MINATO_TESTNET: "soneium-minato-testnet";
                        readonly SPACE_TESTNET: "space-testnet";
                        readonly STORY_TESTNET: "story-testnet";
                        readonly VERIFY_TESTNET: "verify-testnet";
                        readonly VICTION_TESTNET: "viction-testnet";
                        readonly XAI_SEPOLIA_TESTNET: "xai-sepolia-testnet";
                        readonly ZKATANA: "zkatana";
                        readonly ZKYOTO: "zkyoto";
                        readonly ZORA_GOERLI: "zora-goerli";
                        readonly ZORA_SEPOLIA: "zora-sepolia";
                        readonly MODE_SEPOLIA: "mode-sepolia";
                        readonly SOLANA: "solana";
                        readonly CARDANO: "cardano";
                        readonly SUI: "sui";
                        readonly APTOS: "aptos";
                    }>;
                    quantity: z.ZodEffects<z.ZodNumber, number, number>;
                    slippageBps: z.ZodOptional<z.ZodNumber>;
                    callData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                    metadata: z.ZodObject<
                        {
                            description: z.ZodString;
                            name: z.ZodString;
                            imageUrl: z.ZodString;
                            collection: z.ZodOptional<
                                z.ZodObject<
                                    {
                                        name: z.ZodOptional<z.ZodString>;
                                        description: z.ZodOptional<z.ZodString>;
                                        imageUrl: z.ZodOptional<z.ZodString>;
                                    },
                                    "strip",
                                    z.ZodTypeAny,
                                    {
                                        name?: string | undefined;
                                        description?: string | undefined;
                                        imageUrl?: string | undefined;
                                    },
                                    {
                                        name?: string | undefined;
                                        description?: string | undefined;
                                        imageUrl?: string | undefined;
                                    }
                                >
                            >;
                        },
                        "strip",
                        z.ZodTypeAny,
                        {
                            description: string;
                            name: string;
                            imageUrl: string;
                            collection?:
                                | {
                                      name?: string | undefined;
                                      description?: string | undefined;
                                      imageUrl?: string | undefined;
                                  }
                                | undefined;
                        },
                        {
                            description: string;
                            name: string;
                            imageUrl: string;
                            collection?:
                                | {
                                      name?: string | undefined;
                                      description?: string | undefined;
                                      imageUrl?: string | undefined;
                                  }
                                | undefined;
                        }
                    >;
                    quote: z.ZodObject<
                        {
                            status: z.ZodEnum<["item-unavailable", "valid", "expired", "requires-recipient"]>;
                            unavailabilityReason: z.ZodOptional<
                                z.ZodObject<
                                    {
                                        code: z.ZodEnum<["to", "do"]>;
                                        message: z.ZodString;
                                    },
                                    "strip",
                                    z.ZodTypeAny,
                                    {
                                        code: "to" | "do";
                                        message: string;
                                    },
                                    {
                                        code: "to" | "do";
                                        message: string;
                                    }
                                >
                            >;
                            charges: z.ZodOptional<
                                z.ZodObject<
                                    {
                                        unit: z.ZodObject<
                                            {
                                                amount: z.ZodString;
                                                currency: z.ZodUnion<
                                                    [
                                                        z.ZodNativeEnum<{
                                                            readonly ETH: "eth";
                                                            readonly SOL: "sol";
                                                            readonly MATIC: "matic";
                                                            readonly USDC: "usdc";
                                                            readonly USDXM: "usdxm";
                                                            readonly DEGEN: "degen";
                                                            readonly BRETT: "brett";
                                                            readonly TOSHI: "toshi";
                                                            readonly BONK: "bonk";
                                                            readonly WIF: "wif";
                                                            readonly MOTHER: "mother";
                                                            readonly EURC: "eurc";
                                                            readonly SUPERVERSE: "superverse";
                                                        }>,
                                                        z.ZodNativeEnum<{
                                                            readonly USD: "usd";
                                                            readonly EUR: "eur";
                                                            readonly AUD: "aud";
                                                            readonly GBP: "gbp";
                                                            readonly JPY: "jpy";
                                                            readonly SGD: "sgd";
                                                            readonly HKD: "hkd";
                                                            readonly KRW: "krw";
                                                            readonly INR: "inr";
                                                            readonly VND: "vnd";
                                                        }>,
                                                    ]
                                                >;
                                            },
                                            "strip",
                                            z.ZodTypeAny,
                                            {
                                                currency:
                                                    | "eth"
                                                    | "matic"
                                                    | "usdc"
                                                    | "usdxm"
                                                    | "degen"
                                                    | "brett"
                                                    | "toshi"
                                                    | "eurc"
                                                    | "superverse"
                                                    | "sol"
                                                    | "bonk"
                                                    | "wif"
                                                    | "mother"
                                                    | "usd"
                                                    | "eur"
                                                    | "aud"
                                                    | "gbp"
                                                    | "jpy"
                                                    | "sgd"
                                                    | "hkd"
                                                    | "krw"
                                                    | "inr"
                                                    | "vnd";
                                                amount: string;
                                            },
                                            {
                                                currency:
                                                    | "eth"
                                                    | "matic"
                                                    | "usdc"
                                                    | "usdxm"
                                                    | "degen"
                                                    | "brett"
                                                    | "toshi"
                                                    | "eurc"
                                                    | "superverse"
                                                    | "sol"
                                                    | "bonk"
                                                    | "wif"
                                                    | "mother"
                                                    | "usd"
                                                    | "eur"
                                                    | "aud"
                                                    | "gbp"
                                                    | "jpy"
                                                    | "sgd"
                                                    | "hkd"
                                                    | "krw"
                                                    | "inr"
                                                    | "vnd";
                                                amount: string;
                                            }
                                        >;
                                        gas: z.ZodOptional<
                                            z.ZodObject<
                                                {
                                                    amount: z.ZodString;
                                                    currency: z.ZodUnion<
                                                        [
                                                            z.ZodNativeEnum<{
                                                                readonly ETH: "eth";
                                                                readonly SOL: "sol";
                                                                readonly MATIC: "matic";
                                                                readonly USDC: "usdc";
                                                                readonly USDXM: "usdxm";
                                                                readonly DEGEN: "degen";
                                                                readonly BRETT: "brett";
                                                                readonly TOSHI: "toshi";
                                                                readonly BONK: "bonk";
                                                                readonly WIF: "wif";
                                                                readonly MOTHER: "mother";
                                                                readonly EURC: "eurc";
                                                                readonly SUPERVERSE: "superverse";
                                                            }>,
                                                            z.ZodNativeEnum<{
                                                                readonly USD: "usd";
                                                                readonly EUR: "eur";
                                                                readonly AUD: "aud";
                                                                readonly GBP: "gbp";
                                                                readonly JPY: "jpy";
                                                                readonly SGD: "sgd";
                                                                readonly HKD: "hkd";
                                                                readonly KRW: "krw";
                                                                readonly INR: "inr";
                                                                readonly VND: "vnd";
                                                            }>,
                                                        ]
                                                    >;
                                                },
                                                "strip",
                                                z.ZodTypeAny,
                                                {
                                                    currency:
                                                        | "eth"
                                                        | "matic"
                                                        | "usdc"
                                                        | "usdxm"
                                                        | "degen"
                                                        | "brett"
                                                        | "toshi"
                                                        | "eurc"
                                                        | "superverse"
                                                        | "sol"
                                                        | "bonk"
                                                        | "wif"
                                                        | "mother"
                                                        | "usd"
                                                        | "eur"
                                                        | "aud"
                                                        | "gbp"
                                                        | "jpy"
                                                        | "sgd"
                                                        | "hkd"
                                                        | "krw"
                                                        | "inr"
                                                        | "vnd";
                                                    amount: string;
                                                },
                                                {
                                                    currency:
                                                        | "eth"
                                                        | "matic"
                                                        | "usdc"
                                                        | "usdxm"
                                                        | "degen"
                                                        | "brett"
                                                        | "toshi"
                                                        | "eurc"
                                                        | "superverse"
                                                        | "sol"
                                                        | "bonk"
                                                        | "wif"
                                                        | "mother"
                                                        | "usd"
                                                        | "eur"
                                                        | "aud"
                                                        | "gbp"
                                                        | "jpy"
                                                        | "sgd"
                                                        | "hkd"
                                                        | "krw"
                                                        | "inr"
                                                        | "vnd";
                                                    amount: string;
                                                }
                                            >
                                        >;
                                    },
                                    "strip",
                                    z.ZodTypeAny,
                                    {
                                        unit: {
                                            currency:
                                                | "eth"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "brett"
                                                | "toshi"
                                                | "eurc"
                                                | "superverse"
                                                | "sol"
                                                | "bonk"
                                                | "wif"
                                                | "mother"
                                                | "usd"
                                                | "eur"
                                                | "aud"
                                                | "gbp"
                                                | "jpy"
                                                | "sgd"
                                                | "hkd"
                                                | "krw"
                                                | "inr"
                                                | "vnd";
                                            amount: string;
                                        };
                                        gas?:
                                            | {
                                                  currency:
                                                      | "eth"
                                                      | "matic"
                                                      | "usdc"
                                                      | "usdxm"
                                                      | "degen"
                                                      | "brett"
                                                      | "toshi"
                                                      | "eurc"
                                                      | "superverse"
                                                      | "sol"
                                                      | "bonk"
                                                      | "wif"
                                                      | "mother"
                                                      | "usd"
                                                      | "eur"
                                                      | "aud"
                                                      | "gbp"
                                                      | "jpy"
                                                      | "sgd"
                                                      | "hkd"
                                                      | "krw"
                                                      | "inr"
                                                      | "vnd";
                                                  amount: string;
                                              }
                                            | undefined;
                                    },
                                    {
                                        unit: {
                                            currency:
                                                | "eth"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "brett"
                                                | "toshi"
                                                | "eurc"
                                                | "superverse"
                                                | "sol"
                                                | "bonk"
                                                | "wif"
                                                | "mother"
                                                | "usd"
                                                | "eur"
                                                | "aud"
                                                | "gbp"
                                                | "jpy"
                                                | "sgd"
                                                | "hkd"
                                                | "krw"
                                                | "inr"
                                                | "vnd";
                                            amount: string;
                                        };
                                        gas?:
                                            | {
                                                  currency:
                                                      | "eth"
                                                      | "matic"
                                                      | "usdc"
                                                      | "usdxm"
                                                      | "degen"
                                                      | "brett"
                                                      | "toshi"
                                                      | "eurc"
                                                      | "superverse"
                                                      | "sol"
                                                      | "bonk"
                                                      | "wif"
                                                      | "mother"
                                                      | "usd"
                                                      | "eur"
                                                      | "aud"
                                                      | "gbp"
                                                      | "jpy"
                                                      | "sgd"
                                                      | "hkd"
                                                      | "krw"
                                                      | "inr"
                                                      | "vnd";
                                                  amount: string;
                                              }
                                            | undefined;
                                    }
                                >
                            >;
                            totalPrice: z.ZodOptional<
                                z.ZodObject<
                                    {
                                        amount: z.ZodString;
                                        currency: z.ZodUnion<
                                            [
                                                z.ZodNativeEnum<{
                                                    readonly ETH: "eth";
                                                    readonly SOL: "sol";
                                                    readonly MATIC: "matic";
                                                    readonly USDC: "usdc";
                                                    readonly USDXM: "usdxm";
                                                    readonly DEGEN: "degen";
                                                    readonly BRETT: "brett";
                                                    readonly TOSHI: "toshi";
                                                    readonly BONK: "bonk";
                                                    readonly WIF: "wif";
                                                    readonly MOTHER: "mother";
                                                    readonly EURC: "eurc";
                                                    readonly SUPERVERSE: "superverse";
                                                }>,
                                                z.ZodNativeEnum<{
                                                    readonly USD: "usd";
                                                    readonly EUR: "eur";
                                                    readonly AUD: "aud";
                                                    readonly GBP: "gbp";
                                                    readonly JPY: "jpy";
                                                    readonly SGD: "sgd";
                                                    readonly HKD: "hkd";
                                                    readonly KRW: "krw";
                                                    readonly INR: "inr";
                                                    readonly VND: "vnd";
                                                }>,
                                            ]
                                        >;
                                    },
                                    "strip",
                                    z.ZodTypeAny,
                                    {
                                        currency:
                                            | "eth"
                                            | "matic"
                                            | "usdc"
                                            | "usdxm"
                                            | "degen"
                                            | "brett"
                                            | "toshi"
                                            | "eurc"
                                            | "superverse"
                                            | "sol"
                                            | "bonk"
                                            | "wif"
                                            | "mother"
                                            | "usd"
                                            | "eur"
                                            | "aud"
                                            | "gbp"
                                            | "jpy"
                                            | "sgd"
                                            | "hkd"
                                            | "krw"
                                            | "inr"
                                            | "vnd";
                                        amount: string;
                                    },
                                    {
                                        currency:
                                            | "eth"
                                            | "matic"
                                            | "usdc"
                                            | "usdxm"
                                            | "degen"
                                            | "brett"
                                            | "toshi"
                                            | "eurc"
                                            | "superverse"
                                            | "sol"
                                            | "bonk"
                                            | "wif"
                                            | "mother"
                                            | "usd"
                                            | "eur"
                                            | "aud"
                                            | "gbp"
                                            | "jpy"
                                            | "sgd"
                                            | "hkd"
                                            | "krw"
                                            | "inr"
                                            | "vnd";
                                        amount: string;
                                    }
                                >
                            >;
                        },
                        "strip",
                        z.ZodTypeAny,
                        {
                            status: "valid" | "item-unavailable" | "expired" | "requires-recipient";
                            unavailabilityReason?:
                                | {
                                      code: "to" | "do";
                                      message: string;
                                  }
                                | undefined;
                            charges?:
                                | {
                                      unit: {
                                          currency:
                                              | "eth"
                                              | "matic"
                                              | "usdc"
                                              | "usdxm"
                                              | "degen"
                                              | "brett"
                                              | "toshi"
                                              | "eurc"
                                              | "superverse"
                                              | "sol"
                                              | "bonk"
                                              | "wif"
                                              | "mother"
                                              | "usd"
                                              | "eur"
                                              | "aud"
                                              | "gbp"
                                              | "jpy"
                                              | "sgd"
                                              | "hkd"
                                              | "krw"
                                              | "inr"
                                              | "vnd";
                                          amount: string;
                                      };
                                      gas?:
                                          | {
                                                currency:
                                                    | "eth"
                                                    | "matic"
                                                    | "usdc"
                                                    | "usdxm"
                                                    | "degen"
                                                    | "brett"
                                                    | "toshi"
                                                    | "eurc"
                                                    | "superverse"
                                                    | "sol"
                                                    | "bonk"
                                                    | "wif"
                                                    | "mother"
                                                    | "usd"
                                                    | "eur"
                                                    | "aud"
                                                    | "gbp"
                                                    | "jpy"
                                                    | "sgd"
                                                    | "hkd"
                                                    | "krw"
                                                    | "inr"
                                                    | "vnd";
                                                amount: string;
                                            }
                                          | undefined;
                                  }
                                | undefined;
                            totalPrice?:
                                | {
                                      currency:
                                          | "eth"
                                          | "matic"
                                          | "usdc"
                                          | "usdxm"
                                          | "degen"
                                          | "brett"
                                          | "toshi"
                                          | "eurc"
                                          | "superverse"
                                          | "sol"
                                          | "bonk"
                                          | "wif"
                                          | "mother"
                                          | "usd"
                                          | "eur"
                                          | "aud"
                                          | "gbp"
                                          | "jpy"
                                          | "sgd"
                                          | "hkd"
                                          | "krw"
                                          | "inr"
                                          | "vnd";
                                      amount: string;
                                  }
                                | undefined;
                        },
                        {
                            status: "valid" | "item-unavailable" | "expired" | "requires-recipient";
                            unavailabilityReason?:
                                | {
                                      code: "to" | "do";
                                      message: string;
                                  }
                                | undefined;
                            charges?:
                                | {
                                      unit: {
                                          currency:
                                              | "eth"
                                              | "matic"
                                              | "usdc"
                                              | "usdxm"
                                              | "degen"
                                              | "brett"
                                              | "toshi"
                                              | "eurc"
                                              | "superverse"
                                              | "sol"
                                              | "bonk"
                                              | "wif"
                                              | "mother"
                                              | "usd"
                                              | "eur"
                                              | "aud"
                                              | "gbp"
                                              | "jpy"
                                              | "sgd"
                                              | "hkd"
                                              | "krw"
                                              | "inr"
                                              | "vnd";
                                          amount: string;
                                      };
                                      gas?:
                                          | {
                                                currency:
                                                    | "eth"
                                                    | "matic"
                                                    | "usdc"
                                                    | "usdxm"
                                                    | "degen"
                                                    | "brett"
                                                    | "toshi"
                                                    | "eurc"
                                                    | "superverse"
                                                    | "sol"
                                                    | "bonk"
                                                    | "wif"
                                                    | "mother"
                                                    | "usd"
                                                    | "eur"
                                                    | "aud"
                                                    | "gbp"
                                                    | "jpy"
                                                    | "sgd"
                                                    | "hkd"
                                                    | "krw"
                                                    | "inr"
                                                    | "vnd";
                                                amount: string;
                                            }
                                          | undefined;
                                  }
                                | undefined;
                            totalPrice?:
                                | {
                                      currency:
                                          | "eth"
                                          | "matic"
                                          | "usdc"
                                          | "usdxm"
                                          | "degen"
                                          | "brett"
                                          | "toshi"
                                          | "eurc"
                                          | "superverse"
                                          | "sol"
                                          | "bonk"
                                          | "wif"
                                          | "mother"
                                          | "usd"
                                          | "eur"
                                          | "aud"
                                          | "gbp"
                                          | "jpy"
                                          | "sgd"
                                          | "hkd"
                                          | "krw"
                                          | "inr"
                                          | "vnd";
                                      amount: string;
                                  }
                                | undefined;
                        }
                    >;
                    delivery: z.ZodUnion<
                        [
                            z.ZodObject<
                                {
                                    status: z.ZodEnum<["awaiting-payment", "in-progress", "failed"]>;
                                    recipient: z.ZodOptional<
                                        z.ZodUnion<
                                            [
                                                z.ZodObject<
                                                    {
                                                        walletAddress: z.ZodString;
                                                        locator: z.ZodString;
                                                        physicalAddress: z.ZodOptional<
                                                            z.ZodEffects<
                                                                z.ZodObject<
                                                                    {
                                                                        name: z.ZodString;
                                                                        line1: z.ZodString;
                                                                        line2: z.ZodOptional<z.ZodString>;
                                                                        city: z.ZodString;
                                                                        state: z.ZodOptional<z.ZodString>;
                                                                        postalCode: z.ZodString;
                                                                        country: z.ZodString;
                                                                    },
                                                                    "strip",
                                                                    z.ZodTypeAny,
                                                                    {
                                                                        name: string;
                                                                        line1: string;
                                                                        city: string;
                                                                        postalCode: string;
                                                                        country: string;
                                                                        line2?: string | undefined;
                                                                        state?: string | undefined;
                                                                    },
                                                                    {
                                                                        name: string;
                                                                        line1: string;
                                                                        city: string;
                                                                        postalCode: string;
                                                                        country: string;
                                                                        line2?: string | undefined;
                                                                        state?: string | undefined;
                                                                    }
                                                                >,
                                                                {
                                                                    name: string;
                                                                    line1: string;
                                                                    city: string;
                                                                    postalCode: string;
                                                                    country: string;
                                                                    line2?: string | undefined;
                                                                    state?: string | undefined;
                                                                },
                                                                {
                                                                    name: string;
                                                                    line1: string;
                                                                    city: string;
                                                                    postalCode: string;
                                                                    country: string;
                                                                    line2?: string | undefined;
                                                                    state?: string | undefined;
                                                                }
                                                            >
                                                        >;
                                                    },
                                                    "strip",
                                                    z.ZodTypeAny,
                                                    {
                                                        walletAddress: string;
                                                        locator: string;
                                                        physicalAddress?:
                                                            | {
                                                                  name: string;
                                                                  line1: string;
                                                                  city: string;
                                                                  postalCode: string;
                                                                  country: string;
                                                                  line2?: string | undefined;
                                                                  state?: string | undefined;
                                                              }
                                                            | undefined;
                                                    },
                                                    {
                                                        walletAddress: string;
                                                        locator: string;
                                                        physicalAddress?:
                                                            | {
                                                                  name: string;
                                                                  line1: string;
                                                                  city: string;
                                                                  postalCode: string;
                                                                  country: string;
                                                                  line2?: string | undefined;
                                                                  state?: string | undefined;
                                                              }
                                                            | undefined;
                                                    }
                                                >,
                                                z.ZodObject<
                                                    {
                                                        walletAddress: z.ZodString;
                                                        physicalAddress: z.ZodOptional<
                                                            z.ZodEffects<
                                                                z.ZodObject<
                                                                    {
                                                                        name: z.ZodString;
                                                                        line1: z.ZodString;
                                                                        line2: z.ZodOptional<z.ZodString>;
                                                                        city: z.ZodString;
                                                                        state: z.ZodOptional<z.ZodString>;
                                                                        postalCode: z.ZodString;
                                                                        country: z.ZodString;
                                                                    },
                                                                    "strip",
                                                                    z.ZodTypeAny,
                                                                    {
                                                                        name: string;
                                                                        line1: string;
                                                                        city: string;
                                                                        postalCode: string;
                                                                        country: string;
                                                                        line2?: string | undefined;
                                                                        state?: string | undefined;
                                                                    },
                                                                    {
                                                                        name: string;
                                                                        line1: string;
                                                                        city: string;
                                                                        postalCode: string;
                                                                        country: string;
                                                                        line2?: string | undefined;
                                                                        state?: string | undefined;
                                                                    }
                                                                >,
                                                                {
                                                                    name: string;
                                                                    line1: string;
                                                                    city: string;
                                                                    postalCode: string;
                                                                    country: string;
                                                                    line2?: string | undefined;
                                                                    state?: string | undefined;
                                                                },
                                                                {
                                                                    name: string;
                                                                    line1: string;
                                                                    city: string;
                                                                    postalCode: string;
                                                                    country: string;
                                                                    line2?: string | undefined;
                                                                    state?: string | undefined;
                                                                }
                                                            >
                                                        >;
                                                        locator: z.ZodString;
                                                        email: z.ZodString;
                                                    },
                                                    "strip",
                                                    z.ZodTypeAny,
                                                    {
                                                        email: string;
                                                        walletAddress: string;
                                                        locator: string;
                                                        physicalAddress?:
                                                            | {
                                                                  name: string;
                                                                  line1: string;
                                                                  city: string;
                                                                  postalCode: string;
                                                                  country: string;
                                                                  line2?: string | undefined;
                                                                  state?: string | undefined;
                                                              }
                                                            | undefined;
                                                    },
                                                    {
                                                        email: string;
                                                        walletAddress: string;
                                                        locator: string;
                                                        physicalAddress?:
                                                            | {
                                                                  name: string;
                                                                  line1: string;
                                                                  city: string;
                                                                  postalCode: string;
                                                                  country: string;
                                                                  line2?: string | undefined;
                                                                  state?: string | undefined;
                                                              }
                                                            | undefined;
                                                    }
                                                >,
                                            ]
                                        >
                                    >;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    status: "awaiting-payment" | "in-progress" | "failed";
                                    recipient?:
                                        | {
                                              walletAddress: string;
                                              locator: string;
                                              physicalAddress?:
                                                  | {
                                                        name: string;
                                                        line1: string;
                                                        city: string;
                                                        postalCode: string;
                                                        country: string;
                                                        line2?: string | undefined;
                                                        state?: string | undefined;
                                                    }
                                                  | undefined;
                                          }
                                        | {
                                              email: string;
                                              walletAddress: string;
                                              locator: string;
                                              physicalAddress?:
                                                  | {
                                                        name: string;
                                                        line1: string;
                                                        city: string;
                                                        postalCode: string;
                                                        country: string;
                                                        line2?: string | undefined;
                                                        state?: string | undefined;
                                                    }
                                                  | undefined;
                                          }
                                        | undefined;
                                },
                                {
                                    status: "awaiting-payment" | "in-progress" | "failed";
                                    recipient?:
                                        | {
                                              walletAddress: string;
                                              locator: string;
                                              physicalAddress?:
                                                  | {
                                                        name: string;
                                                        line1: string;
                                                        city: string;
                                                        postalCode: string;
                                                        country: string;
                                                        line2?: string | undefined;
                                                        state?: string | undefined;
                                                    }
                                                  | undefined;
                                          }
                                        | {
                                              email: string;
                                              walletAddress: string;
                                              locator: string;
                                              physicalAddress?:
                                                  | {
                                                        name: string;
                                                        line1: string;
                                                        city: string;
                                                        postalCode: string;
                                                        country: string;
                                                        line2?: string | undefined;
                                                        state?: string | undefined;
                                                    }
                                                  | undefined;
                                          }
                                        | undefined;
                                }
                            >,
                            z.ZodObject<
                                {
                                    status: z.ZodLiteral<"completed">;
                                    recipient: z.ZodOptional<
                                        z.ZodUnion<
                                            [
                                                z.ZodObject<
                                                    {
                                                        walletAddress: z.ZodString;
                                                        locator: z.ZodString;
                                                        physicalAddress: z.ZodOptional<
                                                            z.ZodEffects<
                                                                z.ZodObject<
                                                                    {
                                                                        name: z.ZodString;
                                                                        line1: z.ZodString;
                                                                        line2: z.ZodOptional<z.ZodString>;
                                                                        city: z.ZodString;
                                                                        state: z.ZodOptional<z.ZodString>;
                                                                        postalCode: z.ZodString;
                                                                        country: z.ZodString;
                                                                    },
                                                                    "strip",
                                                                    z.ZodTypeAny,
                                                                    {
                                                                        name: string;
                                                                        line1: string;
                                                                        city: string;
                                                                        postalCode: string;
                                                                        country: string;
                                                                        line2?: string | undefined;
                                                                        state?: string | undefined;
                                                                    },
                                                                    {
                                                                        name: string;
                                                                        line1: string;
                                                                        city: string;
                                                                        postalCode: string;
                                                                        country: string;
                                                                        line2?: string | undefined;
                                                                        state?: string | undefined;
                                                                    }
                                                                >,
                                                                {
                                                                    name: string;
                                                                    line1: string;
                                                                    city: string;
                                                                    postalCode: string;
                                                                    country: string;
                                                                    line2?: string | undefined;
                                                                    state?: string | undefined;
                                                                },
                                                                {
                                                                    name: string;
                                                                    line1: string;
                                                                    city: string;
                                                                    postalCode: string;
                                                                    country: string;
                                                                    line2?: string | undefined;
                                                                    state?: string | undefined;
                                                                }
                                                            >
                                                        >;
                                                    },
                                                    "strip",
                                                    z.ZodTypeAny,
                                                    {
                                                        walletAddress: string;
                                                        locator: string;
                                                        physicalAddress?:
                                                            | {
                                                                  name: string;
                                                                  line1: string;
                                                                  city: string;
                                                                  postalCode: string;
                                                                  country: string;
                                                                  line2?: string | undefined;
                                                                  state?: string | undefined;
                                                              }
                                                            | undefined;
                                                    },
                                                    {
                                                        walletAddress: string;
                                                        locator: string;
                                                        physicalAddress?:
                                                            | {
                                                                  name: string;
                                                                  line1: string;
                                                                  city: string;
                                                                  postalCode: string;
                                                                  country: string;
                                                                  line2?: string | undefined;
                                                                  state?: string | undefined;
                                                              }
                                                            | undefined;
                                                    }
                                                >,
                                                z.ZodObject<
                                                    {
                                                        walletAddress: z.ZodString;
                                                        physicalAddress: z.ZodOptional<
                                                            z.ZodEffects<
                                                                z.ZodObject<
                                                                    {
                                                                        name: z.ZodString;
                                                                        line1: z.ZodString;
                                                                        line2: z.ZodOptional<z.ZodString>;
                                                                        city: z.ZodString;
                                                                        state: z.ZodOptional<z.ZodString>;
                                                                        postalCode: z.ZodString;
                                                                        country: z.ZodString;
                                                                    },
                                                                    "strip",
                                                                    z.ZodTypeAny,
                                                                    {
                                                                        name: string;
                                                                        line1: string;
                                                                        city: string;
                                                                        postalCode: string;
                                                                        country: string;
                                                                        line2?: string | undefined;
                                                                        state?: string | undefined;
                                                                    },
                                                                    {
                                                                        name: string;
                                                                        line1: string;
                                                                        city: string;
                                                                        postalCode: string;
                                                                        country: string;
                                                                        line2?: string | undefined;
                                                                        state?: string | undefined;
                                                                    }
                                                                >,
                                                                {
                                                                    name: string;
                                                                    line1: string;
                                                                    city: string;
                                                                    postalCode: string;
                                                                    country: string;
                                                                    line2?: string | undefined;
                                                                    state?: string | undefined;
                                                                },
                                                                {
                                                                    name: string;
                                                                    line1: string;
                                                                    city: string;
                                                                    postalCode: string;
                                                                    country: string;
                                                                    line2?: string | undefined;
                                                                    state?: string | undefined;
                                                                }
                                                            >
                                                        >;
                                                        locator: z.ZodString;
                                                        email: z.ZodString;
                                                    },
                                                    "strip",
                                                    z.ZodTypeAny,
                                                    {
                                                        email: string;
                                                        walletAddress: string;
                                                        locator: string;
                                                        physicalAddress?:
                                                            | {
                                                                  name: string;
                                                                  line1: string;
                                                                  city: string;
                                                                  postalCode: string;
                                                                  country: string;
                                                                  line2?: string | undefined;
                                                                  state?: string | undefined;
                                                              }
                                                            | undefined;
                                                    },
                                                    {
                                                        email: string;
                                                        walletAddress: string;
                                                        locator: string;
                                                        physicalAddress?:
                                                            | {
                                                                  name: string;
                                                                  line1: string;
                                                                  city: string;
                                                                  postalCode: string;
                                                                  country: string;
                                                                  line2?: string | undefined;
                                                                  state?: string | undefined;
                                                              }
                                                            | undefined;
                                                    }
                                                >,
                                            ]
                                        >
                                    >;
                                    txId: z.ZodString;
                                    tokens: z.ZodArray<
                                        z.ZodUnion<
                                            [
                                                z.ZodObject<
                                                    {
                                                        contractAddress: z.ZodString;
                                                        tokenId: z.ZodString;
                                                        locator: z.ZodString;
                                                    },
                                                    "strip",
                                                    z.ZodTypeAny,
                                                    {
                                                        locator: string;
                                                        contractAddress: string;
                                                        tokenId: string;
                                                    },
                                                    {
                                                        locator: string;
                                                        contractAddress: string;
                                                        tokenId: string;
                                                    }
                                                >,
                                                z.ZodObject<
                                                    {
                                                        mintHash: z.ZodString;
                                                        locator: z.ZodString;
                                                    },
                                                    "strip",
                                                    z.ZodTypeAny,
                                                    {
                                                        locator: string;
                                                        mintHash: string;
                                                    },
                                                    {
                                                        locator: string;
                                                        mintHash: string;
                                                    }
                                                >,
                                            ]
                                        >,
                                        "many"
                                    >;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    status: "completed";
                                    txId: string;
                                    tokens: (
                                        | {
                                              locator: string;
                                              contractAddress: string;
                                              tokenId: string;
                                          }
                                        | {
                                              locator: string;
                                              mintHash: string;
                                          }
                                    )[];
                                    recipient?:
                                        | {
                                              walletAddress: string;
                                              locator: string;
                                              physicalAddress?:
                                                  | {
                                                        name: string;
                                                        line1: string;
                                                        city: string;
                                                        postalCode: string;
                                                        country: string;
                                                        line2?: string | undefined;
                                                        state?: string | undefined;
                                                    }
                                                  | undefined;
                                          }
                                        | {
                                              email: string;
                                              walletAddress: string;
                                              locator: string;
                                              physicalAddress?:
                                                  | {
                                                        name: string;
                                                        line1: string;
                                                        city: string;
                                                        postalCode: string;
                                                        country: string;
                                                        line2?: string | undefined;
                                                        state?: string | undefined;
                                                    }
                                                  | undefined;
                                          }
                                        | undefined;
                                },
                                {
                                    status: "completed";
                                    txId: string;
                                    tokens: (
                                        | {
                                              locator: string;
                                              contractAddress: string;
                                              tokenId: string;
                                          }
                                        | {
                                              locator: string;
                                              mintHash: string;
                                          }
                                    )[];
                                    recipient?:
                                        | {
                                              walletAddress: string;
                                              locator: string;
                                              physicalAddress?:
                                                  | {
                                                        name: string;
                                                        line1: string;
                                                        city: string;
                                                        postalCode: string;
                                                        country: string;
                                                        line2?: string | undefined;
                                                        state?: string | undefined;
                                                    }
                                                  | undefined;
                                          }
                                        | {
                                              email: string;
                                              walletAddress: string;
                                              locator: string;
                                              physicalAddress?:
                                                  | {
                                                        name: string;
                                                        line1: string;
                                                        city: string;
                                                        postalCode: string;
                                                        country: string;
                                                        line2?: string | undefined;
                                                        state?: string | undefined;
                                                    }
                                                  | undefined;
                                          }
                                        | undefined;
                                }
                            >,
                        ]
                    >;
                },
                "strip",
                z.ZodTypeAny,
                {
                    chain:
                        | "ethereum"
                        | "polygon"
                        | "bsc"
                        | "optimism"
                        | "arbitrum"
                        | "base"
                        | "zora"
                        | "arbitrumnova"
                        | "astar-zkevm"
                        | "apechain"
                        | "apex"
                        | "boss"
                        | "lightlink"
                        | "skale-nebula"
                        | "sei-pacific-1"
                        | "chiliz"
                        | "avalanche"
                        | "xai"
                        | "shape"
                        | "rari"
                        | "scroll"
                        | "viction"
                        | "mode"
                        | "space"
                        | "soneium"
                        | "arbitrum-sepolia"
                        | "avalanche-fuji"
                        | "curtis"
                        | "barret-testnet"
                        | "base-goerli"
                        | "base-sepolia"
                        | "bsc-testnet"
                        | "chiliz-spicy-testnet"
                        | "ethereum-goerli"
                        | "ethereum-sepolia"
                        | "hypersonic-testnet"
                        | "lightlink-pegasus"
                        | "optimism-goerli"
                        | "optimism-sepolia"
                        | "polygon-amoy"
                        | "polygon-mumbai"
                        | "crossmint-private-testnet-ethereum"
                        | "crossmint-private-testnet-polygon"
                        | "rari-testnet"
                        | "scroll-sepolia"
                        | "sei-atlantic-2-testnet"
                        | "shape-sepolia"
                        | "skale-nebula-testnet"
                        | "soneium-minato-testnet"
                        | "space-testnet"
                        | "story-testnet"
                        | "verify-testnet"
                        | "viction-testnet"
                        | "xai-sepolia-testnet"
                        | "zkatana"
                        | "zkyoto"
                        | "zora-goerli"
                        | "zora-sepolia"
                        | "mode-sepolia"
                        | "solana"
                        | "cardano"
                        | "sui"
                        | "aptos";
                    quantity: number;
                    metadata: {
                        description: string;
                        name: string;
                        imageUrl: string;
                        collection?:
                            | {
                                  name?: string | undefined;
                                  description?: string | undefined;
                                  imageUrl?: string | undefined;
                              }
                            | undefined;
                    };
                    quote: {
                        status: "valid" | "item-unavailable" | "expired" | "requires-recipient";
                        unavailabilityReason?:
                            | {
                                  code: "to" | "do";
                                  message: string;
                              }
                            | undefined;
                        charges?:
                            | {
                                  unit: {
                                      currency:
                                          | "eth"
                                          | "matic"
                                          | "usdc"
                                          | "usdxm"
                                          | "degen"
                                          | "brett"
                                          | "toshi"
                                          | "eurc"
                                          | "superverse"
                                          | "sol"
                                          | "bonk"
                                          | "wif"
                                          | "mother"
                                          | "usd"
                                          | "eur"
                                          | "aud"
                                          | "gbp"
                                          | "jpy"
                                          | "sgd"
                                          | "hkd"
                                          | "krw"
                                          | "inr"
                                          | "vnd";
                                      amount: string;
                                  };
                                  gas?:
                                      | {
                                            currency:
                                                | "eth"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "brett"
                                                | "toshi"
                                                | "eurc"
                                                | "superverse"
                                                | "sol"
                                                | "bonk"
                                                | "wif"
                                                | "mother"
                                                | "usd"
                                                | "eur"
                                                | "aud"
                                                | "gbp"
                                                | "jpy"
                                                | "sgd"
                                                | "hkd"
                                                | "krw"
                                                | "inr"
                                                | "vnd";
                                            amount: string;
                                        }
                                      | undefined;
                              }
                            | undefined;
                        totalPrice?:
                            | {
                                  currency:
                                      | "eth"
                                      | "matic"
                                      | "usdc"
                                      | "usdxm"
                                      | "degen"
                                      | "brett"
                                      | "toshi"
                                      | "eurc"
                                      | "superverse"
                                      | "sol"
                                      | "bonk"
                                      | "wif"
                                      | "mother"
                                      | "usd"
                                      | "eur"
                                      | "aud"
                                      | "gbp"
                                      | "jpy"
                                      | "sgd"
                                      | "hkd"
                                      | "krw"
                                      | "inr"
                                      | "vnd";
                                  amount: string;
                              }
                            | undefined;
                    };
                    delivery:
                        | {
                              status: "completed";
                              txId: string;
                              tokens: (
                                  | {
                                        locator: string;
                                        contractAddress: string;
                                        tokenId: string;
                                    }
                                  | {
                                        locator: string;
                                        mintHash: string;
                                    }
                              )[];
                              recipient?:
                                  | {
                                        walletAddress: string;
                                        locator: string;
                                        physicalAddress?:
                                            | {
                                                  name: string;
                                                  line1: string;
                                                  city: string;
                                                  postalCode: string;
                                                  country: string;
                                                  line2?: string | undefined;
                                                  state?: string | undefined;
                                              }
                                            | undefined;
                                    }
                                  | {
                                        email: string;
                                        walletAddress: string;
                                        locator: string;
                                        physicalAddress?:
                                            | {
                                                  name: string;
                                                  line1: string;
                                                  city: string;
                                                  postalCode: string;
                                                  country: string;
                                                  line2?: string | undefined;
                                                  state?: string | undefined;
                                              }
                                            | undefined;
                                    }
                                  | undefined;
                          }
                        | {
                              status: "awaiting-payment" | "in-progress" | "failed";
                              recipient?:
                                  | {
                                        walletAddress: string;
                                        locator: string;
                                        physicalAddress?:
                                            | {
                                                  name: string;
                                                  line1: string;
                                                  city: string;
                                                  postalCode: string;
                                                  country: string;
                                                  line2?: string | undefined;
                                                  state?: string | undefined;
                                              }
                                            | undefined;
                                    }
                                  | {
                                        email: string;
                                        walletAddress: string;
                                        locator: string;
                                        physicalAddress?:
                                            | {
                                                  name: string;
                                                  line1: string;
                                                  city: string;
                                                  postalCode: string;
                                                  country: string;
                                                  line2?: string | undefined;
                                                  state?: string | undefined;
                                              }
                                            | undefined;
                                    }
                                  | undefined;
                          };
                    slippageBps?: number | undefined;
                    callData?: Record<string, any> | undefined;
                },
                {
                    chain:
                        | "ethereum"
                        | "polygon"
                        | "bsc"
                        | "optimism"
                        | "arbitrum"
                        | "base"
                        | "zora"
                        | "arbitrumnova"
                        | "astar-zkevm"
                        | "apechain"
                        | "apex"
                        | "boss"
                        | "lightlink"
                        | "skale-nebula"
                        | "sei-pacific-1"
                        | "chiliz"
                        | "avalanche"
                        | "xai"
                        | "shape"
                        | "rari"
                        | "scroll"
                        | "viction"
                        | "mode"
                        | "space"
                        | "soneium"
                        | "arbitrum-sepolia"
                        | "avalanche-fuji"
                        | "curtis"
                        | "barret-testnet"
                        | "base-goerli"
                        | "base-sepolia"
                        | "bsc-testnet"
                        | "chiliz-spicy-testnet"
                        | "ethereum-goerli"
                        | "ethereum-sepolia"
                        | "hypersonic-testnet"
                        | "lightlink-pegasus"
                        | "optimism-goerli"
                        | "optimism-sepolia"
                        | "polygon-amoy"
                        | "polygon-mumbai"
                        | "crossmint-private-testnet-ethereum"
                        | "crossmint-private-testnet-polygon"
                        | "rari-testnet"
                        | "scroll-sepolia"
                        | "sei-atlantic-2-testnet"
                        | "shape-sepolia"
                        | "skale-nebula-testnet"
                        | "soneium-minato-testnet"
                        | "space-testnet"
                        | "story-testnet"
                        | "verify-testnet"
                        | "viction-testnet"
                        | "xai-sepolia-testnet"
                        | "zkatana"
                        | "zkyoto"
                        | "zora-goerli"
                        | "zora-sepolia"
                        | "mode-sepolia"
                        | "solana"
                        | "cardano"
                        | "sui"
                        | "aptos";
                    quantity: number;
                    metadata: {
                        description: string;
                        name: string;
                        imageUrl: string;
                        collection?:
                            | {
                                  name?: string | undefined;
                                  description?: string | undefined;
                                  imageUrl?: string | undefined;
                              }
                            | undefined;
                    };
                    quote: {
                        status: "valid" | "item-unavailable" | "expired" | "requires-recipient";
                        unavailabilityReason?:
                            | {
                                  code: "to" | "do";
                                  message: string;
                              }
                            | undefined;
                        charges?:
                            | {
                                  unit: {
                                      currency:
                                          | "eth"
                                          | "matic"
                                          | "usdc"
                                          | "usdxm"
                                          | "degen"
                                          | "brett"
                                          | "toshi"
                                          | "eurc"
                                          | "superverse"
                                          | "sol"
                                          | "bonk"
                                          | "wif"
                                          | "mother"
                                          | "usd"
                                          | "eur"
                                          | "aud"
                                          | "gbp"
                                          | "jpy"
                                          | "sgd"
                                          | "hkd"
                                          | "krw"
                                          | "inr"
                                          | "vnd";
                                      amount: string;
                                  };
                                  gas?:
                                      | {
                                            currency:
                                                | "eth"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "brett"
                                                | "toshi"
                                                | "eurc"
                                                | "superverse"
                                                | "sol"
                                                | "bonk"
                                                | "wif"
                                                | "mother"
                                                | "usd"
                                                | "eur"
                                                | "aud"
                                                | "gbp"
                                                | "jpy"
                                                | "sgd"
                                                | "hkd"
                                                | "krw"
                                                | "inr"
                                                | "vnd";
                                            amount: string;
                                        }
                                      | undefined;
                              }
                            | undefined;
                        totalPrice?:
                            | {
                                  currency:
                                      | "eth"
                                      | "matic"
                                      | "usdc"
                                      | "usdxm"
                                      | "degen"
                                      | "brett"
                                      | "toshi"
                                      | "eurc"
                                      | "superverse"
                                      | "sol"
                                      | "bonk"
                                      | "wif"
                                      | "mother"
                                      | "usd"
                                      | "eur"
                                      | "aud"
                                      | "gbp"
                                      | "jpy"
                                      | "sgd"
                                      | "hkd"
                                      | "krw"
                                      | "inr"
                                      | "vnd";
                                  amount: string;
                              }
                            | undefined;
                    };
                    delivery:
                        | {
                              status: "completed";
                              txId: string;
                              tokens: (
                                  | {
                                        locator: string;
                                        contractAddress: string;
                                        tokenId: string;
                                    }
                                  | {
                                        locator: string;
                                        mintHash: string;
                                    }
                              )[];
                              recipient?:
                                  | {
                                        walletAddress: string;
                                        locator: string;
                                        physicalAddress?:
                                            | {
                                                  name: string;
                                                  line1: string;
                                                  city: string;
                                                  postalCode: string;
                                                  country: string;
                                                  line2?: string | undefined;
                                                  state?: string | undefined;
                                              }
                                            | undefined;
                                    }
                                  | {
                                        email: string;
                                        walletAddress: string;
                                        locator: string;
                                        physicalAddress?:
                                            | {
                                                  name: string;
                                                  line1: string;
                                                  city: string;
                                                  postalCode: string;
                                                  country: string;
                                                  line2?: string | undefined;
                                                  state?: string | undefined;
                                              }
                                            | undefined;
                                    }
                                  | undefined;
                          }
                        | {
                              status: "awaiting-payment" | "in-progress" | "failed";
                              recipient?:
                                  | {
                                        walletAddress: string;
                                        locator: string;
                                        physicalAddress?:
                                            | {
                                                  name: string;
                                                  line1: string;
                                                  city: string;
                                                  postalCode: string;
                                                  country: string;
                                                  line2?: string | undefined;
                                                  state?: string | undefined;
                                              }
                                            | undefined;
                                    }
                                  | {
                                        email: string;
                                        walletAddress: string;
                                        locator: string;
                                        physicalAddress?:
                                            | {
                                                  name: string;
                                                  line1: string;
                                                  city: string;
                                                  postalCode: string;
                                                  country: string;
                                                  line2?: string | undefined;
                                                  state?: string | undefined;
                                              }
                                            | undefined;
                                    }
                                  | undefined;
                          };
                    slippageBps?: number | undefined;
                    callData?: Record<string, any> | undefined;
                }
            >,
            "many"
        >;
        quote: z.ZodObject<
            {
                status: z.ZodEnum<
                    [
                        "requires-recipient",
                        "requires-physical-address",
                        "all-line-items-unavailable",
                        "valid",
                        "expired",
                    ]
                >;
                quotedAt: z.ZodOptional<z.ZodString>;
                expiresAt: z.ZodOptional<z.ZodString>;
                totalPrice: z.ZodOptional<
                    z.ZodObject<
                        {
                            amount: z.ZodString;
                            currency: z.ZodUnion<
                                [
                                    z.ZodNativeEnum<{
                                        readonly ETH: "eth";
                                        readonly SOL: "sol";
                                        readonly MATIC: "matic";
                                        readonly USDC: "usdc";
                                        readonly USDXM: "usdxm";
                                        readonly DEGEN: "degen";
                                        readonly BRETT: "brett";
                                        readonly TOSHI: "toshi";
                                        readonly BONK: "bonk";
                                        readonly WIF: "wif";
                                        readonly MOTHER: "mother";
                                        readonly EURC: "eurc";
                                        readonly SUPERVERSE: "superverse";
                                    }>,
                                    z.ZodNativeEnum<{
                                        readonly USD: "usd";
                                        readonly EUR: "eur";
                                        readonly AUD: "aud";
                                        readonly GBP: "gbp";
                                        readonly JPY: "jpy";
                                        readonly SGD: "sgd";
                                        readonly HKD: "hkd";
                                        readonly KRW: "krw";
                                        readonly INR: "inr";
                                        readonly VND: "vnd";
                                    }>,
                                ]
                            >;
                        },
                        "strip",
                        z.ZodTypeAny,
                        {
                            currency:
                                | "eth"
                                | "matic"
                                | "usdc"
                                | "usdxm"
                                | "degen"
                                | "brett"
                                | "toshi"
                                | "eurc"
                                | "superverse"
                                | "sol"
                                | "bonk"
                                | "wif"
                                | "mother"
                                | "usd"
                                | "eur"
                                | "aud"
                                | "gbp"
                                | "jpy"
                                | "sgd"
                                | "hkd"
                                | "krw"
                                | "inr"
                                | "vnd";
                            amount: string;
                        },
                        {
                            currency:
                                | "eth"
                                | "matic"
                                | "usdc"
                                | "usdxm"
                                | "degen"
                                | "brett"
                                | "toshi"
                                | "eurc"
                                | "superverse"
                                | "sol"
                                | "bonk"
                                | "wif"
                                | "mother"
                                | "usd"
                                | "eur"
                                | "aud"
                                | "gbp"
                                | "jpy"
                                | "sgd"
                                | "hkd"
                                | "krw"
                                | "inr"
                                | "vnd";
                            amount: string;
                        }
                    >
                >;
            },
            "strip",
            z.ZodTypeAny,
            {
                status:
                    | "valid"
                    | "expired"
                    | "requires-recipient"
                    | "requires-physical-address"
                    | "all-line-items-unavailable";
                quotedAt?: string | undefined;
                expiresAt?: string | undefined;
                totalPrice?:
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                      }
                    | undefined;
            },
            {
                status:
                    | "valid"
                    | "expired"
                    | "requires-recipient"
                    | "requires-physical-address"
                    | "all-line-items-unavailable";
                quotedAt?: string | undefined;
                expiresAt?: string | undefined;
                totalPrice?:
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                      }
                    | undefined;
            }
        >;
        payment: z.ZodObject<
            {
                status: z.ZodEnum<
                    [
                        "requires-quote",
                        "requires-crypto-payer-address",
                        "requires-email",
                        "crypto-payer-insufficient-funds",
                        "awaiting-payment",
                        "in-progress",
                        "completed",
                    ]
                >;
                failureReason: z.ZodOptional<
                    z.ZodUnion<
                        [
                            z.ZodObject<
                                {
                                    code: z.ZodString;
                                    message: z.ZodOptional<z.ZodString>;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    code: string;
                                    message?: string | undefined;
                                },
                                {
                                    code: string;
                                    message?: string | undefined;
                                }
                            >,
                            z.ZodObject<
                                {
                                    code: z.ZodNativeEnum<{
                                        readonly UNKNOWN: "unknown";
                                        readonly TX_ID_NOT_FOUND: "tx-id-not-found";
                                        readonly INSUFFICIENT_FUNDS: "insufficient-funds";
                                    }>;
                                    message: z.ZodOptional<z.ZodString>;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    code: "unknown" | "tx-id-not-found" | "insufficient-funds";
                                    message?: string | undefined;
                                },
                                {
                                    code: "unknown" | "tx-id-not-found" | "insufficient-funds";
                                    message?: string | undefined;
                                }
                            >,
                        ]
                    >
                >;
                method: z.ZodNativeEnum<{
                    readonly ETHEREUM: "ethereum";
                    readonly POLYGON: "polygon";
                    readonly BSC: "bsc";
                    readonly OPTIMISM: "optimism";
                    readonly ARBITRUM: "arbitrum";
                    readonly BASE: "base";
                    readonly ZORA: "zora";
                    readonly ARBITRUM_NOVA: "arbitrumnova";
                    readonly ASTAR_ZKEVM: "astar-zkevm";
                    readonly APECHAIN: "apechain";
                    readonly APEX: "apex";
                    readonly BOSS: "boss";
                    readonly LIGHTLINK: "lightlink";
                    readonly SKALE_NEBULA: "skale-nebula";
                    readonly SEI_PACIFIC_1: "sei-pacific-1";
                    readonly CHILIZ: "chiliz";
                    readonly AVALANCHE: "avalanche";
                    readonly XAI: "xai";
                    readonly SHAPE: "shape";
                    readonly RARI: "rari";
                    readonly SCROLL: "scroll";
                    readonly VICTION: "viction";
                    readonly MODE: "mode";
                    readonly SPACE: "space";
                    readonly SONEIUM: "soneium";
                    readonly ARBITRUM_SEPOLIA: "arbitrum-sepolia";
                    readonly AVALANCHE_FUJI: "avalanche-fuji";
                    readonly CURTIS: "curtis";
                    readonly BARRET_TESTNET: "barret-testnet";
                    readonly BASE_GOERLI: "base-goerli";
                    readonly BASE_SEPOLIA: "base-sepolia";
                    readonly BSC_TESTNET: "bsc-testnet";
                    readonly CHILIZ_SPICY_TESTNET: "chiliz-spicy-testnet";
                    readonly ETHEREUM_GOERLI: "ethereum-goerli";
                    readonly ETHEREUM_SEPOLIA: "ethereum-sepolia";
                    readonly HYPERSONIC_TESTNET: "hypersonic-testnet";
                    readonly LIGHTLINK_PEGASUS: "lightlink-pegasus";
                    readonly OPTIMISM_GOERLI: "optimism-goerli";
                    readonly OPTIMISM_SEPOLIA: "optimism-sepolia";
                    readonly POLYGON_AMOY: "polygon-amoy";
                    readonly POLYGON_MUMBAI: "polygon-mumbai";
                    readonly PRIVATE_TESTNET_ETHEREUM: "crossmint-private-testnet-ethereum";
                    readonly PRIVATE_TESTNET_POLYGON: "crossmint-private-testnet-polygon";
                    readonly RARI_TESTNET: "rari-testnet";
                    readonly SCROLL_SEPOLIA: "scroll-sepolia";
                    readonly SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet";
                    readonly SHAPE_SEPOLIA: "shape-sepolia";
                    readonly SKALE_NEBULA_TESTNET: "skale-nebula-testnet";
                    readonly SONEIUM_MINATO_TESTNET: "soneium-minato-testnet";
                    readonly SPACE_TESTNET: "space-testnet";
                    readonly STORY_TESTNET: "story-testnet";
                    readonly VERIFY_TESTNET: "verify-testnet";
                    readonly VICTION_TESTNET: "viction-testnet";
                    readonly XAI_SEPOLIA_TESTNET: "xai-sepolia-testnet";
                    readonly ZKATANA: "zkatana";
                    readonly ZKYOTO: "zkyoto";
                    readonly ZORA_GOERLI: "zora-goerli";
                    readonly ZORA_SEPOLIA: "zora-sepolia";
                    readonly MODE_SEPOLIA: "mode-sepolia";
                    readonly SOLANA: "solana";
                    readonly "stripe-payment-element": "stripe-payment-element";
                }>;
                currency: z.ZodUnion<
                    [
                        z.ZodNativeEnum<{
                            readonly ETH: "eth";
                            readonly SOL: "sol";
                            readonly MATIC: "matic";
                            readonly USDC: "usdc";
                            readonly USDXM: "usdxm";
                            readonly DEGEN: "degen";
                            readonly BRETT: "brett";
                            readonly TOSHI: "toshi";
                            readonly BONK: "bonk";
                            readonly WIF: "wif";
                            readonly MOTHER: "mother";
                            readonly EURC: "eurc";
                            readonly SUPERVERSE: "superverse";
                        }>,
                        z.ZodNativeEnum<{
                            readonly USD: "usd";
                            readonly EUR: "eur";
                            readonly AUD: "aud";
                            readonly GBP: "gbp";
                            readonly JPY: "jpy";
                            readonly SGD: "sgd";
                            readonly HKD: "hkd";
                            readonly KRW: "krw";
                            readonly INR: "inr";
                            readonly VND: "vnd";
                        }>,
                    ]
                >;
                preparation: z.ZodOptional<
                    z.ZodUnion<
                        [
                            z.ZodObject<
                                {
                                    chain: z.ZodOptional<
                                        z.ZodNativeEnum<{
                                            readonly ETHEREUM: "ethereum";
                                            readonly POLYGON: "polygon";
                                            readonly BSC: "bsc";
                                            readonly OPTIMISM: "optimism";
                                            readonly ARBITRUM: "arbitrum";
                                            readonly BASE: "base";
                                            readonly ZORA: "zora";
                                            readonly ARBITRUM_NOVA: "arbitrumnova";
                                            readonly ASTAR_ZKEVM: "astar-zkevm";
                                            readonly APECHAIN: "apechain";
                                            readonly APEX: "apex";
                                            readonly BOSS: "boss";
                                            readonly LIGHTLINK: "lightlink";
                                            readonly SKALE_NEBULA: "skale-nebula";
                                            readonly SEI_PACIFIC_1: "sei-pacific-1";
                                            readonly CHILIZ: "chiliz";
                                            readonly AVALANCHE: "avalanche";
                                            readonly XAI: "xai";
                                            readonly SHAPE: "shape";
                                            readonly RARI: "rari";
                                            readonly SCROLL: "scroll";
                                            readonly VICTION: "viction";
                                            readonly MODE: "mode";
                                            readonly SPACE: "space";
                                            readonly SONEIUM: "soneium";
                                            readonly ARBITRUM_SEPOLIA: "arbitrum-sepolia";
                                            readonly AVALANCHE_FUJI: "avalanche-fuji";
                                            readonly CURTIS: "curtis";
                                            readonly BARRET_TESTNET: "barret-testnet";
                                            readonly BASE_GOERLI: "base-goerli";
                                            readonly BASE_SEPOLIA: "base-sepolia";
                                            readonly BSC_TESTNET: "bsc-testnet";
                                            readonly CHILIZ_SPICY_TESTNET: "chiliz-spicy-testnet";
                                            readonly ETHEREUM_GOERLI: "ethereum-goerli";
                                            readonly ETHEREUM_SEPOLIA: "ethereum-sepolia";
                                            readonly HYPERSONIC_TESTNET: "hypersonic-testnet";
                                            readonly LIGHTLINK_PEGASUS: "lightlink-pegasus";
                                            readonly OPTIMISM_GOERLI: "optimism-goerli";
                                            readonly OPTIMISM_SEPOLIA: "optimism-sepolia";
                                            readonly POLYGON_AMOY: "polygon-amoy";
                                            readonly POLYGON_MUMBAI: "polygon-mumbai";
                                            readonly PRIVATE_TESTNET_ETHEREUM: "crossmint-private-testnet-ethereum";
                                            readonly PRIVATE_TESTNET_POLYGON: "crossmint-private-testnet-polygon";
                                            readonly RARI_TESTNET: "rari-testnet";
                                            readonly SCROLL_SEPOLIA: "scroll-sepolia";
                                            readonly SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet";
                                            readonly SHAPE_SEPOLIA: "shape-sepolia";
                                            readonly SKALE_NEBULA_TESTNET: "skale-nebula-testnet";
                                            readonly SONEIUM_MINATO_TESTNET: "soneium-minato-testnet";
                                            readonly SPACE_TESTNET: "space-testnet";
                                            readonly STORY_TESTNET: "story-testnet";
                                            readonly VERIFY_TESTNET: "verify-testnet";
                                            readonly VICTION_TESTNET: "viction-testnet";
                                            readonly XAI_SEPOLIA_TESTNET: "xai-sepolia-testnet";
                                            readonly ZKATANA: "zkatana";
                                            readonly ZKYOTO: "zkyoto";
                                            readonly ZORA_GOERLI: "zora-goerli";
                                            readonly ZORA_SEPOLIA: "zora-sepolia";
                                            readonly MODE_SEPOLIA: "mode-sepolia";
                                            readonly SOLANA: "solana";
                                            readonly CARDANO: "cardano";
                                            readonly SUI: "sui";
                                            readonly APTOS: "aptos";
                                        }>
                                    >;
                                    payerAddress: z.ZodOptional<z.ZodString>;
                                    serializedTransaction: z.ZodOptional<z.ZodString>;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    chain?:
                                        | "ethereum"
                                        | "polygon"
                                        | "bsc"
                                        | "optimism"
                                        | "arbitrum"
                                        | "base"
                                        | "zora"
                                        | "arbitrumnova"
                                        | "astar-zkevm"
                                        | "apechain"
                                        | "apex"
                                        | "boss"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "chiliz"
                                        | "avalanche"
                                        | "xai"
                                        | "shape"
                                        | "rari"
                                        | "scroll"
                                        | "viction"
                                        | "mode"
                                        | "space"
                                        | "soneium"
                                        | "arbitrum-sepolia"
                                        | "avalanche-fuji"
                                        | "curtis"
                                        | "barret-testnet"
                                        | "base-goerli"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "chiliz-spicy-testnet"
                                        | "ethereum-goerli"
                                        | "ethereum-sepolia"
                                        | "hypersonic-testnet"
                                        | "lightlink-pegasus"
                                        | "optimism-goerli"
                                        | "optimism-sepolia"
                                        | "polygon-amoy"
                                        | "polygon-mumbai"
                                        | "crossmint-private-testnet-ethereum"
                                        | "crossmint-private-testnet-polygon"
                                        | "rari-testnet"
                                        | "scroll-sepolia"
                                        | "sei-atlantic-2-testnet"
                                        | "shape-sepolia"
                                        | "skale-nebula-testnet"
                                        | "soneium-minato-testnet"
                                        | "space-testnet"
                                        | "story-testnet"
                                        | "verify-testnet"
                                        | "viction-testnet"
                                        | "xai-sepolia-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "zora-goerli"
                                        | "zora-sepolia"
                                        | "mode-sepolia"
                                        | "solana"
                                        | "cardano"
                                        | "sui"
                                        | "aptos"
                                        | undefined;
                                    payerAddress?: string | undefined;
                                    serializedTransaction?: string | undefined;
                                },
                                {
                                    chain?:
                                        | "ethereum"
                                        | "polygon"
                                        | "bsc"
                                        | "optimism"
                                        | "arbitrum"
                                        | "base"
                                        | "zora"
                                        | "arbitrumnova"
                                        | "astar-zkevm"
                                        | "apechain"
                                        | "apex"
                                        | "boss"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "chiliz"
                                        | "avalanche"
                                        | "xai"
                                        | "shape"
                                        | "rari"
                                        | "scroll"
                                        | "viction"
                                        | "mode"
                                        | "space"
                                        | "soneium"
                                        | "arbitrum-sepolia"
                                        | "avalanche-fuji"
                                        | "curtis"
                                        | "barret-testnet"
                                        | "base-goerli"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "chiliz-spicy-testnet"
                                        | "ethereum-goerli"
                                        | "ethereum-sepolia"
                                        | "hypersonic-testnet"
                                        | "lightlink-pegasus"
                                        | "optimism-goerli"
                                        | "optimism-sepolia"
                                        | "polygon-amoy"
                                        | "polygon-mumbai"
                                        | "crossmint-private-testnet-ethereum"
                                        | "crossmint-private-testnet-polygon"
                                        | "rari-testnet"
                                        | "scroll-sepolia"
                                        | "sei-atlantic-2-testnet"
                                        | "shape-sepolia"
                                        | "skale-nebula-testnet"
                                        | "soneium-minato-testnet"
                                        | "space-testnet"
                                        | "story-testnet"
                                        | "verify-testnet"
                                        | "viction-testnet"
                                        | "xai-sepolia-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "zora-goerli"
                                        | "zora-sepolia"
                                        | "mode-sepolia"
                                        | "solana"
                                        | "cardano"
                                        | "sui"
                                        | "aptos"
                                        | undefined;
                                    payerAddress?: string | undefined;
                                    serializedTransaction?: string | undefined;
                                }
                            >,
                            z.ZodObject<
                                {
                                    stripeClientSecret: z.ZodOptional<z.ZodString>;
                                    stripePublishableKey: z.ZodString;
                                    stripeEphemeralKeySecret: z.ZodOptional<z.ZodString>;
                                    stripeSubscriptionId: z.ZodOptional<z.ZodString>;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    stripePublishableKey: string;
                                    stripeClientSecret?: string | undefined;
                                    stripeEphemeralKeySecret?: string | undefined;
                                    stripeSubscriptionId?: string | undefined;
                                },
                                {
                                    stripePublishableKey: string;
                                    stripeClientSecret?: string | undefined;
                                    stripeEphemeralKeySecret?: string | undefined;
                                    stripeSubscriptionId?: string | undefined;
                                }
                            >,
                        ]
                    >
                >;
                received: z.ZodOptional<
                    z.ZodUnion<
                        [
                            z.ZodObject<
                                {
                                    currency: z.ZodUnion<
                                        [
                                            z.ZodNativeEnum<{
                                                readonly ETH: "eth";
                                                readonly SOL: "sol";
                                                readonly MATIC: "matic";
                                                readonly USDC: "usdc";
                                                readonly USDXM: "usdxm";
                                                readonly DEGEN: "degen";
                                                readonly BRETT: "brett";
                                                readonly TOSHI: "toshi";
                                                readonly BONK: "bonk";
                                                readonly WIF: "wif";
                                                readonly MOTHER: "mother";
                                                readonly EURC: "eurc";
                                                readonly SUPERVERSE: "superverse";
                                            }>,
                                            z.ZodNativeEnum<{
                                                readonly USD: "usd";
                                                readonly EUR: "eur";
                                                readonly AUD: "aud";
                                                readonly GBP: "gbp";
                                                readonly JPY: "jpy";
                                                readonly SGD: "sgd";
                                                readonly HKD: "hkd";
                                                readonly KRW: "krw";
                                                readonly INR: "inr";
                                                readonly VND: "vnd";
                                            }>,
                                        ]
                                    >;
                                    amount: z.ZodString;
                                    txId: z.ZodString;
                                    chain: z.ZodNativeEnum<{
                                        readonly ETHEREUM: "ethereum";
                                        readonly POLYGON: "polygon";
                                        readonly BSC: "bsc";
                                        readonly OPTIMISM: "optimism";
                                        readonly ARBITRUM: "arbitrum";
                                        readonly BASE: "base";
                                        readonly ZORA: "zora";
                                        readonly ARBITRUM_NOVA: "arbitrumnova";
                                        readonly ASTAR_ZKEVM: "astar-zkevm";
                                        readonly APECHAIN: "apechain";
                                        readonly APEX: "apex";
                                        readonly BOSS: "boss";
                                        readonly LIGHTLINK: "lightlink";
                                        readonly SKALE_NEBULA: "skale-nebula";
                                        readonly SEI_PACIFIC_1: "sei-pacific-1";
                                        readonly CHILIZ: "chiliz";
                                        readonly AVALANCHE: "avalanche";
                                        readonly XAI: "xai";
                                        readonly SHAPE: "shape";
                                        readonly RARI: "rari";
                                        readonly SCROLL: "scroll";
                                        readonly VICTION: "viction";
                                        readonly MODE: "mode";
                                        readonly SPACE: "space";
                                        readonly SONEIUM: "soneium";
                                        readonly ARBITRUM_SEPOLIA: "arbitrum-sepolia";
                                        readonly AVALANCHE_FUJI: "avalanche-fuji";
                                        readonly CURTIS: "curtis";
                                        readonly BARRET_TESTNET: "barret-testnet";
                                        readonly BASE_GOERLI: "base-goerli";
                                        readonly BASE_SEPOLIA: "base-sepolia";
                                        readonly BSC_TESTNET: "bsc-testnet";
                                        readonly CHILIZ_SPICY_TESTNET: "chiliz-spicy-testnet";
                                        readonly ETHEREUM_GOERLI: "ethereum-goerli";
                                        readonly ETHEREUM_SEPOLIA: "ethereum-sepolia";
                                        readonly HYPERSONIC_TESTNET: "hypersonic-testnet";
                                        readonly LIGHTLINK_PEGASUS: "lightlink-pegasus";
                                        readonly OPTIMISM_GOERLI: "optimism-goerli";
                                        readonly OPTIMISM_SEPOLIA: "optimism-sepolia";
                                        readonly POLYGON_AMOY: "polygon-amoy";
                                        readonly POLYGON_MUMBAI: "polygon-mumbai";
                                        readonly PRIVATE_TESTNET_ETHEREUM: "crossmint-private-testnet-ethereum";
                                        readonly PRIVATE_TESTNET_POLYGON: "crossmint-private-testnet-polygon";
                                        readonly RARI_TESTNET: "rari-testnet";
                                        readonly SCROLL_SEPOLIA: "scroll-sepolia";
                                        readonly SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet";
                                        readonly SHAPE_SEPOLIA: "shape-sepolia";
                                        readonly SKALE_NEBULA_TESTNET: "skale-nebula-testnet";
                                        readonly SONEIUM_MINATO_TESTNET: "soneium-minato-testnet";
                                        readonly SPACE_TESTNET: "space-testnet";
                                        readonly STORY_TESTNET: "story-testnet";
                                        readonly VERIFY_TESTNET: "verify-testnet";
                                        readonly VICTION_TESTNET: "viction-testnet";
                                        readonly XAI_SEPOLIA_TESTNET: "xai-sepolia-testnet";
                                        readonly ZKATANA: "zkatana";
                                        readonly ZKYOTO: "zkyoto";
                                        readonly ZORA_GOERLI: "zora-goerli";
                                        readonly ZORA_SEPOLIA: "zora-sepolia";
                                        readonly MODE_SEPOLIA: "mode-sepolia";
                                        readonly SOLANA: "solana";
                                        readonly CARDANO: "cardano";
                                        readonly SUI: "sui";
                                        readonly APTOS: "aptos";
                                    }>;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    currency:
                                        | "eth"
                                        | "matic"
                                        | "usdc"
                                        | "usdxm"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eurc"
                                        | "superverse"
                                        | "sol"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "usd"
                                        | "eur"
                                        | "aud"
                                        | "gbp"
                                        | "jpy"
                                        | "sgd"
                                        | "hkd"
                                        | "krw"
                                        | "inr"
                                        | "vnd";
                                    amount: string;
                                    txId: string;
                                    chain:
                                        | "ethereum"
                                        | "polygon"
                                        | "bsc"
                                        | "optimism"
                                        | "arbitrum"
                                        | "base"
                                        | "zora"
                                        | "arbitrumnova"
                                        | "astar-zkevm"
                                        | "apechain"
                                        | "apex"
                                        | "boss"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "chiliz"
                                        | "avalanche"
                                        | "xai"
                                        | "shape"
                                        | "rari"
                                        | "scroll"
                                        | "viction"
                                        | "mode"
                                        | "space"
                                        | "soneium"
                                        | "arbitrum-sepolia"
                                        | "avalanche-fuji"
                                        | "curtis"
                                        | "barret-testnet"
                                        | "base-goerli"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "chiliz-spicy-testnet"
                                        | "ethereum-goerli"
                                        | "ethereum-sepolia"
                                        | "hypersonic-testnet"
                                        | "lightlink-pegasus"
                                        | "optimism-goerli"
                                        | "optimism-sepolia"
                                        | "polygon-amoy"
                                        | "polygon-mumbai"
                                        | "crossmint-private-testnet-ethereum"
                                        | "crossmint-private-testnet-polygon"
                                        | "rari-testnet"
                                        | "scroll-sepolia"
                                        | "sei-atlantic-2-testnet"
                                        | "shape-sepolia"
                                        | "skale-nebula-testnet"
                                        | "soneium-minato-testnet"
                                        | "space-testnet"
                                        | "story-testnet"
                                        | "verify-testnet"
                                        | "viction-testnet"
                                        | "xai-sepolia-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "zora-goerli"
                                        | "zora-sepolia"
                                        | "mode-sepolia"
                                        | "solana"
                                        | "cardano"
                                        | "sui"
                                        | "aptos";
                                },
                                {
                                    currency:
                                        | "eth"
                                        | "matic"
                                        | "usdc"
                                        | "usdxm"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eurc"
                                        | "superverse"
                                        | "sol"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "usd"
                                        | "eur"
                                        | "aud"
                                        | "gbp"
                                        | "jpy"
                                        | "sgd"
                                        | "hkd"
                                        | "krw"
                                        | "inr"
                                        | "vnd";
                                    amount: string;
                                    txId: string;
                                    chain:
                                        | "ethereum"
                                        | "polygon"
                                        | "bsc"
                                        | "optimism"
                                        | "arbitrum"
                                        | "base"
                                        | "zora"
                                        | "arbitrumnova"
                                        | "astar-zkevm"
                                        | "apechain"
                                        | "apex"
                                        | "boss"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "chiliz"
                                        | "avalanche"
                                        | "xai"
                                        | "shape"
                                        | "rari"
                                        | "scroll"
                                        | "viction"
                                        | "mode"
                                        | "space"
                                        | "soneium"
                                        | "arbitrum-sepolia"
                                        | "avalanche-fuji"
                                        | "curtis"
                                        | "barret-testnet"
                                        | "base-goerli"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "chiliz-spicy-testnet"
                                        | "ethereum-goerli"
                                        | "ethereum-sepolia"
                                        | "hypersonic-testnet"
                                        | "lightlink-pegasus"
                                        | "optimism-goerli"
                                        | "optimism-sepolia"
                                        | "polygon-amoy"
                                        | "polygon-mumbai"
                                        | "crossmint-private-testnet-ethereum"
                                        | "crossmint-private-testnet-polygon"
                                        | "rari-testnet"
                                        | "scroll-sepolia"
                                        | "sei-atlantic-2-testnet"
                                        | "shape-sepolia"
                                        | "skale-nebula-testnet"
                                        | "soneium-minato-testnet"
                                        | "space-testnet"
                                        | "story-testnet"
                                        | "verify-testnet"
                                        | "viction-testnet"
                                        | "xai-sepolia-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "zora-goerli"
                                        | "zora-sepolia"
                                        | "mode-sepolia"
                                        | "solana"
                                        | "cardano"
                                        | "sui"
                                        | "aptos";
                                }
                            >,
                            z.ZodObject<
                                {
                                    amount: z.ZodString;
                                    currency: z.ZodUnion<
                                        [
                                            z.ZodNativeEnum<{
                                                readonly ETH: "eth";
                                                readonly SOL: "sol";
                                                readonly MATIC: "matic";
                                                readonly USDC: "usdc";
                                                readonly USDXM: "usdxm";
                                                readonly DEGEN: "degen";
                                                readonly BRETT: "brett";
                                                readonly TOSHI: "toshi";
                                                readonly BONK: "bonk";
                                                readonly WIF: "wif";
                                                readonly MOTHER: "mother";
                                                readonly EURC: "eurc";
                                                readonly SUPERVERSE: "superverse";
                                            }>,
                                            z.ZodNativeEnum<{
                                                readonly USD: "usd";
                                                readonly EUR: "eur";
                                                readonly AUD: "aud";
                                                readonly GBP: "gbp";
                                                readonly JPY: "jpy";
                                                readonly SGD: "sgd";
                                                readonly HKD: "hkd";
                                                readonly KRW: "krw";
                                                readonly INR: "inr";
                                                readonly VND: "vnd";
                                            }>,
                                        ]
                                    >;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    currency:
                                        | "eth"
                                        | "matic"
                                        | "usdc"
                                        | "usdxm"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eurc"
                                        | "superverse"
                                        | "sol"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "usd"
                                        | "eur"
                                        | "aud"
                                        | "gbp"
                                        | "jpy"
                                        | "sgd"
                                        | "hkd"
                                        | "krw"
                                        | "inr"
                                        | "vnd";
                                    amount: string;
                                },
                                {
                                    currency:
                                        | "eth"
                                        | "matic"
                                        | "usdc"
                                        | "usdxm"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eurc"
                                        | "superverse"
                                        | "sol"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "usd"
                                        | "eur"
                                        | "aud"
                                        | "gbp"
                                        | "jpy"
                                        | "sgd"
                                        | "hkd"
                                        | "krw"
                                        | "inr"
                                        | "vnd";
                                    amount: string;
                                }
                            >,
                        ]
                    >
                >;
                refunded: z.ZodOptional<
                    z.ZodUnion<
                        [
                            z.ZodObject<
                                {
                                    currency: z.ZodUnion<
                                        [
                                            z.ZodNativeEnum<{
                                                readonly ETH: "eth";
                                                readonly SOL: "sol";
                                                readonly MATIC: "matic";
                                                readonly USDC: "usdc";
                                                readonly USDXM: "usdxm";
                                                readonly DEGEN: "degen";
                                                readonly BRETT: "brett";
                                                readonly TOSHI: "toshi";
                                                readonly BONK: "bonk";
                                                readonly WIF: "wif";
                                                readonly MOTHER: "mother";
                                                readonly EURC: "eurc";
                                                readonly SUPERVERSE: "superverse";
                                            }>,
                                            z.ZodNativeEnum<{
                                                readonly USD: "usd";
                                                readonly EUR: "eur";
                                                readonly AUD: "aud";
                                                readonly GBP: "gbp";
                                                readonly JPY: "jpy";
                                                readonly SGD: "sgd";
                                                readonly HKD: "hkd";
                                                readonly KRW: "krw";
                                                readonly INR: "inr";
                                                readonly VND: "vnd";
                                            }>,
                                        ]
                                    >;
                                    amount: z.ZodString;
                                    txId: z.ZodString;
                                    chain: z.ZodNativeEnum<{
                                        readonly ETHEREUM: "ethereum";
                                        readonly POLYGON: "polygon";
                                        readonly BSC: "bsc";
                                        readonly OPTIMISM: "optimism";
                                        readonly ARBITRUM: "arbitrum";
                                        readonly BASE: "base";
                                        readonly ZORA: "zora";
                                        readonly ARBITRUM_NOVA: "arbitrumnova";
                                        readonly ASTAR_ZKEVM: "astar-zkevm";
                                        readonly APECHAIN: "apechain";
                                        readonly APEX: "apex";
                                        readonly BOSS: "boss";
                                        readonly LIGHTLINK: "lightlink";
                                        readonly SKALE_NEBULA: "skale-nebula";
                                        readonly SEI_PACIFIC_1: "sei-pacific-1";
                                        readonly CHILIZ: "chiliz";
                                        readonly AVALANCHE: "avalanche";
                                        readonly XAI: "xai";
                                        readonly SHAPE: "shape";
                                        readonly RARI: "rari";
                                        readonly SCROLL: "scroll";
                                        readonly VICTION: "viction";
                                        readonly MODE: "mode";
                                        readonly SPACE: "space";
                                        readonly SONEIUM: "soneium";
                                        readonly ARBITRUM_SEPOLIA: "arbitrum-sepolia";
                                        readonly AVALANCHE_FUJI: "avalanche-fuji";
                                        readonly CURTIS: "curtis";
                                        readonly BARRET_TESTNET: "barret-testnet";
                                        readonly BASE_GOERLI: "base-goerli";
                                        readonly BASE_SEPOLIA: "base-sepolia";
                                        readonly BSC_TESTNET: "bsc-testnet";
                                        readonly CHILIZ_SPICY_TESTNET: "chiliz-spicy-testnet";
                                        readonly ETHEREUM_GOERLI: "ethereum-goerli";
                                        readonly ETHEREUM_SEPOLIA: "ethereum-sepolia";
                                        readonly HYPERSONIC_TESTNET: "hypersonic-testnet";
                                        readonly LIGHTLINK_PEGASUS: "lightlink-pegasus";
                                        readonly OPTIMISM_GOERLI: "optimism-goerli";
                                        readonly OPTIMISM_SEPOLIA: "optimism-sepolia";
                                        readonly POLYGON_AMOY: "polygon-amoy";
                                        readonly POLYGON_MUMBAI: "polygon-mumbai";
                                        readonly PRIVATE_TESTNET_ETHEREUM: "crossmint-private-testnet-ethereum";
                                        readonly PRIVATE_TESTNET_POLYGON: "crossmint-private-testnet-polygon";
                                        readonly RARI_TESTNET: "rari-testnet";
                                        readonly SCROLL_SEPOLIA: "scroll-sepolia";
                                        readonly SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet";
                                        readonly SHAPE_SEPOLIA: "shape-sepolia";
                                        readonly SKALE_NEBULA_TESTNET: "skale-nebula-testnet";
                                        readonly SONEIUM_MINATO_TESTNET: "soneium-minato-testnet";
                                        readonly SPACE_TESTNET: "space-testnet";
                                        readonly STORY_TESTNET: "story-testnet";
                                        readonly VERIFY_TESTNET: "verify-testnet";
                                        readonly VICTION_TESTNET: "viction-testnet";
                                        readonly XAI_SEPOLIA_TESTNET: "xai-sepolia-testnet";
                                        readonly ZKATANA: "zkatana";
                                        readonly ZKYOTO: "zkyoto";
                                        readonly ZORA_GOERLI: "zora-goerli";
                                        readonly ZORA_SEPOLIA: "zora-sepolia";
                                        readonly MODE_SEPOLIA: "mode-sepolia";
                                        readonly SOLANA: "solana";
                                        readonly CARDANO: "cardano";
                                        readonly SUI: "sui";
                                        readonly APTOS: "aptos";
                                    }>;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    currency:
                                        | "eth"
                                        | "matic"
                                        | "usdc"
                                        | "usdxm"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eurc"
                                        | "superverse"
                                        | "sol"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "usd"
                                        | "eur"
                                        | "aud"
                                        | "gbp"
                                        | "jpy"
                                        | "sgd"
                                        | "hkd"
                                        | "krw"
                                        | "inr"
                                        | "vnd";
                                    amount: string;
                                    txId: string;
                                    chain:
                                        | "ethereum"
                                        | "polygon"
                                        | "bsc"
                                        | "optimism"
                                        | "arbitrum"
                                        | "base"
                                        | "zora"
                                        | "arbitrumnova"
                                        | "astar-zkevm"
                                        | "apechain"
                                        | "apex"
                                        | "boss"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "chiliz"
                                        | "avalanche"
                                        | "xai"
                                        | "shape"
                                        | "rari"
                                        | "scroll"
                                        | "viction"
                                        | "mode"
                                        | "space"
                                        | "soneium"
                                        | "arbitrum-sepolia"
                                        | "avalanche-fuji"
                                        | "curtis"
                                        | "barret-testnet"
                                        | "base-goerli"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "chiliz-spicy-testnet"
                                        | "ethereum-goerli"
                                        | "ethereum-sepolia"
                                        | "hypersonic-testnet"
                                        | "lightlink-pegasus"
                                        | "optimism-goerli"
                                        | "optimism-sepolia"
                                        | "polygon-amoy"
                                        | "polygon-mumbai"
                                        | "crossmint-private-testnet-ethereum"
                                        | "crossmint-private-testnet-polygon"
                                        | "rari-testnet"
                                        | "scroll-sepolia"
                                        | "sei-atlantic-2-testnet"
                                        | "shape-sepolia"
                                        | "skale-nebula-testnet"
                                        | "soneium-minato-testnet"
                                        | "space-testnet"
                                        | "story-testnet"
                                        | "verify-testnet"
                                        | "viction-testnet"
                                        | "xai-sepolia-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "zora-goerli"
                                        | "zora-sepolia"
                                        | "mode-sepolia"
                                        | "solana"
                                        | "cardano"
                                        | "sui"
                                        | "aptos";
                                },
                                {
                                    currency:
                                        | "eth"
                                        | "matic"
                                        | "usdc"
                                        | "usdxm"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eurc"
                                        | "superverse"
                                        | "sol"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "usd"
                                        | "eur"
                                        | "aud"
                                        | "gbp"
                                        | "jpy"
                                        | "sgd"
                                        | "hkd"
                                        | "krw"
                                        | "inr"
                                        | "vnd";
                                    amount: string;
                                    txId: string;
                                    chain:
                                        | "ethereum"
                                        | "polygon"
                                        | "bsc"
                                        | "optimism"
                                        | "arbitrum"
                                        | "base"
                                        | "zora"
                                        | "arbitrumnova"
                                        | "astar-zkevm"
                                        | "apechain"
                                        | "apex"
                                        | "boss"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "chiliz"
                                        | "avalanche"
                                        | "xai"
                                        | "shape"
                                        | "rari"
                                        | "scroll"
                                        | "viction"
                                        | "mode"
                                        | "space"
                                        | "soneium"
                                        | "arbitrum-sepolia"
                                        | "avalanche-fuji"
                                        | "curtis"
                                        | "barret-testnet"
                                        | "base-goerli"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "chiliz-spicy-testnet"
                                        | "ethereum-goerli"
                                        | "ethereum-sepolia"
                                        | "hypersonic-testnet"
                                        | "lightlink-pegasus"
                                        | "optimism-goerli"
                                        | "optimism-sepolia"
                                        | "polygon-amoy"
                                        | "polygon-mumbai"
                                        | "crossmint-private-testnet-ethereum"
                                        | "crossmint-private-testnet-polygon"
                                        | "rari-testnet"
                                        | "scroll-sepolia"
                                        | "sei-atlantic-2-testnet"
                                        | "shape-sepolia"
                                        | "skale-nebula-testnet"
                                        | "soneium-minato-testnet"
                                        | "space-testnet"
                                        | "story-testnet"
                                        | "verify-testnet"
                                        | "viction-testnet"
                                        | "xai-sepolia-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "zora-goerli"
                                        | "zora-sepolia"
                                        | "mode-sepolia"
                                        | "solana"
                                        | "cardano"
                                        | "sui"
                                        | "aptos";
                                }
                            >,
                            z.ZodObject<
                                {
                                    amount: z.ZodString;
                                    currency: z.ZodUnion<
                                        [
                                            z.ZodNativeEnum<{
                                                readonly ETH: "eth";
                                                readonly SOL: "sol";
                                                readonly MATIC: "matic";
                                                readonly USDC: "usdc";
                                                readonly USDXM: "usdxm";
                                                readonly DEGEN: "degen";
                                                readonly BRETT: "brett";
                                                readonly TOSHI: "toshi";
                                                readonly BONK: "bonk";
                                                readonly WIF: "wif";
                                                readonly MOTHER: "mother";
                                                readonly EURC: "eurc";
                                                readonly SUPERVERSE: "superverse";
                                            }>,
                                            z.ZodNativeEnum<{
                                                readonly USD: "usd";
                                                readonly EUR: "eur";
                                                readonly AUD: "aud";
                                                readonly GBP: "gbp";
                                                readonly JPY: "jpy";
                                                readonly SGD: "sgd";
                                                readonly HKD: "hkd";
                                                readonly KRW: "krw";
                                                readonly INR: "inr";
                                                readonly VND: "vnd";
                                            }>,
                                        ]
                                    >;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    currency:
                                        | "eth"
                                        | "matic"
                                        | "usdc"
                                        | "usdxm"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eurc"
                                        | "superverse"
                                        | "sol"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "usd"
                                        | "eur"
                                        | "aud"
                                        | "gbp"
                                        | "jpy"
                                        | "sgd"
                                        | "hkd"
                                        | "krw"
                                        | "inr"
                                        | "vnd";
                                    amount: string;
                                },
                                {
                                    currency:
                                        | "eth"
                                        | "matic"
                                        | "usdc"
                                        | "usdxm"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eurc"
                                        | "superverse"
                                        | "sol"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "usd"
                                        | "eur"
                                        | "aud"
                                        | "gbp"
                                        | "jpy"
                                        | "sgd"
                                        | "hkd"
                                        | "krw"
                                        | "inr"
                                        | "vnd";
                                    amount: string;
                                }
                            >,
                        ]
                    >
                >;
                receiptEmail: z.ZodOptional<z.ZodString>;
            },
            "strip",
            z.ZodTypeAny,
            {
                status:
                    | "completed"
                    | "awaiting-payment"
                    | "in-progress"
                    | "requires-quote"
                    | "requires-crypto-payer-address"
                    | "requires-email"
                    | "crypto-payer-insufficient-funds";
                method:
                    | "ethereum"
                    | "polygon"
                    | "bsc"
                    | "optimism"
                    | "arbitrum"
                    | "base"
                    | "zora"
                    | "arbitrumnova"
                    | "astar-zkevm"
                    | "apechain"
                    | "apex"
                    | "boss"
                    | "lightlink"
                    | "skale-nebula"
                    | "sei-pacific-1"
                    | "chiliz"
                    | "avalanche"
                    | "xai"
                    | "shape"
                    | "rari"
                    | "scroll"
                    | "viction"
                    | "mode"
                    | "space"
                    | "soneium"
                    | "arbitrum-sepolia"
                    | "avalanche-fuji"
                    | "curtis"
                    | "barret-testnet"
                    | "base-goerli"
                    | "base-sepolia"
                    | "bsc-testnet"
                    | "chiliz-spicy-testnet"
                    | "ethereum-goerli"
                    | "ethereum-sepolia"
                    | "hypersonic-testnet"
                    | "lightlink-pegasus"
                    | "optimism-goerli"
                    | "optimism-sepolia"
                    | "polygon-amoy"
                    | "polygon-mumbai"
                    | "crossmint-private-testnet-ethereum"
                    | "crossmint-private-testnet-polygon"
                    | "rari-testnet"
                    | "scroll-sepolia"
                    | "sei-atlantic-2-testnet"
                    | "shape-sepolia"
                    | "skale-nebula-testnet"
                    | "soneium-minato-testnet"
                    | "space-testnet"
                    | "story-testnet"
                    | "verify-testnet"
                    | "viction-testnet"
                    | "xai-sepolia-testnet"
                    | "zkatana"
                    | "zkyoto"
                    | "zora-goerli"
                    | "zora-sepolia"
                    | "mode-sepolia"
                    | "solana"
                    | "stripe-payment-element";
                currency:
                    | "eth"
                    | "matic"
                    | "usdc"
                    | "usdxm"
                    | "degen"
                    | "brett"
                    | "toshi"
                    | "eurc"
                    | "superverse"
                    | "sol"
                    | "bonk"
                    | "wif"
                    | "mother"
                    | "usd"
                    | "eur"
                    | "aud"
                    | "gbp"
                    | "jpy"
                    | "sgd"
                    | "hkd"
                    | "krw"
                    | "inr"
                    | "vnd";
                failureReason?:
                    | {
                          code: string;
                          message?: string | undefined;
                      }
                    | {
                          code: "unknown" | "tx-id-not-found" | "insufficient-funds";
                          message?: string | undefined;
                      }
                    | undefined;
                preparation?:
                    | {
                          chain?:
                              | "ethereum"
                              | "polygon"
                              | "bsc"
                              | "optimism"
                              | "arbitrum"
                              | "base"
                              | "zora"
                              | "arbitrumnova"
                              | "astar-zkevm"
                              | "apechain"
                              | "apex"
                              | "boss"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "chiliz"
                              | "avalanche"
                              | "xai"
                              | "shape"
                              | "rari"
                              | "scroll"
                              | "viction"
                              | "mode"
                              | "space"
                              | "soneium"
                              | "arbitrum-sepolia"
                              | "avalanche-fuji"
                              | "curtis"
                              | "barret-testnet"
                              | "base-goerli"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "chiliz-spicy-testnet"
                              | "ethereum-goerli"
                              | "ethereum-sepolia"
                              | "hypersonic-testnet"
                              | "lightlink-pegasus"
                              | "optimism-goerli"
                              | "optimism-sepolia"
                              | "polygon-amoy"
                              | "polygon-mumbai"
                              | "crossmint-private-testnet-ethereum"
                              | "crossmint-private-testnet-polygon"
                              | "rari-testnet"
                              | "scroll-sepolia"
                              | "sei-atlantic-2-testnet"
                              | "shape-sepolia"
                              | "skale-nebula-testnet"
                              | "soneium-minato-testnet"
                              | "space-testnet"
                              | "story-testnet"
                              | "verify-testnet"
                              | "viction-testnet"
                              | "xai-sepolia-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "zora-goerli"
                              | "zora-sepolia"
                              | "mode-sepolia"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos"
                              | undefined;
                          payerAddress?: string | undefined;
                          serializedTransaction?: string | undefined;
                      }
                    | {
                          stripePublishableKey: string;
                          stripeClientSecret?: string | undefined;
                          stripeEphemeralKeySecret?: string | undefined;
                          stripeSubscriptionId?: string | undefined;
                      }
                    | undefined;
                received?:
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                      }
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                          txId: string;
                          chain:
                              | "ethereum"
                              | "polygon"
                              | "bsc"
                              | "optimism"
                              | "arbitrum"
                              | "base"
                              | "zora"
                              | "arbitrumnova"
                              | "astar-zkevm"
                              | "apechain"
                              | "apex"
                              | "boss"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "chiliz"
                              | "avalanche"
                              | "xai"
                              | "shape"
                              | "rari"
                              | "scroll"
                              | "viction"
                              | "mode"
                              | "space"
                              | "soneium"
                              | "arbitrum-sepolia"
                              | "avalanche-fuji"
                              | "curtis"
                              | "barret-testnet"
                              | "base-goerli"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "chiliz-spicy-testnet"
                              | "ethereum-goerli"
                              | "ethereum-sepolia"
                              | "hypersonic-testnet"
                              | "lightlink-pegasus"
                              | "optimism-goerli"
                              | "optimism-sepolia"
                              | "polygon-amoy"
                              | "polygon-mumbai"
                              | "crossmint-private-testnet-ethereum"
                              | "crossmint-private-testnet-polygon"
                              | "rari-testnet"
                              | "scroll-sepolia"
                              | "sei-atlantic-2-testnet"
                              | "shape-sepolia"
                              | "skale-nebula-testnet"
                              | "soneium-minato-testnet"
                              | "space-testnet"
                              | "story-testnet"
                              | "verify-testnet"
                              | "viction-testnet"
                              | "xai-sepolia-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "zora-goerli"
                              | "zora-sepolia"
                              | "mode-sepolia"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos";
                      }
                    | undefined;
                refunded?:
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                      }
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                          txId: string;
                          chain:
                              | "ethereum"
                              | "polygon"
                              | "bsc"
                              | "optimism"
                              | "arbitrum"
                              | "base"
                              | "zora"
                              | "arbitrumnova"
                              | "astar-zkevm"
                              | "apechain"
                              | "apex"
                              | "boss"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "chiliz"
                              | "avalanche"
                              | "xai"
                              | "shape"
                              | "rari"
                              | "scroll"
                              | "viction"
                              | "mode"
                              | "space"
                              | "soneium"
                              | "arbitrum-sepolia"
                              | "avalanche-fuji"
                              | "curtis"
                              | "barret-testnet"
                              | "base-goerli"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "chiliz-spicy-testnet"
                              | "ethereum-goerli"
                              | "ethereum-sepolia"
                              | "hypersonic-testnet"
                              | "lightlink-pegasus"
                              | "optimism-goerli"
                              | "optimism-sepolia"
                              | "polygon-amoy"
                              | "polygon-mumbai"
                              | "crossmint-private-testnet-ethereum"
                              | "crossmint-private-testnet-polygon"
                              | "rari-testnet"
                              | "scroll-sepolia"
                              | "sei-atlantic-2-testnet"
                              | "shape-sepolia"
                              | "skale-nebula-testnet"
                              | "soneium-minato-testnet"
                              | "space-testnet"
                              | "story-testnet"
                              | "verify-testnet"
                              | "viction-testnet"
                              | "xai-sepolia-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "zora-goerli"
                              | "zora-sepolia"
                              | "mode-sepolia"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos";
                      }
                    | undefined;
                receiptEmail?: string | undefined;
            },
            {
                status:
                    | "completed"
                    | "awaiting-payment"
                    | "in-progress"
                    | "requires-quote"
                    | "requires-crypto-payer-address"
                    | "requires-email"
                    | "crypto-payer-insufficient-funds";
                method:
                    | "ethereum"
                    | "polygon"
                    | "bsc"
                    | "optimism"
                    | "arbitrum"
                    | "base"
                    | "zora"
                    | "arbitrumnova"
                    | "astar-zkevm"
                    | "apechain"
                    | "apex"
                    | "boss"
                    | "lightlink"
                    | "skale-nebula"
                    | "sei-pacific-1"
                    | "chiliz"
                    | "avalanche"
                    | "xai"
                    | "shape"
                    | "rari"
                    | "scroll"
                    | "viction"
                    | "mode"
                    | "space"
                    | "soneium"
                    | "arbitrum-sepolia"
                    | "avalanche-fuji"
                    | "curtis"
                    | "barret-testnet"
                    | "base-goerli"
                    | "base-sepolia"
                    | "bsc-testnet"
                    | "chiliz-spicy-testnet"
                    | "ethereum-goerli"
                    | "ethereum-sepolia"
                    | "hypersonic-testnet"
                    | "lightlink-pegasus"
                    | "optimism-goerli"
                    | "optimism-sepolia"
                    | "polygon-amoy"
                    | "polygon-mumbai"
                    | "crossmint-private-testnet-ethereum"
                    | "crossmint-private-testnet-polygon"
                    | "rari-testnet"
                    | "scroll-sepolia"
                    | "sei-atlantic-2-testnet"
                    | "shape-sepolia"
                    | "skale-nebula-testnet"
                    | "soneium-minato-testnet"
                    | "space-testnet"
                    | "story-testnet"
                    | "verify-testnet"
                    | "viction-testnet"
                    | "xai-sepolia-testnet"
                    | "zkatana"
                    | "zkyoto"
                    | "zora-goerli"
                    | "zora-sepolia"
                    | "mode-sepolia"
                    | "solana"
                    | "stripe-payment-element";
                currency:
                    | "eth"
                    | "matic"
                    | "usdc"
                    | "usdxm"
                    | "degen"
                    | "brett"
                    | "toshi"
                    | "eurc"
                    | "superverse"
                    | "sol"
                    | "bonk"
                    | "wif"
                    | "mother"
                    | "usd"
                    | "eur"
                    | "aud"
                    | "gbp"
                    | "jpy"
                    | "sgd"
                    | "hkd"
                    | "krw"
                    | "inr"
                    | "vnd";
                failureReason?:
                    | {
                          code: string;
                          message?: string | undefined;
                      }
                    | {
                          code: "unknown" | "tx-id-not-found" | "insufficient-funds";
                          message?: string | undefined;
                      }
                    | undefined;
                preparation?:
                    | {
                          chain?:
                              | "ethereum"
                              | "polygon"
                              | "bsc"
                              | "optimism"
                              | "arbitrum"
                              | "base"
                              | "zora"
                              | "arbitrumnova"
                              | "astar-zkevm"
                              | "apechain"
                              | "apex"
                              | "boss"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "chiliz"
                              | "avalanche"
                              | "xai"
                              | "shape"
                              | "rari"
                              | "scroll"
                              | "viction"
                              | "mode"
                              | "space"
                              | "soneium"
                              | "arbitrum-sepolia"
                              | "avalanche-fuji"
                              | "curtis"
                              | "barret-testnet"
                              | "base-goerli"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "chiliz-spicy-testnet"
                              | "ethereum-goerli"
                              | "ethereum-sepolia"
                              | "hypersonic-testnet"
                              | "lightlink-pegasus"
                              | "optimism-goerli"
                              | "optimism-sepolia"
                              | "polygon-amoy"
                              | "polygon-mumbai"
                              | "crossmint-private-testnet-ethereum"
                              | "crossmint-private-testnet-polygon"
                              | "rari-testnet"
                              | "scroll-sepolia"
                              | "sei-atlantic-2-testnet"
                              | "shape-sepolia"
                              | "skale-nebula-testnet"
                              | "soneium-minato-testnet"
                              | "space-testnet"
                              | "story-testnet"
                              | "verify-testnet"
                              | "viction-testnet"
                              | "xai-sepolia-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "zora-goerli"
                              | "zora-sepolia"
                              | "mode-sepolia"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos"
                              | undefined;
                          payerAddress?: string | undefined;
                          serializedTransaction?: string | undefined;
                      }
                    | {
                          stripePublishableKey: string;
                          stripeClientSecret?: string | undefined;
                          stripeEphemeralKeySecret?: string | undefined;
                          stripeSubscriptionId?: string | undefined;
                      }
                    | undefined;
                received?:
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                      }
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                          txId: string;
                          chain:
                              | "ethereum"
                              | "polygon"
                              | "bsc"
                              | "optimism"
                              | "arbitrum"
                              | "base"
                              | "zora"
                              | "arbitrumnova"
                              | "astar-zkevm"
                              | "apechain"
                              | "apex"
                              | "boss"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "chiliz"
                              | "avalanche"
                              | "xai"
                              | "shape"
                              | "rari"
                              | "scroll"
                              | "viction"
                              | "mode"
                              | "space"
                              | "soneium"
                              | "arbitrum-sepolia"
                              | "avalanche-fuji"
                              | "curtis"
                              | "barret-testnet"
                              | "base-goerli"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "chiliz-spicy-testnet"
                              | "ethereum-goerli"
                              | "ethereum-sepolia"
                              | "hypersonic-testnet"
                              | "lightlink-pegasus"
                              | "optimism-goerli"
                              | "optimism-sepolia"
                              | "polygon-amoy"
                              | "polygon-mumbai"
                              | "crossmint-private-testnet-ethereum"
                              | "crossmint-private-testnet-polygon"
                              | "rari-testnet"
                              | "scroll-sepolia"
                              | "sei-atlantic-2-testnet"
                              | "shape-sepolia"
                              | "skale-nebula-testnet"
                              | "soneium-minato-testnet"
                              | "space-testnet"
                              | "story-testnet"
                              | "verify-testnet"
                              | "viction-testnet"
                              | "xai-sepolia-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "zora-goerli"
                              | "zora-sepolia"
                              | "mode-sepolia"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos";
                      }
                    | undefined;
                refunded?:
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                      }
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                          txId: string;
                          chain:
                              | "ethereum"
                              | "polygon"
                              | "bsc"
                              | "optimism"
                              | "arbitrum"
                              | "base"
                              | "zora"
                              | "arbitrumnova"
                              | "astar-zkevm"
                              | "apechain"
                              | "apex"
                              | "boss"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "chiliz"
                              | "avalanche"
                              | "xai"
                              | "shape"
                              | "rari"
                              | "scroll"
                              | "viction"
                              | "mode"
                              | "space"
                              | "soneium"
                              | "arbitrum-sepolia"
                              | "avalanche-fuji"
                              | "curtis"
                              | "barret-testnet"
                              | "base-goerli"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "chiliz-spicy-testnet"
                              | "ethereum-goerli"
                              | "ethereum-sepolia"
                              | "hypersonic-testnet"
                              | "lightlink-pegasus"
                              | "optimism-goerli"
                              | "optimism-sepolia"
                              | "polygon-amoy"
                              | "polygon-mumbai"
                              | "crossmint-private-testnet-ethereum"
                              | "crossmint-private-testnet-polygon"
                              | "rari-testnet"
                              | "scroll-sepolia"
                              | "sei-atlantic-2-testnet"
                              | "shape-sepolia"
                              | "skale-nebula-testnet"
                              | "soneium-minato-testnet"
                              | "space-testnet"
                              | "story-testnet"
                              | "verify-testnet"
                              | "viction-testnet"
                              | "xai-sepolia-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "zora-goerli"
                              | "zora-sepolia"
                              | "mode-sepolia"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos";
                      }
                    | undefined;
                receiptEmail?: string | undefined;
            }
        >;
    },
    "strip",
    z.ZodTypeAny,
    {
        quote: {
            status:
                | "valid"
                | "expired"
                | "requires-recipient"
                | "requires-physical-address"
                | "all-line-items-unavailable";
            quotedAt?: string | undefined;
            expiresAt?: string | undefined;
            totalPrice?:
                | {
                      currency:
                          | "eth"
                          | "matic"
                          | "usdc"
                          | "usdxm"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eurc"
                          | "superverse"
                          | "sol"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "usd"
                          | "eur"
                          | "aud"
                          | "gbp"
                          | "jpy"
                          | "sgd"
                          | "hkd"
                          | "krw"
                          | "inr"
                          | "vnd";
                      amount: string;
                  }
                | undefined;
        };
        payment: {
            status:
                | "completed"
                | "awaiting-payment"
                | "in-progress"
                | "requires-quote"
                | "requires-crypto-payer-address"
                | "requires-email"
                | "crypto-payer-insufficient-funds";
            method:
                | "ethereum"
                | "polygon"
                | "bsc"
                | "optimism"
                | "arbitrum"
                | "base"
                | "zora"
                | "arbitrumnova"
                | "astar-zkevm"
                | "apechain"
                | "apex"
                | "boss"
                | "lightlink"
                | "skale-nebula"
                | "sei-pacific-1"
                | "chiliz"
                | "avalanche"
                | "xai"
                | "shape"
                | "rari"
                | "scroll"
                | "viction"
                | "mode"
                | "space"
                | "soneium"
                | "arbitrum-sepolia"
                | "avalanche-fuji"
                | "curtis"
                | "barret-testnet"
                | "base-goerli"
                | "base-sepolia"
                | "bsc-testnet"
                | "chiliz-spicy-testnet"
                | "ethereum-goerli"
                | "ethereum-sepolia"
                | "hypersonic-testnet"
                | "lightlink-pegasus"
                | "optimism-goerli"
                | "optimism-sepolia"
                | "polygon-amoy"
                | "polygon-mumbai"
                | "crossmint-private-testnet-ethereum"
                | "crossmint-private-testnet-polygon"
                | "rari-testnet"
                | "scroll-sepolia"
                | "sei-atlantic-2-testnet"
                | "shape-sepolia"
                | "skale-nebula-testnet"
                | "soneium-minato-testnet"
                | "space-testnet"
                | "story-testnet"
                | "verify-testnet"
                | "viction-testnet"
                | "xai-sepolia-testnet"
                | "zkatana"
                | "zkyoto"
                | "zora-goerli"
                | "zora-sepolia"
                | "mode-sepolia"
                | "solana"
                | "stripe-payment-element";
            currency:
                | "eth"
                | "matic"
                | "usdc"
                | "usdxm"
                | "degen"
                | "brett"
                | "toshi"
                | "eurc"
                | "superverse"
                | "sol"
                | "bonk"
                | "wif"
                | "mother"
                | "usd"
                | "eur"
                | "aud"
                | "gbp"
                | "jpy"
                | "sgd"
                | "hkd"
                | "krw"
                | "inr"
                | "vnd";
            failureReason?:
                | {
                      code: string;
                      message?: string | undefined;
                  }
                | {
                      code: "unknown" | "tx-id-not-found" | "insufficient-funds";
                      message?: string | undefined;
                  }
                | undefined;
            preparation?:
                | {
                      chain?:
                          | "ethereum"
                          | "polygon"
                          | "bsc"
                          | "optimism"
                          | "arbitrum"
                          | "base"
                          | "zora"
                          | "arbitrumnova"
                          | "astar-zkevm"
                          | "apechain"
                          | "apex"
                          | "boss"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "chiliz"
                          | "avalanche"
                          | "xai"
                          | "shape"
                          | "rari"
                          | "scroll"
                          | "viction"
                          | "mode"
                          | "space"
                          | "soneium"
                          | "arbitrum-sepolia"
                          | "avalanche-fuji"
                          | "curtis"
                          | "barret-testnet"
                          | "base-goerli"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "chiliz-spicy-testnet"
                          | "ethereum-goerli"
                          | "ethereum-sepolia"
                          | "hypersonic-testnet"
                          | "lightlink-pegasus"
                          | "optimism-goerli"
                          | "optimism-sepolia"
                          | "polygon-amoy"
                          | "polygon-mumbai"
                          | "crossmint-private-testnet-ethereum"
                          | "crossmint-private-testnet-polygon"
                          | "rari-testnet"
                          | "scroll-sepolia"
                          | "sei-atlantic-2-testnet"
                          | "shape-sepolia"
                          | "skale-nebula-testnet"
                          | "soneium-minato-testnet"
                          | "space-testnet"
                          | "story-testnet"
                          | "verify-testnet"
                          | "viction-testnet"
                          | "xai-sepolia-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "zora-goerli"
                          | "zora-sepolia"
                          | "mode-sepolia"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos"
                          | undefined;
                      payerAddress?: string | undefined;
                      serializedTransaction?: string | undefined;
                  }
                | {
                      stripePublishableKey: string;
                      stripeClientSecret?: string | undefined;
                      stripeEphemeralKeySecret?: string | undefined;
                      stripeSubscriptionId?: string | undefined;
                  }
                | undefined;
            received?:
                | {
                      currency:
                          | "eth"
                          | "matic"
                          | "usdc"
                          | "usdxm"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eurc"
                          | "superverse"
                          | "sol"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "usd"
                          | "eur"
                          | "aud"
                          | "gbp"
                          | "jpy"
                          | "sgd"
                          | "hkd"
                          | "krw"
                          | "inr"
                          | "vnd";
                      amount: string;
                  }
                | {
                      currency:
                          | "eth"
                          | "matic"
                          | "usdc"
                          | "usdxm"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eurc"
                          | "superverse"
                          | "sol"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "usd"
                          | "eur"
                          | "aud"
                          | "gbp"
                          | "jpy"
                          | "sgd"
                          | "hkd"
                          | "krw"
                          | "inr"
                          | "vnd";
                      amount: string;
                      txId: string;
                      chain:
                          | "ethereum"
                          | "polygon"
                          | "bsc"
                          | "optimism"
                          | "arbitrum"
                          | "base"
                          | "zora"
                          | "arbitrumnova"
                          | "astar-zkevm"
                          | "apechain"
                          | "apex"
                          | "boss"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "chiliz"
                          | "avalanche"
                          | "xai"
                          | "shape"
                          | "rari"
                          | "scroll"
                          | "viction"
                          | "mode"
                          | "space"
                          | "soneium"
                          | "arbitrum-sepolia"
                          | "avalanche-fuji"
                          | "curtis"
                          | "barret-testnet"
                          | "base-goerli"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "chiliz-spicy-testnet"
                          | "ethereum-goerli"
                          | "ethereum-sepolia"
                          | "hypersonic-testnet"
                          | "lightlink-pegasus"
                          | "optimism-goerli"
                          | "optimism-sepolia"
                          | "polygon-amoy"
                          | "polygon-mumbai"
                          | "crossmint-private-testnet-ethereum"
                          | "crossmint-private-testnet-polygon"
                          | "rari-testnet"
                          | "scroll-sepolia"
                          | "sei-atlantic-2-testnet"
                          | "shape-sepolia"
                          | "skale-nebula-testnet"
                          | "soneium-minato-testnet"
                          | "space-testnet"
                          | "story-testnet"
                          | "verify-testnet"
                          | "viction-testnet"
                          | "xai-sepolia-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "zora-goerli"
                          | "zora-sepolia"
                          | "mode-sepolia"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos";
                  }
                | undefined;
            refunded?:
                | {
                      currency:
                          | "eth"
                          | "matic"
                          | "usdc"
                          | "usdxm"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eurc"
                          | "superverse"
                          | "sol"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "usd"
                          | "eur"
                          | "aud"
                          | "gbp"
                          | "jpy"
                          | "sgd"
                          | "hkd"
                          | "krw"
                          | "inr"
                          | "vnd";
                      amount: string;
                  }
                | {
                      currency:
                          | "eth"
                          | "matic"
                          | "usdc"
                          | "usdxm"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eurc"
                          | "superverse"
                          | "sol"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "usd"
                          | "eur"
                          | "aud"
                          | "gbp"
                          | "jpy"
                          | "sgd"
                          | "hkd"
                          | "krw"
                          | "inr"
                          | "vnd";
                      amount: string;
                      txId: string;
                      chain:
                          | "ethereum"
                          | "polygon"
                          | "bsc"
                          | "optimism"
                          | "arbitrum"
                          | "base"
                          | "zora"
                          | "arbitrumnova"
                          | "astar-zkevm"
                          | "apechain"
                          | "apex"
                          | "boss"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "chiliz"
                          | "avalanche"
                          | "xai"
                          | "shape"
                          | "rari"
                          | "scroll"
                          | "viction"
                          | "mode"
                          | "space"
                          | "soneium"
                          | "arbitrum-sepolia"
                          | "avalanche-fuji"
                          | "curtis"
                          | "barret-testnet"
                          | "base-goerli"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "chiliz-spicy-testnet"
                          | "ethereum-goerli"
                          | "ethereum-sepolia"
                          | "hypersonic-testnet"
                          | "lightlink-pegasus"
                          | "optimism-goerli"
                          | "optimism-sepolia"
                          | "polygon-amoy"
                          | "polygon-mumbai"
                          | "crossmint-private-testnet-ethereum"
                          | "crossmint-private-testnet-polygon"
                          | "rari-testnet"
                          | "scroll-sepolia"
                          | "sei-atlantic-2-testnet"
                          | "shape-sepolia"
                          | "skale-nebula-testnet"
                          | "soneium-minato-testnet"
                          | "space-testnet"
                          | "story-testnet"
                          | "verify-testnet"
                          | "viction-testnet"
                          | "xai-sepolia-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "zora-goerli"
                          | "zora-sepolia"
                          | "mode-sepolia"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos";
                  }
                | undefined;
            receiptEmail?: string | undefined;
        };
        orderId: string;
        phase: "completed" | "quote" | "delivery" | "payment";
        locale:
            | "en-US"
            | "es-ES"
            | "fr-FR"
            | "it-IT"
            | "ko-KR"
            | "pt-PT"
            | "ja-JP"
            | "zh-CN"
            | "zh-TW"
            | "de-DE"
            | "ru-RU"
            | "tr-TR"
            | "uk-UA"
            | "th-TH"
            | "vi-VN"
            | "Klingon";
        lineItems: {
            chain:
                | "ethereum"
                | "polygon"
                | "bsc"
                | "optimism"
                | "arbitrum"
                | "base"
                | "zora"
                | "arbitrumnova"
                | "astar-zkevm"
                | "apechain"
                | "apex"
                | "boss"
                | "lightlink"
                | "skale-nebula"
                | "sei-pacific-1"
                | "chiliz"
                | "avalanche"
                | "xai"
                | "shape"
                | "rari"
                | "scroll"
                | "viction"
                | "mode"
                | "space"
                | "soneium"
                | "arbitrum-sepolia"
                | "avalanche-fuji"
                | "curtis"
                | "barret-testnet"
                | "base-goerli"
                | "base-sepolia"
                | "bsc-testnet"
                | "chiliz-spicy-testnet"
                | "ethereum-goerli"
                | "ethereum-sepolia"
                | "hypersonic-testnet"
                | "lightlink-pegasus"
                | "optimism-goerli"
                | "optimism-sepolia"
                | "polygon-amoy"
                | "polygon-mumbai"
                | "crossmint-private-testnet-ethereum"
                | "crossmint-private-testnet-polygon"
                | "rari-testnet"
                | "scroll-sepolia"
                | "sei-atlantic-2-testnet"
                | "shape-sepolia"
                | "skale-nebula-testnet"
                | "soneium-minato-testnet"
                | "space-testnet"
                | "story-testnet"
                | "verify-testnet"
                | "viction-testnet"
                | "xai-sepolia-testnet"
                | "zkatana"
                | "zkyoto"
                | "zora-goerli"
                | "zora-sepolia"
                | "mode-sepolia"
                | "solana"
                | "cardano"
                | "sui"
                | "aptos";
            quantity: number;
            metadata: {
                description: string;
                name: string;
                imageUrl: string;
                collection?:
                    | {
                          name?: string | undefined;
                          description?: string | undefined;
                          imageUrl?: string | undefined;
                      }
                    | undefined;
            };
            quote: {
                status: "valid" | "item-unavailable" | "expired" | "requires-recipient";
                unavailabilityReason?:
                    | {
                          code: "to" | "do";
                          message: string;
                      }
                    | undefined;
                charges?:
                    | {
                          unit: {
                              currency:
                                  | "eth"
                                  | "matic"
                                  | "usdc"
                                  | "usdxm"
                                  | "degen"
                                  | "brett"
                                  | "toshi"
                                  | "eurc"
                                  | "superverse"
                                  | "sol"
                                  | "bonk"
                                  | "wif"
                                  | "mother"
                                  | "usd"
                                  | "eur"
                                  | "aud"
                                  | "gbp"
                                  | "jpy"
                                  | "sgd"
                                  | "hkd"
                                  | "krw"
                                  | "inr"
                                  | "vnd";
                              amount: string;
                          };
                          gas?:
                              | {
                                    currency:
                                        | "eth"
                                        | "matic"
                                        | "usdc"
                                        | "usdxm"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eurc"
                                        | "superverse"
                                        | "sol"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "usd"
                                        | "eur"
                                        | "aud"
                                        | "gbp"
                                        | "jpy"
                                        | "sgd"
                                        | "hkd"
                                        | "krw"
                                        | "inr"
                                        | "vnd";
                                    amount: string;
                                }
                              | undefined;
                      }
                    | undefined;
                totalPrice?:
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                      }
                    | undefined;
            };
            delivery:
                | {
                      status: "completed";
                      txId: string;
                      tokens: (
                          | {
                                locator: string;
                                contractAddress: string;
                                tokenId: string;
                            }
                          | {
                                locator: string;
                                mintHash: string;
                            }
                      )[];
                      recipient?:
                          | {
                                walletAddress: string;
                                locator: string;
                                physicalAddress?:
                                    | {
                                          name: string;
                                          line1: string;
                                          city: string;
                                          postalCode: string;
                                          country: string;
                                          line2?: string | undefined;
                                          state?: string | undefined;
                                      }
                                    | undefined;
                            }
                          | {
                                email: string;
                                walletAddress: string;
                                locator: string;
                                physicalAddress?:
                                    | {
                                          name: string;
                                          line1: string;
                                          city: string;
                                          postalCode: string;
                                          country: string;
                                          line2?: string | undefined;
                                          state?: string | undefined;
                                      }
                                    | undefined;
                            }
                          | undefined;
                  }
                | {
                      status: "awaiting-payment" | "in-progress" | "failed";
                      recipient?:
                          | {
                                walletAddress: string;
                                locator: string;
                                physicalAddress?:
                                    | {
                                          name: string;
                                          line1: string;
                                          city: string;
                                          postalCode: string;
                                          country: string;
                                          line2?: string | undefined;
                                          state?: string | undefined;
                                      }
                                    | undefined;
                            }
                          | {
                                email: string;
                                walletAddress: string;
                                locator: string;
                                physicalAddress?:
                                    | {
                                          name: string;
                                          line1: string;
                                          city: string;
                                          postalCode: string;
                                          country: string;
                                          line2?: string | undefined;
                                          state?: string | undefined;
                                      }
                                    | undefined;
                            }
                          | undefined;
                  };
            slippageBps?: number | undefined;
            callData?: Record<string, any> | undefined;
        }[];
    },
    {
        quote: {
            status:
                | "valid"
                | "expired"
                | "requires-recipient"
                | "requires-physical-address"
                | "all-line-items-unavailable";
            quotedAt?: string | undefined;
            expiresAt?: string | undefined;
            totalPrice?:
                | {
                      currency:
                          | "eth"
                          | "matic"
                          | "usdc"
                          | "usdxm"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eurc"
                          | "superverse"
                          | "sol"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "usd"
                          | "eur"
                          | "aud"
                          | "gbp"
                          | "jpy"
                          | "sgd"
                          | "hkd"
                          | "krw"
                          | "inr"
                          | "vnd";
                      amount: string;
                  }
                | undefined;
        };
        payment: {
            status:
                | "completed"
                | "awaiting-payment"
                | "in-progress"
                | "requires-quote"
                | "requires-crypto-payer-address"
                | "requires-email"
                | "crypto-payer-insufficient-funds";
            method:
                | "ethereum"
                | "polygon"
                | "bsc"
                | "optimism"
                | "arbitrum"
                | "base"
                | "zora"
                | "arbitrumnova"
                | "astar-zkevm"
                | "apechain"
                | "apex"
                | "boss"
                | "lightlink"
                | "skale-nebula"
                | "sei-pacific-1"
                | "chiliz"
                | "avalanche"
                | "xai"
                | "shape"
                | "rari"
                | "scroll"
                | "viction"
                | "mode"
                | "space"
                | "soneium"
                | "arbitrum-sepolia"
                | "avalanche-fuji"
                | "curtis"
                | "barret-testnet"
                | "base-goerli"
                | "base-sepolia"
                | "bsc-testnet"
                | "chiliz-spicy-testnet"
                | "ethereum-goerli"
                | "ethereum-sepolia"
                | "hypersonic-testnet"
                | "lightlink-pegasus"
                | "optimism-goerli"
                | "optimism-sepolia"
                | "polygon-amoy"
                | "polygon-mumbai"
                | "crossmint-private-testnet-ethereum"
                | "crossmint-private-testnet-polygon"
                | "rari-testnet"
                | "scroll-sepolia"
                | "sei-atlantic-2-testnet"
                | "shape-sepolia"
                | "skale-nebula-testnet"
                | "soneium-minato-testnet"
                | "space-testnet"
                | "story-testnet"
                | "verify-testnet"
                | "viction-testnet"
                | "xai-sepolia-testnet"
                | "zkatana"
                | "zkyoto"
                | "zora-goerli"
                | "zora-sepolia"
                | "mode-sepolia"
                | "solana"
                | "stripe-payment-element";
            currency:
                | "eth"
                | "matic"
                | "usdc"
                | "usdxm"
                | "degen"
                | "brett"
                | "toshi"
                | "eurc"
                | "superverse"
                | "sol"
                | "bonk"
                | "wif"
                | "mother"
                | "usd"
                | "eur"
                | "aud"
                | "gbp"
                | "jpy"
                | "sgd"
                | "hkd"
                | "krw"
                | "inr"
                | "vnd";
            failureReason?:
                | {
                      code: string;
                      message?: string | undefined;
                  }
                | {
                      code: "unknown" | "tx-id-not-found" | "insufficient-funds";
                      message?: string | undefined;
                  }
                | undefined;
            preparation?:
                | {
                      chain?:
                          | "ethereum"
                          | "polygon"
                          | "bsc"
                          | "optimism"
                          | "arbitrum"
                          | "base"
                          | "zora"
                          | "arbitrumnova"
                          | "astar-zkevm"
                          | "apechain"
                          | "apex"
                          | "boss"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "chiliz"
                          | "avalanche"
                          | "xai"
                          | "shape"
                          | "rari"
                          | "scroll"
                          | "viction"
                          | "mode"
                          | "space"
                          | "soneium"
                          | "arbitrum-sepolia"
                          | "avalanche-fuji"
                          | "curtis"
                          | "barret-testnet"
                          | "base-goerli"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "chiliz-spicy-testnet"
                          | "ethereum-goerli"
                          | "ethereum-sepolia"
                          | "hypersonic-testnet"
                          | "lightlink-pegasus"
                          | "optimism-goerli"
                          | "optimism-sepolia"
                          | "polygon-amoy"
                          | "polygon-mumbai"
                          | "crossmint-private-testnet-ethereum"
                          | "crossmint-private-testnet-polygon"
                          | "rari-testnet"
                          | "scroll-sepolia"
                          | "sei-atlantic-2-testnet"
                          | "shape-sepolia"
                          | "skale-nebula-testnet"
                          | "soneium-minato-testnet"
                          | "space-testnet"
                          | "story-testnet"
                          | "verify-testnet"
                          | "viction-testnet"
                          | "xai-sepolia-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "zora-goerli"
                          | "zora-sepolia"
                          | "mode-sepolia"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos"
                          | undefined;
                      payerAddress?: string | undefined;
                      serializedTransaction?: string | undefined;
                  }
                | {
                      stripePublishableKey: string;
                      stripeClientSecret?: string | undefined;
                      stripeEphemeralKeySecret?: string | undefined;
                      stripeSubscriptionId?: string | undefined;
                  }
                | undefined;
            received?:
                | {
                      currency:
                          | "eth"
                          | "matic"
                          | "usdc"
                          | "usdxm"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eurc"
                          | "superverse"
                          | "sol"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "usd"
                          | "eur"
                          | "aud"
                          | "gbp"
                          | "jpy"
                          | "sgd"
                          | "hkd"
                          | "krw"
                          | "inr"
                          | "vnd";
                      amount: string;
                  }
                | {
                      currency:
                          | "eth"
                          | "matic"
                          | "usdc"
                          | "usdxm"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eurc"
                          | "superverse"
                          | "sol"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "usd"
                          | "eur"
                          | "aud"
                          | "gbp"
                          | "jpy"
                          | "sgd"
                          | "hkd"
                          | "krw"
                          | "inr"
                          | "vnd";
                      amount: string;
                      txId: string;
                      chain:
                          | "ethereum"
                          | "polygon"
                          | "bsc"
                          | "optimism"
                          | "arbitrum"
                          | "base"
                          | "zora"
                          | "arbitrumnova"
                          | "astar-zkevm"
                          | "apechain"
                          | "apex"
                          | "boss"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "chiliz"
                          | "avalanche"
                          | "xai"
                          | "shape"
                          | "rari"
                          | "scroll"
                          | "viction"
                          | "mode"
                          | "space"
                          | "soneium"
                          | "arbitrum-sepolia"
                          | "avalanche-fuji"
                          | "curtis"
                          | "barret-testnet"
                          | "base-goerli"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "chiliz-spicy-testnet"
                          | "ethereum-goerli"
                          | "ethereum-sepolia"
                          | "hypersonic-testnet"
                          | "lightlink-pegasus"
                          | "optimism-goerli"
                          | "optimism-sepolia"
                          | "polygon-amoy"
                          | "polygon-mumbai"
                          | "crossmint-private-testnet-ethereum"
                          | "crossmint-private-testnet-polygon"
                          | "rari-testnet"
                          | "scroll-sepolia"
                          | "sei-atlantic-2-testnet"
                          | "shape-sepolia"
                          | "skale-nebula-testnet"
                          | "soneium-minato-testnet"
                          | "space-testnet"
                          | "story-testnet"
                          | "verify-testnet"
                          | "viction-testnet"
                          | "xai-sepolia-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "zora-goerli"
                          | "zora-sepolia"
                          | "mode-sepolia"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos";
                  }
                | undefined;
            refunded?:
                | {
                      currency:
                          | "eth"
                          | "matic"
                          | "usdc"
                          | "usdxm"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eurc"
                          | "superverse"
                          | "sol"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "usd"
                          | "eur"
                          | "aud"
                          | "gbp"
                          | "jpy"
                          | "sgd"
                          | "hkd"
                          | "krw"
                          | "inr"
                          | "vnd";
                      amount: string;
                  }
                | {
                      currency:
                          | "eth"
                          | "matic"
                          | "usdc"
                          | "usdxm"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eurc"
                          | "superverse"
                          | "sol"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "usd"
                          | "eur"
                          | "aud"
                          | "gbp"
                          | "jpy"
                          | "sgd"
                          | "hkd"
                          | "krw"
                          | "inr"
                          | "vnd";
                      amount: string;
                      txId: string;
                      chain:
                          | "ethereum"
                          | "polygon"
                          | "bsc"
                          | "optimism"
                          | "arbitrum"
                          | "base"
                          | "zora"
                          | "arbitrumnova"
                          | "astar-zkevm"
                          | "apechain"
                          | "apex"
                          | "boss"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "chiliz"
                          | "avalanche"
                          | "xai"
                          | "shape"
                          | "rari"
                          | "scroll"
                          | "viction"
                          | "mode"
                          | "space"
                          | "soneium"
                          | "arbitrum-sepolia"
                          | "avalanche-fuji"
                          | "curtis"
                          | "barret-testnet"
                          | "base-goerli"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "chiliz-spicy-testnet"
                          | "ethereum-goerli"
                          | "ethereum-sepolia"
                          | "hypersonic-testnet"
                          | "lightlink-pegasus"
                          | "optimism-goerli"
                          | "optimism-sepolia"
                          | "polygon-amoy"
                          | "polygon-mumbai"
                          | "crossmint-private-testnet-ethereum"
                          | "crossmint-private-testnet-polygon"
                          | "rari-testnet"
                          | "scroll-sepolia"
                          | "sei-atlantic-2-testnet"
                          | "shape-sepolia"
                          | "skale-nebula-testnet"
                          | "soneium-minato-testnet"
                          | "space-testnet"
                          | "story-testnet"
                          | "verify-testnet"
                          | "viction-testnet"
                          | "xai-sepolia-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "zora-goerli"
                          | "zora-sepolia"
                          | "mode-sepolia"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos";
                  }
                | undefined;
            receiptEmail?: string | undefined;
        };
        orderId: string;
        phase: "completed" | "quote" | "delivery" | "payment";
        locale:
            | "en-US"
            | "es-ES"
            | "fr-FR"
            | "it-IT"
            | "ko-KR"
            | "pt-PT"
            | "ja-JP"
            | "zh-CN"
            | "zh-TW"
            | "de-DE"
            | "ru-RU"
            | "tr-TR"
            | "uk-UA"
            | "th-TH"
            | "vi-VN"
            | "Klingon";
        lineItems: {
            chain:
                | "ethereum"
                | "polygon"
                | "bsc"
                | "optimism"
                | "arbitrum"
                | "base"
                | "zora"
                | "arbitrumnova"
                | "astar-zkevm"
                | "apechain"
                | "apex"
                | "boss"
                | "lightlink"
                | "skale-nebula"
                | "sei-pacific-1"
                | "chiliz"
                | "avalanche"
                | "xai"
                | "shape"
                | "rari"
                | "scroll"
                | "viction"
                | "mode"
                | "space"
                | "soneium"
                | "arbitrum-sepolia"
                | "avalanche-fuji"
                | "curtis"
                | "barret-testnet"
                | "base-goerli"
                | "base-sepolia"
                | "bsc-testnet"
                | "chiliz-spicy-testnet"
                | "ethereum-goerli"
                | "ethereum-sepolia"
                | "hypersonic-testnet"
                | "lightlink-pegasus"
                | "optimism-goerli"
                | "optimism-sepolia"
                | "polygon-amoy"
                | "polygon-mumbai"
                | "crossmint-private-testnet-ethereum"
                | "crossmint-private-testnet-polygon"
                | "rari-testnet"
                | "scroll-sepolia"
                | "sei-atlantic-2-testnet"
                | "shape-sepolia"
                | "skale-nebula-testnet"
                | "soneium-minato-testnet"
                | "space-testnet"
                | "story-testnet"
                | "verify-testnet"
                | "viction-testnet"
                | "xai-sepolia-testnet"
                | "zkatana"
                | "zkyoto"
                | "zora-goerli"
                | "zora-sepolia"
                | "mode-sepolia"
                | "solana"
                | "cardano"
                | "sui"
                | "aptos";
            quantity: number;
            metadata: {
                description: string;
                name: string;
                imageUrl: string;
                collection?:
                    | {
                          name?: string | undefined;
                          description?: string | undefined;
                          imageUrl?: string | undefined;
                      }
                    | undefined;
            };
            quote: {
                status: "valid" | "item-unavailable" | "expired" | "requires-recipient";
                unavailabilityReason?:
                    | {
                          code: "to" | "do";
                          message: string;
                      }
                    | undefined;
                charges?:
                    | {
                          unit: {
                              currency:
                                  | "eth"
                                  | "matic"
                                  | "usdc"
                                  | "usdxm"
                                  | "degen"
                                  | "brett"
                                  | "toshi"
                                  | "eurc"
                                  | "superverse"
                                  | "sol"
                                  | "bonk"
                                  | "wif"
                                  | "mother"
                                  | "usd"
                                  | "eur"
                                  | "aud"
                                  | "gbp"
                                  | "jpy"
                                  | "sgd"
                                  | "hkd"
                                  | "krw"
                                  | "inr"
                                  | "vnd";
                              amount: string;
                          };
                          gas?:
                              | {
                                    currency:
                                        | "eth"
                                        | "matic"
                                        | "usdc"
                                        | "usdxm"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eurc"
                                        | "superverse"
                                        | "sol"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "usd"
                                        | "eur"
                                        | "aud"
                                        | "gbp"
                                        | "jpy"
                                        | "sgd"
                                        | "hkd"
                                        | "krw"
                                        | "inr"
                                        | "vnd";
                                    amount: string;
                                }
                              | undefined;
                      }
                    | undefined;
                totalPrice?:
                    | {
                          currency:
                              | "eth"
                              | "matic"
                              | "usdc"
                              | "usdxm"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eurc"
                              | "superverse"
                              | "sol"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "usd"
                              | "eur"
                              | "aud"
                              | "gbp"
                              | "jpy"
                              | "sgd"
                              | "hkd"
                              | "krw"
                              | "inr"
                              | "vnd";
                          amount: string;
                      }
                    | undefined;
            };
            delivery:
                | {
                      status: "completed";
                      txId: string;
                      tokens: (
                          | {
                                locator: string;
                                contractAddress: string;
                                tokenId: string;
                            }
                          | {
                                locator: string;
                                mintHash: string;
                            }
                      )[];
                      recipient?:
                          | {
                                walletAddress: string;
                                locator: string;
                                physicalAddress?:
                                    | {
                                          name: string;
                                          line1: string;
                                          city: string;
                                          postalCode: string;
                                          country: string;
                                          line2?: string | undefined;
                                          state?: string | undefined;
                                      }
                                    | undefined;
                            }
                          | {
                                email: string;
                                walletAddress: string;
                                locator: string;
                                physicalAddress?:
                                    | {
                                          name: string;
                                          line1: string;
                                          city: string;
                                          postalCode: string;
                                          country: string;
                                          line2?: string | undefined;
                                          state?: string | undefined;
                                      }
                                    | undefined;
                            }
                          | undefined;
                  }
                | {
                      status: "awaiting-payment" | "in-progress" | "failed";
                      recipient?:
                          | {
                                walletAddress: string;
                                locator: string;
                                physicalAddress?:
                                    | {
                                          name: string;
                                          line1: string;
                                          city: string;
                                          postalCode: string;
                                          country: string;
                                          line2?: string | undefined;
                                          state?: string | undefined;
                                      }
                                    | undefined;
                            }
                          | {
                                email: string;
                                walletAddress: string;
                                locator: string;
                                physicalAddress?:
                                    | {
                                          name: string;
                                          line1: string;
                                          city: string;
                                          postalCode: string;
                                          country: string;
                                          line2?: string | undefined;
                                          state?: string | undefined;
                                      }
                                    | undefined;
                            }
                          | undefined;
                  };
            slippageBps?: number | undefined;
            callData?: Record<string, any> | undefined;
        }[];
    }
>;
type Order = z.infer<typeof orderSchema>;

export { type Order, orderSchema };
