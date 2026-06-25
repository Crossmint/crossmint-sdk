import type { GetBalanceSuccessResponse } from "../../api";
import type { Balances, TokenBalance } from "../types";
import type { Chain } from "../../chains/chains";
import { getChainAdapter } from "../../chains/chain-adapter";

function toTokenBalance<C extends Chain>(tokenData: GetBalanceSuccessResponse[number], chain: C): TokenBalance<C> {
    const chainData = tokenData.chains?.[chain];

    const chainSpecificField = getChainAdapter(chain).balanceTokenFields(chainData);

    return {
        symbol: tokenData.symbol ?? "",
        name: tokenData.name ?? "",
        amount: tokenData.amount ?? "0",
        decimals: tokenData.decimals,
        rawAmount: tokenData.rawAmount ?? "0",
        ...chainSpecificField,
    } as TokenBalance<C>;
}

function emptyTokenBalance<C extends Chain>(symbol: TokenBalance["symbol"], chain: C): TokenBalance<C> {
    const baseToken = {
        symbol,
        name: symbol,
        amount: "0",
        decimals: 0,
        rawAmount: "0",
    };

    const chainSpecificField = getChainAdapter(chain).emptyBalanceTokenFields();

    return {
        ...baseToken,
        ...chainSpecificField,
    } as TokenBalance<C>;
}

export function formatBalanceResponse<C extends Chain>(
    response: GetBalanceSuccessResponse,
    chain: C,
    nativeTokenSymbol: TokenBalance["symbol"],
    requestedTokens?: string[]
): Balances<C> {
    const nativeTokenData = response.find((token) => token.symbol === nativeTokenSymbol);
    const usdcData = response.find((token) => token.symbol === "usdc");

    const otherTokens = response.filter((token) => {
        return (
            token.symbol !== nativeTokenSymbol &&
            token.symbol !== "usdc" &&
            (requestedTokens == null || requestedTokens.includes(token.symbol ?? ""))
        );
    });

    return {
        nativeToken:
            nativeTokenData != null
                ? toTokenBalance(nativeTokenData, chain)
                : emptyTokenBalance(nativeTokenSymbol, chain),
        usdc: usdcData != null ? toTokenBalance(usdcData, chain) : emptyTokenBalance("usdc", chain),
        tokens: otherTokens.map((token) => toTokenBalance(token, chain)),
    };
}
