import { logInfo } from "@/services/logging";
import { UserParams } from "@/types/params";
import { keccak256, toHex } from "viem";

import { SmartWalletConfigSchema } from "../../../types/schema";
import type { SmartWalletConfig } from "../../../types/service";
import { SDK_VERSION } from "../../../utils/constants";

export class AccountConfigCache {
    private keyPrefix = `smart-wallet-${SDK_VERSION}`;

    constructor(private readonly storage: Storage) {}

    set(user: UserParams, config: SmartWalletConfig) {
        console.log("SET: Setting for cached config");
        console.log("Setting local storage data");
        this.storage.setItem(this.key(user), JSON.stringify(config));
    }

    get(user: UserParams): SmartWalletConfig | null {
        const key = this.key(user);
        const data = this.storage.getItem(key);
        if (data == null) {
            this.clear(); // To keep local storage tidy
            return null;
        }

        const result = SmartWalletConfigSchema.safeParse(JSON.parse(data));
        if (!result.success) {
            logInfo(`Invalid cached smart wallet config. Details:\n${result.error.toString()}`);
            this.storage.removeItem(key);
            return null;
        }

        return result.data;
    }

    private clear() {
        console.log("Clearing all smart wallet data from local storage");
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key && key.startsWith(this.keyPrefix)) {
                this.storage.removeItem(key);
                i--; // Decrement i since we've removed an item
            }
        }
    }

    private key(user: UserParams) {
        return `${this.keyPrefix}-${keccak256(toHex(user.jwt))}`;
    }
}
