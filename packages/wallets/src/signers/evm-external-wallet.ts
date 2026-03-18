import type { EvmExternalWalletInternalSignerConfig } from "./types";
import { ExternalWalletSigner } from "./external-wallet-signer";

export class EVMExternalWalletSigner extends ExternalWalletSigner {
    private onSign?: (payload: string) => Promise<string>;

    constructor(config: EvmExternalWalletInternalSignerConfig) {
        super(config);
        this.onSign = config.onSign;
    }

    async signMessage(message: string) {
        if (this.onSign == null) {
            return await Promise.reject(
                new Error("onSign callback is required to sign messages with an EVM external wallet")
            );
        }
        const signature = await this.onSign(message);
        if (signature == null) {
            throw new Error("[EVMExternalWalletSigner] Failed to sign message: onSign returned null");
        }
        return { signature };
    }

    async signTransaction(transaction: string) {
        return await this.signMessage(transaction);
    }
}
