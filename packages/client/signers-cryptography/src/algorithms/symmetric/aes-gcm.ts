export class AesGcm {
    async encrypt(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            data
        );

        // Combine IV and encrypted data
        const result = new Uint8Array(iv.length + encrypted.byteLength);
        result.set(iv);
        result.set(new Uint8Array(encrypted), iv.length);

        return result.buffer;
    }

    async decrypt(
        encryptedData: ArrayBuffer,
        key: CryptoKey
    ): Promise<ArrayBuffer> {
        const data = new Uint8Array(encryptedData);
        const iv = data.slice(0, 12);
        const ciphertext = data.slice(12);

        return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    }
}
