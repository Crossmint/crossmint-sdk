import { EmailSignerConfig, IEmailSigner } from "./types";

export class EmailSigner implements IEmailSigner {
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
