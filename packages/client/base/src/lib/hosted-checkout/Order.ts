type JSONValue = string | number | boolean | JSONValue[] | { [key: string]: JSONValue } | null;

type Order = {
    orderId: string;
    phase: "quote" | "payment" | "delivery" | "completed";
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
    lineItems: Array<
        | {
              chain:
                  | "solana"
                  | "sui"
                  | "aptos"
                  | "xion"
                  | "stellar"
                  | "arbitrum-sepolia"
                  | "arc-testnet"
                  | "avalanche-fuji"
                  | "curtis"
                  | "base-goerli"
                  | "base-sepolia"
                  | "bsc-testnet"
                  | "chiliz-spicy-testnet"
                  | "coti-testnet"
                  | "ethereum-goerli"
                  | "ethereum-sepolia"
                  | "hedera-testnet"
                  | "hypersonic-testnet"
                  | "lightlink-pegasus"
                  | "mantle-sepolia"
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
                  | "u2u-nebulas"
                  | "zenchain-testnet"
                  | "abstract-testnet"
                  | "world-chain-sepolia"
                  | "plume-testnet"
                  | "flow-testnet"
                  | "tempo-testnet"
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
                  | "hedera"
                  | "coti"
                  | "lightlink"
                  | "mantle"
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
                  | "story"
                  | "u2u-solaris"
                  | "abstract"
                  | "world-chain"
                  | "plume"
                  | "flow"
                  | "tempo";
              metadata: {
                  name: string;
                  description: string;
                  imageUrl: string;
                  collection?:
                      | { name?: string | undefined; description?: string | undefined; imageUrl?: string | undefined }
                      | undefined;
              };
              quote:
                  | {
                        status: "item-unavailable" | "valid" | "expired" | "requires-recipient";
                        unavailabilityReason?: { code: "to" | "do"; message: string } | undefined;
                        charges?:
                            | {
                                  unit: {
                                      amount: string;
                                      currency:
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
                                          | "eth"
                                          | "sol"
                                          | "matic"
                                          | "usdc"
                                          | "usdxm"
                                          | "degen"
                                          | "bonk"
                                          | "phantom-cash"
                                          | "eurc"
                                          | "superverse"
                                          | "chz"
                                          | "pirate"
                                          | "sui"
                                          | "credit"
                                          | "wld"
                                          | "keycat"
                                          | "doginme"
                                          | "ski"
                                          | "russell"
                                          | "miggles"
                                          | "benji"
                                          | "mochi"
                                          | "$mfer"
                                          | "tybg"
                                          | "toby"
                                          | "tibbir";
                                  };
                                  crossmintFees?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  gas?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  salesTax?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  shipping?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  networkFee?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  fees?:
                                      | {
                                            type: "exact";
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | {
                                            type: "worst-case";
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                              }
                            | undefined;
                        totalPrice?:
                            | {
                                  amount: string;
                                  currency:
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
                                      | "eth"
                                      | "sol"
                                      | "matic"
                                      | "usdc"
                                      | "usdxm"
                                      | "degen"
                                      | "bonk"
                                      | "phantom-cash"
                                      | "eurc"
                                      | "superverse"
                                      | "chz"
                                      | "pirate"
                                      | "sui"
                                      | "credit"
                                      | "wld"
                                      | "keycat"
                                      | "doginme"
                                      | "ski"
                                      | "russell"
                                      | "miggles"
                                      | "benji"
                                      | "mochi"
                                      | "$mfer"
                                      | "tybg"
                                      | "toby"
                                      | "tibbir";
                              }
                            | undefined;
                    }
                  | {
                        status: "item-unavailable" | "valid" | "expired" | "requires-recipient";
                        quantityRange: { lowerBound: string; upperBound: string };
                        unavailabilityReason?: { code: "to" | "do"; message: string } | undefined;
                        charges?:
                            | {
                                  unit: {
                                      amount: string;
                                      currency:
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
                                          | "eth"
                                          | "sol"
                                          | "matic"
                                          | "usdc"
                                          | "usdxm"
                                          | "degen"
                                          | "bonk"
                                          | "phantom-cash"
                                          | "eurc"
                                          | "superverse"
                                          | "chz"
                                          | "pirate"
                                          | "sui"
                                          | "credit"
                                          | "wld"
                                          | "keycat"
                                          | "doginme"
                                          | "ski"
                                          | "russell"
                                          | "miggles"
                                          | "benji"
                                          | "mochi"
                                          | "$mfer"
                                          | "tybg"
                                          | "toby"
                                          | "tibbir";
                                  };
                                  crossmintFees?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  gas?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  salesTax?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  shipping?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  networkFee?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  fees?:
                                      | {
                                            type: "exact";
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | {
                                            type: "worst-case";
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                              }
                            | undefined;
                        totalPrice?:
                            | {
                                  amount: string;
                                  currency:
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
                                      | "eth"
                                      | "sol"
                                      | "matic"
                                      | "usdc"
                                      | "usdxm"
                                      | "degen"
                                      | "bonk"
                                      | "phantom-cash"
                                      | "eurc"
                                      | "superverse"
                                      | "chz"
                                      | "pirate"
                                      | "sui"
                                      | "credit"
                                      | "wld"
                                      | "keycat"
                                      | "doginme"
                                      | "ski"
                                      | "russell"
                                      | "miggles"
                                      | "benji"
                                      | "mochi"
                                      | "$mfer"
                                      | "tybg"
                                      | "toby"
                                      | "tibbir";
                              }
                            | undefined;
                    };
              delivery:
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
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  email: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | { locator: string; bankAccountId: string }
                            | undefined;
                    }
                  | {
                        status: "failed";
                        recipient?:
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  email: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | { locator: string; bankAccountId: string }
                            | undefined;
                        failureReason?: { code: "slippage-tolerance-exceeded" } | undefined;
                    }
                  | {
                        status: "completed";
                        recipient?:
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  email: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | { locator: string; bankAccountId: string }
                            | undefined;
                    }
                  | {
                        status: "completed";
                        txId: string;
                        tokens: Array<
                            | { contractAddress: string; tokenId: string; locator: string }
                            | {
                                  contractAddress: string;
                                  tokenId: string;
                                  locator: string;
                                  symbol: string;
                                  quantity: string;
                                  decimals?: number | undefined;
                              }
                            | { mintHash: string; locator: string }
                            | {
                                  mintHash: string;
                                  locator: string;
                                  symbol: string;
                                  quantity: string;
                                  decimals?: number | undefined;
                              }
                            | {
                                  contractId: string;
                                  locator: string;
                                  symbol: string;
                                  quantity: string;
                                  decimals?: number | undefined;
                              }
                        >;
                        recipient?:
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  email: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | { locator: string; bankAccountId: string }
                            | undefined;
                    };
              executionMode: "exact-out";
              quantity: number;
              callData?: Record<string, any> | undefined;
              executionParams?: Record<string, any> | undefined;
          }
        | {
              chain:
                  | "solana"
                  | "sui"
                  | "aptos"
                  | "xion"
                  | "stellar"
                  | "arbitrum-sepolia"
                  | "arc-testnet"
                  | "avalanche-fuji"
                  | "curtis"
                  | "base-goerli"
                  | "base-sepolia"
                  | "bsc-testnet"
                  | "chiliz-spicy-testnet"
                  | "coti-testnet"
                  | "ethereum-goerli"
                  | "ethereum-sepolia"
                  | "hedera-testnet"
                  | "hypersonic-testnet"
                  | "lightlink-pegasus"
                  | "mantle-sepolia"
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
                  | "u2u-nebulas"
                  | "zenchain-testnet"
                  | "abstract-testnet"
                  | "world-chain-sepolia"
                  | "plume-testnet"
                  | "flow-testnet"
                  | "tempo-testnet"
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
                  | "hedera"
                  | "coti"
                  | "lightlink"
                  | "mantle"
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
                  | "story"
                  | "u2u-solaris"
                  | "abstract"
                  | "world-chain"
                  | "plume"
                  | "flow"
                  | "tempo";
              metadata: {
                  name: string;
                  description: string;
                  imageUrl: string;
                  collection?:
                      | { name?: string | undefined; description?: string | undefined; imageUrl?: string | undefined }
                      | undefined;
              };
              quote:
                  | {
                        status: "item-unavailable" | "valid" | "expired" | "requires-recipient";
                        unavailabilityReason?: { code: "to" | "do"; message: string } | undefined;
                        charges?:
                            | {
                                  unit: {
                                      amount: string;
                                      currency:
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
                                          | "eth"
                                          | "sol"
                                          | "matic"
                                          | "usdc"
                                          | "usdxm"
                                          | "degen"
                                          | "bonk"
                                          | "phantom-cash"
                                          | "eurc"
                                          | "superverse"
                                          | "chz"
                                          | "pirate"
                                          | "sui"
                                          | "credit"
                                          | "wld"
                                          | "keycat"
                                          | "doginme"
                                          | "ski"
                                          | "russell"
                                          | "miggles"
                                          | "benji"
                                          | "mochi"
                                          | "$mfer"
                                          | "tybg"
                                          | "toby"
                                          | "tibbir";
                                  };
                                  crossmintFees?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  gas?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  salesTax?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  shipping?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  networkFee?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  fees?:
                                      | {
                                            type: "exact";
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | {
                                            type: "worst-case";
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                              }
                            | undefined;
                        totalPrice?:
                            | {
                                  amount: string;
                                  currency:
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
                                      | "eth"
                                      | "sol"
                                      | "matic"
                                      | "usdc"
                                      | "usdxm"
                                      | "degen"
                                      | "bonk"
                                      | "phantom-cash"
                                      | "eurc"
                                      | "superverse"
                                      | "chz"
                                      | "pirate"
                                      | "sui"
                                      | "credit"
                                      | "wld"
                                      | "keycat"
                                      | "doginme"
                                      | "ski"
                                      | "russell"
                                      | "miggles"
                                      | "benji"
                                      | "mochi"
                                      | "$mfer"
                                      | "tybg"
                                      | "toby"
                                      | "tibbir";
                              }
                            | undefined;
                    }
                  | {
                        status: "item-unavailable" | "valid" | "expired" | "requires-recipient";
                        quantityRange: { lowerBound: string; upperBound: string };
                        unavailabilityReason?: { code: "to" | "do"; message: string } | undefined;
                        charges?:
                            | {
                                  unit: {
                                      amount: string;
                                      currency:
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
                                          | "eth"
                                          | "sol"
                                          | "matic"
                                          | "usdc"
                                          | "usdxm"
                                          | "degen"
                                          | "bonk"
                                          | "phantom-cash"
                                          | "eurc"
                                          | "superverse"
                                          | "chz"
                                          | "pirate"
                                          | "sui"
                                          | "credit"
                                          | "wld"
                                          | "keycat"
                                          | "doginme"
                                          | "ski"
                                          | "russell"
                                          | "miggles"
                                          | "benji"
                                          | "mochi"
                                          | "$mfer"
                                          | "tybg"
                                          | "toby"
                                          | "tibbir";
                                  };
                                  crossmintFees?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  gas?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  salesTax?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  shipping?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  networkFee?:
                                      | {
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                                  fees?:
                                      | {
                                            type: "exact";
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | {
                                            type: "worst-case";
                                            amount: string;
                                            currency:
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
                                                | "eth"
                                                | "sol"
                                                | "matic"
                                                | "usdc"
                                                | "usdxm"
                                                | "degen"
                                                | "bonk"
                                                | "phantom-cash"
                                                | "eurc"
                                                | "superverse"
                                                | "chz"
                                                | "pirate"
                                                | "sui"
                                                | "credit"
                                                | "wld"
                                                | "keycat"
                                                | "doginme"
                                                | "ski"
                                                | "russell"
                                                | "miggles"
                                                | "benji"
                                                | "mochi"
                                                | "$mfer"
                                                | "tybg"
                                                | "toby"
                                                | "tibbir";
                                        }
                                      | undefined;
                              }
                            | undefined;
                        totalPrice?:
                            | {
                                  amount: string;
                                  currency:
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
                                      | "eth"
                                      | "sol"
                                      | "matic"
                                      | "usdc"
                                      | "usdxm"
                                      | "degen"
                                      | "bonk"
                                      | "phantom-cash"
                                      | "eurc"
                                      | "superverse"
                                      | "chz"
                                      | "pirate"
                                      | "sui"
                                      | "credit"
                                      | "wld"
                                      | "keycat"
                                      | "doginme"
                                      | "ski"
                                      | "russell"
                                      | "miggles"
                                      | "benji"
                                      | "mochi"
                                      | "$mfer"
                                      | "tybg"
                                      | "toby"
                                      | "tibbir";
                              }
                            | undefined;
                    };
              delivery:
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
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  email: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | { locator: string; bankAccountId: string }
                            | undefined;
                    }
                  | {
                        status: "failed";
                        recipient?:
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  email: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | { locator: string; bankAccountId: string }
                            | undefined;
                        failureReason?: { code: "slippage-tolerance-exceeded" } | undefined;
                    }
                  | {
                        status: "completed";
                        recipient?:
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  email: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | { locator: string; bankAccountId: string }
                            | undefined;
                    }
                  | {
                        status: "completed";
                        txId: string;
                        tokens: Array<
                            | { contractAddress: string; tokenId: string; locator: string }
                            | {
                                  contractAddress: string;
                                  tokenId: string;
                                  locator: string;
                                  symbol: string;
                                  quantity: string;
                                  decimals?: number | undefined;
                              }
                            | { mintHash: string; locator: string }
                            | {
                                  mintHash: string;
                                  locator: string;
                                  symbol: string;
                                  quantity: string;
                                  decimals?: number | undefined;
                              }
                            | {
                                  contractId: string;
                                  locator: string;
                                  symbol: string;
                                  quantity: string;
                                  decimals?: number | undefined;
                              }
                        >;
                        recipient?:
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | {
                                  walletAddress: string;
                                  locator: string;
                                  email: string;
                                  physicalAddress?:
                                      | {
                                            name: string;
                                            line1: string;
                                            line2: string;
                                            city: string;
                                            state?: string | undefined;
                                            stateOrRegion?: string | undefined;
                                            postalCode: string;
                                            country: string;
                                        }
                                      | undefined;
                              }
                            | { locator: string; bankAccountId: string }
                            | undefined;
                    };
              executionMode: "exact-in";
              maxSlippageBps: string;
              callData?: Record<string, any> | undefined;
              executionParams?: Record<string, any> | undefined;
          }
    >;
    quote: {
        status: "valid" | "expired" | "requires-recipient" | "requires-physical-address" | "all-line-items-unavailable";
        quotedAt?: string | undefined;
        expiresAt?: string | undefined;
        totalPrice?:
            | {
                  amount: string;
                  currency:
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
                      | "eth"
                      | "sol"
                      | "matic"
                      | "usdc"
                      | "usdxm"
                      | "degen"
                      | "bonk"
                      | "phantom-cash"
                      | "eurc"
                      | "superverse"
                      | "chz"
                      | "pirate"
                      | "sui"
                      | "credit"
                      | "wld"
                      | "keycat"
                      | "doginme"
                      | "ski"
                      | "russell"
                      | "miggles"
                      | "benji"
                      | "mochi"
                      | "$mfer"
                      | "tybg"
                      | "toby"
                      | "tibbir";
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
            | "requires-kyc"
            | "manual-kyc"
            | "failed-kyc"
            | "requires-recipient-verification"
            | "crypto-payer-insufficient-funds"
            | "crypto-payer-insufficient-funds-for-gas"
            | "pending-kyc-review";
        method:
            | "arbitrum-sepolia"
            | "arc-testnet"
            | "avalanche-fuji"
            | "curtis"
            | "base-goerli"
            | "base-sepolia"
            | "bsc-testnet"
            | "chiliz-spicy-testnet"
            | "coti-testnet"
            | "ethereum-goerli"
            | "ethereum-sepolia"
            | "hedera-testnet"
            | "hypersonic-testnet"
            | "lightlink-pegasus"
            | "mantle-sepolia"
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
            | "u2u-nebulas"
            | "zenchain-testnet"
            | "abstract-testnet"
            | "world-chain-sepolia"
            | "plume-testnet"
            | "flow-testnet"
            | "tempo-testnet"
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
            | "hedera"
            | "coti"
            | "lightlink"
            | "mantle"
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
            | "story"
            | "u2u-solaris"
            | "abstract"
            | "world-chain"
            | "plume"
            | "flow"
            | "tempo"
            | "solana"
            | "stripe-payment-element"
            | "checkoutcom-flow"
            | "card-token"
            | "basis-theory"
            | "card";
        currency:
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
            | "eth"
            | "sol"
            | "matic"
            | "usdc"
            | "usdxm"
            | "degen"
            | "bonk"
            | "phantom-cash"
            | "eurc"
            | "superverse"
            | "chz"
            | "pirate"
            | "sui"
            | "credit"
            | "wld"
            | "keycat"
            | "doginme"
            | "ski"
            | "russell"
            | "miggles"
            | "benji"
            | "mochi"
            | "$mfer"
            | "tybg"
            | "toby"
            | "tibbir";
        failureReason?:
            | { code: string; message?: string | undefined }
            | {
                  code: "unknown" | "tx-id-not-found" | "insufficient-funds" | "insufficient-gas";
                  message?: string | undefined;
              }
            | undefined;
        preparation?:
            | {
                  chain?:
                      | "solana"
                      | "sui"
                      | "aptos"
                      | "xion"
                      | "stellar"
                      | "arbitrum-sepolia"
                      | "arc-testnet"
                      | "avalanche-fuji"
                      | "curtis"
                      | "base-goerli"
                      | "base-sepolia"
                      | "bsc-testnet"
                      | "chiliz-spicy-testnet"
                      | "coti-testnet"
                      | "ethereum-goerli"
                      | "ethereum-sepolia"
                      | "hedera-testnet"
                      | "hypersonic-testnet"
                      | "lightlink-pegasus"
                      | "mantle-sepolia"
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
                      | "u2u-nebulas"
                      | "zenchain-testnet"
                      | "abstract-testnet"
                      | "world-chain-sepolia"
                      | "plume-testnet"
                      | "flow-testnet"
                      | "tempo-testnet"
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
                      | "hedera"
                      | "coti"
                      | "lightlink"
                      | "mantle"
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
                      | "story"
                      | "u2u-solaris"
                      | "abstract"
                      | "world-chain"
                      | "plume"
                      | "flow"
                      | "tempo"
                      | undefined;
                  payerAddress?: string | undefined;
                  serializedTransaction?: string | undefined;
                  transactionParameters?: { amount: string; memo: string } | undefined;
              }
            | {
                  checkoutcomPublicKey: string;
                  checkoutcomPaymentSession?:
                      | {
                            id: string;
                            payment_session_secret: string;
                            payment_session_token: string;
                            _links: { self: { href: string } };
                        }
                      | undefined;
              }
            | {
                  stripePublishableKey: string;
                  stripeClientSecret?: string | undefined;
                  stripeEphemeralKeySecret?: string | undefined;
              }
            | {
                  kyc: {
                      provider: "persona";
                      inquiryId: string;
                      environmentId: string;
                      sessionToken?: string | undefined;
                  };
              }
            | { message: string }
            | undefined;
        received?:
            | {
                  amount: string;
                  currency:
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
                      | "eth"
                      | "sol"
                      | "matic"
                      | "usdc"
                      | "usdxm"
                      | "degen"
                      | "bonk"
                      | "phantom-cash"
                      | "eurc"
                      | "superverse"
                      | "chz"
                      | "pirate"
                      | "sui"
                      | "credit"
                      | "wld"
                      | "keycat"
                      | "doginme"
                      | "ski"
                      | "russell"
                      | "miggles"
                      | "benji"
                      | "mochi"
                      | "$mfer"
                      | "tybg"
                      | "toby"
                      | "tibbir";
              }
            | {
                  amount: string;
                  currency:
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
                      | "eth"
                      | "sol"
                      | "matic"
                      | "usdc"
                      | "usdxm"
                      | "degen"
                      | "bonk"
                      | "phantom-cash"
                      | "eurc"
                      | "superverse"
                      | "chz"
                      | "pirate"
                      | "sui"
                      | "credit"
                      | "wld"
                      | "keycat"
                      | "doginme"
                      | "ski"
                      | "russell"
                      | "miggles"
                      | "benji"
                      | "mochi"
                      | "$mfer"
                      | "tybg"
                      | "toby"
                      | "tibbir";
                  txId: string;
                  chain:
                      | "solana"
                      | "sui"
                      | "aptos"
                      | "xion"
                      | "stellar"
                      | "arbitrum-sepolia"
                      | "arc-testnet"
                      | "avalanche-fuji"
                      | "curtis"
                      | "base-goerli"
                      | "base-sepolia"
                      | "bsc-testnet"
                      | "chiliz-spicy-testnet"
                      | "coti-testnet"
                      | "ethereum-goerli"
                      | "ethereum-sepolia"
                      | "hedera-testnet"
                      | "hypersonic-testnet"
                      | "lightlink-pegasus"
                      | "mantle-sepolia"
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
                      | "u2u-nebulas"
                      | "zenchain-testnet"
                      | "abstract-testnet"
                      | "world-chain-sepolia"
                      | "plume-testnet"
                      | "flow-testnet"
                      | "tempo-testnet"
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
                      | "hedera"
                      | "coti"
                      | "lightlink"
                      | "mantle"
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
                      | "story"
                      | "u2u-solaris"
                      | "abstract"
                      | "world-chain"
                      | "plume"
                      | "flow"
                      | "tempo";
              }
            | undefined;
        refunded?:
            | {
                  amount: string;
                  currency:
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
                      | "eth"
                      | "sol"
                      | "matic"
                      | "usdc"
                      | "usdxm"
                      | "degen"
                      | "bonk"
                      | "phantom-cash"
                      | "eurc"
                      | "superverse"
                      | "chz"
                      | "pirate"
                      | "sui"
                      | "credit"
                      | "wld"
                      | "keycat"
                      | "doginme"
                      | "ski"
                      | "russell"
                      | "miggles"
                      | "benji"
                      | "mochi"
                      | "$mfer"
                      | "tybg"
                      | "toby"
                      | "tibbir";
              }
            | {
                  amount: string;
                  currency:
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
                      | "eth"
                      | "sol"
                      | "matic"
                      | "usdc"
                      | "usdxm"
                      | "degen"
                      | "bonk"
                      | "phantom-cash"
                      | "eurc"
                      | "superverse"
                      | "chz"
                      | "pirate"
                      | "sui"
                      | "credit"
                      | "wld"
                      | "keycat"
                      | "doginme"
                      | "ski"
                      | "russell"
                      | "miggles"
                      | "benji"
                      | "mochi"
                      | "$mfer"
                      | "tybg"
                      | "toby"
                      | "tibbir";
                  txId: string;
                  chain:
                      | "solana"
                      | "sui"
                      | "aptos"
                      | "xion"
                      | "stellar"
                      | "arbitrum-sepolia"
                      | "arc-testnet"
                      | "avalanche-fuji"
                      | "curtis"
                      | "base-goerli"
                      | "base-sepolia"
                      | "bsc-testnet"
                      | "chiliz-spicy-testnet"
                      | "coti-testnet"
                      | "ethereum-goerli"
                      | "ethereum-sepolia"
                      | "hedera-testnet"
                      | "hypersonic-testnet"
                      | "lightlink-pegasus"
                      | "mantle-sepolia"
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
                      | "u2u-nebulas"
                      | "zenchain-testnet"
                      | "abstract-testnet"
                      | "world-chain-sepolia"
                      | "plume-testnet"
                      | "flow-testnet"
                      | "tempo-testnet"
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
                      | "hedera"
                      | "coti"
                      | "lightlink"
                      | "mantle"
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
                      | "story"
                      | "u2u-solaris"
                      | "abstract"
                      | "world-chain"
                      | "plume"
                      | "flow"
                      | "tempo";
              }
            | undefined;
        receiptEmail?: string | undefined;
    };
    metadata?: Record<string, JSONValue> | undefined;
    legal?:
        | {
              requirements: Array<{
                  display: "show-text" | "show-checkbox";
                  type: "privacy-policy" | "crossmint-terms-of-service" | "crossmint-privacy-policy";
                  url: string;
              }>;
          }
        | undefined;
};

export { type Order };
