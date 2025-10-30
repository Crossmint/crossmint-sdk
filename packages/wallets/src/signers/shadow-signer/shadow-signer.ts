import type { Chain } from "@/chains/chains";
import type { Signer } from "../types";
import {
    getShadowSigner,
    getStorage,
    hasShadowSigner as checkStorageForShadowSigner,
    type ShadowSignerData,
    type ShadowSignerStorage,
} from "./utils";
import type { InternalSignerConfig } from "../types";

export abstract class ShadowSigner<C extends Chain, S extends Signer, Config extends InternalSignerConfig<C>> {
    protected storage: ShadowSignerStorage;
    protected signer: S | null = null;

    constructor(walletAddress: string, storage?: ShadowSignerStorage, enabled = true) {
        this.storage = storage ?? getStorage();
        this.initialize(walletAddress, enabled);
    }

    abstract getShadowSignerConfig(shadowData: ShadowSignerData): Config;

    protected abstract getSignerClass(): new (config: Config) => S;

    private async initialize(walletAddress: string, enabled: boolean): Promise<void> {
        if (!enabled) {
            return;
        }

        if (await checkStorageForShadowSigner(walletAddress, this.storage)) {
            const shadowData = await getShadowSigner(walletAddress, this.storage);
            if (shadowData != null) {
                const config = this.getShadowSignerConfig(shadowData);
                const SignerClass = this.getSignerClass();
                this.signer = new SignerClass(config);
            }
        }
    }

    hasShadowSigner(): this is { signer: S } {
        return this.signer != null;
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
        if (!this.hasShadowSigner()) {
            throw new Error("Shadow signer not initialized");
        }
        const result = await this.signer.signTransaction(transaction);
        return result as { signature: string };
    }

    locator(): string {
        if (!this.hasShadowSigner()) {
            throw new Error("Shadow signer not initialized");
        }
        return this.signer.locator();
    }

    address(): string {
        if (!this.hasShadowSigner()) {
            throw new Error("Shadow signer not initialized");
        }
        if (this.signer.address == null) {
            throw new Error("Signer does not have an address method");
        }
        return this.signer.address();
    }
}
