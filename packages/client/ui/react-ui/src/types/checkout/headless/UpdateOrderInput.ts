import { z } from "zod";

declare const updateOrderInputSchema: z.ZodObject<
    {
        recipient: z.ZodOptional<
            z.ZodUnion<
                [
                    z.ZodObject<
                        {
                            email: z.ZodString;
                        },
                        "strict",
                        z.ZodTypeAny,
                        {
                            email: string;
                        },
                        {
                            email: string;
                        }
                    >,
                    z.ZodObject<
                        {
                            walletAddress: z.ZodEffects<z.ZodString, string, string>;
                        },
                        "strict",
                        z.ZodTypeAny,
                        {
                            walletAddress: string;
                        },
                        {
                            walletAddress: string;
                        }
                    >
                ]
            >
        >;
        locale: z.ZodOptional<
            z.ZodNativeEnum<{
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
            }>
        >;
        payment: z.ZodOptional<
            z.ZodEffects<
                z.ZodDiscriminatedUnion<
                    "method",
                    [
                        z.ZodObject<
                            {
                                receiptEmail: z.ZodOptional<z.ZodString>;
                                method: z.ZodEnum<["stripe-payment-element"]>;
                                currency: z.ZodDefault<
                                    z.ZodOptional<
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
                                    >
                                >;
                            },
                            "strip",
                            z.ZodTypeAny,
                            {
                                method: "stripe-payment-element";
                                currency: "usd" | "eur" | "aud" | "gbp" | "jpy" | "sgd" | "hkd" | "krw" | "inr" | "vnd";
                                receiptEmail?: string | undefined;
                            },
                            {
                                method: "stripe-payment-element";
                                receiptEmail?: string | undefined;
                                currency?:
                                    | "usd"
                                    | "eur"
                                    | "aud"
                                    | "gbp"
                                    | "jpy"
                                    | "sgd"
                                    | "hkd"
                                    | "krw"
                                    | "inr"
                                    | "vnd"
                                    | undefined;
                            }
                        >,
                        z.ZodObject<
                            {
                                receiptEmail: z.ZodOptional<z.ZodString>;
                                method: z.ZodLiteral<"solana">;
                                currency: z.ZodEnum<["sol", "usdc", "bonk", "wif", "mother"]>;
                                payerAddress: z.ZodOptional<z.ZodString>;
                            },
                            "strip",
                            z.ZodTypeAny,
                            {
                                method: "solana";
                                currency: "usdc" | "bonk" | "wif" | "mother" | "sol";
                                receiptEmail?: string | undefined;
                                payerAddress?: string | undefined;
                            },
                            {
                                method: "solana";
                                currency: "usdc" | "bonk" | "wif" | "mother" | "sol";
                                receiptEmail?: string | undefined;
                                payerAddress?: string | undefined;
                            }
                        >,
                        ...z.ZodObject<
                            {
                                receiptEmail: z.ZodOptional<z.ZodString>;
                                method: z.ZodEffects<
                                    z.ZodLiteral<
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
                                    >,
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
                                    | "sei-atlantic-2-testnet",
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
                                >;
                                currency: z.ZodEnum<["eth", "matic", "usdc", "degen", "brett", "toshi"]>;
                                payerAddress: z.ZodOptional<z.ZodString>;
                            },
                            "strip",
                            z.ZodTypeAny,
                            {
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
                                    | "sei-atlantic-2-testnet";
                                currency: "usdc" | "degen" | "brett" | "toshi" | "eth" | "matic";
                                receiptEmail?: string | undefined;
                                payerAddress?: string | undefined;
                            },
                            {
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
                                    | "sei-atlantic-2-testnet";
                                currency: "usdc" | "degen" | "brett" | "toshi" | "eth" | "matic";
                                receiptEmail?: string | undefined;
                                payerAddress?: string | undefined;
                            }
                        >[]
                    ]
                >,
                | {
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
                          | "sei-atlantic-2-testnet";
                      currency: "usdc" | "degen" | "brett" | "toshi" | "eth" | "matic";
                      receiptEmail?: string | undefined;
                      payerAddress?: string | undefined;
                  }
                | {
                      method: "solana";
                      currency: "usdc" | "bonk" | "wif" | "mother" | "sol";
                      receiptEmail?: string | undefined;
                      payerAddress?: string | undefined;
                  }
                | {
                      method: "stripe-payment-element";
                      currency: "usd" | "eur" | "aud" | "gbp" | "jpy" | "sgd" | "hkd" | "krw" | "inr" | "vnd";
                      receiptEmail?: string | undefined;
                  },
                | {
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
                          | "sei-atlantic-2-testnet";
                      currency: "usdc" | "degen" | "brett" | "toshi" | "eth" | "matic";
                      receiptEmail?: string | undefined;
                      payerAddress?: string | undefined;
                  }
                | {
                      method: "solana";
                      currency: "usdc" | "bonk" | "wif" | "mother" | "sol";
                      receiptEmail?: string | undefined;
                      payerAddress?: string | undefined;
                  }
                | {
                      method: "stripe-payment-element";
                      receiptEmail?: string | undefined;
                      currency?:
                          | "usd"
                          | "eur"
                          | "aud"
                          | "gbp"
                          | "jpy"
                          | "sgd"
                          | "hkd"
                          | "krw"
                          | "inr"
                          | "vnd"
                          | undefined;
                  }
            >
        >;
    },
    "strip",
    z.ZodTypeAny,
    {
        recipient?:
            | {
                  email: string;
              }
            | {
                  walletAddress: string;
              }
            | undefined;
        locale?:
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
            | "Klingon"
            | undefined;
        payment?:
            | {
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
                      | "sei-atlantic-2-testnet";
                  currency: "usdc" | "degen" | "brett" | "toshi" | "eth" | "matic";
                  receiptEmail?: string | undefined;
                  payerAddress?: string | undefined;
              }
            | {
                  method: "solana";
                  currency: "usdc" | "bonk" | "wif" | "mother" | "sol";
                  receiptEmail?: string | undefined;
                  payerAddress?: string | undefined;
              }
            | {
                  method: "stripe-payment-element";
                  currency: "usd" | "eur" | "aud" | "gbp" | "jpy" | "sgd" | "hkd" | "krw" | "inr" | "vnd";
                  receiptEmail?: string | undefined;
              }
            | undefined;
    },
    {
        recipient?:
            | {
                  email: string;
              }
            | {
                  walletAddress: string;
              }
            | undefined;
        locale?:
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
            | "Klingon"
            | undefined;
        payment?:
            | {
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
                      | "sei-atlantic-2-testnet";
                  currency: "usdc" | "degen" | "brett" | "toshi" | "eth" | "matic";
                  receiptEmail?: string | undefined;
                  payerAddress?: string | undefined;
              }
            | {
                  method: "solana";
                  currency: "usdc" | "bonk" | "wif" | "mother" | "sol";
                  receiptEmail?: string | undefined;
                  payerAddress?: string | undefined;
              }
            | {
                  method: "stripe-payment-element";
                  receiptEmail?: string | undefined;
                  currency?: "usd" | "eur" | "aud" | "gbp" | "jpy" | "sgd" | "hkd" | "krw" | "inr" | "vnd" | undefined;
              }
            | undefined;
    }
>;

export { updateOrderInputSchema };
