import { type EmbeddedOfframpPayer, OfframpSignatureRejectedError } from "@crossmint/client-sdk-base";
import { type Chain, EVMWallet, SolanaWallet, TransactionNotCreatedError, type Wallet } from "@crossmint/wallets-sdk";

function validateOfframpWallet(
    wallet: Wallet<Chain>,
    { chain, payerAddress }: { chain: string; payerAddress: string }
) {
    if (wallet.chain === "stellar") {
        throw new Error("Offramp withdrawals support EVM and Solana wallets only");
    }
    if (chain !== wallet.chain) {
        throw new Error("This withdrawal was prepared for a different chain");
    }
    const sameWallet =
        wallet.chain === "solana"
            ? wallet.address === payerAddress
            : wallet.address.toLowerCase() === payerAddress.toLowerCase();
    if (!sameWallet) {
        throw new Error("This withdrawal was prepared for a different wallet");
    }
}

export function createCrossmintWalletSigner(wallet: Wallet<Chain>): EmbeddedOfframpPayer {
    return {
        async signAndSendTransaction({ serializedTransaction, payerAddress, chain }) {
            validateOfframpWallet(wallet, { chain, payerAddress });
            const isSolana = wallet.chain === "solana";
            try {
                const result = isSolana
                    ? await SolanaWallet.from(wallet).sendTransaction({ serializedTransaction })
                    : await EVMWallet.from(wallet).sendTransaction({ transaction: serializedTransaction });
                return result.hash;
            } catch (error) {
                if (error instanceof TransactionNotCreatedError) {
                    throw new OfframpSignatureRejectedError(error.message);
                }
                throw error;
            }
        },
    };
}
