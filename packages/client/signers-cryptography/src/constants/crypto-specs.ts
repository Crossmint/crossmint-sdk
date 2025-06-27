export const AES256_KEY_SPEC: AesKeyGenParams = {
    name: "AES-GCM" as const,
    length: 256,
} as const;

export const ECDH_KEY_SPEC: EcKeyGenParams = {
    name: "ECDH" as const,
    namedCurve: "P-256" as const,
} as const;
