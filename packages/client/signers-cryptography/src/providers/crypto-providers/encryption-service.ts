import { HPKE, AesGcm, FPE } from "../../algorithms";
import type { EncryptionResult, EncryptablePayload } from "../../types";

export class EncryptionService {
    private readonly hpke: HPKE;
    private readonly aesGcm: AesGcm;
    private readonly fpe: FPE;

    constructor() {
        this.hpke = new HPKE();
        this.aesGcm = new AesGcm();
        this.fpe = new FPE();
    }

    // HPKE operations
    async encryptAsymmetric<T extends EncryptablePayload>(
        data: T,
        recipientPublicKey: CryptoKey,
        senderKeyPair: CryptoKeyPair
    ): Promise<EncryptionResult<ArrayBuffer>> {
        return this.hpke.encrypt(data, recipientPublicKey, senderKeyPair);
    }

    async encryptAsymmetricBase64<T extends EncryptablePayload>(
        data: T,
        recipientPublicKey: CryptoKey,
        senderKeyPair: CryptoKeyPair
    ): Promise<EncryptionResult<string>> {
        return this.hpke.encryptBase64(data, recipientPublicKey, senderKeyPair);
    }

    // AES-GCM operations
    async encryptSymmetric(
        data: ArrayBuffer,
        key: CryptoKey
    ): Promise<ArrayBuffer> {
        return this.aesGcm.encrypt(data, key);
    }

    // FPE operations
    async encryptFPE(data: number[], key: CryptoKey): Promise<number[]> {
        return this.fpe.encrypt(data, key);
    }
}
