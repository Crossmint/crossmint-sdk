import type { Account, EIP1193Provider as ViemEIP1193Provider } from "viem";
import type { GenericEIP1193Provider, Signer, ExternalWalletInternalSignerConfig } from "./types";
import type { EVMChain } from "@/chains/chains";

export class EVMExternalWalletSigner implements Signer {
    type = "external-wallet" as const;
    private _address: string;
    provider?: GenericEIP1193Provider | ViemEIP1193Provider;
    viemAccount?: Account;

    constructor(private config: ExternalWalletInternalSignerConfig<EVMChain>) {
        if (config.address == null) {
            throw new Error("Please provide an address for the External Wallet Signer");
        }
        this._address = config.address;
        this.provider = config.provider;
        this.viemAccount = config.viemAccount;
    }

    address() {
        return this._address;
    }

    locator() {
        return this.config.locator;
    }

    async sign(payload: string): Promise<{ signature: string }> {
        if (this.provider != null) {
                   const signature = await this.provider.request({
                       method: "personal_sign",
                       params: [payload, this._address] as any,
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
                           raw: payload as `0x${string}`,
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

    async signMessage(message: string) {
        return await this.sign(message);
    }

    async signTransaction(transaction: string) {
        return await this.sign(transaction);
    }
}
