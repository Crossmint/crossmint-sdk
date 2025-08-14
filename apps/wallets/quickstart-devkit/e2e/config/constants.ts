// Environment variables and configuration
export const AUTH_CONFIG = {
    mailosaurApiKey: process.env.MAILOSAUR_API_KEY || "",
    mailosaurServerId: process.env.MAILOSAUR_SERVER_ID || "",
    mailosaurPhoneNumber: process.env.MAILOSAUR_PHONE_NUMBER || "",
    baseUrl: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    timeout: 60000,
    emailTimeout: 60000, // Longer timeout for email delivery
};

// Validation
if (!AUTH_CONFIG.mailosaurApiKey || !AUTH_CONFIG.mailosaurServerId || !AUTH_CONFIG.mailosaurPhoneNumber) {
    throw new Error(
        "MAILOSAUR_API_KEY, MAILOSAUR_SERVER_ID, and MAILOSAUR_PHONE_NUMBER environment variables must be set to run tests"
    );
}

// Test configurations for different provider/chain/signer combinations
export const TEST_CONFIGURATIONS = [
    // EVM Configurations
    { provider: "crossmint", chain: "evm", signer: "email", chainId: "optimism-sepolia" },
    {
        provider: "crossmint",
        chain: "evm",
        signer: "phone",
        chainId: "optimism-sepolia",
        phoneNumber: AUTH_CONFIG.mailosaurPhoneNumber,
    },
    // Solana Configurations
    { provider: "crossmint", chain: "solana", signer: "email", chainId: "solana" },
    {
        provider: "crossmint",
        chain: "solana",
        signer: "phone",
        chainId: "solana",
        phoneNumber: AUTH_CONFIG.mailosaurPhoneNumber,
    },
] as const;

export type TestConfiguration = (typeof TEST_CONFIGURATIONS)[number];

// Legacy support - keep existing signer types for backward compatibility
export const SIGNER_TYPES = TEST_CONFIGURATIONS.map((config) => config.signer).filter(
    (value, index, self) => self.indexOf(value) === index
);
export type SignerType = TestConfiguration["signer"];

// Email aliases for different signer types
// TODO: comment these out and remember to update the TEST_CONFIGURATIONS when adding new signer types
export const SIGNER_EMAIL_MAPPING: Record<SignerType, string> = {
    email: "email",
    phone: "phone1",
    // passkey: "passkey",
    // "api-key": "apikey",
    // "external-wallet": "external",
};

// Test wallet addresses to transfer test funds to
export const TEST_RECIPIENT_WALLET_ADDRESSES = {
    evm: "0xDF8b5F9c19E187f1Ea00730a1e46180152244315",
    solana: "AsBWK4STzydYZHvacHFuFSSongkeBzZx7Bk8rCbDeH4d",
};

// Generate email address for a specific signer type
export function getEmailForSigner(signerType: SignerType): string {
    const alias = SIGNER_EMAIL_MAPPING[signerType];
    return `test-${alias}@${AUTH_CONFIG.mailosaurServerId}.mailosaur.net`;
}

// Build URL with query parameters for testing
export function buildTestUrl(config: TestConfiguration): string {
    const url = new URL(AUTH_CONFIG.baseUrl);
    url.searchParams.set("provider", config.provider);
    url.searchParams.set("chain", config.chain);
    url.searchParams.set("signer", config.signer);
    url.searchParams.set("chainId", config.chainId);
    if (config.signer === "phone" && config.phoneNumber != null) {
        url.searchParams.set("phoneNumber", config.phoneNumber);
    }
    return url.toString();
}
