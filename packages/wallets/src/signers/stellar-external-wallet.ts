import type { ExternalWalletInternalSignerConfig } from "./types";
import type { StellarChain } from "@/chains/chains";
import { ExternalWalletSigner } from "./external-wallet-signer";
import { StellarDeviceSigner, type DeviceSignerStorage } from "./device-signer";

export class StellarExternalWalletSigner extends ExternalWalletSigner<StellarChain> {
    onSignStellarTransaction?: (payload: string) => Promise<string>;
    protected deviceSigner?: StellarDeviceSigner;
    protected deviceSignerStorage?: DeviceSignerStorage;

    constructor(
        config: ExternalWalletInternalSignerConfig<StellarChain>,
        walletAddress?: string,
        deviceSignerEnabled?: boolean,
        deviceSignerStorage?: DeviceSignerStorage
    ) {
        super(config);
        this.onSignStellarTransaction = config.onSignStellarTransaction;
        this.deviceSignerStorage = deviceSignerStorage;
        this.deviceSigner = new StellarDeviceSigner(walletAddress, this.deviceSignerStorage, deviceSignerEnabled);
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for stellar external wallet signer"));
    }

    async signTransaction(payload: string) {
        if (this.deviceSigner?.hasDeviceSigner()) {
            return await this.deviceSigner.signTransaction(payload);
        }
        if (this.onSignStellarTransaction == null) {
            return await Promise.reject(
                new Error(
                    "onSignStellarTransaction method is required to sign transactions with a Stellar external wallet"
                )
            );
        }

        const signedTx = await this.onSignStellarTransaction(payload);
        return { signature: signedTx };
    }
}
