import {
    CipherSuite,
    Aes256Gcm,
    DhkemP256HkdfSha256,
    HkdfSha256,
} from "@hpke/core";

export const createHpkeSuite = () => {
    return new CipherSuite({
        kem: createKEM(),
        kdf: new HkdfSha256(),
        aead: new Aes256Gcm(),
    });
};

export const createKEM = () => {
    return new DhkemP256HkdfSha256();
};
