import { AES256_KEY_SPEC } from "../../constants";

export async function deriveSymmetricKey(
    privateKey: CryptoKey,
    publicKey: CryptoKey
): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: publicKey,
        },
        privateKey,
        AES256_KEY_SPEC,
        true,
        ["encrypt", "decrypt"]
    );
}
