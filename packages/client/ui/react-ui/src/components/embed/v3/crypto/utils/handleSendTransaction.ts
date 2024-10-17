import type { Wallet } from "@dynamic-labs/sdk-react-core";

import type { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { handleEvmTransaction } from "./handleEvmTransaction";

import { isSolanaWallet } from "@dynamic-labs/solana";
import { handleSolanaTransaction } from "./handleSolanaTransaction";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import type { EmbeddedCheckoutV3IFrameEmitter } from "@crossmint/client-sdk-base";

export async function handleSendTransaction(
    primaryWallet: Wallet,
    chain: BlockchainIncludingTestnet,
    serializedTransaction: string,
    iframeClient: EmbeddedCheckoutV3IFrameEmitter
) {
    const commonParams = {
        chain,
        serializedTransaction,
        iframeClient,
    };
    if (isSolanaWallet(primaryWallet)) {
        return await handleSolanaTransaction({
            ...commonParams,
            primaryWallet,
        });
    } else if (isEthereumWallet(primaryWallet)) {
        return await handleEvmTransaction({ ...commonParams, primaryWallet });
    }
}
