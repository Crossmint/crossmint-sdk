import type { EmbeddedCheckoutV3IFrameEmitter } from "@crossmint/client-sdk-base";
import type { Wallet } from "@dynamic-labs/sdk-react-core";
import type { ISolana } from "@dynamic-labs/solana";
import { Transaction } from "@solana/web3.js";
import base58 from "bs58";

export async function handleSolanaTransaction({
    primaryWallet,
    serializedTransaction,
    iframeClient,
}: {
    primaryWallet: Wallet;
    serializedTransaction: string;
    iframeClient: EmbeddedCheckoutV3IFrameEmitter;
}) {
    // TODO: Handle switch network

    const { connector } = primaryWallet;

    let signer: ISolana;
    try {
        signer = await connector.getSigner<ISolana>();
    } catch (error) {
        console.error("[CryptoWalletConnectionHandler] failed to get signer", error);
        iframeClient.send("crypto:send-transaction:failed", {
            error: "Failed to get signer",
        });
        return;
    }

    let deserializedTransaction: Transaction;
    try {
        deserializedTransaction = Transaction.from(base58.decode(serializedTransaction));
    } catch (error) {
        console.error("[CryptoWalletConnectionHandler] failed to deserialize transaction", error);
        iframeClient.send("crypto:send-transaction:failed", {
            error: "Failed to deserialize transaction",
        });
        return;
    }

    try {
        const { signature: txId } = await signer.signAndSendTransaction(deserializedTransaction);
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
