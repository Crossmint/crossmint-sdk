import { describe, expect, test, vi } from "vitest";
import base58 from "bs58";
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

import type { EmailInternalSignerConfig } from "../types";
import { SolanaNonCustodialSigner } from "./ncs-solana-signer";

const SIGNER_KEYPAIR = Keypair.generate();

function makeSigner() {
    const sendAction = vi.fn(async (args: { event: string }) => {
        if (args.event === "request:get-status") {
            return { status: "success", signerStatus: "ready" };
        }
        return {
            status: "success",
            signature: { bytes: "signature-bytes", encoding: "base58", keyType: "ed25519" },
            publicKey: {
                bytes: SIGNER_KEYPAIR.publicKey.toBase58(),
                encoding: "base58",
                keyType: "ed25519",
            },
        };
    });
    const config = {
        type: "email",
        email: "test@example.com",
        locator: "email:test@example.com",
        address: SIGNER_KEYPAIR.publicKey.toBase58(),
        crossmint: { apiKey: "ck_staging_test", jwt: "test-jwt" },
        clientTEEConnection: { sendAction },
        onAuthRequired: vi.fn(async () => {}),
    } as unknown as EmailInternalSignerConfig;

    return { signer: new SolanaNonCustodialSigner(config), sendAction };
}

function signedBytes(sendAction: ReturnType<typeof makeSigner>["sendAction"]) {
    const signCall = sendAction.mock.calls.find(([args]) => args.event === "request:sign");
    if (signCall == null) {
        throw new Error("No sign request was sent to the signer");
    }
    return (signCall[0] as unknown as { data: { data: { bytes: string } } }).data.data.bytes;
}

function makeTransaction() {
    const message = new TransactionMessage({
        payerKey: SIGNER_KEYPAIR.publicKey,
        recentBlockhash: Keypair.generate().publicKey.toBase58(),
        instructions: [
            SystemProgram.transfer({
                fromPubkey: SIGNER_KEYPAIR.publicKey,
                toPubkey: Keypair.generate().publicKey,
                lamports: 1,
            }),
        ],
    }).compileToV0Message();
    return new VersionedTransaction(message);
}

describe("SolanaNonCustodialSigner.signMessage", () => {
    test("signs the payload bytes verbatim, without transaction deserialization", async () => {
        // A canonical app payload: arbitrary bytes that are not a valid Solana transaction.
        const payload = base58.encode(new Uint8Array(91).fill(7));
        const { signer, sendAction } = makeSigner();

        const result = await signer.signMessage(payload);

        expect(result).toEqual({ signature: "signature-bytes" });
        expect(signedBytes(sendAction)).toBe(payload);
    });
});

describe("SolanaNonCustodialSigner.signTransaction", () => {
    test("signs the serialized transaction message rather than the full transaction", async () => {
        const transaction = makeTransaction();
        const { signer, sendAction } = makeSigner();

        const result = await signer.signTransaction(base58.encode(transaction.serialize()));

        expect(result).toEqual({ signature: "signature-bytes" });
        expect(signedBytes(sendAction)).toBe(base58.encode(transaction.message.serialize()));
    });
});
