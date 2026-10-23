/**
 * Abstract storage interface for managing P-256 (secp256r1) device signer key pairs.
 * Implementations handle key generation, persistence, retrieval, signing, and deletion.
 */

export type BiometricPolicy = "always" | "session" | "none";
export abstract class DeviceSignerKeyStorage {
    constructor(protected readonly apiKey: string) {}

    /**
     * Generate a new P-256 key pair and persist it.
     * @param params - Key generation parameters.
     * @param params.address - Optional wallet address to associate the key with. If omitted, the key
     *                         should be stored under a temporary identifier until {@link mapAddressToKey} is called.
     * @returns The uncompressed public key encoded as a base64 string.
     */
    abstract generateKey(params: {
        address?: string;
        biometricPolicy?: Exclude<BiometricPolicy, "session">;
    }): Promise<string>;
    abstract generateKey(params: {
        address?: string;
        biometricPolicy: "session";
        biometricExpirationTime: number;
    }): Promise<string>;
    abstract generateKey(params: {
        address?: string;
        biometricPolicy?: BiometricPolicy;
        biometricExpirationTime?: number;
    }): Promise<string>;

    /**
     * Associate an already-generated key pair with a wallet address.
     * Used when the wallet address is not yet known at the time of key generation.
     * @param address - The wallet address to map the key to.
     * @param publicKeyBase64 - The base64-encoded public key returned by {@link generateKey}.
     */
    abstract mapAddressToKey(address: string, publicKeyBase64: string): Promise<void>;

    /**
     * Retrieve the public key for a given wallet address.
     * @param address - The wallet address whose public key to look up.
     * @returns The base64-encoded public key, or `null` if no key is found for the address.
     */
    abstract getKey(address: string): Promise<string | null>;

    /**
     * Check if a key with the given public key exists on this device.
     * @param publicKeyBase64 - The base64-encoded public key to look for.
     * @returns `true` if the key exists on the device, `false` otherwise.
     */
    abstract hasKey(publicKeyBase64: string): Promise<boolean>;

    /**
     * Sign a message using the private key associated with the given wallet address.
     * @param address - The wallet address whose private key to sign with.
     * @param message - The message string to sign.
     * @returns The ECDSA signature split into its `r` and `s` components, each as a hex string.
     */
    abstract signMessage(address: string, message: string): Promise<{ r: string; s: string }>;

    /**
     * Delete the key pair associated with the given wallet address.
     * @param address - The wallet address whose key pair to remove.
     */
    abstract deleteKey(address: string): Promise<void>;

    /**
     * Get a human-readable name for this device (e.g. "MacBook Pro", "iPhone 15").
     * Used to label device signers in the API for identification purposes.
     * @returns A descriptive name for the current device.
     */
    abstract getDeviceName(): string;

    /**
     * Save the locator of the device signer that this device registered for a wallet.
     * The SDK uses it to remove that signer from the wallet if the key is lost and a new signer is registered.
     * Store it apart from the key, so that it stays when the key is deleted. The default implementation does nothing.
     * @param address - The wallet address.
     * @param signerLocator - The device signer locator, in the format `device:<publicKeyBase64>`.
     */
    async saveSignerLocator(_address: string, _signerLocator: string): Promise<void> {}

    /**
     * Get the device signer locator that {@link saveSignerLocator} saved for a wallet.
     * @param address - The wallet address.
     * @returns The saved locator, or `null` if no locator is saved. The default implementation returns `null`.
     */
    async getSavedSignerLocator(_address: string): Promise<string | null> {
        return null;
    }
}
