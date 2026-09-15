import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

export function normalizeSolanaSerializedTransaction(serialized: string): string {
    try {
        VersionedTransaction.deserialize(bs58.decode(serialized));
        return serialized;
    } catch {
        try {
            const bytes = Buffer.from(serialized, "base64");
            VersionedTransaction.deserialize(bytes);
            return bs58.encode(bytes);
        } catch {
            throw new Error("Value must be a base58- or base64-encoded Solana transaction");
        }
    }
}
