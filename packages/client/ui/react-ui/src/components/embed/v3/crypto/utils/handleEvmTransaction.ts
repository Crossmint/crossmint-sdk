import type { EmbeddedCheckoutV3IFrameEmitter } from "@crossmint/client-sdk-base";
import {
    type BlockchainIncludingTestnet,
    blockchainToChainId,
    type EVMBlockchainIncludingTestnet,
} from "@crossmint/common-sdk-base";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import type { Wallet } from "@dynamic-labs/sdk-react-core";
import {
    type TransactionSerializableEIP1559,
    parseTransaction,
} from "viem";

export async function handleEvmTransaction({
    primaryWallet,
    chain,
    serializedTransaction,
    iframeClient,
}: {
    primaryWallet: Wallet;
    chain: BlockchainIncludingTestnet;
    serializedTransaction: string;
    iframeClient: EmbeddedCheckoutV3IFrameEmitter;
}) {
    const { connector } = primaryWallet;
    const chainId = blockchainToChainId(chain as EVMBlockchainIncludingTestnet);

    try {
        await connector.switchNetwork({ networkChainId: chainId });
    } catch (error) {
        console.error(`[CryptoWalletConnectionHandler] failed to switch network to ${chainId}`, error);
        iframeClient.send("crypto:send-transaction:failed", {
            error: (error as Error).message,
        });
        return;
    }

    let walletClient;
    try {
        if (!isEthereumWallet(primaryWallet)) {
            throw new Error("primaryWallet is not an ethereum wallet");
        }

        walletClient = await primaryWallet.getWalletClient(String(chainId));
        if (!walletClient) {
            throw new Error(`primaryWallet.getWalletClient(${chainId}) returned undefined`);
        }
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
