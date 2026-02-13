// Environment variables and configuration
export const AUTH_CONFIG = {
    crossmintApiKey: process.env.TESTS_CROSSMINT_API_KEY || "",
    mailosaurApiKey: process.env.MAILOSAUR_API_KEY || "",
    mailosaurServerId: process.env.MAILOSAUR_SERVER_ID || "",
    mailosaurPhoneNumber: process.env.MAILOSAUR_PHONE_NUMBER || "",
    baseUrl: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    timeout: 60000,
    emailTimeout: 60000, // Longer timeout for email delivery
};

// Validation
if (
    !AUTH_CONFIG.mailosaurApiKey ||
    !AUTH_CONFIG.mailosaurServerId ||
    !AUTH_CONFIG.mailosaurPhoneNumber ||
    !AUTH_CONFIG.crossmintApiKey
) {
    throw new Error(
        "MAILOSAUR_API_KEY, MAILOSAUR_SERVER_ID, MAILOSAUR_PHONE_NUMBER, and TESTS_CROSSMINT_API_KEY environment variables must be set to run tests"
    );
}

// Test configurations for different provider/chain/signer combinations
export const TEST_CONFIGURATIONS = [
    // EVM Configurations
    { provider: "crossmint", chain: "evm", signer: "email", chainId: "base-sepolia", alias: undefined },
    {
        provider: "crossmint",
        chain: "evm",
        signer: "phone",
        chainId: "base-sepolia",
        phoneNumber: AUTH_CONFIG.mailosaurPhoneNumber,
        alias: undefined,
    },
    // Solana Configurations
    { provider: "crossmint", chain: "solana", signer: "email", chainId: "solana", alias: undefined },
    {
        provider: "crossmint",
        chain: "solana",
        signer: "phone",
        chainId: "solana",
        phoneNumber: AUTH_CONFIG.mailosaurPhoneNumber,
        alias: undefined,
    },
    // Stellar Configurations
    // Note: alias will be generated dynamically to avoid conflicts
    { provider: "crossmint", chain: "stellar", signer: "email", chainId: "stellar", alias: undefined },
] as const;

export type TestConfiguration = (typeof TEST_CONFIGURATIONS)[number];

// Legacy support - keep existing signer types for backward compatibility
export const SIGNER_TYPES = TEST_CONFIGURATIONS.map((config) => config.signer).filter(
    (value, index, self) => self.indexOf(value) === index
);
export type SignerType = TestConfiguration["signer"];

// Test wallet addresses to transfer test funds to
export const TEST_RECIPIENT_WALLET_ADDRESSES = {
    evm: "0x4DA90A5d86972E5129C5CEa24c4b019B8f85Ae8e",
    solana: "61Y4H6d2SUnuJNeJVHazVCm1Btf6CK2g2iags5oV44v7",
    stellar: "CANKOZR2XAFXTUT7JX6ZPKKDNOQQ2XS5RGVC6ZU57VLDNDYRJPXUK2SJ",
};

// Base email aliases for different signer types
// Random numbers are appended to prevent email blocking
const SIGNER_EMAIL_BASE: Record<SignerType, string> = {
    email: "email",
    phone: "phone",
    // passkey: "passkey",
    // "api-key": "apikey",
    // "external-wallet": "external",
};

// Cache for email addresses per signer type to ensure consistency within a test run
const emailCache = new Map<SignerType, string>();
// Cache for random suffix per signer type to ensure alias consistency
const randomSuffixCache = new Map<SignerType, number>();

// Generate email address for a specific signer type with random suffix to prevent blocking
// The email is cached per signer type to ensure consistency within a test run
export function getEmailForSigner(signerType: SignerType): string {
    // Return cached email if it exists
    const cached = emailCache.get(signerType);
    if (cached) {
        return cached;
    }

    const baseAlias = SIGNER_EMAIL_BASE[signerType];
    // Generate a random number between 0 and 999999 to create unique email addresses
    // Store the suffix first so it can be reused for Stellar aliases
    const randomSuffix = Math.floor(Math.random() * 1000000);
    randomSuffixCache.set(signerType, randomSuffix);
    const alias = `${baseAlias}${randomSuffix}`;
    const email = `test-${alias}@${AUTH_CONFIG.mailosaurServerId}.mailosaur.net`;

    emailCache.set(signerType, email);
    console.log(`📧 Generated and cached email for ${signerType}: ${email}`);

    return email;
}

// Generate a unique alias for Stellar wallets based on the email's random suffix
// This ensures consistency - same email = same alias
export function getStellarAlias(signerType: SignerType): string {
    // Get the random suffix that was used for the email
    const randomSuffix = randomSuffixCache.get(signerType) ?? Math.floor(Math.random() * 1000000);
    if (!randomSuffixCache.has(signerType)) {
        randomSuffixCache.set(signerType, randomSuffix);
    }
    return `stellartestingwallet${randomSuffix}`;
}

// Build URL with query parameters for testing
export function buildTestUrl(config: TestConfiguration): string {
    const url = new URL(AUTH_CONFIG.baseUrl);
    url.searchParams.set("provider", config.provider);
    url.searchParams.set("chain", config.chain);
    url.searchParams.set("signer", config.signer);
    url.searchParams.set("chainId", config.chainId);
    url.searchParams.set("crossmintApiKey", AUTH_CONFIG.crossmintApiKey);
    if (config.signer === "phone" && config.phoneNumber != null) {
        url.searchParams.set("phoneNumber", config.phoneNumber);
    }
    // For Stellar wallets, generate a unique alias based on the email's random suffix
    // This prevents conflicts when using random emails
    if (config.chain === "stellar") {
        const stellarAlias = getStellarAlias(config.signer as SignerType);
        url.searchParams.set("alias", stellarAlias);
    } else if (config.alias != null) {
        url.searchParams.set("alias", config.alias);
    }
    return url.toString();
}
