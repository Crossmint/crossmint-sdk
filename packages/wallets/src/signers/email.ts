import type { EmailSignerConfig, Signer } from "./types";

export class EmailSigner implements Signer {
    type = "email" as const;

    constructor(private config: EmailSignerConfig) {}

    // TODO: update for the wallet locator
    locator() {
        return `email:${this.config.email}`;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for email signer"));
    }
    async signTransaction() {
        return await Promise.reject(new Error("signTransaction method not implemented for email signer"));
    }
}
