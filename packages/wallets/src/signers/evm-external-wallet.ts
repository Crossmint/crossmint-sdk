import type { Account, EIP1193Provider as ViemEIP1193Provider } from "viem";
import type { GenericEIP1193Provider, Signer, EvmExternalWalletSignerConfig } from "./types";

export class EVMExternalWalletSigner implements Signer {
    type = "external-wallet" as const;
    address: string;
    provider?: GenericEIP1193Provider | ViemEIP1193Provider;
    viemAccount?: Account;

    constructor(config: EvmExternalWalletSignerConfig) {
        if (config.address == null) {
            throw new Error("Please provide an address for the External Wallet Signer");
        }
        this.address = config.address;
        this.provider = config.provider;
        this.viemAccount = config.viemAccount;
    }

    locator() {
        return `external-wallet:${this.address}`;
    }

    async signMessage(message: string) {
        if (this.provider != null) {
            const signature = await this.provider.request({
                method: "personal_sign",
                params: [message, this.address] as any,
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
