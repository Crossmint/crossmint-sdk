import z from "zod";

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
                        readonly APEX: "apex";
                        readonly LIGHTLINK: "lightlink";
                        readonly SKALE_NEBULA: "skale-nebula";
                        readonly SEI_PACIFIC_1: "sei-pacific-1";
                        readonly ARBITRUM_SEPOLIA: "arbitrum-sepolia";
                        readonly BASE_SEPOLIA: "base-sepolia";
                        readonly BSC_TESTNET: "bsc-testnet";
                        readonly ETHEREUM_SEPOLIA: "ethereum-sepolia";
                        readonly POLYGON_AMOY: "polygon-amoy";
                        readonly OPTIMISM_SEPOLIA: "optimism-sepolia";
                        readonly ZORA_SEPOLIA: "zora-sepolia";
                        readonly HYPERSONIC_TESTNET: "hypersonic-testnet";
                        readonly ZKATANA: "zkatana";
                        readonly ZKYOTO: "zkyoto";
                        readonly LIGHTLINK_PEGASUS: "lightlink-pegasus";
                        readonly PRIVATE_TESTNET_POLYGON: "crossmint-private-testnet-polygon";
                        readonly PRIVATE_TESTNET_ETHEREUM: "crossmint-private-testnet-ethereum";
                        readonly ZORA_GOERLI: "zora-goerli";
                        readonly BASE_GOERLI: "base-goerli";
                        readonly OPTIMISM_GOERLI: "optimism-goerli";
                        readonly ETHEREUM_GOERLI: "ethereum-goerli";
                        readonly POLYGON_MUMBAI: "polygon-mumbai";
                        readonly SKALE_NEBULA_TESTNET: "skale-nebula-testnet";
                        readonly BARRET_TESTNET: "barret-testnet";
                        readonly SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet";
                        readonly SOLANA: "solana";
                        readonly CARDANO: "cardano";
                        readonly SUI: "sui";
                        readonly APTOS: "aptos";
                    }>;
                    quantity: z.ZodNumber;
                    callData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                    metadata: z.ZodObject<
                        {
                            name: z.ZodString;
                            description: z.ZodString;
                            imageUrl: z.ZodString;
                            collection: z.ZodOptional<
                                z.ZodObject<
                                    {
                                        name: z.ZodString;
                                        description: z.ZodString;
                                        imageUrl: z.ZodString;
                                    },
                                    "strip",
                                    z.ZodTypeAny,
                                    {
                                        name: string;
                                        description: string;
                                        imageUrl: string;
                                    },
                                    {
                                        name: string;
                                        description: string;
                                        imageUrl: string;
                                    }
                                >
                            >;
                        },
                        "strip",
                        z.ZodTypeAny,
                        {
                            name: string;
                            description: string;
                            imageUrl: string;
                            collection?:
                                | {
                                      name: string;
                                      description: string;
                                      imageUrl: string;
                                  }
                                | undefined;
                        },
                        {
                            name: string;
                            description: string;
                            imageUrl: string;
                            collection?:
                                | {
                                      name: string;
                                      description: string;
                                      imageUrl: string;
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
                                                            readonly DEGEN: "degen";
                                                            readonly BRETT: "brett";
                                                            readonly TOSHI: "toshi";
                                                            readonly BONK: "bonk";
                                                            readonly WIF: "wif";
                                                            readonly MOTHER: "mother";
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
                                                        }>
                                                    ]
                                                >;
                                            },
                                            "strip",
                                            z.ZodTypeAny,
                                            {
                                                currency:
                                                    | "usdc"
                                                    | "degen"
                                                    | "brett"
                                                    | "toshi"
                                                    | "eth"
                                                    | "matic"
                                                    | "bonk"
                                                    | "wif"
                                                    | "mother"
                                                    | "sol"
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
                                                    | "usdc"
                                                    | "degen"
                                                    | "brett"
                                                    | "toshi"
                                                    | "eth"
                                                    | "matic"
                                                    | "bonk"
                                                    | "wif"
                                                    | "mother"
                                                    | "sol"
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
                                                                readonly DEGEN: "degen";
                                                                readonly BRETT: "brett";
                                                                readonly TOSHI: "toshi";
                                                                readonly BONK: "bonk";
                                                                readonly WIF: "wif";
                                                                readonly MOTHER: "mother";
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
                                                            }>
                                                        ]
                                                    >;
                                                },
                                                "strip",
                                                z.ZodTypeAny,
                                                {
                                                    currency:
                                                        | "usdc"
                                                        | "degen"
                                                        | "brett"
                                                        | "toshi"
                                                        | "eth"
                                                        | "matic"
                                                        | "bonk"
                                                        | "wif"
                                                        | "mother"
                                                        | "sol"
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
                                                        | "usdc"
                                                        | "degen"
                                                        | "brett"
                                                        | "toshi"
                                                        | "eth"
                                                        | "matic"
                                                        | "bonk"
                                                        | "wif"
                                                        | "mother"
                                                        | "sol"
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
                                                | "usdc"
                                                | "degen"
                                                | "brett"
                                                | "toshi"
                                                | "eth"
                                                | "matic"
                                                | "bonk"
                                                | "wif"
                                                | "mother"
                                                | "sol"
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
                                                      | "usdc"
                                                      | "degen"
                                                      | "brett"
                                                      | "toshi"
                                                      | "eth"
                                                      | "matic"
                                                      | "bonk"
                                                      | "wif"
                                                      | "mother"
                                                      | "sol"
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
                                                | "usdc"
                                                | "degen"
                                                | "brett"
                                                | "toshi"
                                                | "eth"
                                                | "matic"
                                                | "bonk"
                                                | "wif"
                                                | "mother"
                                                | "sol"
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
                                                      | "usdc"
                                                      | "degen"
                                                      | "brett"
                                                      | "toshi"
                                                      | "eth"
                                                      | "matic"
                                                      | "bonk"
                                                      | "wif"
                                                      | "mother"
                                                      | "sol"
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
                                                    readonly DEGEN: "degen";
                                                    readonly BRETT: "brett";
                                                    readonly TOSHI: "toshi";
                                                    readonly BONK: "bonk";
                                                    readonly WIF: "wif";
                                                    readonly MOTHER: "mother";
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
                                                }>
                                            ]
                                        >;
                                    },
                                    "strip",
                                    z.ZodTypeAny,
                                    {
                                        currency:
                                            | "usdc"
                                            | "degen"
                                            | "brett"
                                            | "toshi"
                                            | "eth"
                                            | "matic"
                                            | "bonk"
                                            | "wif"
                                            | "mother"
                                            | "sol"
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
                                            | "usdc"
                                            | "degen"
                                            | "brett"
                                            | "toshi"
                                            | "eth"
                                            | "matic"
                                            | "bonk"
                                            | "wif"
                                            | "mother"
                                            | "sol"
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
                                              | "usdc"
                                              | "degen"
                                              | "brett"
                                              | "toshi"
                                              | "eth"
                                              | "matic"
                                              | "bonk"
                                              | "wif"
                                              | "mother"
                                              | "sol"
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
                                                    | "usdc"
                                                    | "degen"
                                                    | "brett"
                                                    | "toshi"
                                                    | "eth"
                                                    | "matic"
                                                    | "bonk"
                                                    | "wif"
                                                    | "mother"
                                                    | "sol"
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
                                          | "usdc"
                                          | "degen"
                                          | "brett"
                                          | "toshi"
                                          | "eth"
                                          | "matic"
                                          | "bonk"
                                          | "wif"
                                          | "mother"
                                          | "sol"
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
                                              | "usdc"
                                              | "degen"
                                              | "brett"
                                              | "toshi"
                                              | "eth"
                                              | "matic"
                                              | "bonk"
                                              | "wif"
                                              | "mother"
                                              | "sol"
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
                                                    | "usdc"
                                                    | "degen"
                                                    | "brett"
                                                    | "toshi"
                                                    | "eth"
                                                    | "matic"
                                                    | "bonk"
                                                    | "wif"
                                                    | "mother"
                                                    | "sol"
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
                                          | "usdc"
                                          | "degen"
                                          | "brett"
                                          | "toshi"
                                          | "eth"
                                          | "matic"
                                          | "bonk"
                                          | "wif"
                                          | "mother"
                                          | "sol"
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
                                        z.ZodIntersection<
                                            z.ZodObject<
                                                {
                                                    locator: z.ZodString;
                                                },
                                                "strip",
                                                z.ZodTypeAny,
                                                {
                                                    locator: string;
                                                },
                                                {
                                                    locator: string;
                                                }
                                            >,
                                            z.ZodUnion<
                                                [
                                                    z.ZodObject<
                                                        {
                                                            walletAddress: z.ZodString;
                                                        },
                                                        "strip",
                                                        z.ZodTypeAny,
                                                        {
                                                            walletAddress: string;
                                                        },
                                                        {
                                                            walletAddress: string;
                                                        }
                                                    >,
                                                    z.ZodObject<
                                                        {
                                                            walletAddress: z.ZodString;
                                                            email: z.ZodString;
                                                        },
                                                        "strip",
                                                        z.ZodTypeAny,
                                                        {
                                                            email: string;
                                                            walletAddress: string;
                                                        },
                                                        {
                                                            email: string;
                                                            walletAddress: string;
                                                        }
                                                    >
                                                ]
                                            >
                                        >
                                    >;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    status: "awaiting-payment" | "in-progress" | "failed";
                                    recipient?:
                                        | ({
                                              locator: string;
                                          } & (
                                              | {
                                                    walletAddress: string;
                                                }
                                              | {
                                                    email: string;
                                                    walletAddress: string;
                                                }
                                          ))
                                        | undefined;
                                },
                                {
                                    status: "awaiting-payment" | "in-progress" | "failed";
                                    recipient?:
                                        | ({
                                              locator: string;
                                          } & (
                                              | {
                                                    walletAddress: string;
                                                }
                                              | {
                                                    email: string;
                                                    walletAddress: string;
                                                }
                                          ))
                                        | undefined;
                                }
                            >,
                            z.ZodObject<
                                {
                                    status: z.ZodLiteral<"completed">;
                                    recipient: z.ZodOptional<
                                        z.ZodIntersection<
                                            z.ZodObject<
                                                {
                                                    locator: z.ZodString;
                                                },
                                                "strip",
                                                z.ZodTypeAny,
                                                {
                                                    locator: string;
                                                },
                                                {
                                                    locator: string;
                                                }
                                            >,
                                            z.ZodUnion<
                                                [
                                                    z.ZodObject<
                                                        {
                                                            walletAddress: z.ZodString;
                                                        },
                                                        "strip",
                                                        z.ZodTypeAny,
                                                        {
                                                            walletAddress: string;
                                                        },
                                                        {
                                                            walletAddress: string;
                                                        }
                                                    >,
                                                    z.ZodObject<
                                                        {
                                                            walletAddress: z.ZodString;
                                                            email: z.ZodString;
                                                        },
                                                        "strip",
                                                        z.ZodTypeAny,
                                                        {
                                                            email: string;
                                                            walletAddress: string;
                                                        },
                                                        {
                                                            email: string;
                                                            walletAddress: string;
                                                        }
                                                    >
                                                ]
                                            >
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
                                                    },
                                                    "strip",
                                                    z.ZodTypeAny,
                                                    {
                                                        contractAddress: string;
                                                        tokenId: string;
                                                    },
                                                    {
                                                        contractAddress: string;
                                                        tokenId: string;
                                                    }
                                                >,
                                                z.ZodObject<
                                                    {
                                                        mintHash: z.ZodString;
                                                    },
                                                    "strip",
                                                    z.ZodTypeAny,
                                                    {
                                                        mintHash: string;
                                                    },
                                                    {
                                                        mintHash: string;
                                                    }
                                                >
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
                                              contractAddress: string;
                                              tokenId: string;
                                          }
                                        | {
                                              mintHash: string;
                                          }
                                    )[];
                                    recipient?:
                                        | ({
                                              locator: string;
                                          } & (
                                              | {
                                                    walletAddress: string;
                                                }
                                              | {
                                                    email: string;
                                                    walletAddress: string;
                                                }
                                          ))
                                        | undefined;
                                },
                                {
                                    status: "completed";
                                    txId: string;
                                    tokens: (
                                        | {
                                              contractAddress: string;
                                              tokenId: string;
                                          }
                                        | {
                                              mintHash: string;
                                          }
                                    )[];
                                    recipient?:
                                        | ({
                                              locator: string;
                                          } & (
                                              | {
                                                    walletAddress: string;
                                                }
                                              | {
                                                    email: string;
                                                    walletAddress: string;
                                                }
                                          ))
                                        | undefined;
                                }
                            >
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
                        | "apex"
                        | "lightlink"
                        | "skale-nebula"
                        | "sei-pacific-1"
                        | "arbitrum-sepolia"
                        | "base-sepolia"
                        | "bsc-testnet"
                        | "ethereum-sepolia"
                        | "polygon-amoy"
                        | "optimism-sepolia"
                        | "zora-sepolia"
                        | "hypersonic-testnet"
                        | "zkatana"
                        | "zkyoto"
                        | "lightlink-pegasus"
                        | "crossmint-private-testnet-polygon"
                        | "crossmint-private-testnet-ethereum"
                        | "zora-goerli"
                        | "base-goerli"
                        | "optimism-goerli"
                        | "ethereum-goerli"
                        | "polygon-mumbai"
                        | "skale-nebula-testnet"
                        | "barret-testnet"
                        | "sei-atlantic-2-testnet"
                        | "solana"
                        | "cardano"
                        | "sui"
                        | "aptos";
                    quantity: number;
                    metadata: {
                        name: string;
                        description: string;
                        imageUrl: string;
                        collection?:
                            | {
                                  name: string;
                                  description: string;
                                  imageUrl: string;
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
                                          | "usdc"
                                          | "degen"
                                          | "brett"
                                          | "toshi"
                                          | "eth"
                                          | "matic"
                                          | "bonk"
                                          | "wif"
                                          | "mother"
                                          | "sol"
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
                                                | "usdc"
                                                | "degen"
                                                | "brett"
                                                | "toshi"
                                                | "eth"
                                                | "matic"
                                                | "bonk"
                                                | "wif"
                                                | "mother"
                                                | "sol"
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
                                      | "usdc"
                                      | "degen"
                                      | "brett"
                                      | "toshi"
                                      | "eth"
                                      | "matic"
                                      | "bonk"
                                      | "wif"
                                      | "mother"
                                      | "sol"
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
                                        contractAddress: string;
                                        tokenId: string;
                                    }
                                  | {
                                        mintHash: string;
                                    }
                              )[];
                              recipient?:
                                  | ({
                                        locator: string;
                                    } & (
                                        | {
                                              walletAddress: string;
                                          }
                                        | {
                                              email: string;
                                              walletAddress: string;
                                          }
                                    ))
                                  | undefined;
                          }
                        | {
                              status: "awaiting-payment" | "in-progress" | "failed";
                              recipient?:
                                  | ({
                                        locator: string;
                                    } & (
                                        | {
                                              walletAddress: string;
                                          }
                                        | {
                                              email: string;
                                              walletAddress: string;
                                          }
                                    ))
                                  | undefined;
                          };
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
                        | "apex"
                        | "lightlink"
                        | "skale-nebula"
                        | "sei-pacific-1"
                        | "arbitrum-sepolia"
                        | "base-sepolia"
                        | "bsc-testnet"
                        | "ethereum-sepolia"
                        | "polygon-amoy"
                        | "optimism-sepolia"
                        | "zora-sepolia"
                        | "hypersonic-testnet"
                        | "zkatana"
                        | "zkyoto"
                        | "lightlink-pegasus"
                        | "crossmint-private-testnet-polygon"
                        | "crossmint-private-testnet-ethereum"
                        | "zora-goerli"
                        | "base-goerli"
                        | "optimism-goerli"
                        | "ethereum-goerli"
                        | "polygon-mumbai"
                        | "skale-nebula-testnet"
                        | "barret-testnet"
                        | "sei-atlantic-2-testnet"
                        | "solana"
                        | "cardano"
                        | "sui"
                        | "aptos";
                    quantity: number;
                    metadata: {
                        name: string;
                        description: string;
                        imageUrl: string;
                        collection?:
                            | {
                                  name: string;
                                  description: string;
                                  imageUrl: string;
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
                                          | "usdc"
                                          | "degen"
                                          | "brett"
                                          | "toshi"
                                          | "eth"
                                          | "matic"
                                          | "bonk"
                                          | "wif"
                                          | "mother"
                                          | "sol"
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
                                                | "usdc"
                                                | "degen"
                                                | "brett"
                                                | "toshi"
                                                | "eth"
                                                | "matic"
                                                | "bonk"
                                                | "wif"
                                                | "mother"
                                                | "sol"
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
                                      | "usdc"
                                      | "degen"
                                      | "brett"
                                      | "toshi"
                                      | "eth"
                                      | "matic"
                                      | "bonk"
                                      | "wif"
                                      | "mother"
                                      | "sol"
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
                                        contractAddress: string;
                                        tokenId: string;
                                    }
                                  | {
                                        mintHash: string;
                                    }
                              )[];
                              recipient?:
                                  | ({
                                        locator: string;
                                    } & (
                                        | {
                                              walletAddress: string;
                                          }
                                        | {
                                              email: string;
                                              walletAddress: string;
                                          }
                                    ))
                                  | undefined;
                          }
                        | {
                              status: "awaiting-payment" | "in-progress" | "failed";
                              recipient?:
                                  | ({
                                        locator: string;
                                    } & (
                                        | {
                                              walletAddress: string;
                                          }
                                        | {
                                              email: string;
                                              walletAddress: string;
                                          }
                                    ))
                                  | undefined;
                          };
                    callData?: Record<string, any> | undefined;
                }
            >,
            "many"
        >;
        quote: z.ZodObject<
            {
                status: z.ZodEnum<["requires-recipient", "all-line-items-unavailable", "valid", "expired"]>;
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
                                        readonly DEGEN: "degen";
                                        readonly BRETT: "brett";
                                        readonly TOSHI: "toshi";
                                        readonly BONK: "bonk";
                                        readonly WIF: "wif";
                                        readonly MOTHER: "mother";
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
                                    }>
                                ]
                            >;
                        },
                        "strip",
                        z.ZodTypeAny,
                        {
                            currency:
                                | "usdc"
                                | "degen"
                                | "brett"
                                | "toshi"
                                | "eth"
                                | "matic"
                                | "bonk"
                                | "wif"
                                | "mother"
                                | "sol"
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
                                | "usdc"
                                | "degen"
                                | "brett"
                                | "toshi"
                                | "eth"
                                | "matic"
                                | "bonk"
                                | "wif"
                                | "mother"
                                | "sol"
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
                status: "valid" | "expired" | "requires-recipient" | "all-line-items-unavailable";
                quotedAt?: string | undefined;
                expiresAt?: string | undefined;
                totalPrice?:
                    | {
                          currency:
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                status: "valid" | "expired" | "requires-recipient" | "all-line-items-unavailable";
                quotedAt?: string | undefined;
                expiresAt?: string | undefined;
                totalPrice?:
                    | {
                          currency:
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                        "crypto-payer-insufficient-funds",
                        "awaiting-payment",
                        "in-progress",
                        "completed"
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
                            >
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
                    readonly APEX: "apex";
                    readonly LIGHTLINK: "lightlink";
                    readonly SKALE_NEBULA: "skale-nebula";
                    readonly SEI_PACIFIC_1: "sei-pacific-1";
                    readonly ARBITRUM_SEPOLIA: "arbitrum-sepolia";
                    readonly BASE_SEPOLIA: "base-sepolia";
                    readonly BSC_TESTNET: "bsc-testnet";
                    readonly ETHEREUM_SEPOLIA: "ethereum-sepolia";
                    readonly POLYGON_AMOY: "polygon-amoy";
                    readonly OPTIMISM_SEPOLIA: "optimism-sepolia";
                    readonly ZORA_SEPOLIA: "zora-sepolia";
                    readonly HYPERSONIC_TESTNET: "hypersonic-testnet";
                    readonly ZKATANA: "zkatana";
                    readonly ZKYOTO: "zkyoto";
                    readonly LIGHTLINK_PEGASUS: "lightlink-pegasus";
                    readonly PRIVATE_TESTNET_POLYGON: "crossmint-private-testnet-polygon";
                    readonly PRIVATE_TESTNET_ETHEREUM: "crossmint-private-testnet-ethereum";
                    readonly ZORA_GOERLI: "zora-goerli";
                    readonly BASE_GOERLI: "base-goerli";
                    readonly OPTIMISM_GOERLI: "optimism-goerli";
                    readonly ETHEREUM_GOERLI: "ethereum-goerli";
                    readonly POLYGON_MUMBAI: "polygon-mumbai";
                    readonly SKALE_NEBULA_TESTNET: "skale-nebula-testnet";
                    readonly BARRET_TESTNET: "barret-testnet";
                    readonly SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet";
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
                            readonly DEGEN: "degen";
                            readonly BRETT: "brett";
                            readonly TOSHI: "toshi";
                            readonly BONK: "bonk";
                            readonly WIF: "wif";
                            readonly MOTHER: "mother";
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
                        }>
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
                                            readonly APEX: "apex";
                                            readonly LIGHTLINK: "lightlink";
                                            readonly SKALE_NEBULA: "skale-nebula";
                                            readonly SEI_PACIFIC_1: "sei-pacific-1";
                                            readonly ARBITRUM_SEPOLIA: "arbitrum-sepolia";
                                            readonly BASE_SEPOLIA: "base-sepolia";
                                            readonly BSC_TESTNET: "bsc-testnet";
                                            readonly ETHEREUM_SEPOLIA: "ethereum-sepolia";
                                            readonly POLYGON_AMOY: "polygon-amoy";
                                            readonly OPTIMISM_SEPOLIA: "optimism-sepolia";
                                            readonly ZORA_SEPOLIA: "zora-sepolia";
                                            readonly HYPERSONIC_TESTNET: "hypersonic-testnet";
                                            readonly ZKATANA: "zkatana";
                                            readonly ZKYOTO: "zkyoto";
                                            readonly LIGHTLINK_PEGASUS: "lightlink-pegasus";
                                            readonly PRIVATE_TESTNET_POLYGON: "crossmint-private-testnet-polygon";
                                            readonly PRIVATE_TESTNET_ETHEREUM: "crossmint-private-testnet-ethereum";
                                            readonly ZORA_GOERLI: "zora-goerli";
                                            readonly BASE_GOERLI: "base-goerli";
                                            readonly OPTIMISM_GOERLI: "optimism-goerli";
                                            readonly ETHEREUM_GOERLI: "ethereum-goerli";
                                            readonly POLYGON_MUMBAI: "polygon-mumbai";
                                            readonly SKALE_NEBULA_TESTNET: "skale-nebula-testnet";
                                            readonly BARRET_TESTNET: "barret-testnet";
                                            readonly SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet";
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
                                        | "apex"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "arbitrum-sepolia"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "ethereum-sepolia"
                                        | "polygon-amoy"
                                        | "optimism-sepolia"
                                        | "zora-sepolia"
                                        | "hypersonic-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "lightlink-pegasus"
                                        | "crossmint-private-testnet-polygon"
                                        | "crossmint-private-testnet-ethereum"
                                        | "zora-goerli"
                                        | "base-goerli"
                                        | "optimism-goerli"
                                        | "ethereum-goerli"
                                        | "polygon-mumbai"
                                        | "skale-nebula-testnet"
                                        | "barret-testnet"
                                        | "sei-atlantic-2-testnet"
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
                                        | "apex"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "arbitrum-sepolia"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "ethereum-sepolia"
                                        | "polygon-amoy"
                                        | "optimism-sepolia"
                                        | "zora-sepolia"
                                        | "hypersonic-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "lightlink-pegasus"
                                        | "crossmint-private-testnet-polygon"
                                        | "crossmint-private-testnet-ethereum"
                                        | "zora-goerli"
                                        | "base-goerli"
                                        | "optimism-goerli"
                                        | "ethereum-goerli"
                                        | "polygon-mumbai"
                                        | "skale-nebula-testnet"
                                        | "barret-testnet"
                                        | "sei-atlantic-2-testnet"
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
                                    stripeClientSecret: z.ZodString;
                                    stripePublishableKey: z.ZodString;
                                    stripeEphemeralKeySecret: z.ZodOptional<z.ZodString>;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    stripeClientSecret: string;
                                    stripePublishableKey: string;
                                    stripeEphemeralKeySecret?: string | undefined;
                                },
                                {
                                    stripeClientSecret: string;
                                    stripePublishableKey: string;
                                    stripeEphemeralKeySecret?: string | undefined;
                                }
                            >
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
                                                readonly DEGEN: "degen";
                                                readonly BRETT: "brett";
                                                readonly TOSHI: "toshi";
                                                readonly BONK: "bonk";
                                                readonly WIF: "wif";
                                                readonly MOTHER: "mother";
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
                                            }>
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
                                        readonly APEX: "apex";
                                        readonly LIGHTLINK: "lightlink";
                                        readonly SKALE_NEBULA: "skale-nebula";
                                        readonly SEI_PACIFIC_1: "sei-pacific-1";
                                        readonly ARBITRUM_SEPOLIA: "arbitrum-sepolia";
                                        readonly BASE_SEPOLIA: "base-sepolia";
                                        readonly BSC_TESTNET: "bsc-testnet";
                                        readonly ETHEREUM_SEPOLIA: "ethereum-sepolia";
                                        readonly POLYGON_AMOY: "polygon-amoy";
                                        readonly OPTIMISM_SEPOLIA: "optimism-sepolia";
                                        readonly ZORA_SEPOLIA: "zora-sepolia";
                                        readonly HYPERSONIC_TESTNET: "hypersonic-testnet";
                                        readonly ZKATANA: "zkatana";
                                        readonly ZKYOTO: "zkyoto";
                                        readonly LIGHTLINK_PEGASUS: "lightlink-pegasus";
                                        readonly PRIVATE_TESTNET_POLYGON: "crossmint-private-testnet-polygon";
                                        readonly PRIVATE_TESTNET_ETHEREUM: "crossmint-private-testnet-ethereum";
                                        readonly ZORA_GOERLI: "zora-goerli";
                                        readonly BASE_GOERLI: "base-goerli";
                                        readonly OPTIMISM_GOERLI: "optimism-goerli";
                                        readonly ETHEREUM_GOERLI: "ethereum-goerli";
                                        readonly POLYGON_MUMBAI: "polygon-mumbai";
                                        readonly SKALE_NEBULA_TESTNET: "skale-nebula-testnet";
                                        readonly BARRET_TESTNET: "barret-testnet";
                                        readonly SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet";
                                        readonly SOLANA: "solana";
                                        readonly CARDANO: "cardano";
                                        readonly SUI: "sui";
                                        readonly APTOS: "aptos";
                                    }>;
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
                                        | "apex"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "arbitrum-sepolia"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "ethereum-sepolia"
                                        | "polygon-amoy"
                                        | "optimism-sepolia"
                                        | "zora-sepolia"
                                        | "hypersonic-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "lightlink-pegasus"
                                        | "crossmint-private-testnet-polygon"
                                        | "crossmint-private-testnet-ethereum"
                                        | "zora-goerli"
                                        | "base-goerli"
                                        | "optimism-goerli"
                                        | "ethereum-goerli"
                                        | "polygon-mumbai"
                                        | "skale-nebula-testnet"
                                        | "barret-testnet"
                                        | "sei-atlantic-2-testnet"
                                        | "solana"
                                        | "cardano"
                                        | "sui"
                                        | "aptos";
                                    currency:
                                        | "usdc"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eth"
                                        | "matic"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "sol"
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
                                        | "apex"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "arbitrum-sepolia"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "ethereum-sepolia"
                                        | "polygon-amoy"
                                        | "optimism-sepolia"
                                        | "zora-sepolia"
                                        | "hypersonic-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "lightlink-pegasus"
                                        | "crossmint-private-testnet-polygon"
                                        | "crossmint-private-testnet-ethereum"
                                        | "zora-goerli"
                                        | "base-goerli"
                                        | "optimism-goerli"
                                        | "ethereum-goerli"
                                        | "polygon-mumbai"
                                        | "skale-nebula-testnet"
                                        | "barret-testnet"
                                        | "sei-atlantic-2-testnet"
                                        | "solana"
                                        | "cardano"
                                        | "sui"
                                        | "aptos";
                                    currency:
                                        | "usdc"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eth"
                                        | "matic"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "sol"
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
                                                readonly DEGEN: "degen";
                                                readonly BRETT: "brett";
                                                readonly TOSHI: "toshi";
                                                readonly BONK: "bonk";
                                                readonly WIF: "wif";
                                                readonly MOTHER: "mother";
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
                                            }>
                                        ]
                                    >;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    currency:
                                        | "usdc"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eth"
                                        | "matic"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "sol"
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
                                        | "usdc"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eth"
                                        | "matic"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "sol"
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
                                                readonly DEGEN: "degen";
                                                readonly BRETT: "brett";
                                                readonly TOSHI: "toshi";
                                                readonly BONK: "bonk";
                                                readonly WIF: "wif";
                                                readonly MOTHER: "mother";
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
                                            }>
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
                                        readonly APEX: "apex";
                                        readonly LIGHTLINK: "lightlink";
                                        readonly SKALE_NEBULA: "skale-nebula";
                                        readonly SEI_PACIFIC_1: "sei-pacific-1";
                                        readonly ARBITRUM_SEPOLIA: "arbitrum-sepolia";
                                        readonly BASE_SEPOLIA: "base-sepolia";
                                        readonly BSC_TESTNET: "bsc-testnet";
                                        readonly ETHEREUM_SEPOLIA: "ethereum-sepolia";
                                        readonly POLYGON_AMOY: "polygon-amoy";
                                        readonly OPTIMISM_SEPOLIA: "optimism-sepolia";
                                        readonly ZORA_SEPOLIA: "zora-sepolia";
                                        readonly HYPERSONIC_TESTNET: "hypersonic-testnet";
                                        readonly ZKATANA: "zkatana";
                                        readonly ZKYOTO: "zkyoto";
                                        readonly LIGHTLINK_PEGASUS: "lightlink-pegasus";
                                        readonly PRIVATE_TESTNET_POLYGON: "crossmint-private-testnet-polygon";
                                        readonly PRIVATE_TESTNET_ETHEREUM: "crossmint-private-testnet-ethereum";
                                        readonly ZORA_GOERLI: "zora-goerli";
                                        readonly BASE_GOERLI: "base-goerli";
                                        readonly OPTIMISM_GOERLI: "optimism-goerli";
                                        readonly ETHEREUM_GOERLI: "ethereum-goerli";
                                        readonly POLYGON_MUMBAI: "polygon-mumbai";
                                        readonly SKALE_NEBULA_TESTNET: "skale-nebula-testnet";
                                        readonly BARRET_TESTNET: "barret-testnet";
                                        readonly SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet";
                                        readonly SOLANA: "solana";
                                        readonly CARDANO: "cardano";
                                        readonly SUI: "sui";
                                        readonly APTOS: "aptos";
                                    }>;
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
                                        | "apex"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "arbitrum-sepolia"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "ethereum-sepolia"
                                        | "polygon-amoy"
                                        | "optimism-sepolia"
                                        | "zora-sepolia"
                                        | "hypersonic-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "lightlink-pegasus"
                                        | "crossmint-private-testnet-polygon"
                                        | "crossmint-private-testnet-ethereum"
                                        | "zora-goerli"
                                        | "base-goerli"
                                        | "optimism-goerli"
                                        | "ethereum-goerli"
                                        | "polygon-mumbai"
                                        | "skale-nebula-testnet"
                                        | "barret-testnet"
                                        | "sei-atlantic-2-testnet"
                                        | "solana"
                                        | "cardano"
                                        | "sui"
                                        | "aptos";
                                    currency:
                                        | "usdc"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eth"
                                        | "matic"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "sol"
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
                                        | "apex"
                                        | "lightlink"
                                        | "skale-nebula"
                                        | "sei-pacific-1"
                                        | "arbitrum-sepolia"
                                        | "base-sepolia"
                                        | "bsc-testnet"
                                        | "ethereum-sepolia"
                                        | "polygon-amoy"
                                        | "optimism-sepolia"
                                        | "zora-sepolia"
                                        | "hypersonic-testnet"
                                        | "zkatana"
                                        | "zkyoto"
                                        | "lightlink-pegasus"
                                        | "crossmint-private-testnet-polygon"
                                        | "crossmint-private-testnet-ethereum"
                                        | "zora-goerli"
                                        | "base-goerli"
                                        | "optimism-goerli"
                                        | "ethereum-goerli"
                                        | "polygon-mumbai"
                                        | "skale-nebula-testnet"
                                        | "barret-testnet"
                                        | "sei-atlantic-2-testnet"
                                        | "solana"
                                        | "cardano"
                                        | "sui"
                                        | "aptos";
                                    currency:
                                        | "usdc"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eth"
                                        | "matic"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "sol"
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
                                                readonly DEGEN: "degen";
                                                readonly BRETT: "brett";
                                                readonly TOSHI: "toshi";
                                                readonly BONK: "bonk";
                                                readonly WIF: "wif";
                                                readonly MOTHER: "mother";
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
                                            }>
                                        ]
                                    >;
                                },
                                "strip",
                                z.ZodTypeAny,
                                {
                                    currency:
                                        | "usdc"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eth"
                                        | "matic"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "sol"
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
                                        | "usdc"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eth"
                                        | "matic"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "sol"
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
                        ]
                    >
                >;
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
                    | "apex"
                    | "lightlink"
                    | "skale-nebula"
                    | "sei-pacific-1"
                    | "arbitrum-sepolia"
                    | "base-sepolia"
                    | "bsc-testnet"
                    | "ethereum-sepolia"
                    | "polygon-amoy"
                    | "optimism-sepolia"
                    | "zora-sepolia"
                    | "hypersonic-testnet"
                    | "zkatana"
                    | "zkyoto"
                    | "lightlink-pegasus"
                    | "crossmint-private-testnet-polygon"
                    | "crossmint-private-testnet-ethereum"
                    | "zora-goerli"
                    | "base-goerli"
                    | "optimism-goerli"
                    | "ethereum-goerli"
                    | "polygon-mumbai"
                    | "skale-nebula-testnet"
                    | "barret-testnet"
                    | "sei-atlantic-2-testnet"
                    | "solana"
                    | "stripe-payment-element";
                currency:
                    | "usdc"
                    | "degen"
                    | "brett"
                    | "toshi"
                    | "eth"
                    | "matic"
                    | "bonk"
                    | "wif"
                    | "mother"
                    | "sol"
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
                              | "apex"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "arbitrum-sepolia"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "ethereum-sepolia"
                              | "polygon-amoy"
                              | "optimism-sepolia"
                              | "zora-sepolia"
                              | "hypersonic-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "lightlink-pegasus"
                              | "crossmint-private-testnet-polygon"
                              | "crossmint-private-testnet-ethereum"
                              | "zora-goerli"
                              | "base-goerli"
                              | "optimism-goerli"
                              | "ethereum-goerli"
                              | "polygon-mumbai"
                              | "skale-nebula-testnet"
                              | "barret-testnet"
                              | "sei-atlantic-2-testnet"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos"
                              | undefined;
                          payerAddress?: string | undefined;
                          serializedTransaction?: string | undefined;
                      }
                    | {
                          stripeClientSecret: string;
                          stripePublishableKey: string;
                          stripeEphemeralKeySecret?: string | undefined;
                      }
                    | undefined;
                received?:
                    | {
                          currency:
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                              | "apex"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "arbitrum-sepolia"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "ethereum-sepolia"
                              | "polygon-amoy"
                              | "optimism-sepolia"
                              | "zora-sepolia"
                              | "hypersonic-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "lightlink-pegasus"
                              | "crossmint-private-testnet-polygon"
                              | "crossmint-private-testnet-ethereum"
                              | "zora-goerli"
                              | "base-goerli"
                              | "optimism-goerli"
                              | "ethereum-goerli"
                              | "polygon-mumbai"
                              | "skale-nebula-testnet"
                              | "barret-testnet"
                              | "sei-atlantic-2-testnet"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos";
                          currency:
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                      }
                    | undefined;
                refunded?:
                    | {
                          currency:
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                              | "apex"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "arbitrum-sepolia"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "ethereum-sepolia"
                              | "polygon-amoy"
                              | "optimism-sepolia"
                              | "zora-sepolia"
                              | "hypersonic-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "lightlink-pegasus"
                              | "crossmint-private-testnet-polygon"
                              | "crossmint-private-testnet-ethereum"
                              | "zora-goerli"
                              | "base-goerli"
                              | "optimism-goerli"
                              | "ethereum-goerli"
                              | "polygon-mumbai"
                              | "skale-nebula-testnet"
                              | "barret-testnet"
                              | "sei-atlantic-2-testnet"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos";
                          currency:
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                      }
                    | undefined;
            },
            {
                status:
                    | "completed"
                    | "awaiting-payment"
                    | "in-progress"
                    | "requires-quote"
                    | "requires-crypto-payer-address"
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
                    | "apex"
                    | "lightlink"
                    | "skale-nebula"
                    | "sei-pacific-1"
                    | "arbitrum-sepolia"
                    | "base-sepolia"
                    | "bsc-testnet"
                    | "ethereum-sepolia"
                    | "polygon-amoy"
                    | "optimism-sepolia"
                    | "zora-sepolia"
                    | "hypersonic-testnet"
                    | "zkatana"
                    | "zkyoto"
                    | "lightlink-pegasus"
                    | "crossmint-private-testnet-polygon"
                    | "crossmint-private-testnet-ethereum"
                    | "zora-goerli"
                    | "base-goerli"
                    | "optimism-goerli"
                    | "ethereum-goerli"
                    | "polygon-mumbai"
                    | "skale-nebula-testnet"
                    | "barret-testnet"
                    | "sei-atlantic-2-testnet"
                    | "solana"
                    | "stripe-payment-element";
                currency:
                    | "usdc"
                    | "degen"
                    | "brett"
                    | "toshi"
                    | "eth"
                    | "matic"
                    | "bonk"
                    | "wif"
                    | "mother"
                    | "sol"
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
                              | "apex"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "arbitrum-sepolia"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "ethereum-sepolia"
                              | "polygon-amoy"
                              | "optimism-sepolia"
                              | "zora-sepolia"
                              | "hypersonic-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "lightlink-pegasus"
                              | "crossmint-private-testnet-polygon"
                              | "crossmint-private-testnet-ethereum"
                              | "zora-goerli"
                              | "base-goerli"
                              | "optimism-goerli"
                              | "ethereum-goerli"
                              | "polygon-mumbai"
                              | "skale-nebula-testnet"
                              | "barret-testnet"
                              | "sei-atlantic-2-testnet"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos"
                              | undefined;
                          payerAddress?: string | undefined;
                          serializedTransaction?: string | undefined;
                      }
                    | {
                          stripeClientSecret: string;
                          stripePublishableKey: string;
                          stripeEphemeralKeySecret?: string | undefined;
                      }
                    | undefined;
                received?:
                    | {
                          currency:
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                              | "apex"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "arbitrum-sepolia"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "ethereum-sepolia"
                              | "polygon-amoy"
                              | "optimism-sepolia"
                              | "zora-sepolia"
                              | "hypersonic-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "lightlink-pegasus"
                              | "crossmint-private-testnet-polygon"
                              | "crossmint-private-testnet-ethereum"
                              | "zora-goerli"
                              | "base-goerli"
                              | "optimism-goerli"
                              | "ethereum-goerli"
                              | "polygon-mumbai"
                              | "skale-nebula-testnet"
                              | "barret-testnet"
                              | "sei-atlantic-2-testnet"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos";
                          currency:
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                      }
                    | undefined;
                refunded?:
                    | {
                          currency:
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                              | "apex"
                              | "lightlink"
                              | "skale-nebula"
                              | "sei-pacific-1"
                              | "arbitrum-sepolia"
                              | "base-sepolia"
                              | "bsc-testnet"
                              | "ethereum-sepolia"
                              | "polygon-amoy"
                              | "optimism-sepolia"
                              | "zora-sepolia"
                              | "hypersonic-testnet"
                              | "zkatana"
                              | "zkyoto"
                              | "lightlink-pegasus"
                              | "crossmint-private-testnet-polygon"
                              | "crossmint-private-testnet-ethereum"
                              | "zora-goerli"
                              | "base-goerli"
                              | "optimism-goerli"
                              | "ethereum-goerli"
                              | "polygon-mumbai"
                              | "skale-nebula-testnet"
                              | "barret-testnet"
                              | "sei-atlantic-2-testnet"
                              | "solana"
                              | "cardano"
                              | "sui"
                              | "aptos";
                          currency:
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                      }
                    | undefined;
            }
        >;
    },
    "strip",
    z.ZodTypeAny,
    {
        quote: {
            status: "valid" | "expired" | "requires-recipient" | "all-line-items-unavailable";
            quotedAt?: string | undefined;
            expiresAt?: string | undefined;
            totalPrice?:
                | {
                      currency:
                          | "usdc"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eth"
                          | "matic"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "sol"
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
                | "apex"
                | "lightlink"
                | "skale-nebula"
                | "sei-pacific-1"
                | "arbitrum-sepolia"
                | "base-sepolia"
                | "bsc-testnet"
                | "ethereum-sepolia"
                | "polygon-amoy"
                | "optimism-sepolia"
                | "zora-sepolia"
                | "hypersonic-testnet"
                | "zkatana"
                | "zkyoto"
                | "lightlink-pegasus"
                | "crossmint-private-testnet-polygon"
                | "crossmint-private-testnet-ethereum"
                | "zora-goerli"
                | "base-goerli"
                | "optimism-goerli"
                | "ethereum-goerli"
                | "polygon-mumbai"
                | "skale-nebula-testnet"
                | "barret-testnet"
                | "sei-atlantic-2-testnet"
                | "solana"
                | "stripe-payment-element";
            currency:
                | "usdc"
                | "degen"
                | "brett"
                | "toshi"
                | "eth"
                | "matic"
                | "bonk"
                | "wif"
                | "mother"
                | "sol"
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
                          | "apex"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "arbitrum-sepolia"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "ethereum-sepolia"
                          | "polygon-amoy"
                          | "optimism-sepolia"
                          | "zora-sepolia"
                          | "hypersonic-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "lightlink-pegasus"
                          | "crossmint-private-testnet-polygon"
                          | "crossmint-private-testnet-ethereum"
                          | "zora-goerli"
                          | "base-goerli"
                          | "optimism-goerli"
                          | "ethereum-goerli"
                          | "polygon-mumbai"
                          | "skale-nebula-testnet"
                          | "barret-testnet"
                          | "sei-atlantic-2-testnet"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos"
                          | undefined;
                      payerAddress?: string | undefined;
                      serializedTransaction?: string | undefined;
                  }
                | {
                      stripeClientSecret: string;
                      stripePublishableKey: string;
                      stripeEphemeralKeySecret?: string | undefined;
                  }
                | undefined;
            received?:
                | {
                      currency:
                          | "usdc"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eth"
                          | "matic"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "sol"
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
                          | "apex"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "arbitrum-sepolia"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "ethereum-sepolia"
                          | "polygon-amoy"
                          | "optimism-sepolia"
                          | "zora-sepolia"
                          | "hypersonic-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "lightlink-pegasus"
                          | "crossmint-private-testnet-polygon"
                          | "crossmint-private-testnet-ethereum"
                          | "zora-goerli"
                          | "base-goerli"
                          | "optimism-goerli"
                          | "ethereum-goerli"
                          | "polygon-mumbai"
                          | "skale-nebula-testnet"
                          | "barret-testnet"
                          | "sei-atlantic-2-testnet"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos";
                      currency:
                          | "usdc"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eth"
                          | "matic"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "sol"
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
                  }
                | undefined;
            refunded?:
                | {
                      currency:
                          | "usdc"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eth"
                          | "matic"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "sol"
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
                          | "apex"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "arbitrum-sepolia"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "ethereum-sepolia"
                          | "polygon-amoy"
                          | "optimism-sepolia"
                          | "zora-sepolia"
                          | "hypersonic-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "lightlink-pegasus"
                          | "crossmint-private-testnet-polygon"
                          | "crossmint-private-testnet-ethereum"
                          | "zora-goerli"
                          | "base-goerli"
                          | "optimism-goerli"
                          | "ethereum-goerli"
                          | "polygon-mumbai"
                          | "skale-nebula-testnet"
                          | "barret-testnet"
                          | "sei-atlantic-2-testnet"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos";
                      currency:
                          | "usdc"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eth"
                          | "matic"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "sol"
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
                  }
                | undefined;
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
                | "apex"
                | "lightlink"
                | "skale-nebula"
                | "sei-pacific-1"
                | "arbitrum-sepolia"
                | "base-sepolia"
                | "bsc-testnet"
                | "ethereum-sepolia"
                | "polygon-amoy"
                | "optimism-sepolia"
                | "zora-sepolia"
                | "hypersonic-testnet"
                | "zkatana"
                | "zkyoto"
                | "lightlink-pegasus"
                | "crossmint-private-testnet-polygon"
                | "crossmint-private-testnet-ethereum"
                | "zora-goerli"
                | "base-goerli"
                | "optimism-goerli"
                | "ethereum-goerli"
                | "polygon-mumbai"
                | "skale-nebula-testnet"
                | "barret-testnet"
                | "sei-atlantic-2-testnet"
                | "solana"
                | "cardano"
                | "sui"
                | "aptos";
            quantity: number;
            metadata: {
                name: string;
                description: string;
                imageUrl: string;
                collection?:
                    | {
                          name: string;
                          description: string;
                          imageUrl: string;
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
                                  | "usdc"
                                  | "degen"
                                  | "brett"
                                  | "toshi"
                                  | "eth"
                                  | "matic"
                                  | "bonk"
                                  | "wif"
                                  | "mother"
                                  | "sol"
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
                                        | "usdc"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eth"
                                        | "matic"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "sol"
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
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                                contractAddress: string;
                                tokenId: string;
                            }
                          | {
                                mintHash: string;
                            }
                      )[];
                      recipient?:
                          | ({
                                locator: string;
                            } & (
                                | {
                                      walletAddress: string;
                                  }
                                | {
                                      email: string;
                                      walletAddress: string;
                                  }
                            ))
                          | undefined;
                  }
                | {
                      status: "awaiting-payment" | "in-progress" | "failed";
                      recipient?:
                          | ({
                                locator: string;
                            } & (
                                | {
                                      walletAddress: string;
                                  }
                                | {
                                      email: string;
                                      walletAddress: string;
                                  }
                            ))
                          | undefined;
                  };
            callData?: Record<string, any> | undefined;
        }[];
    },
    {
        quote: {
            status: "valid" | "expired" | "requires-recipient" | "all-line-items-unavailable";
            quotedAt?: string | undefined;
            expiresAt?: string | undefined;
            totalPrice?:
                | {
                      currency:
                          | "usdc"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eth"
                          | "matic"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "sol"
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
                | "apex"
                | "lightlink"
                | "skale-nebula"
                | "sei-pacific-1"
                | "arbitrum-sepolia"
                | "base-sepolia"
                | "bsc-testnet"
                | "ethereum-sepolia"
                | "polygon-amoy"
                | "optimism-sepolia"
                | "zora-sepolia"
                | "hypersonic-testnet"
                | "zkatana"
                | "zkyoto"
                | "lightlink-pegasus"
                | "crossmint-private-testnet-polygon"
                | "crossmint-private-testnet-ethereum"
                | "zora-goerli"
                | "base-goerli"
                | "optimism-goerli"
                | "ethereum-goerli"
                | "polygon-mumbai"
                | "skale-nebula-testnet"
                | "barret-testnet"
                | "sei-atlantic-2-testnet"
                | "solana"
                | "stripe-payment-element";
            currency:
                | "usdc"
                | "degen"
                | "brett"
                | "toshi"
                | "eth"
                | "matic"
                | "bonk"
                | "wif"
                | "mother"
                | "sol"
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
                          | "apex"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "arbitrum-sepolia"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "ethereum-sepolia"
                          | "polygon-amoy"
                          | "optimism-sepolia"
                          | "zora-sepolia"
                          | "hypersonic-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "lightlink-pegasus"
                          | "crossmint-private-testnet-polygon"
                          | "crossmint-private-testnet-ethereum"
                          | "zora-goerli"
                          | "base-goerli"
                          | "optimism-goerli"
                          | "ethereum-goerli"
                          | "polygon-mumbai"
                          | "skale-nebula-testnet"
                          | "barret-testnet"
                          | "sei-atlantic-2-testnet"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos"
                          | undefined;
                      payerAddress?: string | undefined;
                      serializedTransaction?: string | undefined;
                  }
                | {
                      stripeClientSecret: string;
                      stripePublishableKey: string;
                      stripeEphemeralKeySecret?: string | undefined;
                  }
                | undefined;
            received?:
                | {
                      currency:
                          | "usdc"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eth"
                          | "matic"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "sol"
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
                          | "apex"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "arbitrum-sepolia"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "ethereum-sepolia"
                          | "polygon-amoy"
                          | "optimism-sepolia"
                          | "zora-sepolia"
                          | "hypersonic-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "lightlink-pegasus"
                          | "crossmint-private-testnet-polygon"
                          | "crossmint-private-testnet-ethereum"
                          | "zora-goerli"
                          | "base-goerli"
                          | "optimism-goerli"
                          | "ethereum-goerli"
                          | "polygon-mumbai"
                          | "skale-nebula-testnet"
                          | "barret-testnet"
                          | "sei-atlantic-2-testnet"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos";
                      currency:
                          | "usdc"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eth"
                          | "matic"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "sol"
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
                  }
                | undefined;
            refunded?:
                | {
                      currency:
                          | "usdc"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eth"
                          | "matic"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "sol"
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
                          | "apex"
                          | "lightlink"
                          | "skale-nebula"
                          | "sei-pacific-1"
                          | "arbitrum-sepolia"
                          | "base-sepolia"
                          | "bsc-testnet"
                          | "ethereum-sepolia"
                          | "polygon-amoy"
                          | "optimism-sepolia"
                          | "zora-sepolia"
                          | "hypersonic-testnet"
                          | "zkatana"
                          | "zkyoto"
                          | "lightlink-pegasus"
                          | "crossmint-private-testnet-polygon"
                          | "crossmint-private-testnet-ethereum"
                          | "zora-goerli"
                          | "base-goerli"
                          | "optimism-goerli"
                          | "ethereum-goerli"
                          | "polygon-mumbai"
                          | "skale-nebula-testnet"
                          | "barret-testnet"
                          | "sei-atlantic-2-testnet"
                          | "solana"
                          | "cardano"
                          | "sui"
                          | "aptos";
                      currency:
                          | "usdc"
                          | "degen"
                          | "brett"
                          | "toshi"
                          | "eth"
                          | "matic"
                          | "bonk"
                          | "wif"
                          | "mother"
                          | "sol"
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
                  }
                | undefined;
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
                | "apex"
                | "lightlink"
                | "skale-nebula"
                | "sei-pacific-1"
                | "arbitrum-sepolia"
                | "base-sepolia"
                | "bsc-testnet"
                | "ethereum-sepolia"
                | "polygon-amoy"
                | "optimism-sepolia"
                | "zora-sepolia"
                | "hypersonic-testnet"
                | "zkatana"
                | "zkyoto"
                | "lightlink-pegasus"
                | "crossmint-private-testnet-polygon"
                | "crossmint-private-testnet-ethereum"
                | "zora-goerli"
                | "base-goerli"
                | "optimism-goerli"
                | "ethereum-goerli"
                | "polygon-mumbai"
                | "skale-nebula-testnet"
                | "barret-testnet"
                | "sei-atlantic-2-testnet"
                | "solana"
                | "cardano"
                | "sui"
                | "aptos";
            quantity: number;
            metadata: {
                name: string;
                description: string;
                imageUrl: string;
                collection?:
                    | {
                          name: string;
                          description: string;
                          imageUrl: string;
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
                                  | "usdc"
                                  | "degen"
                                  | "brett"
                                  | "toshi"
                                  | "eth"
                                  | "matic"
                                  | "bonk"
                                  | "wif"
                                  | "mother"
                                  | "sol"
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
                                        | "usdc"
                                        | "degen"
                                        | "brett"
                                        | "toshi"
                                        | "eth"
                                        | "matic"
                                        | "bonk"
                                        | "wif"
                                        | "mother"
                                        | "sol"
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
                              | "usdc"
                              | "degen"
                              | "brett"
                              | "toshi"
                              | "eth"
                              | "matic"
                              | "bonk"
                              | "wif"
                              | "mother"
                              | "sol"
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
                                contractAddress: string;
                                tokenId: string;
                            }
                          | {
                                mintHash: string;
                            }
                      )[];
                      recipient?:
                          | ({
                                locator: string;
                            } & (
                                | {
                                      walletAddress: string;
                                  }
                                | {
                                      email: string;
                                      walletAddress: string;
                                  }
                            ))
                          | undefined;
                  }
                | {
                      status: "awaiting-payment" | "in-progress" | "failed";
                      recipient?:
                          | ({
                                locator: string;
                            } & (
                                | {
                                      walletAddress: string;
                                  }
                                | {
                                      email: string;
                                      walletAddress: string;
                                  }
                            ))
                          | undefined;
                  };
            callData?: Record<string, any> | undefined;
        }[];
    }
>;
type Order = z.infer<typeof orderSchema>;

export { type Order, orderSchema };
