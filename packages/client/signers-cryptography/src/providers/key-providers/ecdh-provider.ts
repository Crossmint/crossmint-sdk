import { deriveSymmetricKey } from "../../primitives";
import type {
    KeyPairProvider,
    PublicKeyProvider,
    SymmetricKeyProvider,
} from "./interfaces";

export class ECDHKeyProvider implements SymmetricKeyProvider {
    constructor(
        private readonly keyPairProvider: KeyPairProvider,
        private readonly publicKeyProvider: PublicKeyProvider
    ) {}

    async getSymmetricKey(): Promise<CryptoKey> {
        const publicKey = await this.publicKeyProvider.getPublicKey();
        const keyPair = await this.keyPairProvider.getKeyPair();

        return deriveSymmetricKey(keyPair.privateKey, publicKey);
    }
}
