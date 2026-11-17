import * as SecureStore from "expo-secure-store";

const SIGNER_LOCATOR_KEY_PREFIX = "crossmint_device_signer_locator_";

export async function saveSignerLocator(address: string, signerLocator: string): Promise<void> {
    await SecureStore.setItemAsync(`${SIGNER_LOCATOR_KEY_PREFIX}${address}`, signerLocator);
}

export async function getSavedSignerLocator(address: string): Promise<string | null> {
    return await SecureStore.getItemAsync(`${SIGNER_LOCATOR_KEY_PREFIX}${address}`);
}
