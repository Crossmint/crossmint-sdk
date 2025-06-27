export class CryptographyError extends Error {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = "CryptographyError";
    }
}

export class EncryptionError extends CryptographyError {
    constructor(message: string, cause?: Error) {
        super(`Encryption failed: ${message}`, cause);
        this.name = "EncryptionError";
    }
}

export class DecryptionError extends CryptographyError {
    constructor(message: string, cause?: Error) {
        super(`Decryption failed: ${message}`, cause);
        this.name = "DecryptionError";
    }
}

export class KeyError extends CryptographyError {
    constructor(message: string, cause?: Error) {
        super(`Key operation failed: ${message}`, cause);
        this.name = "KeyError";
    }
}
