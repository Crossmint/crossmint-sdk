import { createCrossmint, CrossmintWallets } from "@crossmint/wallets-sdk";

function getApiKey(): string {
    const key = process.env.CROSSMINT_API_KEY;
    if (key == null) {
        throw new Error("CROSSMINT_API_KEY is not set");
    }
    return key;
}

function getSignerSecret(): string {
    const secret = process.env.CROSSMINT_SIGNER_SECRET;
    if (secret == null) {
        throw new Error("CROSSMINT_SIGNER_SECRET is not set");
    }
    return secret;
}

export function getWalletsClient() {
    const crossmint = createCrossmint({ apiKey: getApiKey() });
    return CrossmintWallets.from(crossmint);
}

export function getSignerConfig() {
    return { type: "server" as const, secret: getSignerSecret() };
}
