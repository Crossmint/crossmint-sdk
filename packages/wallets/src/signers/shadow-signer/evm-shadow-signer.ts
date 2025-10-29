import { ShadowSigner } from "./shadow-signer";
import type { EVMChain } from "@/chains/chains";
import type { EVM256KeypairInternalSignerConfig } from "../types";
import type { ShadowSignerData } from "./utils";
import { EVM256KeypairSigner } from "../evm-p256-keypair";

export class EVMShadowSigner extends ShadowSigner<EVMChain, EVM256KeypairSigner, EVM256KeypairInternalSignerConfig> {
    protected getSignerClass() {
        return EVM256KeypairSigner;
    }

    getShadowSignerConfig(shadowData: ShadowSignerData): EVM256KeypairInternalSignerConfig {
        return {
            type: "evm-p256-keypair",
            publicKey: shadowData.publicKeyBase64,
            chain: shadowData.chain as EVMChain,
            locator: `evm-p256-keypair:${shadowData.chain}:${shadowData.publicKeyBase64}`,
            onSignTransaction: async (pubKey: string, data: Uint8Array) => {
                return await this.storage.sign(pubKey, data);
            },
        };
    }
}
