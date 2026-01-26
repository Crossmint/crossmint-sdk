import type { Chain } from "@/chains/chains";
import type { ExternalWalletInternalSignerConfig } from "../types";
import type { ExternalWalletSigner } from "../external-wallet-signer";
import {
    getDeviceSigner,
    getStorage,
    hasDeviceSigner as checkStorageForDeviceSigner,
    type DeviceSignerData,
    type DeviceSignerStorage,
} from "./utils";

export abstract class DeviceSigner<C extends Chain> {
    protected storage: DeviceSignerStorage;
    protected signer: ExternalWalletSigner<C> | null = null;

    constructor(walletAddress?: string, storage?: DeviceSignerStorage, enabled = true) {
        this.storage = storage ?? getStorage();
        this.initialize(walletAddress, enabled);
    }

    abstract getDeviceSignerConfig(shadowData: DeviceSignerData): ExternalWalletInternalSignerConfig<C>;

    protected abstract getExternalWalletSignerClass(): new (
        config: ExternalWalletInternalSignerConfig<C>
    ) => ExternalWalletSigner<C>;

    private async initialize(walletAddress: string | undefined, enabled: boolean): Promise<void> {
        if (!enabled || walletAddress == null) {
            return;
        }

        if (await checkStorageForDeviceSigner(walletAddress, this.storage)) {
            const shadowData = await getDeviceSigner(walletAddress, this.storage);
            if (shadowData != null) {
                const config = this.getDeviceSignerConfig(shadowData);
                const ExternalWalletSignerClass = this.getExternalWalletSignerClass();
                this.signer = new ExternalWalletSignerClass(config);
            }
        }
    }

    hasDeviceSigner(): this is { signer: ExternalWalletSigner<C> } {
        return this.signer != null;
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
        if (!this.hasDeviceSigner()) {
            throw new Error("Device signer not initialized");
        }
        return await this.signer.signTransaction(transaction);
    }

    locator(): string {
        if (!this.hasDeviceSigner()) {
            throw new Error("Device signer not initialized");
        }
        return `device:${this.address()}`;
    }

    address(): string {
        if (!this.hasDeviceSigner()) {
            throw new Error("Device signer not initialized");
        }
        return this.signer.address();
    }
}
