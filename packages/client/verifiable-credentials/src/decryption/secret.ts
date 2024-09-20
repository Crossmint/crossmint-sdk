import { type EncryptedVerifiableCredential, isVerifiableCredential } from "@/verifiableCredentialsSDK";
import crypto from "crypto";

export class VCSymmetricEncryptionService {
    constructor() {}

    private async decryptWithSecret(encrypted: string, secret: string) {
        const iv = Buffer.from(encrypted.substring(0, 32), "hex"); // Extract IV from the beginning
        const tag = Buffer.from(encrypted.substring(32, 64), "hex"); // Extract tag
        const ciphertext = encrypted.substring(64);
        const key = Buffer.from(secret, "hex");
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(tag); // Set tag for integrity check
        let decrypted = decipher.update(ciphertext, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    }

    async decrypt(encrypted: EncryptedVerifiableCredential, secret: string) {
        const plaintext = await this.decryptWithSecret(encrypted.payload, secret);
        const vc = JSON.parse(plaintext);
        if (!isVerifiableCredential(vc)) {
            throw new Error("Decrypted data is not a valid Verifiable Credential");
        }
        return vc;
    }
}
