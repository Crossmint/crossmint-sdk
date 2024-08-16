import { keccak256, toHex } from "viem";

import { UserParams } from "../../../types/params";
import { SmartWalletConfigSchema } from "../../../types/schema";
import type { SmartWalletConfig } from "../../../types/service";

export class AccountConfigCache {
    constructor(private readonly keyPrefix: string) {}

    set(user: UserParams, config: SmartWalletConfig) {
        localStorage.setItem(this.key(user), JSON.stringify(config));
    }

    get(user: UserParams): SmartWalletConfig | null {
        const key = this.key(user);
        const data = localStorage.getItem(key);
        if (data == null) {
            return null;
        }

        const result = SmartWalletConfigSchema.safeParse(JSON.parse(data));
        if (!result.success) {
            localStorage.removeItem(key);
            return null;
        }

        return result.data;
    }

    public clear() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.keyPrefix)) {
                localStorage.removeItem(key);
                i--; // Decrement i since we've removed an item
            }
        }
    }

    private key(user: UserParams) {
        return `${this.keyPrefix}-${keccak256(toHex(user.jwt))}`;
    }
}
