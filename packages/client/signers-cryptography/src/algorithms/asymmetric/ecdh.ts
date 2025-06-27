import { deriveSymmetricKey } from "../../primitives";

export class ECDH {
    async deriveSharedSecret(
        privateKey: CryptoKey,
        publicKey: CryptoKey
    ): Promise<CryptoKey> {
        return deriveSymmetricKey(privateKey, publicKey);
    }
}
