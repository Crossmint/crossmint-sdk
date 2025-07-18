export type EncryptionResult<T extends ArrayBuffer | string> = {
    ciphertext: T;
    encapsulatedKey: T;
};

export type EncryptablePayload = Record<string, unknown>;

export type FPEEncryptionOptions = {
    radix: number;
    tweak?: Uint8Array;
};
