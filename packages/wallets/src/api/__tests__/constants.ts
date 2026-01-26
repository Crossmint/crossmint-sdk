import type { WalletLocator } from "../types";

export const HTTP_ERROR_STATUSES = [
    { status: 400, message: "Bad Request" },
    { status: 401, message: "Unauthorized" },
    { status: 403, message: "Forbidden" },
    { status: 404, message: "Not Found" },
    { status: 429, message: "Rate limit exceeded" },
    { status: 500, message: "Internal server error" },
    { status: 502, message: "Bad Gateway" },
    { status: 503, message: "Service Unavailable" },
] as const;

/**
 * General-purpose wallet locators for unit and integration tests.
 * Includes both locator format strings (me:chain:type) and actual addresses.
 * Used for testing wallet operations that accept WalletLocator type.
 */
export const WALLET_LOCATORS = {
    evmSmart: "me:evm:smart" as WalletLocator,
    evmMpc: "me:evm:mpc" as WalletLocator,
    solanaSmart: "me:solana:smart" as WalletLocator,
    solanaAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" as WalletLocator,
    evmAddress: "0x1234567890123456789012345678901234567890" as WalletLocator,
    evmAddressWithSpecialChars: "0xABCDEFabcdef0123456789ABCDEFabcdef012345" as WalletLocator,
} as const;

export const TOKEN_LOCATORS = {
    eth: "base-sepolia:eth",
    usdc: "base-sepolia:usdc",
    sol: "solana:sol",
    customContract: "base-sepolia:0x1234567890123456789012345678901234567890",
    tokenWithSpecialChars: "base-sepolia:0xABCDEFabcdef0123456789ABCDEFabcdef012345",
} as const;

export const TIMEOUT_SHORT = 30000; // 30 seconds
export const TIMEOUT_MEDIUM = 60000; // 60 seconds
export const TIMEOUT_LONG = 120000; // 120 seconds

export const DELAY_SHORT = 200; // 200ms - for rapid sequential requests
export const DELAY_MEDIUM = 500; // 500ms - for standard rate limiting
export const DELAY_LONG = 1000; // 1s - for cleanup and rate limit windows
export const DELAY_RATE_LIMIT_WINDOW = 2000; // 2s - for rate limit recovery

/**
 * Real blockchain addresses for integration tests with specific purposes.
 * These are actual addresses used in integration tests for:
 * - Admin signers (external wallet addresses for wallet creation)
 * - Recipients (addresses to send tokens to)
 * - Error testing (non-existent addresses)
 * - General test operations
 * Note: These are actual addresses, not locator format strings.
 */
export const TEST_ADDRESSES = {
    EVM_ADMIN_SIGNER: "0xe5E91D9b21C3563011cc332B050150fb9211bBEB",
    SOLANA_ADMIN_SIGNER: "CsHuaddA9J8j9vSTdL9wpvBsyjYe4F7iQQLuPg3EUqsU",
    EVM_RECIPIENT: "0xDF8b5F9c19E187f1Ea00730a1e46180152244315",
    EVM_NON_EXISTENT: "0x0000000000000000000000000000000000000000",
    EVM_TEST: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
} as const;

export const TEST_VALUES = {
    FUNDING_AMOUNT_SMALL: 1.0,
    FUNDING_AMOUNT_LARGE: 10,
    SEND_AMOUNT_SMALL: "0.0001",
    SEND_AMOUNT_VERY_SMALL: "0.000000000000000001",
    SEND_AMOUNT_ZERO: "0",
    SEND_AMOUNT_INVALID: "999999999999999999.0",
    SEND_AMOUNT_EXTREME: "999999999999999999999999999999.999999999999999999",
    LONG_STRING_LENGTH: 10000,
    CONCURRENT_REQUESTS: 3,
    RAPID_SEQUENTIAL_COUNT: 3,
    RATE_LIMIT_BATCH_SIZE: 5,
    RATE_LIMIT_BATCHES: 3,
    RATE_LIMIT_RAPID_COUNT: 20,
    RATE_LIMIT_STRESS_COUNT: 50,
    APPROVE_TRANSACTION_MAX_RETRIES: 10,
} as const;

/**
 * Mock API key for unit tests.
 * This is a valid development API key format used for testing purposes only.
 */
export const MOCK_API_KEY =
    "ck_development_A61UZQnvjSQcM5qVBaBactgqebxafWAVsNdD2xLkgBxoYuH5q2guM8r9DUmZQzE1WYyoByGVYpEG2o9gVSzAZFsrLbfKGERUJ6D5CW6S9AsJGAc3ctgrsD4n2ioekzGj7KPbLwT3SysDjMamYXLxEroUbQSdwf6aLF4zeEpECq2crkTUQeLFzxzmjWNxFDHFYefDrfrFPCURvBXJLf5pCxCQ";
