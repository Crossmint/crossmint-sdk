import { generateKeyPairSync } from "node:crypto";
import base58 from "bs58";

// A raw ed25519 public key is the last 32 bytes of its SPKI DER encoding.
export function solanaExternalWalletSigner(): {
    signer: { type: "external-wallet"; address: string };
    locator: string;
} {
    const { publicKey } = generateKeyPairSync("ed25519");
    const spki = publicKey.export({ type: "spki", format: "der" });
    const address = base58.encode(new Uint8Array(spki.subarray(spki.length - 32)));
    return { signer: { type: "external-wallet", address }, locator: `external-wallet:${address}` };
}
