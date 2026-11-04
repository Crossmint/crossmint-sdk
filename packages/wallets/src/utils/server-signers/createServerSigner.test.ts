import { describe, it, expect } from "vitest";
import base58 from "bs58";
import { ed25519 } from "@noble/curves/ed25519";
import { recoverMessageAddress } from "viem";

import { encodeStellarPublicKey } from "../stellar";
import { createServerSigner } from "./createServerSigner";

const params = { secret: "a".repeat(64), projectId: "project-123", environment: "staging" };

describe("createServerSigner().sign", () => {
    it("EVM: signs the raw hex message so it recovers to the signer's address", async () => {
        const signer = createServerSigner({ ...params, chain: "base-sepolia" });
        const message = "0x7b2a0c1d9e";

        const signature = await signer.sign(message);

        expect(signature).toMatch(/^0x[0-9a-f]{130}$/);
        await expect(
            recoverMessageAddress({ message: { raw: message }, signature: signature as `0x${string}` })
        ).resolves.toBe(signer.address);
    });

    it("EVM: rejects a message that is not 0x-prefixed hex", async () => {
        const signer = createServerSigner({ ...params, chain: "base-sepolia" });

        await expect(signer.sign("7b2a")).rejects.toThrow("0x-prefixed hex");
    });

    it("Solana: signs the base58-decoded message with the address's ed25519 key, base58 out", async () => {
        const signer = createServerSigner({ ...params, chain: "solana" });
        const messageBytes = new Uint8Array([1, 2, 3, 250, 251, 252]);

        const signature = await signer.sign(base58.encode(messageBytes));

        expect(ed25519.verify(base58.decode(signature), messageBytes, base58.decode(signer.address))).toBe(true);
    });

    it("Stellar: signs the base64-decoded message with the address's ed25519 key, base64 out", async () => {
        const signer = createServerSigner({ ...params, chain: "stellar" });
        // A quorum member's Stellar message is the 32-byte auth-entry preimage hash, base64-encoded.
        const messageBytes = new Uint8Array(32).map((_, i) => i * 7);
        const publicKey = ed25519.getPublicKey(signer.keyBytes);
        expect(encodeStellarPublicKey(publicKey)).toBe(signer.address);

        const signature = await signer.sign(Buffer.from(messageBytes).toString("base64"));

        expect(ed25519.verify(Buffer.from(signature, "base64"), messageBytes, publicKey)).toBe(true);
    });

    it("Stellar: rejects a message that is not base64", async () => {
        const signer = createServerSigner({ ...params, chain: "stellar" });

        await expect(signer.sign("not base64!")).rejects.toThrow("base64");
    });

    it("leaves keyBytes intact after signing", async () => {
        const signer = createServerSigner({ ...params, chain: "solana" });
        const before = signer.keyBytes.slice();

        await signer.sign(base58.encode(new Uint8Array([9])));

        expect(signer.keyBytes).toEqual(before);
        expect(before.some((b) => b !== 0)).toBe(true);
    });
});
