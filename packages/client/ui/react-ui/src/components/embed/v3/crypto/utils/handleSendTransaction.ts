import type { Wallet } from "@dynamic-labs/sdk-react-core";
import type { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";
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

    switch (primaryWallet.chain) {
        case "EVM":
            // @ts-expect-error - Error because we dont use 'module' field in tsconfig, which is expected because we use tsup to compile
            const { handleEvmTransaction } = await import("./handleEvmTransaction");
            return await handleEvmTransaction({ ...commonParams, primaryWallet });
        case "SOL":
            // @ts-expect-error - Error because we dont use 'module' field in tsconfig, which is expected because we use tsup to compile
            const { handleSolanaTransaction } = await import("./handleSolanaTransaction");
            return await handleSolanaTransaction({ ...commonParams, primaryWallet });
        default:
            throw new Error(`Connected wallet is on an unsupported chain: ${primaryWallet.chain}`);
    }
}
