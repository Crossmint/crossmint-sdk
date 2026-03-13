import type { DeviceSignerKeyStorage } from "./DeviceSignerKeyStorage";
import type { DeviceSignerDescriptor } from "../../wallets/types";
import { decodeBase64, encodeHex } from "@crossmint/client-signers-cryptography";

/**
 * Creates a device signer by generating a new P-256 key pair via the provided key storage.
 *
 * @param deviceKeyStorage - The device key storage implementation to use for key generation.
 * @returns A device signer descriptor containing the type, public key coordinates, and locator.
 *
 * @example
 * ```ts
 * const signer = await createDeviceSigner(deviceKeyStorage);
 * // signer = { type: "device", publicKey: { x, y }, locator: "device:<pubkey64>" }
 * ```
 */
export async function createDeviceSigner(deviceKeyStorage: DeviceSignerKeyStorage): Promise<DeviceSignerDescriptor> {
    const publicKeyBase64 = await deviceKeyStorage.generateKey({});

    // The public key is an uncompressed P-256 key (65 bytes: 0x04 prefix + 32 bytes x + 32 bytes y)
    // encoded as base64. We need to extract the x and y coordinates.
    const publicKeyBytes = decodeBase64(publicKeyBase64);

    if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
        throw new Error("Invalid uncompressed P-256 public key: expected 65 bytes starting with 0x04");
    }

    const xBytes = publicKeyBytes.slice(1, 33);
    const yBytes = publicKeyBytes.slice(33, 65);

    const x = `0x${encodeHex(xBytes)}`;
    const y = `0x${encodeHex(yBytes)}`;

    return {
        type: "device",
        publicKey: { x, y },
        locator: `device:${publicKeyBase64}`,
    };
}
