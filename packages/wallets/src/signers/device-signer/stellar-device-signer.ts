import { DeviceSigner } from "./device-signer";
import type { StellarChain } from "@/chains/chains";
import type { ExternalWalletInternalSignerConfig } from "../types";
import type { DeviceSignerData, DeviceSignerStorage } from "./utils";
import { StellarExternalWalletSigner } from "../stellar-external-wallet";

export class StellarDeviceSigner extends DeviceSigner<StellarChain> {
    protected getExternalWalletSignerClass(): new (
        config: ExternalWalletInternalSignerConfig<StellarChain>,
        walletAddress?: string,
        deviceSignerEnabled?: boolean,
        deviceSignerStorage?: DeviceSignerStorage
    ) => StellarExternalWalletSigner {
        return StellarExternalWalletSigner;
    }

    getDeviceSignerConfig(shadowData: DeviceSignerData): ExternalWalletInternalSignerConfig<StellarChain> {
        return {
            type: "external-wallet",
            address: shadowData.publicKey,
            locator: `external-wallet:${shadowData.publicKey}`,
            onSignStellarTransaction: async (payload) => {
                const transactionString = typeof payload === "string" ? payload : (payload as { tx: string }).tx;
                const messageBytes = Uint8Array.from(atob(transactionString), (c) => c.charCodeAt(0));

                const signature = await this.storage.sign(shadowData.publicKeyBase64, messageBytes);

                const signatureBase64 = btoa(String.fromCharCode(...signature));
                return signatureBase64;
            },
        };
    }
}
