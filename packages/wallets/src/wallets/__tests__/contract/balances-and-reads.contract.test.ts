/**
 * CHARACTERIZATION (contract) tests for the read-side surface of Wallet:
 * balances(), stagingFund(), nfts(), transactions(), transaction(), transfers().
 *
 * These tests pin CURRENT behavior (exact error classes and message strings,
 * API call arguments, response passthrough and transform output shapes) ahead of
 * the wallet.ts service decomposition. If one of these fails after a refactor,
 * the refactor changed observable behavior.
 *
 * Phase 1 migration note: the pure balance-shaping pins (chain-specific token
 * fields, default-token synthesis, the requestedTokens filter semantics) moved to
 * src/wallets/services/balance-formatter.test.ts, colocated with the extracted
 * formatBalanceResponse. What stays here is Wallet-level orchestration only:
 * getBalance call arguments (native-token + usdc token-list construction) and the
 * error branches. The per-chain native-token mapping is additionally pinned by
 * wallet.test.ts ("returns balances for Solana/Stellar chain").
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Wallet } from "../../wallet";
import type { ApiClient, GetBalanceSuccessResponse } from "../../../api";
import type { SignerConfigForChain } from "../../../signers/types";
import { createMockApiClient, createMockWallet, type MockedApiClient } from "../test-helpers";
import { walletsLogger } from "../../../logger";

// The global test setup (__tests__/setup.ts) mocks walletsLogger without a `debug` method,
// but validateChainForEnvironment's mainnet->testnet auto-conversion path calls walletsLogger.debug.
// Patch it here (mock object only — no production code is touched).
(walletsLogger as unknown as { debug?: () => void }).debug ??= vi.fn();

// The shared MockedApiClient helper does not stub the read-side endpoints under
// audit here (fundWallet, getNfts, getTransactions, getTransfers), so extend it.
type ExtendedMockApiClient = MockedApiClient & {
    fundWallet: ReturnType<typeof vi.fn>;
    getNfts: ReturnType<typeof vi.fn>;
    getTransactions: ReturnType<typeof vi.fn>;
    getTransfers: ReturnType<typeof vi.fn>;
};

const createExtendedMockApiClient = (overrides: Partial<MockedApiClient> = {}): ExtendedMockApiClient =>
    Object.assign(createMockApiClient(overrides), {
        fundWallet: vi.fn(),
        getNfts: vi.fn(),
        getTransactions: vi.fn(),
        getTransfers: vi.fn(),
    });

// Asserts a promise rejects with a PLAIN Error (not a subclass) carrying the exact message.
const expectPlainErrorRejection = async (promise: Promise<unknown>, exactMessage: string): Promise<void> => {
    const error = await promise.then(
        () => {
            throw new Error("expected promise to reject, but it resolved");
        },
        (e: unknown) => e
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).constructor).toBe(Error);
    expect((error as Error).message).toBe(exactMessage);
};

describe("contract: balances-and-reads", () => {
    let mockApiClient: ExtendedMockApiClient;
    let wallet: Wallet<"base-sepolia">;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockApiClient = createExtendedMockApiClient();
        wallet = await createMockWallet("base-sepolia", mockApiClient);
    });

    describe("balances() requested-token filtering (otherTokens filter)", () => {
        const responseWithExtras: GetBalanceSuccessResponse = [
            {
                symbol: "eth",
                name: "Ethereum",
                amount: "1.0",
                rawAmount: "1000000000000000000",
                decimals: 18,
                chains: {
                    "base-sepolia": {
                        locator: "base-sepolia:eth",
                        amount: "1.0",
                        rawAmount: "1000000000000000000",
                    },
                },
            },
            {
                symbol: "usdc",
                name: "USD Coin",
                amount: "100.0",
                rawAmount: "100000000",
                decimals: 6,
                chains: {
                    "base-sepolia": {
                        locator: "base-sepolia:usdc",
                        amount: "100.0",
                        rawAmount: "100000000",
                        contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                    },
                },
            },
            {
                symbol: "dai",
                name: "Dai Stablecoin",
                amount: "50.0",
                rawAmount: "50000000000000000000",
                decimals: 18,
                chains: {
                    "base-sepolia": {
                        locator: "base-sepolia:dai",
                        amount: "50.0",
                        rawAmount: "50000000000000000000",
                        contractAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
                    },
                },
            },
            {
                symbol: "wbtc",
                name: "Wrapped BTC",
                amount: "0.5",
                rawAmount: "50000000",
                decimals: 8,
                chains: {
                    "base-sepolia": {
                        locator: "base-sepolia:wbtc",
                        amount: "0.5",
                        rawAmount: "50000000",
                        contractAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
                    },
                },
            },
        ];

        // pins wallet.ts balances() ORCHESTRATION: getBalance call args (native token + usdc are
        // prepended to the requested token list) and that the requested tokens are forwarded to
        // formatBalanceResponse (wbtc excluded). The filter SEMANTICS themselves are pinned in
        // src/wallets/services/balance-formatter.test.ts.
        it("filters out response tokens not in the requested tokens list", async () => {
            mockApiClient.getBalance.mockResolvedValue(responseWithExtras);

            const balances = await wallet.balances(["dai"]);

            // wbtc is in the response but was not requested -> excluded
            expect(balances.tokens.map((t) => t.symbol)).toEqual(["dai"]);
            expect(mockApiClient.getBalance).toHaveBeenCalledWith(wallet.address, {
                chains: ["base-sepolia"],
                tokens: ["eth", "usdc", "dai"],
            });
        });
    });

    describe("balances() error contract", () => {
        // pins wallet.ts balances error branch: plain Error with JSON-serialized response.message suffix
        it("balances error message includes JSON-serialized response.message", async () => {
            mockApiClient.getBalance.mockResolvedValue({
                error: "rate_limited",
                message: "rate limited",
            } as unknown as GetBalanceSuccessResponse);

            await expectPlainErrorRejection(wallet.balances(), 'Failed to get balances for wallet: "rate limited"');
        });
    });

    describe("stagingFund()", () => {
        // pins wallet.ts stagingFund: fundWallet(address, { amount, token: 'usdxm', chain: this.chain }) and response passthrough
        it("stagingFund calls fundWallet with usdxm token and wallet chain by default", async () => {
            const fundResponse = { status: "success", txId: "0xfund123" };
            mockApiClient.fundWallet.mockResolvedValue(fundResponse);

            const result = await wallet.stagingFund(10);

            expect(mockApiClient.fundWallet).toHaveBeenCalledTimes(1);
            expect(mockApiClient.fundWallet).toHaveBeenCalledWith(wallet.address, {
                amount: 10,
                token: "usdxm",
                chain: "base-sepolia",
            });
            // returned unchanged (same reference)
            expect(result).toBe(fundResponse);
        });

        // pins wallet.ts stagingFund chain override: chain ?? this.chain, NO resolveChainForEnvironment, no wallet state mutation
        it("stagingFund uses explicit chain parameter over wallet default chain", async () => {
            mockApiClient.fundWallet.mockResolvedValue({ status: "success" });

            // "polygon" is a mainnet chain; in STAGING resolveChainForEnvironment would convert it
            // to "polygon-amoy". stagingFund passes it through verbatim — pinning that it does NOT
            // run environment chain validation.
            await wallet.stagingFund(5, "polygon");

            expect(mockApiClient.fundWallet).toHaveBeenCalledWith(wallet.address, {
                amount: 5,
                token: "usdxm",
                chain: "polygon",
            });
            // wallet's own chain is untouched
            expect(wallet.chain).toBe("base-sepolia");
        });

        // pins wallet.ts stagingFund error branch: plain Error 'Failed to fund wallet: <JSON of response.message>'
        it("stagingFund throws 'Failed to fund wallet: <message>' when API returns error", async () => {
            mockApiClient.fundWallet.mockResolvedValue({
                error: "funding_failed",
                message: "insufficient faucet funds",
            });

            await expectPlainErrorRejection(
                wallet.stagingFund(10),
                'Failed to fund wallet: "insufficient faucet funds"'
            );
        });
    });

    describe("transactions()", () => {
        // pins wallet.ts transactions: getTransactions(walletLocator) with client-side 'me:evm:smart' locator + passthrough
        it("transactions returns API response and passes wallet locator to getTransactions", async () => {
            const transactionsResponse = { transactions: [{ id: "tx_1" }, { id: "tx_2" }] };
            mockApiClient.getTransactions.mockResolvedValue(transactionsResponse);

            const result = await wallet.transactions();

            expect(mockApiClient.getTransactions).toHaveBeenCalledTimes(1);
            expect(mockApiClient.getTransactions).toHaveBeenCalledWith("me:evm:smart");
            expect(result).toBe(transactionsResponse);
        });

        // pins wallet.ts walletLocator getter: chain-specific 'me:<chain>:smart' locators on client side
        it("uses chain-specific smart wallet locators on client side", async () => {
            mockApiClient.getTransactions.mockResolvedValue({ transactions: [] });

            const solanaWallet = await createMockWallet("solana", mockApiClient);
            await solanaWallet.transactions();
            expect(mockApiClient.getTransactions).toHaveBeenLastCalledWith("me:solana:smart");

            const stellarWallet = await createMockWallet("stellar", mockApiClient);
            await stellarWallet.transactions();
            expect(mockApiClient.getTransactions).toHaveBeenLastCalledWith("me:stellar:smart");
        });

        // pins wallet.ts walletLocator getter: alias appends ':alias:<alias>' to the client-side locator
        it("appends alias to the client-side wallet locator", async () => {
            const aliasWallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as SignerConfigForChain<"base-sepolia">,
                    alias: "my-alias",
                },
                mockApiClient as unknown as ApiClient
            );
            mockApiClient.getTransactions.mockResolvedValue({ transactions: [] });

            await aliasWallet.transactions();

            expect(mockApiClient.getTransactions).toHaveBeenCalledWith("me:evm:smart:alias:my-alias");
        });

        // pins wallet.ts walletLocator getter: server-side locator is the raw wallet address
        it("uses raw address locator on server side", async () => {
            const serverApiClient = createExtendedMockApiClient({ isServerSide: true });
            const serverWallet = await createMockWallet("base-sepolia", serverApiClient);
            serverApiClient.getTransactions.mockResolvedValue({ transactions: [] });

            await serverWallet.transactions();

            expect(serverApiClient.getTransactions).toHaveBeenCalledWith(serverWallet.address);
        });

        // pins wallet.ts transactions error branch: plain Error 'Failed to get transactions: <JSON of response.message>'
        it("transactions throws 'Failed to get transactions: <message>' when API returns error", async () => {
            mockApiClient.getTransactions.mockResolvedValue({
                error: "not_found",
                message: "wallet not found",
            });

            await expectPlainErrorRejection(wallet.transactions(), 'Failed to get transactions: "wallet not found"');
        });
    });

    describe("transaction(transactionId)", () => {
        // pins wallet.ts transaction: getTransaction(walletLocator, transactionId) + passthrough on success
        it("transaction passes wallet locator and id to getTransaction and returns response unchanged", async () => {
            const transactionResponse = { id: "tx_abc", status: "success" };
            mockApiClient.getTransaction.mockResolvedValue(transactionResponse as any);

            const result = await wallet.transaction("tx_abc");

            expect(mockApiClient.getTransaction).toHaveBeenCalledTimes(1);
            expect(mockApiClient.getTransaction).toHaveBeenCalledWith("me:evm:smart", "tx_abc");
            expect(result).toBe(transactionResponse);
        });

        // pins wallet.ts transaction error branch: serializes response.error (NOT response.message like sibling methods)
        // NOTE: suspected bug — every sibling read method (balances/transactions/transfers/stagingFund)
        // serializes response.message; transaction() alone serializes response.error. Pinned as-is.
        it("transaction throws 'Failed to get transaction: <error>' serializing the error field", async () => {
            mockApiClient.getTransaction.mockResolvedValue({
                error: { code: "tx_not_found" },
                message: "human readable message that is NOT used",
            } as any);

            await expectPlainErrorRejection(
                wallet.transaction("tx_missing"),
                'Failed to get transaction: {"code":"tx_not_found"}'
            );
        });
    });

    describe("transfers()", () => {
        // pins wallet.ts transfers: getTransfers(walletLocator, { chain: resolvedChain, tokens, status }) + passthrough
        it("transfers passes resolved chain, tokens and status to getTransfers and returns response unchanged", async () => {
            const transfersResponse = { transfers: [{ id: "transfer_1" }] };
            mockApiClient.getTransfers.mockResolvedValue(transfersResponse);

            const result = await wallet.transfers({ tokens: "usdc,dai", status: "successful" });

            expect(mockApiClient.getTransfers).toHaveBeenCalledTimes(1);
            expect(mockApiClient.getTransfers).toHaveBeenCalledWith("me:evm:smart", {
                chain: "base-sepolia",
                tokens: "usdc,dai",
                status: "successful",
            });
            expect(result).toBe(transfersResponse);
        });

        // pins wallet.ts transfers: resolveChainForEnvironment converts mainnet chain in staging AND mutates wallet.chain
        it("transfers resolves mainnet chain to testnet equivalent in staging and mutates wallet chain", async () => {
            const polygonWallet = await createMockWallet("polygon", mockApiClient);
            mockApiClient.getTransfers.mockResolvedValue({ transfers: [] });

            await polygonWallet.transfers({ status: "failed" });

            expect(mockApiClient.getTransfers).toHaveBeenCalledWith("me:evm:smart", {
                chain: "polygon-amoy",
                tokens: undefined,
                status: "failed",
            });
            // state effect: resolveChainForEnvironment writes the resolved chain back onto the wallet
            expect(polygonWallet.chain).toBe("polygon-amoy");
        });

        // pins wallet.ts transfers error branch: plain Error 'Failed to get transfers: <JSON of response.message>'
        it("transfers throws 'Failed to get transfers: <message>' when API returns error", async () => {
            mockApiClient.getTransfers.mockResolvedValue({
                error: "unavailable",
                message: "transfers unavailable",
            });

            await expectPlainErrorRejection(
                wallet.transfers({ status: "successful" }),
                'Failed to get transfers: "transfers unavailable"'
            );
        });
    });

    describe("nfts()", () => {
        // pins wallet.ts nfts: getNfts({ perPage, page, chain: this.chain, address: this.address }) + raw passthrough
        it("nfts passes pagination, chain and address to getNfts and returns the raw response", async () => {
            const nftsResponse = [{ id: "nft_1" }];
            mockApiClient.getNfts.mockResolvedValue(nftsResponse);

            const result = await wallet.nfts({ perPage: 10, page: 2 });

            expect(mockApiClient.getNfts).toHaveBeenCalledTimes(1);
            expect(mockApiClient.getNfts).toHaveBeenCalledWith({
                perPage: 10,
                page: 2,
                chain: "base-sepolia",
                address: wallet.address,
            });
            expect(result).toBe(nftsResponse);
        });

        // pins wallet.ts nfts: NO error-in-response guard — an API error object is RETURNED, not thrown
        // NOTE: suspected bug — every sibling read method throws on an error-shaped response; nfts()
        // returns it to the caller, and uses this.chain without resolveChainForEnvironment. Pinned as-is.
        it("nfts returns an error-shaped response without throwing", async () => {
            const errorResponse = { error: "NOT_FOUND", message: "no nfts here" };
            mockApiClient.getNfts.mockResolvedValue(errorResponse);

            const result = await wallet.nfts({ perPage: 5, page: 1 });

            expect(result).toBe(errorResponse);
        });
    });
});
