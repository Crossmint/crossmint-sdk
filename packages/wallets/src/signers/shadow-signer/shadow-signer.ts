import type { Chain } from "@/chains/chains";
import type { ExternalWalletInternalSignerConfig } from "../types";
import type { ExternalWalletSigner } from "../external-wallet-signer";
import {
    getShadowSigner,
    getStorage,
    hasShadowSigner as checkStorageForShadowSigner,
    type ShadowSignerData,
    type ShadowSignerStorage,
} from "./index";

export abstract class ShadowSigner<C extends Chain> {
    protected storage: ShadowSignerStorage;
    protected signer: ExternalWalletSigner<C> | null = null;

    constructor(walletAddress: string, storage?: ShadowSignerStorage, enabled = true) {
        this.storage = storage ?? getStorage();
        this.initialize(walletAddress, enabled);
    }

    abstract getShadowSignerConfig(shadowData: ShadowSignerData): ExternalWalletInternalSignerConfig<C>;

    protected abstract getExternalWalletSignerClass(): new (
        config: ExternalWalletInternalSignerConfig<C>
    ) => ExternalWalletSigner<C>;

    private async initialize(walletAddress: string, enabled: boolean): Promise<void> {
        if (!enabled) {
            return;
        }

        if (await checkStorageForShadowSigner(walletAddress, this.storage)) {
            const shadowData = await getShadowSigner(walletAddress, this.storage);
            if (shadowData != null) {
                const config = this.getShadowSignerConfig(shadowData);
                const ExternalWalletSignerClass = this.getExternalWalletSignerClass();
                this.signer = new ExternalWalletSignerClass(config);
            }
        }
    }

    hasShadowSigner(): this is { signer: ExternalWalletSigner<C> } {
        return this.signer != null;
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
        if (!this.hasShadowSigner()) {
            throw new Error("Shadow signer not initialized");
        }
        return await this.signer.signTransaction(transaction);
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
        return this.signer.address();
    }
}
