/**
 * CHARACTERIZATION (contract) tests for Wallet.send() and its locator helpers.
 *
 * These tests pin the CURRENT behavior of wallet.ts (send params building,
 * signer resolution, and exact error message strings) before the planned
 * service decomposition. Do NOT "fix" behavior here — if a test fails after a
 * refactor, the refactor drifted.
 *
 * Phase 1 migration note: the pure toRecipientLocator / toTokenLocator mapping
 * tables (every UserLocator arm, address pass-through casing, branch order, the
 * terminal error) moved to src/utils/locators.test.ts, colocated with the
 * extracted helpers. What stays here is Wallet-level orchestration: one routing
 * pin per helper (an observable transformation proving send() goes THROUGH the
 * helper), validation ordering (errors thrown before any API call), send params
 * building, and signer resolution.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SendResponse } from "../../../api";
import { InvalidAddressError, InvalidTransferAmountError, TransactionNotCreatedError } from "../../../utils/errors";
import { walletsLogger } from "../../../logger";
import { createMockApiClient, createMockWallet, type MockedApiClient } from "../test-helpers";
import type { Wallet } from "../../wallet";

vi.mock("@/signers/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/signers/server")>();
    return {
        ...actual,
        deriveServerSignerDetails: vi.fn().mockReturnValue({
            derivedKeyBytes: new Uint8Array(32),
            derivedAddress: "0xDerivedServerAddress",
        }),
        deriveServerSignerCandidates: vi.fn().mockReturnValue({
            primary: { derivedKeyBytes: new Uint8Array(32), derivedAddress: "0xDerivedServerAddress" },
            legacy: { derivedKeyBytes: new Uint8Array(32).fill(1), derivedAddress: "0xLegacyServerAddress" },
        }),
        assembleServerSigner: vi.fn().mockReturnValue({
            type: "server",
            locator: () => "server:0xDerivedServerAddress",
            address: () => "0xDerivedServerAddress",
            status: undefined,
            signMessage: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
            signTransaction: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
        }),
    };
});

const VALID_EVM_RECIPIENT = "0x1111111111111111111111111111111111111111";

describe("contract: send-and-locators", () => {
    let mockApiClient: MockedApiClient;
    let wallet: Wallet<"base-sepolia">;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
        mockApiClient.send.mockResolvedValue({ id: "txn-contract-1" } as unknown as SendResponse);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("recipient locator routing (send() -> toRecipientLocator)", () => {
        // pins wallet.ts send() ORCHESTRATION: UserLocator recipients are routed through
        // toRecipientLocator (the phone -> `phoneNumber:` rename is the observable proof of
        // routing). The full per-arm mapping table is pinned in src/utils/locators.test.ts.
        it("send() maps phone user locator to phoneNumber: recipient prefix", async () => {
            await wallet.send({ phone: "+15555550123" }, "usdc", "1.0", { prepareOnly: true });

            expect(mockApiClient.send).toHaveBeenCalledWith(
                "me:evm:smart",
                "base-sepolia:usdc",
                expect.objectContaining({ recipient: "phoneNumber:+15555550123" })
            );
        });
    });

    describe("token locator routing (send() -> toTokenLocator)", () => {
        // pins wallet.ts send() ORCHESTRATION: the token param is routed through toTokenLocator
        // with the resolved chain (the lowercasing is the observable proof of routing). The
        // address pass-through casing rules are pinned in src/utils/locators.test.ts.
        it("send() lowercases token symbols when building the token locator", async () => {
            await wallet.send(VALID_EVM_RECIPIENT, "USDC", "1.0", { prepareOnly: true });

            expect(mockApiClient.send).toHaveBeenCalledWith(
                "me:evm:smart",
                "base-sepolia:usdc",
                expect.objectContaining({ recipient: VALID_EVM_RECIPIENT })
            );
        });
    });

    describe("signer resolution in send params", () => {
        // pins wallet.ts send(): string options.signer is passed through verbatim (no resolution)
        it("send() passes options.signer string directly as the signer param", async () => {
            await wallet.send(VALID_EVM_RECIPIENT, "usdc", "1.0", {
                prepareOnly: true,
                signer: "external-wallet:0xSomeOtherSigner",
            });

            // Exact params object: also pins that transactionType is omitted when not provided
            expect(mockApiClient.send).toHaveBeenCalledWith("me:evm:smart", "base-sepolia:usdc", {
                recipient: VALID_EVM_RECIPIENT,
                amount: "1.0",
                signer: "external-wallet:0xSomeOtherSigner",
            });
        });

        // pins wallet.ts send() -> resolveServerSignerApiLocator -> resolveServerSignerDerivation:
        // ServerSignerConfig resolves to `server:<derivedAddress>` and the unused legacy key bytes are secure-wiped
        it("send() resolves ServerSignerConfig options.signer to server:<derivedAddress> locator", async () => {
            const { deriveServerSignerCandidates } = await import("@/signers/server");
            const candidates = {
                primary: { derivedKeyBytes: new Uint8Array(32).fill(7), derivedAddress: "0xDerivedServerAddress" },
                legacy: { derivedKeyBytes: new Uint8Array(32).fill(1), derivedAddress: "0xLegacyServerAddress" },
            };
            vi.mocked(deriveServerSignerCandidates).mockReturnValueOnce(candidates);

            await wallet.send(VALID_EVM_RECIPIENT, "usdc", "1.0", {
                prepareOnly: true,
                signer: { type: "server", secret: "test-secret" },
            });

            expect(mockApiClient.send).toHaveBeenCalledWith("me:evm:smart", "base-sepolia:usdc", {
                recipient: VALID_EVM_RECIPIENT,
                amount: "1.0",
                signer: "server:0xDerivedServerAddress",
            });
            // The rejected legacy candidate's key bytes are wiped to zeros...
            expect(candidates.legacy.derivedKeyBytes).toEqual(new Uint8Array(32));
            // ...while the chosen primary candidate's key bytes are NOT wiped by this path today
            expect(candidates.primary.derivedKeyBytes).toEqual(new Uint8Array(32).fill(7));
        });

        // pins wallet.ts send(): options.signer undefined defaults to the wallet signer's locator()
        it("send() defaults signer param to the wallet signer locator", async () => {
            mockApiClient.getTransaction.mockResolvedValue({
                id: "txn-contract-1",
                status: "success",
                onChain: {
                    txId: "0xabcdef123456",
                    explorerLink: "https://explorer.example.com/tx/0xabcdef123456",
                },
            } as any);

            const sendPromise = wallet.send(VALID_EVM_RECIPIENT, "usdc", "10.0");
            await vi.runAllTimersAsync();
            await sendPromise;

            // Exact params object: pins the default signer locator AND that transactionType
            // is omitted entirely (not sent as undefined) when options is undefined
            expect(mockApiClient.send).toHaveBeenCalledWith("me:evm:smart", "base-sepolia:usdc", {
                recipient: VALID_EVM_RECIPIENT,
                amount: "10.0",
                signer: "api-key",
            });
        });
    });

    describe("transactionType param", () => {
        // pins wallet.ts send() params building: transactionType is spread into sendParams when provided
        it("send() includes transactionType in params when provided", async () => {
            await wallet.send(VALID_EVM_RECIPIENT, "usdc", "1.0", {
                prepareOnly: true,
                transactionType: "onramp",
            });

            expect(mockApiClient.send).toHaveBeenCalledWith("me:evm:smart", "base-sepolia:usdc", {
                recipient: VALID_EVM_RECIPIENT,
                amount: "1.0",
                signer: "api-key",
                transactionType: "onramp",
            });
        });

        // pins wallet.ts send() params building: the transactionType KEY is omitted when not provided
        it("send() omits the transactionType key from params when not provided", async () => {
            await wallet.send(VALID_EVM_RECIPIENT, "usdc", "1.0", { prepareOnly: true });

            const sendParams = mockApiClient.send.mock.calls[0][2] as Record<string, unknown>;
            expect("transactionType" in sendParams).toBe(false);
            expect(sendParams).toEqual({
                recipient: VALID_EVM_RECIPIENT,
                amount: "1.0",
                signer: "api-key",
            });
        });
    });

    describe("validation error messages", () => {
        // pins wallet.ts send() amount validation: exact InvalidTransferAmountError message with raw amount interpolated
        it("send() throws InvalidTransferAmountError with exact message including the raw amount", async () => {
            await expect(wallet.send(VALID_EVM_RECIPIENT, "usdc", "abc")).rejects.toThrow(InvalidTransferAmountError);
            await expect(wallet.send(VALID_EVM_RECIPIENT, "usdc", "abc")).rejects.toThrow(
                'Invalid transfer amount: "abc". Amount must be a positive number greater than zero.'
            );
            expect(mockApiClient.send).not.toHaveBeenCalled();
        });

        // pins wallet.ts send() amount validation: !Number.isFinite branch ("Infinity" is not NaN and is > 0)
        it("send() throws InvalidTransferAmountError when amount is Infinity", async () => {
            await expect(wallet.send(VALID_EVM_RECIPIENT, "usdc", "Infinity")).rejects.toThrow(
                InvalidTransferAmountError
            );
            await expect(wallet.send(VALID_EVM_RECIPIENT, "usdc", "Infinity")).rejects.toThrow(
                'Invalid transfer amount: "Infinity". Amount must be a positive number greater than zero.'
            );
            expect(mockApiClient.send).not.toHaveBeenCalled();
        });

        // pins wallet.ts toRecipientLocator: exact InvalidAddressError message including the chain-format hint text
        it("send() throws InvalidAddressError with exact message including the invalid recipient", async () => {
            await expect(wallet.send("not-a-valid-address", "usdc", "1.0")).rejects.toThrow(InvalidAddressError);
            await expect(wallet.send("not-a-valid-address", "usdc", "1.0")).rejects.toThrow(
                'Invalid recipient address: "not-a-valid-address". Expected a valid EVM (0x...), Solana (base58), or Stellar (G.../C...) address.'
            );
            expect(mockApiClient.send).not.toHaveBeenCalled();
        });
    });

    describe("API error handling", () => {
        // pins wallet.ts send() error path: message is JSON.stringify'd (quoted) and wallet.send.error is logged before the throw
        it("send() throws TransactionNotCreatedError with JSON-stringified API message", async () => {
            const errorResponse = { message: "Insufficient balance" };
            mockApiClient.send.mockResolvedValue(errorResponse as unknown as SendResponse);

            await expect(wallet.send(VALID_EVM_RECIPIENT, "usdc", "1.0")).rejects.toThrow(TransactionNotCreatedError);
            // Note the quotes around the message — produced by JSON.stringify, part of the contract
            await expect(wallet.send(VALID_EVM_RECIPIENT, "usdc", "1.0")).rejects.toThrow(
                'Failed to send token: "Insufficient balance"'
            );
            expect(walletsLogger.error).toHaveBeenCalledWith("wallet.send.error", {
                error: errorResponse,
            });
        });
    });
});
