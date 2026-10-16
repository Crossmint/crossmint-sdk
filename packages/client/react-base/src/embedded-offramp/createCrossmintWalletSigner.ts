import { type EmbeddedOfframpPayer, OfframpSignatureRejected } from "@crossmint/client-sdk-base";
import { type Chain, EVMWallet, SolanaWallet, TransactionNotCreatedError, type Wallet } from "@crossmint/wallets-sdk";

export function createCrossmintWalletSigner(wallet: Wallet<Chain>): EmbeddedOfframpPayer {
    return {
        async signAndSendTransaction({ serializedTransaction, payerAddress }) {
            const isSolana = wallet.chain === "solana";
            const sameWallet = isSolana
                ? wallet.address === payerAddress
                : wallet.address.toLowerCase() === payerAddress.toLowerCase();
            if (!sameWallet) {
                throw new Error("This withdrawal was prepared for a different wallet");
            }
            try {
                const result = isSolana
                    ? await SolanaWallet.from(wallet).sendTransaction({ serializedTransaction })
                    : await EVMWallet.from(wallet).sendTransaction({ transaction: serializedTransaction });
                return result.hash as string;
            } catch (error) {
                if (error instanceof TransactionNotCreatedError) {
                    throw new OfframpSignatureRejected(error.message);
                }
                throw error;
            }
        },
    };
}
