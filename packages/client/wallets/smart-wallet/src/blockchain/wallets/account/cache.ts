import { logInfo } from "@/services/logging";

import { SmartWalletConfigSchema } from "../../../types/schema";
import type { SmartWalletConfig } from "../../../types/service";
import { SDK_VERSION } from "../../../utils/constants";

export class AccountConfigCache {
    private key = `smart-wallet-${SDK_VERSION}`;

    constructor(private readonly storage: Storage) {}

    set(config: SmartWalletConfig) {
        console.log("SET: Setting for cached config");
        console.log("Setting local storage data");

        const expiration = Date.now() + 7 * 24 * 60 * 60;
        this.storage.setItem(this.key, JSON.stringify({ config, expiration }));
    }

    get(): SmartWalletConfig | null {
        const data = this.storage.getItem(this.key);
        if (data == null) {
            this.clear(); // To keep local storage tidy
            return null;
        }

        const parsed = JSON.parse(data);
        if (typeof parsed.expiration !== "number" || parsed.expiration < Date.now()) {
            this.storage.removeItem(this.key);
            return null;
        }

        const result = SmartWalletConfigSchema.safeParse(parsed.config);
        if (!result.success) {
            logInfo(`Invalid cached smart wallet config. Details:\n${result.error.toString()}`);
            this.storage.removeItem(this.key);
            return null;
        }

        return result.data;
    }

    private clear() {
        console.log("Clearing all smart wallet data from local storage");
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key && key.startsWith(this.key)) {
                this.storage.removeItem(key);
                i--; // Decrement i since we've removed an item
            }
        }
    }
}
