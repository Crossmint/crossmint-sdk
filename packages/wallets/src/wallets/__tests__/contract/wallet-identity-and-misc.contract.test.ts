/**
 * CHARACTERIZATION (contract) tests for wallet.ts — area "wallet-identity-and-misc".
 *
 * These tests pin the CURRENT behavior of Wallet (pre-refactor), including exact
 * error classes, exact error message strings, API call (non-)invocations, and
 * server-signer derivation selection. Do NOT "fix" behavior here — if a test fails
 * after the decomposition, the refactor drifted from the contract.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { Wallet } from "../../wallet";
import type { ApiClient, GetWalletSuccessResponse } from "../../../api";
import type { ApiSourcedServerSignerConfig, SignerConfigForChain } from "../../../signers/types";
import { InvalidEnvironmentError, WalletNotAvailableError, WalletTypeNotSupportedError } from "../../../utils/errors";
import { createMockApiClient, type MockedApiClient } from "../test-helpers";

vi.mock("@/signers/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/signers/server")>();
    return {
        ...actual,
        deriveServerSignerCandidates: vi.fn().mockReturnValue({
            primary: { derivedKeyBytes: new Uint8Array(32), derivedAddress: "0xDerivedServerAddress" },
            legacy: null,
        }),
        // Implementation-based mock: the returned adapter reflects the internal config the
        // Wallet actually selected, so address/locator assertions verify real derivation choice.
        assembleServerSigner: vi.fn((_chain: unknown, config: { address: string; locator: string }) => ({
            type: "server",
            locator: () => config.locator,
            address: () => config.address,
            status: undefined,
            signMessage: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
            signTransaction: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
        })),
    };
});

const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";

/** Await a promise expected to reject and return the rejection reason for exact-message assertions. */
async function captureRejection(promise: Promise<unknown>): Promise<Error> {
    try {
        await promise;
    } catch (error) {
        return error as Error;
    }
    throw new Error("Expected promise to reject, but it resolved");
}

function createEvmWallet(mockApiClient: MockedApiClient, recovery?: unknown): Wallet<"base-sepolia"> {
    return new Wallet(
        {
            chain: "base-sepolia",
            address: EVM_ADDRESS,
            recovery: (recovery ?? { type: "api-key" }) as SignerConfigForChain<"base-sepolia">,
        },
        mockApiClient as unknown as ApiClient
    );
}

