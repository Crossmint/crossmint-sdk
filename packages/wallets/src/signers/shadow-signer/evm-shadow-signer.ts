import { ShadowSigner } from "./shadow-signer";
import type { EVMSmartWalletChain } from "@/chains/chains";
import type { P256KeypairInternalSignerConfig } from "../types";
import type { ShadowSignerData } from "./utils";
import { P256KeypairSigner } from "../p256-keypair";

export class EVMShadowSigner extends ShadowSigner<
    EVMSmartWalletChain,
    P256KeypairSigner,
    P256KeypairInternalSignerConfig
> {
    protected getSignerClass() {
        return P256KeypairSigner;
    }

    getShadowSignerConfig(shadowData: ShadowSignerData): P256KeypairInternalSignerConfig {
        return {
            type: "p256-keypair",
            address: shadowData.publicKeyBase64,
            locator: `p256-keypair:${shadowData.publicKeyBase64}`,
            onSignTransaction: async (pubKey: string, data: Uint8Array) => {
                return await this.storage.sign(pubKey, data);
            },
        };
    }
}
