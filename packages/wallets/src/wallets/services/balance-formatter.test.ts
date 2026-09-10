import { describe, expect, it } from "vitest";
import type { GetBalanceSuccessResponse } from "../../api";
import type { Chain } from "../../chains/chains";
import { formatBalanceResponse } from "./balance-formatter";

type ResponseToken = GetBalanceSuccessResponse[number];

const USDC_EVM_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const ethFields = { symbol: "eth", name: "Ethereum", amount: "1.5", rawAmount: "1500000000000000000", decimals: 18 };

function token(
    chain: string,
    fields: { symbol?: string; name?: string; amount?: string; rawAmount?: string; decimals?: number },
    chainExtra: Record<string, string> = {}
): ResponseToken {
    const { symbol, name, amount, rawAmount, decimals } = fields;
    return {
        symbol,
        name,
        amount,
        rawAmount,
        decimals,
        chains: { [chain]: { locator: `${chain}:${symbol ?? "unknown"}`, amount, rawAmount, ...chainExtra } },
    } as unknown as ResponseToken;
}

function zeroBalance(symbol: string, chainSpecific: Record<string, undefined>) {
    return { symbol, name: symbol, amount: "0", decimals: 0, rawAmount: "0", ...chainSpecific };
}

const chainFieldCases = [
    {
        label: "Solana",
        field: "mintHash",
        chain: "solana",
        nativeSymbol: "sol",
        native: { symbol: "sol", name: "Solana", amount: "10.5", rawAmount: "10500000000", decimals: 9 },
        usdc: { symbol: "usdc", name: "USD Coin", amount: "50.0", rawAmount: "50000000", decimals: 6 },
        value: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        absentOnNative: ["mintHash", "contractAddress"],
    },
    {
        label: "Stellar",
        field: "contractId",
        chain: "stellar",
        nativeSymbol: "xlm",
        native: { symbol: "xlm", name: "Stellar Lumens", amount: "100.0", rawAmount: "1000000000", decimals: 7 },
        usdc: { symbol: "usdc", name: "USD Coin", amount: "25.0", rawAmount: "25000000", decimals: 6 },
        value: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
        absentOnNative: ["contractId", "contractAddress"],
    },
    {
        label: "EVM",
        field: "contractAddress",
        chain: "base-sepolia",
        nativeSymbol: "eth",
        native: ethFields,
        usdc: { symbol: "usdc", name: "USD Coin", amount: "100.0", rawAmount: "100000000", decimals: 6 },
        value: USDC_EVM_ADDRESS,
        absentOnNative: ["contractAddress"],
    },
];

