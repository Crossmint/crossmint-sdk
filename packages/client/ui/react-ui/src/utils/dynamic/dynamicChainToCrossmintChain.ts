import { chainIdToBlockchain, type BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";
import type { HandleConnectedWallet } from "@dynamic-labs/sdk-react-core";

export async function dynamicChainToCrossmintChain(
    wallet: Parameters<HandleConnectedWallet>[0]
): Promise<BlockchainIncludingTestnet> {
    const chain = wallet.chain;
    if (chain === "SOL") {
        return "solana";
    }
    const chainId = await wallet.connector?.getNetwork();
    if (typeof chainId !== "number") {
        throw new Error("chainId is not a number");
    }
    const chainFromChainId = chainIdToBlockchain(chainId);
    if (!chainFromChainId) {
        throw new Error(`ChainId ${chainId} is not supported`);
    }
    return chainFromChainId as BlockchainIncludingTestnet;
}