describe("contract: wallet-identity-and-misc", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
    });

    describe("resolveChainForEnvironment via public wallet methods", () => {
        // pins wallet.ts balances() -> resolveChainForEnvironment: testnet chain + production env throws before any API call
        it("balances() throws InvalidEnvironmentError with exact testnet-in-production message and makes no API call", async () => {
            const prodApiClient = createMockApiClient({ environment: APIKeyEnvironmentPrefix.PRODUCTION });
            const wallet = createEvmWallet(prodApiClient);

            const error = await captureRejection(wallet.balances());

            expect(error).toBeInstanceOf(InvalidEnvironmentError);
            expect(error.message).toBe(
                'Chain "base-sepolia" is a testnet chain and cannot be used in production. Please use a mainnet chain instead.'
            );
            expect(prodApiClient.getBalance).not.toHaveBeenCalled();
            // The wallet chain is left unmodified (no mainnet/testnet conversion happened)
            expect(wallet.chain).toBe("base-sepolia");
        });

        // pins wallet.ts send() -> resolveChainForEnvironment: same environment check guards send() before any API call
        it("send() throws InvalidEnvironmentError with exact testnet-in-production message before any transaction API call", async () => {
            const prodApiClient = createMockApiClient({ environment: APIKeyEnvironmentPrefix.PRODUCTION });
            const wallet = createEvmWallet(prodApiClient);

            const error = await captureRejection(
                wallet.send("0x9876543210987654321098765432109876543210", "usdc", "1.0")
            );

            expect(error).toBeInstanceOf(InvalidEnvironmentError);
            expect(error.message).toBe(
                'Chain "base-sepolia" is a testnet chain and cannot be used in production. Please use a mainnet chain instead.'
            );
            expect(prodApiClient.send).not.toHaveBeenCalled();
            expect(prodApiClient.createTransaction).not.toHaveBeenCalled();
        });
    });

    describe("constructor: explicit apiRecoveryServerSignerAddress capture", () => {
        // pins wallet.ts constructor lines 147-148 (explicit arg branch) + resolveServerSigner legacy match at line 1145-1151
        it("explicit apiRecoveryServerSignerAddress arg takes precedence over the API-sourced recovery config address for legacy derivation matching", async () => {
            const { deriveServerSignerCandidates, assembleServerSigner } = await import("@/signers/server");
            vi.mocked(deriveServerSignerCandidates).mockReturnValue({
                primary: { derivedKeyBytes: new Uint8Array(32), derivedAddress: "0xPrimaryAddress" },
                legacy: { derivedKeyBytes: new Uint8Array(32).fill(1), derivedAddress: "0xLegacyAddress" },
            });

            // Recovery config carries the PRIMARY address, but the explicit constructor arg
            // carries the LEGACY address. The explicit arg must win.
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: EVM_ADDRESS,
                    recovery: { type: "server", address: "0xPrimaryAddress" } as ApiSourcedServerSignerConfig,
                    apiRecoveryServerSignerAddress: "0xLegacyAddress",
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await wallet.useSigner({ type: "server", secret: "test-secret" } as any);

            // Legacy derivation was selected because it matches the explicit constructor arg
            expect(wallet.signer?.address()).toBe("0xLegacyAddress");
            expect(vi.mocked(assembleServerSigner)).toHaveBeenCalledWith(
                "base-sepolia",
                expect.objectContaining({
                    type: "server",
                    address: "0xLegacyAddress",
                    locator: "server:0xLegacyAddress",
                })
            );
            // Recovery signer is admin: status is set to "active" without a getSigner call
            expect(wallet.signer?.status).toBe("active");
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
            // The secret is stripped from the recovery config, replaced by the resolved address
            expect(wallet.recovery).toEqual({ type: "server", address: "0xLegacyAddress" });
        });

        // pins wallet.ts constructor lines 147-148 + resolveServerSignerDerivation legacy heuristic at line 376 (non-server recovery)
        it("explicit apiRecoveryServerSignerAddress arg drives legacy derivation matching even when recovery is a non-server type", async () => {
            const { deriveServerSignerCandidates, assembleServerSigner } = await import("@/signers/server");
            vi.mocked(deriveServerSignerCandidates).mockReturnValue({
                primary: { derivedKeyBytes: new Uint8Array(32), derivedAddress: "0xPrimaryAddress" },
                legacy: { derivedKeyBytes: new Uint8Array(32).fill(1), derivedAddress: "0xLegacyAddress" },
            });
            // assembleFullSigner's getSignerState call is swallowed -> status undefined
            mockApiClient.getSigner.mockRejectedValue(new Error("Signer not found"));

            // Mirrors EVMWallet/SolanaWallet/StellarWallet.from() re-wrapping: recovery is
            // non-server (api-key), the server address survives only via the explicit arg.
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as SignerConfigForChain<"base-sepolia">,
                    apiRecoveryServerSignerAddress: "0xLegacyAddress",
                    signers: [{ type: "server", secret: "test-secret" } as any],
                },
                mockApiClient as unknown as ApiClient
            );
            await wallet.waitForInit();

            // Legacy derivation selected during auto-assembly because it matches the explicit arg
            expect(wallet.signer?.address()).toBe("0xLegacyAddress");
            expect(vi.mocked(assembleServerSigner)).toHaveBeenCalledWith(
                "base-sepolia",
                expect.objectContaining({ address: "0xLegacyAddress", locator: "server:0xLegacyAddress" })
            );

            // Control: identical wallet WITHOUT the explicit arg picks the primary derivation
            vi.mocked(assembleServerSigner).mockClear();
            const controlWallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as SignerConfigForChain<"base-sepolia">,
                    signers: [{ type: "server", secret: "test-secret" } as any],
                },
                mockApiClient as unknown as ApiClient
            );
            await controlWallet.waitForInit();
            expect(controlWallet.signer?.address()).toBe("0xPrimaryAddress");
        });
    });

    describe("signers()", () => {
        const smartEvmWalletResponse = (delegatedSigners: object[]): GetWalletSuccessResponse =>
            ({
                chainType: "evm",
                type: "smart",
                address: EVM_ADDRESS,
                config: {
                    adminSigner: { type: "api-key", address: "0xadmin", locator: "api-key:admin" },
                    delegatedSigners,
                },
                createdAt: Date.now(),
            }) as GetWalletSuccessResponse;

        // pins wallet.ts signers() per-signer try/catch (1623-1631) + getSignerState swallow of rejections and error-shaped responses
        it("filters out signers whose getSigner call rejects or returns an error response and still returns the rest", async () => {
            const wallet = createEvmWallet(mockApiClient);
            mockApiClient.getWallet.mockResolvedValue(
                smartEvmWalletResponse([
                    { type: "external-wallet", address: "0xsigner1", locator: "external-wallet:0xsigner1" },
                    { type: "external-wallet", address: "0xsigner2", locator: "external-wallet:0xsigner2" },
                    { type: "external-wallet", address: "0xsigner3", locator: "external-wallet:0xsigner3" },
                ])
            );

            mockApiClient.getSigner
                // signer1: getSigner rejects (thrown error) -> silently filtered out
                .mockRejectedValueOnce(new Error("network failure"))
                // signer2: getSigner resolves to an error-shaped response -> silently filtered out
                .mockResolvedValueOnce({ error: { message: "Signer not found" } } as any)
                // signer3: healthy
                .mockResolvedValueOnce({
                    type: "external-wallet",
                    address: "0xsigner3",
                    locator: "external-wallet:0xsigner3",
                    chains: { "base-sepolia": { status: "success" } },
                } as any);

            const signers = await wallet.signers();

            expect(signers).toHaveLength(1);
            expect(signers[0].locator).toBe("external-wallet:0xsigner3");
            expect(signers[0].status).toBe("success");
            // All three signers were still queried
            expect(mockApiClient.getSigner).toHaveBeenCalledTimes(3);
        });

        // pins wallet.ts signers() lines 1609-1618: WalletTypeNotSupportedError interpolates walletResponse.type
        it("throws WalletTypeNotSupportedError with exact message 'Wallet type mpc not supported' for non-smart wallet types", async () => {
            const wallet = createEvmWallet(mockApiClient);
            mockApiClient.getWallet.mockResolvedValue({
                chainType: "evm",
                type: "mpc",
                address: EVM_ADDRESS,
                config: { adminSigner: { type: "api-key", address: "0xadmin", locator: "api-key:admin" } },
                createdAt: Date.now(),
            } as GetWalletSuccessResponse);

            const error = await captureRejection(wallet.signers());

            expect(error).toBeInstanceOf(WalletTypeNotSupportedError);
            expect(error.message).toBe("Wallet type mpc not supported");
        });

        // pins wallet.ts signers() lines 1609-1618 quirk: for a smart wallet with unsupported chainType,
        // the message interpolates `type` ("smart"), NOT the offending `chainType`.
        // NOTE: suspected bug — the message omits the actual unsupported chainType; pin as-is, do not fix.
        it("throws WalletTypeNotSupportedError naming the unsupported chain type", async () => {
            const wallet = createEvmWallet(mockApiClient);
            mockApiClient.getWallet.mockResolvedValue({
                chainType: "aptos" as any,
                type: "smart",
                address: EVM_ADDRESS,
                config: { adminSigner: { type: "api-key", address: "0xadmin", locator: "api-key:admin" } },
                createdAt: Date.now(),
            } as GetWalletSuccessResponse);

            const error = await captureRejection(wallet.signers());

            expect(error).toBeInstanceOf(WalletTypeNotSupportedError);
            expect(error.message).toBe("Wallet chain type aptos not supported");
        });

        // pins wallet.ts signers() lines 1602-1606: WalletNotAvailableError message is JSON.stringify of the full error response
        it("throws WalletNotAvailableError with the JSON-stringified API error response as its message", async () => {
            const wallet = createEvmWallet(mockApiClient);
            mockApiClient.getWallet.mockResolvedValue({ error: { message: "Wallet not found" } } as any);

            const error = await captureRejection(wallet.signers());

            expect(error).toBeInstanceOf(WalletNotAvailableError);
            expect(error.message).toBe('{"error":{"message":"Wallet not found"}}');
        });
    });

    describe("recovery getter", () => {
        // pins wallet.ts recovery getter (lines 407-409): returns the constructor's recovery config (same reference)
        it("returns the exact recovery config object passed at construction", async () => {
            const recoveryConfig = { type: "api-key" } as SignerConfigForChain<"base-sepolia">;
            const wallet = createEvmWallet(mockApiClient, recoveryConfig);
            await wallet.waitForInit();

            expect(wallet.recovery).toBe(recoveryConfig);
            expect(wallet.recovery).toEqual({ type: "api-key" });
        });

        // pins wallet.ts recovery getter with an API-sourced server config: address field is preserved, no normalization
        it("returns the API-sourced server recovery config with its address field", async () => {
            const recoveryConfig = {
                type: "server",
                address: "0xApiSourcedRecoveryAddress",
            } as ApiSourcedServerSignerConfig;
            const wallet = createEvmWallet(mockApiClient, recoveryConfig);
            await wallet.waitForInit();

            expect(wallet.recovery).toBe(recoveryConfig as unknown as SignerConfigForChain<"base-sepolia">);
            expect(wallet.recovery).toEqual({ type: "server", address: "0xApiSourcedRecoveryAddress" });
        });
    });

    describe("isSignerApproved()", () => {
        // pins wallet.ts isApprovedSignerStatus (1288-1290): "active" counts as approved via the public isSignerApproved path
        it("returns true for 'active' status", async () => {
            const wallet = createEvmWallet(mockApiClient);
            mockApiClient.getSigner.mockResolvedValueOnce({
                type: "external-wallet",
                address: "0xactive",
                locator: "external-wallet:0xactive",
                chains: { "base-sepolia": { status: "active" } },
            } as any);

            await expect(wallet.isSignerApproved("external-wallet:0xactive")).resolves.toBe(true);
        });

        // pins wallet.ts isApprovedSignerStatus: anything other than "success"/"active" is not approved
        it("returns false for 'pending', 'failed', and missing chain entry (undefined status)", async () => {
            const wallet = createEvmWallet(mockApiClient);
            mockApiClient.getSigner
                .mockResolvedValueOnce({
                    type: "external-wallet",
                    address: "0xpending",
                    locator: "external-wallet:0xpending",
                    chains: { "base-sepolia": { status: "pending", id: "sig-1" } },
                } as any)
                .mockResolvedValueOnce({
                    type: "external-wallet",
                    address: "0xfailed",
                    locator: "external-wallet:0xfailed",
                    chains: { "base-sepolia": { status: "failed" } },
                } as any)
                // Approval exists only for another chain -> mapApiSignerToSigner returns null -> status undefined
                .mockResolvedValueOnce({
                    type: "external-wallet",
                    address: "0xotherchain",
                    locator: "external-wallet:0xotherchain",
                    chains: { ethereum: { status: "success" } },
                } as any);

            await expect(wallet.isSignerApproved("external-wallet:0xpending")).resolves.toBe(false);
            await expect(wallet.isSignerApproved("external-wallet:0xfailed")).resolves.toBe(false);
            await expect(wallet.isSignerApproved("external-wallet:0xotherchain")).resolves.toBe(false);
        });

        // pins wallet.ts getSignerState guard (1874-1876): null / non-object getSigner responses are swallowed, not thrown
        it("resolves false (does not throw) when getSigner resolves to null or a non-object value", async () => {
            const wallet = createEvmWallet(mockApiClient);
            mockApiClient.getSigner.mockResolvedValueOnce(null as any).mockResolvedValueOnce("not-an-object" as any);

            await expect(wallet.isSignerApproved("external-wallet:0xwhatever")).resolves.toBe(false);
            await expect(wallet.isSignerApproved("external-wallet:0xwhatever")).resolves.toBe(false);
        });
    });

    describe("apiClient getter", () => {
        // pins wallet.ts apiClient getter (323-325): identity of the constructor-provided ApiClient instance
        it("returns the identical ApiClient instance passed at construction", async () => {
            const wallet = createEvmWallet(mockApiClient);
            await wallet.waitForInit();

            expect(wallet.apiClient).toBe(mockApiClient as unknown as ApiClient);
        });
    });
});
