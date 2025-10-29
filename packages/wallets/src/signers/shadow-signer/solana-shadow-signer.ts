import { PublicKey } from "@solana/web3.js";
import { ShadowSigner } from "./shadow-signer";
import type { SolanaChain } from "@/chains/chains";
import type { ExternalWalletInternalSignerConfig } from "../types";
import type { ShadowSignerData } from "./index";
import { SolanaExternalWalletSigner } from "../solana-external-wallet";

export class SolanaShadowSigner extends ShadowSigner<SolanaChain> {
    protected getExternalWalletSignerClass() {
        return SolanaExternalWalletSigner;
    }

    getShadowSignerConfig(shadowData: ShadowSignerData): ExternalWalletInternalSignerConfig<SolanaChain> {
        return {
            type: "external-wallet",
            address: shadowData.publicKey,
            locator: `external-wallet:${shadowData.publicKey}`,
            onSignTransaction: async (transaction) => {
                const messageBytes = new Uint8Array(transaction.message.serialize());

                const signature = await this.storage.sign(shadowData.publicKeyBase64, messageBytes);

                transaction.addSignature(new PublicKey(shadowData.publicKey), signature);

                return transaction;
            },
        };
    }
}
