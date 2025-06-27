import { FF1 } from "@noble/ciphers/ff1";
import type { FPEEncryptionOptions } from "../../types";

export class FPE {
    constructor(
        private readonly options: FPEEncryptionOptions = {
            radix: 10,
        }
    ) {}

    private async getFf1(key: CryptoKey): Promise<ReturnType<typeof FF1>> {
        const encryptionKey = await this.exportSymmetricEncryptionKey(key);
        return FF1(this.options.radix, encryptionKey, this.options.tweak);
    }

    async encrypt(data: number[], key: CryptoKey): Promise<number[]> {
        const ff1 = await this.getFf1(key);
        if (data.some((d) => d >= this.options.radix)) {
            throw new Error("Data contains values greater than the radix");
        }
        return ff1.encrypt(data);
    }

    async decrypt(data: number[], key: CryptoKey): Promise<number[]> {
        const ff1 = await this.getFf1(key);
        if (data.some((d) => d >= this.options.radix)) {
            throw new Error("Data contains values greater than the radix");
        }
        return ff1.decrypt(data);
    }

    /**
     * Returns the raw bytes of the AES256 symmetric key derived from ECDH between iframe and TEE keys.
     *
     * This method exports the raw key material of the symmetric encryption key that was created
     * using Elliptic Curve Diffie-Hellman (ECDH) key exchange between:
     * - **iframe's ephemeral private key** (this client's key pair)
     * - **TEE's attested public key** (hardware-verified public key)
     *
     * The returned raw key bytes can be used for:
     * - Direct symmetric encryption/decryption operations
     * - Key derivation for additional cryptographic operations
     * - Integration with external cryptographic libraries
     *
     * The underlying key was derived via ECDH, ensuring both iframe and TEE can independently
     * compute the same shared secret without network transmission. TEE authenticity is
     * guaranteed by Intel TDX hardware attestation.
     *
     * @returns Promise resolving to Uint8Array containing the raw AES256 key bytes (32 bytes)
     * @throws {Error} When AES256 encryption key has not been initialized
     * @throws {Error} When key export operation fails
     */
    private async exportSymmetricEncryptionKey(
        key: CryptoKey
    ): Promise<Uint8Array> {
        return new Uint8Array(await crypto.subtle.exportKey("raw", key));
    }
}
