import type { ExternalWalletInternalSignerConfig } from "./types";
import type { EVMChain } from "@/chains/chains";
import { ExternalWalletSigner } from "./external-wallet-signer";

export class EVMExternalWalletSigner extends ExternalWalletSigner<EVMChain> {
    private onSign: (payload: string) => Promise<string>;

    constructor(config: ExternalWalletInternalSignerConfig<EVMChain>) {
        super(config);
        this.onSign = config.onSign;
    }

    async signMessage(message: string) {
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
