import * as SecureStore from "expo-secure-store";
import type { StorageProvider } from "@crossmint/client-sdk-auth";

export class SecureStorage implements StorageProvider {
    async get(key: string): Promise<string | undefined> {
        try {
            const storedData = await SecureStore.getItemAsync(key);
            if (!storedData) {
                return undefined;
            }

            // Check if it's a JSON string with expiry info
            try {
                const parsed = JSON.parse(storedData);
                if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
                    // Value has expired, remove it
                    await this.remove(key);
                    return undefined;
                }
                return parsed.value;
            } catch {
                // Not JSON, return the raw value
                return storedData;
            }
        } catch (error) {
            console.error("Error reading from SecureStore:", error);
            return undefined;
        }
    }

    async set(key: string, value: string, expiresAt?: string): Promise<void> {
        try {
            if (expiresAt) {
                // Store with expiration information
                const data = JSON.stringify({
                    value,
                    expiresAt,
                });
                await SecureStore.setItemAsync(key, data);
            } else {
                await SecureStore.setItemAsync(key, value);
            }
        } catch (error) {
            console.error("Error writing to SecureStore:", error);
        }
    }

    async remove(key: string): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            console.error("Error removing from SecureStore:", error);
        }
    }

    async isAvailable(): Promise<boolean> {
        try {
            return await SecureStore.isAvailableAsync();
        } catch {
            return false;
        }
    }
}
