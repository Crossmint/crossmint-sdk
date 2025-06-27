export interface KeyPairProvider {
    getKeyPair(): Promise<CryptoKeyPair>;
}

export interface PublicKeyProvider {
    getPublicKey(): Promise<CryptoKey>;
}

export interface SymmetricKeyProvider {
    getSymmetricKey(): Promise<CryptoKey>;
}
