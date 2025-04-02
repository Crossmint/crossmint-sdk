import type { EmbeddedCheckoutV3IFrameEmitter } from "@crossmint/client-sdk-base";
import type { Wallet } from "@dynamic-labs/sdk-react-core";
import { isSuiWallet } from "@dynamic-labs/sui";
import { Transaction } from "@mysten/sui/transactions";

export async function handleSuiTransaction({
    primaryWallet,
    serializedTransaction,
    iframeClient,
}: {
    primaryWallet: Wallet;
    serializedTransaction: string;
    iframeClient: EmbeddedCheckoutV3IFrameEmitter;
}) {
    let walletClient;
    try {
        if (!isSuiWallet(primaryWallet)) {
            throw new Error("primaryWallet is not a Sui wallet");
        }
        walletClient = await primaryWallet.getWalletClient();
        if (!walletClient) {
            throw new Error("Failed to get wallet client");
        }
    } catch (error) {
        console.error("[CryptoWalletConnectionHandler] failed to get wallet client", error);
        iframeClient.send("crypto:send-transaction:failed", {
            error: "Failed to get wallet client",
        });
        return;
    }

    let deserializedTransaction: Transaction;
    try {
        deserializedTransaction = Transaction.from(serializedTransaction);
    } catch (error) {
        console.error("[CryptoWalletConnectionHandler] failed to send transaction", error);
        iframeClient.send("crypto:send-transaction:failed", {
            error: "Failed to deserialize transaction",
        });
        return;
    }

    let signedTransaction: Awaited<ReturnType<typeof primaryWallet.signTransaction>>;
    try {
        signedTransaction = await primaryWallet.signTransaction(deserializedTransaction);
    } catch (error) {
        console.error("[CryptoWalletConnectionHandler] failed to sign transaction", error);
        iframeClient.send("crypto:send-transaction:failed", {
            error: (error as Error).message,
        });
        return;
    }

    try {
        const executeTransactionBlockResponse = await walletClient.executeTransactionBlock({
            transactionBlock: signedTransaction.bytes,
            signature: signedTransaction.signature,
        });
        console.log("[CryptoWalletConnectionHandler] executeTransactionBlockResponse", executeTransactionBlockResponse);
        iframeClient.send("crypto:send-transaction:success", {
            txId: executeTransactionBlockResponse.digest,
        });
    } catch (error) {
        console.error("[CryptoWalletConnectionHandler] failed to send transaction", error);
        iframeClient.send("crypto:send-transaction:failed", {
            error: (error as Error).message,
        });
        return;
    }
}
