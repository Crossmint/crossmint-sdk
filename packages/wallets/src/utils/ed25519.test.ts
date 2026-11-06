import nacl from "tweetnacl";
import { describe, expect, test } from "vitest";

import { ed25519KeypairFromSeed, ed25519Sign } from "./ed25519";

function hexToBytes(hex: string) {
    return Uint8Array.from(hex.match(/../g) ?? [], (byte) => Number.parseInt(byte, 16));
}

describe("ed25519", () => {
    test("matches the RFC 8032 test vector 2", () => {
        const seed = hexToBytes("4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb");
        const { publicKey, secretKey } = ed25519KeypairFromSeed(seed);

        expect(publicKey).toEqual(hexToBytes("3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c"));
        expect(ed25519Sign(hexToBytes("72"), secretKey)).toEqual(
            hexToBytes(
                "92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00"
            )
        );
    });

    test("copies the seed into the secret key", () => {
        const seed = nacl.randomBytes(32);
        const { secretKey } = ed25519KeypairFromSeed(seed);

        seed.fill(0);

        expect(secretKey.subarray(0, 32)).not.toEqual(new Uint8Array(32));
    });

    describe("when compared with tweetnacl", () => {
        test("produces identical keys and signatures for random seeds and messages", () => {
            for (let i = 0; i < 200; i++) {
                const seed = nacl.randomBytes(32);
                const message = nacl.randomBytes(i % 97);
                const expected = nacl.sign.keyPair.fromSeed(seed);
                const actual = ed25519KeypairFromSeed(seed);

                expect(actual.publicKey).toEqual(expected.publicKey);
                expect(actual.secretKey).toEqual(expected.secretKey);

                const signature = ed25519Sign(message, actual.secretKey);
                expect(signature).toEqual(nacl.sign.detached(message, expected.secretKey));
                expect(nacl.sign.detached.verify(message, signature, expected.publicKey)).toBe(true);
            }
            // 200 rounds of pure-JS tweetnacl: under 1 s locally, but over 5 s on a busy CI runner.
        }, 20_000);

        test("signs with a tweetnacl or Solana 64-byte secret key", () => {
            const keypair = nacl.sign.keyPair();
            const message = nacl.randomBytes(64);

            expect(ed25519Sign(message, keypair.secretKey)).toEqual(nacl.sign.detached(message, keypair.secretKey));
        });
    });
});
