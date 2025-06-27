import { AES256_KEY_SPEC, ECDH_KEY_SPEC } from "../../constants";

export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(ECDH_KEY_SPEC, true, ["deriveKey"]);
}

export async function generateAESKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(AES256_KEY_SPEC, true, [
        "encrypt",
        "decrypt",
    ]);
}
