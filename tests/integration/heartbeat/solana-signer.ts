import { generateKeyPairSync, sign } from "node:crypto";
import base58 from "bs58";

export interface SolanaTestSigner {
    signer: { type: "external-wallet"; address: string };
    locator: string;
    approval(message: string): Promise<{ signer: string; signature: string }>;
}

export function solanaExternalWalletSigner(): SolanaTestSigner {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const spki = publicKey.export({ type: "spki", format: "der" });
    const address = base58.encode(new Uint8Array(spki.subarray(spki.length - 32)));
    const locator = `external-wallet:${address}`;
    return {
        signer: { type: "external-wallet", address },
        locator,
        approval(message) {
            const signature = sign(null, Buffer.from(base58.decode(message)), privateKey);
            return Promise.resolve({ signer: locator, signature: base58.encode(new Uint8Array(signature)) });
        },
    };
}
