import type { Account, EIP1193Provider as ViemEIP1193Provider } from "viem";
import type { GenericEIP1193Provider, ExternalWalletInternalSignerConfig } from "./types";
import type { EVMChain } from "@/chains/chains";
import { ExternalWalletSigner } from "./external-wallet-signer";
import { EVMShadowSigner, type ShadowSignerStorage } from "./shadow-signer";

export class EVMExternalWalletSigner extends ExternalWalletSigner<EVMChain> {
    provider?: GenericEIP1193Provider | ViemEIP1193Provider;
    viemAccount?: Account;
    protected shadowSigner?: EVMShadowSigner;
    protected shadowSignerStorage?: ShadowSignerStorage;

    constructor(
        config: ExternalWalletInternalSignerConfig<EVMChain>,
        walletAddress?: string,
        shadowSignerEnabled?: boolean,
        shadowSignerStorage?: ShadowSignerStorage
    ) {
        super(config);
        this.provider = config.provider;
        this.viemAccount = config.viemAccount;
        this.shadowSignerStorage = shadowSignerStorage;
        this.shadowSigner = new EVMShadowSigner(walletAddress, this.shadowSignerStorage, shadowSignerEnabled);
    }

    async signMessage(message: string) {
        if (this.shadowSigner?.hasShadowSigner()) {
            return await this.shadowSigner.signTransaction(message);
        }
        if (this.provider != null) {
            const signature = await this.provider.request({
                method: "personal_sign",
                params: [message, this._address] as any,
            });
            if (signature == null) {
                throw new Error(
                    "[EVMExternalWalletSigner] Failed to sign message: EIP1193 provider signMessage returned null"
                );
            }
            return { signature };
        }
        if (this.viemAccount?.signMessage != null) {
            const signature = await this.viemAccount.signMessage({
                message: {
                    raw: message as `0x${string}`,
                },
            });
            if (signature == null) {
                throw new Error(
                    "[EVMExternalWalletSigner] Failed to sign message: Viem account signMessage returned null"
                );
            }
            return { signature };
        }
        throw new Error("No signer provider or viem account provided");
    }

    async signTransaction(transaction: string) {
        if (this.shadowSigner?.hasShadowSigner()) {
            return await this.shadowSigner.signTransaction(transaction);
        }
        return await this.signMessage(transaction);
    }
}
