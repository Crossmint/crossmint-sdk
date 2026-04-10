import { privateKeyToAccount } from "viem/accounts";
import { Keypair as SolanaKeypair, type VersionedTransaction } from "@solana/web3.js";
import { Keypair as StellarKeypair } from "@stellar/stellar-sdk";

export function buildExternalWalletSigner(chain: string, privateKey: string): any {
    if (chain === "solana") {
        const secretKey = Uint8Array.from(JSON.parse(privateKey));
        const kp = SolanaKeypair.fromSecretKey(secretKey);
        return {
            type: "external-wallet",
            address: kp.publicKey.toBase58(),
            onSign: async (transaction: VersionedTransaction) => {
                transaction.sign([kp]);
                return transaction;
            },
        };
    }
    if (chain === "stellar") {
        const kp = StellarKeypair.fromSecret(privateKey);
        return {
            type: "external-wallet",
            address: kp.publicKey(),
            onSign: async (message: string) => {
                const signature = kp.sign(Buffer.from(message, "base64"));
                return signature.toString("base64");
            },
        };
    }
    // EVM (default)
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    return {
        type: "external-wallet",
        address: account.address,
        onSign: async (message: string) => {
            return await account.signMessage({ message: { raw: message as `0x${string}` } });
        },
    };
}
