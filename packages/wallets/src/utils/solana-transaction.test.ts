import { MessageV0, PublicKey, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { describe, expect, it } from "vitest";
import { normalizeSolanaSerializedTransaction } from "./solana-transaction";

describe("normalizeSolanaSerializedTransaction", () => {
    const transaction = new VersionedTransaction(
        MessageV0.compile({
            payerKey: PublicKey.default,
            instructions: [],
            recentBlockhash: PublicKey.default.toBase58(),
        })
    );
    const serializedBytes = transaction.serialize();
    const base58SerializedTransaction = bs58.encode(serializedBytes);

    it("returns a base58-encoded transaction unchanged", () => {
        expect(normalizeSolanaSerializedTransaction(base58SerializedTransaction)).toBe(base58SerializedTransaction);
    });

    it("converts a base64-encoded transaction to base58", () => {
        const base64SerializedTransaction = Buffer.from(serializedBytes).toString("base64");

        expect(normalizeSolanaSerializedTransaction(base64SerializedTransaction)).toBe(
            bs58.encode(transaction.serialize())
        );
    });

    it("throws for an invalid serialized transaction", () => {
        expect(() => normalizeSolanaSerializedTransaction("garbage")).toThrow(
            "Value must be a base58- or base64-encoded Solana transaction"
        );
    });
});
