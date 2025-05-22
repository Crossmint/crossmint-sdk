import { ExternalWalletSignerConfig, Signer } from "./types";

export class EVMExternalWalletSigner implements Signer {
    type = "external-wallet" as const;

    address: string;

    constructor(private config: ExternalWalletSignerConfig) {
        this.address = config.address;
    }

    locator() {
        return `evm-keypair:${this.address}`;
    }

    async sign(message: string) {
        // call onSignMessage with the message if set
        // else sign the message with the passed provider, viem v2 or eip1193
        return "123";
    }
}
