import { describe, expect, test } from "vitest";
import base58 from "bs58";
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

import { VERSION_1_MESSAGE, VERSION_1_PREFIX } from "./solana-version-1.fixture";
import { extractMessageBytes, messageVersion } from "./solana-transaction-format";

function makeVersion0Transaction(signerCount: number) {
    const signers = Array.from({ length: signerCount }, () => Keypair.generate());
    const payer = signers[0];
    const message = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: Keypair.generate().publicKey.toBase58(),
        instructions: signers.map((signer) =>
            SystemProgram.transfer({
                fromPubkey: signer.publicKey,
                toPubkey: Keypair.generate().publicKey,
                lamports: 1,
            })
        ),
    }).compileToV0Message();
    const transaction = new VersionedTransaction(message);
    transaction.sign(signers);
    return transaction;
}

describe("extractMessageBytes", () => {
    describe("when the transaction carries one signature", () => {
        test("returns the bytes web3.js serializes the message to", () => {
            const transaction = makeVersion0Transaction(1);

            const extracted = extractMessageBytes(transaction.serialize());

            expect(Buffer.from(extracted)).toEqual(Buffer.from(transaction.message.serialize()));
        });
    });

    describe("when the transaction carries several signatures", () => {
        test("skips the whole signature array", () => {
            const transaction = makeVersion0Transaction(3);
            expect(transaction.signatures.length).toBe(3);

            const extracted = extractMessageBytes(transaction.serialize());

            expect(Buffer.from(extracted)).toEqual(Buffer.from(transaction.message.serialize()));
        });
    });

    describe("when the buffer is truncated", () => {
        test("rejects a transaction whose message is missing", () => {
            expect(() => extractMessageBytes(new Uint8Array([1, ...new Array(64).fill(0)]))).toThrow(
                /no message follows/
            );
        });

        test("rejects a buffer that ends inside the compact-u16", () => {
            expect(() => extractMessageBytes(new Uint8Array([0x80]))).toThrow(/compact-u16/);
        });
    });
});

describe("messageVersion", () => {
    describe("when the message is versioned", () => {
        test("reads version 1 from the fixture", () => {
            const messageBytes = base58.decode(VERSION_1_MESSAGE);
            expect(messageBytes[0]).toBe(VERSION_1_PREFIX);

            expect(messageVersion(messageBytes)).toBe(1);
        });

        test("reads version 0 from a compiled message", () => {
            expect(messageVersion(makeVersion0Transaction(1).message.serialize())).toBe(0);
        });
    });

    describe("when the message is legacy", () => {
        test("returns null because no version byte is present", () => {
            expect(messageVersion(new Uint8Array([0x01, 0x00, 0x01]))).toBeNull();
        });

        test("returns null for an empty buffer", () => {
            expect(messageVersion(new Uint8Array())).toBeNull();
        });
    });
});
