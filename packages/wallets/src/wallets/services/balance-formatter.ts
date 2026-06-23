import type { GetBalanceSuccessResponse } from "../../api";
import type { Balances, TokenBalance } from "../types";
import type { Chain } from "../../chains/chains";
import { getChainAdapter } from "../../chains/chain-adapter";
import { getChainType } from "../../signers/server/helpers/get-chain-type";

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

function matchesRequestedToken(
    token: GetBalanceSuccessResponse[number],
    requestedTokenSet: Set<string> | null,
    chain: Chain
): boolean {
    if (requestedTokenSet == null) return true;

    const symbol = (token.symbol ?? "").toLowerCase();
    if (requestedTokenSet.has(symbol)) return true;

    const chainData = token.chains?.[chain];
    if (chainData == null) return false;

    const chainType = getChainType(chain);

    if (chainType === "solana" && "mintHash" in chainData) {
        const mint = (chainData.mintHash as string | undefined)?.toLowerCase();
        return mint != null && (requestedTokenSet.has(mint) || requestedTokenSet.has(`solana:${mint}`));
    }

    if (chainType === "stellar" && "contractId" in chainData) {
        const contractId = (chainData.contractId as string | undefined)?.toLowerCase();
        return (
            contractId != null && (requestedTokenSet.has(contractId) || requestedTokenSet.has(`stellar:${contractId}`))
        );
    }

    if ("contractAddress" in chainData) {
        const addr = (chainData.contractAddress as string | undefined)?.toLowerCase();
        return addr != null && (requestedTokenSet.has(addr) || requestedTokenSet.has(`${chain}:${addr}`));
    }

    return false;
}

export function formatBalanceResponse<C extends Chain>(
    response: GetBalanceSuccessResponse,
    chain: C,
    nativeTokenSymbol: TokenBalance["symbol"],
    requestedTokens?: string[]
): Balances<C> {
    const nativeTokenData = response.find((token) => token.symbol === nativeTokenSymbol);
    const usdcData = response.find((token) => token.symbol === "usdc");

    const requestedTokenSet = requestedTokens != null ? new Set(requestedTokens.map((t) => t.toLowerCase())) : null;

    const otherTokens = response.filter((token) => {
        return (
            token.symbol !== nativeTokenSymbol &&
            token.symbol !== "usdc" &&
            matchesRequestedToken(token, requestedTokenSet, chain)
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
