import * as SecureStore from "expo-secure-store";

const SIGNER_LOCATOR_KEY_PREFIX = "crossmint_device_signer_locator_";
const APPROVING_MEMBERS_KEY_PREFIX = "crossmint_device_recovery_approving_members_";

export async function saveSignerLocator(address: string, signerLocator: string): Promise<void> {
    await SecureStore.setItemAsync(`${SIGNER_LOCATOR_KEY_PREFIX}${address}`, signerLocator);
}

export async function getSavedSignerLocator(address: string): Promise<string | null> {
    return await SecureStore.getItemAsync(`${SIGNER_LOCATOR_KEY_PREFIX}${address}`);
}

export async function saveApprovingMembers(address: string, memberLocators: string[] | null): Promise<void> {
    const key = `${APPROVING_MEMBERS_KEY_PREFIX}${address}`;
    if (memberLocators == null) {
        await SecureStore.deleteItemAsync(key);
        return;
    }
    await SecureStore.setItemAsync(key, JSON.stringify(memberLocators));
}

export async function getSavedApprovingMembers(address: string): Promise<string[] | null> {
    const saved = await SecureStore.getItemAsync(`${APPROVING_MEMBERS_KEY_PREFIX}${address}`);
    return saved == null ? null : (JSON.parse(saved) as string[]);
}