const responseWithExtras = [
    token("base-sepolia", {
        symbol: "eth",
        name: "Ethereum",
        amount: "1.0",
        rawAmount: "1000000000000000000",
        decimals: 18,
    }),
    token(
        "base-sepolia",
        { symbol: "usdc", name: "USD Coin", amount: "100.0", rawAmount: "100000000", decimals: 6 },
        { contractAddress: USDC_EVM_ADDRESS }
    ),
    token(
        "base-sepolia",
        { symbol: "dai", name: "Dai Stablecoin", amount: "50.0", rawAmount: "50000000000000000000", decimals: 18 },
        { contractAddress: DAI_ADDRESS }
    ),
    token(
        "base-sepolia",
        { symbol: "wbtc", name: "Wrapped BTC", amount: "0.5", rawAmount: "50000000", decimals: 8 },
        { contractAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" }
    ),
];

describe("formatBalanceResponse", () => {
    describe("account balance breakdown", () => {
        const usdc = {
            symbol: "usdc",
            name: "USDC",
            decimals: 7,
            amount: "1250.5",
            rawAmount: "12505000000",
            chains: {
                stellar: {
                    locator: "stellar:usdc",
                    contractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
                    amount: "1250.5",
                    rawAmount: "12505000000",
                    available: { amount: "1210.5", rawAmount: "12105000000" },
                    locked: { amount: "40", rawAmount: "400000000" },
                    accounts: [
                        {
                            type: "wallet",
                            amount: "250.5",
                            rawAmount: "2505000000",
                            available: { amount: "250.5", rawAmount: "2505000000" },
                            locked: { amount: "0", rawAmount: "0" },
                        },
                        {
                            type: "card",
                            provider: "rain",
                            amount: "1000",
                            rawAmount: "10000000000",
                            available: { amount: "960", rawAmount: "9600000000" },
                            locked: { amount: "40", rawAmount: "400000000" },
                        },
                    ],
                },
            },
        } satisfies ResponseToken;

        it("preserves available, locked, and account balances alongside the total", () => {
            const balances = formatBalanceResponse([usdc], "stellar", "xlm");

            expect(balances.usdc).toStrictEqual({
                symbol: "usdc",
                name: "USDC",
                amount: "1250.5",
                rawAmount: "12505000000",
                decimals: 7,
                contractId: usdc.chains.stellar.contractId,
                available: usdc.chains.stellar.available,
                locked: usdc.chains.stellar.locked,
                accounts: usdc.chains.stellar.accounts,
            });
            const card = balances.usdc.accounts?.find((account) => account.type === "card");
            expect(card?.available.amount).toBe("960");
            expect(card?.locked.rawAmount).toBe("400000000");
        });

        it("keeps MGUSD without a card as a plain balance alongside enriched USDC", () => {
            const mgusd = token(
                "stellar",
                { symbol: "mgusd", name: "MGUSD", amount: "25", rawAmount: "250000000", decimals: 7 },
                { contractId: "CDK2LDSYUKPEFN3HNE7K7ETUT3VIOBHSOXAK5CTO4A4RKKZQUCAIWCJA" }
            );

            const balances = formatBalanceResponse([usdc, mgusd], "stellar", "xlm", ["usdc", "mgusd"]);

            expect(balances.usdc.available?.amount).toBe("1210.5");
            expect(balances.tokens).toStrictEqual([
                {
                    symbol: "mgusd",
                    name: "MGUSD",
                    amount: "25",
                    rawAmount: "250000000",
                    decimals: 7,
                    contractId: "CDK2LDSYUKPEFN3HNE7K7ETUT3VIOBHSOXAK5CTO4A4RKKZQUCAIWCJA",
                },
            ]);
        });

        it("preserves breakdowns on additional requested tokens", () => {
            const otherToken = { ...usdc, symbol: "other-token" };

            const balances = formatBalanceResponse([otherToken], "stellar", "xlm", ["other-token"]);

            expect(balances.tokens[0].available).toEqual(usdc.chains.stellar.available);
            expect(balances.tokens[0].locked).toEqual(usdc.chains.stellar.locked);
            expect(balances.tokens[0].accounts).toEqual(usdc.chains.stellar.accounts);
        });

        it("only includes the requested chain's account breakdown", () => {
            const response = {
                ...usdc,
                amount: "1255.5",
                rawAmount: "12555000000",
                chains: {
                    ...usdc.chains,
                    "base-sepolia": {
                        locator: `base-sepolia:${USDC_EVM_ADDRESS}`,
                        contractAddress: USDC_EVM_ADDRESS,
                        amount: "5",
                        rawAmount: "50000000",
                    },
                },
            } satisfies ResponseToken;

            const balances = formatBalanceResponse([response], "base-sepolia", "eth");

            expect(balances.usdc.amount).toBe("1255.5");
            expect(balances.usdc).not.toHaveProperty("available");
            expect(balances.usdc).not.toHaveProperty("locked");
            expect(balances.usdc).not.toHaveProperty("accounts");
        });
    });

    describe("chain-specific token fields", () => {
        it.each(chainFieldCases)(
            "includes $field on token balances for $label chain",
            ({ field, chain, nativeSymbol, native, usdc, value, absentOnNative }) => {
                const response = [token(chain, native), token(chain, usdc, { [field]: value })];

                const balances = formatBalanceResponse(response, chain as Chain, nativeSymbol);

                expect((balances.usdc as Record<string, string>)[field]).toBe(value);
                for (const key of absentOnNative) {
                    expect(balances.nativeToken).not.toHaveProperty(key);
                }
            }
        );
    });

    describe("default token synthesis", () => {
        it("synthesizes default usdc token with full zero-balance shape when response omits usdc", () => {
            const balances = formatBalanceResponse([token("base-sepolia", ethFields)], "base-sepolia", "eth");

            expect(balances.usdc).toStrictEqual(zeroBalance("usdc", { contractAddress: undefined }));
        });

        it("synthesizes default native and usdc tokens with full shape from an empty response", () => {
            const balances = formatBalanceResponse([] as GetBalanceSuccessResponse, "base-sepolia", "eth");

            expect(balances.nativeToken).toStrictEqual(zeroBalance("eth", { contractAddress: undefined }));
            expect(balances.usdc).toStrictEqual(zeroBalance("usdc", { contractAddress: undefined }));
            expect(balances.tokens).toEqual([]);
        });

        it.each([
            {
                label: "Solana",
                field: "mintHash",
                chain: "solana",
                nativeSymbol: "sol",
                shape: { mintHash: undefined },
            },
            {
                label: "Stellar",
                field: "contractId",
                chain: "stellar",
                nativeSymbol: "xlm",
                shape: { contractId: undefined },
            },
        ])("synthesized default usdc token carries $field: undefined on $label", ({ chain, nativeSymbol, shape }) => {
            const balances = formatBalanceResponse([] as GetBalanceSuccessResponse, chain as Chain, nativeSymbol);

            expect(balances.usdc).toStrictEqual(zeroBalance("usdc", shape));
        });
    });

    describe("requested-token filtering", () => {
        it("filters out response tokens not in the requested tokens list", () => {
            const balances = formatBalanceResponse(responseWithExtras, "base-sepolia", "eth", ["dai"]);

            expect(balances.tokens.map((t) => t.symbol)).toEqual(["dai"]);
        });

        it("includes all extra response tokens when no tokens filter is requested", () => {
            const balances = formatBalanceResponse(responseWithExtras, "base-sepolia", "eth");

            expect(balances.tokens.map((t) => t.symbol)).toEqual(["dai", "wbtc"]);
        });

        it("returns zero extra tokens when requestedTokens is an empty array", () => {
            const balances = formatBalanceResponse(responseWithExtras, "base-sepolia", "eth", []);

            expect(balances.tokens).toEqual([]);
        });
    });

    describe("locator-based token matching", () => {
        it("matches EVM token by chain-prefixed contractAddress locator", () => {
            const balances = formatBalanceResponse(responseWithExtras, "base-sepolia", "eth", [
                `base-sepolia:${DAI_ADDRESS}`,
            ]);

            expect(balances.tokens.map((t) => t.symbol)).toEqual(["dai"]);
        });

        it("matches EVM token by bare contractAddress", () => {
            const balances = formatBalanceResponse(responseWithExtras, "base-sepolia", "eth", [DAI_ADDRESS]);

            expect(balances.tokens.map((t) => t.symbol)).toEqual(["dai"]);
        });

        it("matches Solana token by prefixed mintHash locator", () => {
            const mintHash = "XsbEhpSupF7MgvGDjRBj9VXMbRzNmj7ECqcNQNHPPPP";
            const response = [
                token("solana", {
                    symbol: "sol",
                    name: "Solana",
                    amount: "10.0",
                    rawAmount: "10000000000",
                    decimals: 9,
                }),
                token(
                    "solana",
                    { symbol: "usdc", name: "USD Coin", amount: "50.0", rawAmount: "50000000", decimals: 6 },
                    { mintHash: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }
                ),
                token(
                    "solana",
                    { symbol: "AAPLx", name: "Apple Token", amount: "5.0", rawAmount: "5000000", decimals: 6 },
                    { mintHash }
                ),
            ];

            const balances = formatBalanceResponse(response, "solana", "sol", [`solana:${mintHash}`]);

            expect(balances.tokens.map((t) => t.symbol)).toEqual(["AAPLx"]);
        });

        it("matches Solana token by bare mintHash", () => {
            const mintHash = "XsbEhpSupF7MgvGDjRBj9VXMbRzNmj7ECqcNQNHPPPP";
            const response = [
                token("solana", {
                    symbol: "sol",
                    name: "Solana",
                    amount: "10.0",
                    rawAmount: "10000000000",
                    decimals: 9,
                }),
                token(
                    "solana",
                    { symbol: "usdc", name: "USD Coin", amount: "50.0", rawAmount: "50000000", decimals: 6 },
                    { mintHash: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }
                ),
                token(
                    "solana",
                    { symbol: "AAPLx", name: "Apple Token", amount: "5.0", rawAmount: "5000000", decimals: 6 },
                    { mintHash }
                ),
            ];

            const balances = formatBalanceResponse(response, "solana", "sol", [mintHash]);

            expect(balances.tokens.map((t) => t.symbol)).toEqual(["AAPLx"]);
        });

        it("matches Stellar token by prefixed contractId locator", () => {
            const contractId = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
            const response = [
                token("stellar", {
                    symbol: "xlm",
                    name: "Stellar Lumens",
                    amount: "100.0",
                    rawAmount: "1000000000",
                    decimals: 7,
                }),
                token(
                    "stellar",
                    { symbol: "usdc", name: "USD Coin", amount: "25.0", rawAmount: "25000000", decimals: 6 },
                    { contractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA" }
                ),
                token(
                    "stellar",
                    { symbol: "yUSDC", name: "Yield USDC", amount: "10.0", rawAmount: "10000000", decimals: 6 },
                    { contractId }
                ),
            ];

            const balances = formatBalanceResponse(response, "stellar", "xlm", [`stellar:${contractId}`]);

            expect(balances.tokens.map((t) => t.symbol)).toEqual(["yUSDC"]);
        });

        it("matches Stellar token by bare contractId", () => {
            const contractId = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
            const response = [
                token("stellar", {
                    symbol: "xlm",
                    name: "Stellar Lumens",
                    amount: "100.0",
                    rawAmount: "1000000000",
                    decimals: 7,
                }),
                token(
                    "stellar",
                    { symbol: "usdc", name: "USD Coin", amount: "25.0", rawAmount: "25000000", decimals: 6 },
                    { contractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA" }
                ),
                token(
                    "stellar",
                    { symbol: "yUSDC", name: "Yield USDC", amount: "10.0", rawAmount: "10000000", decimals: 6 },
                    { contractId }
                ),
            ];

            const balances = formatBalanceResponse(response, "stellar", "xlm", [contractId]);

            expect(balances.tokens.map((t) => t.symbol)).toEqual(["yUSDC"]);
        });

        it("performs case-insensitive matching for locators", () => {
            const mintHash = "XsbEhpSupF7MgvGDjRBj9VXMbRzNmj7ECqcNQNHPPPP";
            const response = [
                token("solana", {
                    symbol: "sol",
                    name: "Solana",
                    amount: "10.0",
                    rawAmount: "10000000000",
                    decimals: 9,
                }),
                token(
                    "solana",
                    { symbol: "usdc", name: "USD Coin", amount: "50.0", rawAmount: "50000000", decimals: 6 },
                    { mintHash: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }
                ),
                token(
                    "solana",
                    { symbol: "AAPLx", name: "Apple Token", amount: "5.0", rawAmount: "5000000", decimals: 6 },
                    { mintHash }
                ),
            ];

            const balances = formatBalanceResponse(response, "solana", "sol", [`SOLANA:${mintHash.toUpperCase()}`]);

            expect(balances.tokens.map((t) => t.symbol)).toEqual(["AAPLx"]);
        });
    });

    describe("nullish-coalescing defaults on transformed tokens", () => {
        it("defaults missing symbol/name/amount/rawAmount and passes decimals through", () => {
            const response = [token("base-sepolia", { decimals: 18 }, { contractAddress: DAI_ADDRESS })];

            const balances = formatBalanceResponse(response, "base-sepolia", "eth");

            expect(balances.tokens).toStrictEqual([
                { symbol: "", name: "", amount: "0", decimals: 18, rawAmount: "0", contractAddress: DAI_ADDRESS },
            ]);
        });

        it("leaves decimals undefined when the response omits it", () => {
            const response = [
                token(
                    "base-sepolia",
                    { symbol: "dai", name: "Dai Stablecoin", amount: "50.0", rawAmount: "50000000000000000000" },
                    { contractAddress: DAI_ADDRESS }
                ),
            ];

            const balances = formatBalanceResponse(response, "base-sepolia", "eth");

            expect(balances.tokens).toStrictEqual([
                {
                    symbol: "dai",
                    name: "Dai Stablecoin",
                    amount: "50.0",
                    decimals: undefined,
                    rawAmount: "50000000000000000000",
                    contractAddress: DAI_ADDRESS,
                },
            ]);
        });
    });
});
