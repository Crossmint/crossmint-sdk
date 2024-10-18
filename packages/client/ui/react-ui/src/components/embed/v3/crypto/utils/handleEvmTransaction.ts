import type { EmbeddedCheckoutV3IFrameEmitter } from "@crossmint/client-sdk-base";
import {
    type BlockchainIncludingTestnet,
    blockchainToChainId,
    type EVMBlockchainIncludingTestnet,
} from "@crossmint/common-sdk-base";
import type { EthereumWallet } from "@dynamic-labs/ethereum-core";
import { parseTransaction, type TransactionSerializableEIP1559 } from "viem";

export async function handleEvmTransaction({
    primaryWallet,
    chain,
    serializedTransaction,
    iframeClient,
}: {
    primaryWallet: EthereumWallet;
    chain: BlockchainIncludingTestnet;
    serializedTransaction: string;
    iframeClient: EmbeddedCheckoutV3IFrameEmitter;
}) {
    try {
        await primaryWallet.switchNetwork(blockchainToChainId(chain as EVMBlockchainIncludingTestnet));
    } catch (error) {
        console.error("[CryptoWalletConnectionHandler] failed to switch network", error);
        iframeClient.send("crypto:send-transaction:failed", {
            error: (error as Error).message,
        });
        return;
    }

    let walletClient: Awaited<ReturnType<typeof primaryWallet.getWalletClient>>;
    try {
        walletClient = await primaryWallet.getWalletClient();
    } catch (error) {
        console.error("[CryptoWalletConnectionHandler] failed to get wallet client", error);
        iframeClient.send("crypto:send-transaction:failed", {
            error: (error as Error).message,
        });
        return;
    }

    let parsedTransaction: TransactionSerializableEIP1559;
    try {
        parsedTransaction = parseTransaction(serializedTransaction as `0x${string}`) as TransactionSerializableEIP1559;
    } catch (error) {
        console.error("[CryptoWalletConnectionHandler] failed to parse transaction", error);
        iframeClient.send("crypto:send-transaction:failed", {
            error: (error as Error).message,
        });
        return;
    }

    try {
        const txId = await walletClient.sendTransaction(parsedTransaction);
        console.log("[CryptoWalletConnectionHandler] txId", txId);
        iframeClient.send("crypto:send-transaction:success", {
            txId,
        });
    } catch (error) {
        console.error("[CryptoWalletConnectionHandler] failed to send transaction", error);
        iframeClient.send("crypto:send-transaction:failed", {
            error: (error as Error).message,
        });
    }
}
