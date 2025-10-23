import type { Account, EIP1193Provider as ViemEIP1193Provider } from "viem";
import type { GenericEIP1193Provider, ExternalWalletInternalSignerConfig } from "./types";
import type { EVMChain } from "@/chains/chains";
import { ExternalWalletSigner } from "./external-wallet-signer";

export class EVMExternalWalletSigner extends ExternalWalletSigner<EVMChain> {
    provider?: GenericEIP1193Provider | ViemEIP1193Provider;
    viemAccount?: Account;

    constructor(config: ExternalWalletInternalSignerConfig<EVMChain>) {
        super(config);
        this.provider = config.provider;
        this.viemAccount = config.viemAccount;
    }

    async signMessage(message: string) {
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
        return await this.signMessage(transaction);
    }
}
