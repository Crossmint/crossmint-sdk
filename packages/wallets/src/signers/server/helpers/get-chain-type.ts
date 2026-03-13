import type { Chain } from "../../../chains/chains";

export function getChainType(chain: Chain): "evm" | "solana" | "stellar" {
    if (chain === "solana") return "solana";
    if (chain === "stellar") return "stellar";
    return "evm";
}
