import { HPKE, AesGcm, FPE } from "../../algorithms";
import type { EncryptablePayload } from "../../types";

export class DecryptionService {
    private readonly hpke: HPKE;
    private readonly aesGcm: AesGcm;
    private readonly fpe: FPE;

    constructor() {
        this.hpke = new HPKE();
        this.aesGcm = new AesGcm();
        this.fpe = new FPE();
    }

    // HPKE operations
    async decryptAsymmetric<
        T extends EncryptablePayload,
        U extends string | ArrayBuffer
    >(
        ciphertextInput: U,
        encapsulatedKeyInput: U,
        recipientKeyPair: CryptoKeyPair,
        senderPublicKey?: CryptoKey
    ): Promise<T> {
        return this.hpke.decrypt(
            ciphertextInput,
            encapsulatedKeyInput,
            recipientKeyPair,
            senderPublicKey
        );
    }

    // AES-GCM operations
    async decryptSymmetric(
        encryptedData: ArrayBuffer,
        key: CryptoKey
    ): Promise<ArrayBuffer> {
        return this.aesGcm.decrypt(encryptedData, key);
    }

    // FPE operations
    async decryptFPE(data: number[], key: CryptoKey): Promise<number[]> {
        return this.fpe.decrypt(data, key);
    }
}
