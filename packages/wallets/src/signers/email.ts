import { EmailSignerConfig, Signer } from "./types";

export class EmailSigner implements Signer {
    type = "email" as const;

    constructor(private config: EmailSignerConfig) {}

    // TODO: update for the wallet locator
    locator() {
        return `email:${this.config.email}`;
    }

    async sign(message: string) {
        return "0xDEADBEEF";
    }
}
