import { ShadowSigner } from "./shadow-signer";
import type { SolanaChain } from "@/chains/chains";
import type { P256KeypairInternalSignerConfig } from "../types";
import type { ShadowSignerData } from "./utils";
import { SolanaP256KeypairSigner } from "../solana-p256-keypair";

export class SolanaShadowSigner extends ShadowSigner<
    SolanaChain,
    SolanaP256KeypairSigner,
    P256KeypairInternalSignerConfig
> {
    protected getWrappedSignerClass() {
        return SolanaP256KeypairSigner;
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
