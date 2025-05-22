import { ExternalWalletSignerConfig, Signer } from "./types";

export class SolanaExternalWalletSigner implements Signer {
    type = "external-wallet" as const;

    address: string;

    constructor(private config: ExternalWalletSignerConfig) {
        this.address = config.address;
    }

    locator() {
        return `solana-keypair:${this.address}`;
    }

    async sign(message: string) {
        // decode message
        // use onSignMessage to sign the message or keypair to sign the message
        // encode the message
        return "123";
    }
}
