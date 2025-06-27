// Core modules
export * from "./constants";
export * from "./types";
export * from "./algorithms";
export * from "./providers";
export * from "./utils";

// Primitives
export {
    // Keys
    PublicKeySerializer,
    deriveSymmetricKey,
    generateECDHKeyPair,
    generateAESKey,
    // Encoding
    encodeBytes,
    decodeBytes,
    encodeBase64,
    decodeBase64,
    encodeBase58,
    decodeBase58,
    encodeHex,
    decodeHex,
} from "./primitives";

// Backward compatibility exports
export { ECDHKeyProvider } from "./providers/key-providers/ecdh-provider";

// Legacy aliases for backward compatibility (deprecated)
/** @deprecated Use HPKE from algorithms instead */
export { HPKE as AsymmetricEncryptionHandler } from "./algorithms/asymmetric/hpke";
/** @deprecated Use FPE from algorithms instead */
export { FPE as FPEHandler } from "./algorithms/symmetric/fpe";
