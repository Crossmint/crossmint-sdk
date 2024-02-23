import {
    WALLETCONNECT_SOLANA_DEVNET_CHAIN_IDENTIFIER,
    WALLETCONNECT_SOLANA_MAINNET_CHAIN_IDENTIFIER,
} from "@/consts/walletconnect";

import { blockchainToCopyName, chainIdToBlockchain } from "@crossmint/common-sdk-base";

export function prettifyWalletConnectChain(chain: string) {
    if (chain.startsWith("eip155:")) {
        const chainId = chain.split(":")[1];
        const blockchain = chainIdToBlockchain(Number(chainId));
        if (!blockchain) {
            return chain;
        }
        return blockchainToCopyName(blockchain);
    }
    if (chain === WALLETCONNECT_SOLANA_DEVNET_CHAIN_IDENTIFIER) {
        return "Solana Devnet";
    } else if (chain === WALLETCONNECT_SOLANA_MAINNET_CHAIN_IDENTIFIER) {
        return "Solana";
    }
    return chain;
}
