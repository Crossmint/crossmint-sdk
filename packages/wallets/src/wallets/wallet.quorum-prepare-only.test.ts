import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateTransactionSuccessResponse, SendResponse } from "../api";
import type { Chain } from "../chains/chains";
import type { ServerSignerConfig } from "../signers/types";
import { EVMWallet } from "./evm";
import { SolanaWallet } from "./solana";
import { StellarWallet } from "./stellar";
import { Wallet } from "./wallet";
import {
    createMockApiClient,
    createMockSolanaSerializedTransaction,
    createMockWallet,
    createQuorumApiEntry,
    createQuorumPendingApproval,
    type MockedApiClient,
} from "./__tests__/test-helpers";
import type { SendTokenTransactionOptions, SignerOption, TransactionInputOptions } from "./types";

const QUORUM = createQuorumApiEntry();
const SERVER_CONFIG = { type: "server", secret: "server-secret" } as ServerSignerConfig;
const DERIVED_SERVER_LOCATOR = "server:0xDerivedServer";
const EXPLICIT_LOCATOR = "external-wallet:0xExplicit";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const STELLAR_CONTRACT = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const LANDED_HASH = "0xlanded";
const LANDED_EXPLORER_LINK = "https://explorer.example.com/tx/0xlanded";

// `prepareOnly` may be omitted here: an untyped caller can leave it out.
type CallOptions = { prepareOnly?: boolean; signer?: SignerOption };

type CreatingCall = {
    name: string;
    chain: Chain;
    chainType: "evm" | "solana" | "stellar";
    call: (wallet: Wallet<Chain>, options: CallOptions) => Promise<unknown>;
    created: (api: MockedApiClient) => { calls: number; signer: unknown };
};

// The SDK sends `signer` on every chain; some variants of the generated params union leave it out.
const createTransactionRequests = (api: MockedApiClient) => ({
    calls: api.createTransaction.mock.calls.length,
    signer: (api.createTransaction.mock.calls[0]?.[1].params as { signer?: string } | undefined)?.signer,
});

const CREATING_CALLS: CreatingCall[] = [
    {
        name: "send",
        chain: "base-sepolia",
        chainType: "evm",
        call: (wallet, options) => wallet.send(RECIPIENT, "usdc", "1", options as SendTokenTransactionOptions),
        created: (api) => ({ calls: api.send.mock.calls.length, signer: api.send.mock.calls[0]?.[2].signer }),
    },
    {
        name: "EVM sendTransaction",
        chain: "base-sepolia",
        chainType: "evm",
        call: (wallet, options) =>
            EVMWallet.from(wallet).sendTransaction({
                to: RECIPIENT,
                value: BigInt(1),
                options: options as TransactionInputOptions,
            }),
        created: createTransactionRequests,
    },
    {
        name: "Solana sendTransaction",
        chain: "solana",
        chainType: "solana",
        call: (wallet, options) =>
            SolanaWallet.from(wallet).sendTransaction({
                serializedTransaction: createMockSolanaSerializedTransaction(),
                options: options as TransactionInputOptions,
            }),
        created: createTransactionRequests,
    },
    {
        name: "Stellar sendTransaction",
        chain: "stellar",
        chainType: "stellar",
        call: (wallet, options) =>
            StellarWallet.from(wallet).sendTransaction({
                contractId: STELLAR_CONTRACT,
                method: "transfer",
                args: {},
                options: options as TransactionInputOptions,
            }),
        created: createTransactionRequests,
    },
];

// Settles the call while fake timers run, so a sleep on the approval path cannot hang the test.
const settle = async (call: Promise<unknown>) => {
    const settled = call.then(
        (value) => ({ value }),
        (error: unknown) => ({ error })
    );
    await vi.runAllTimersAsync();
    return settled;
};

const createdRequest = (transactionId: string) => ({ hash: undefined, explorerLink: undefined, transactionId });

describe("creating calls with a quorum as the acting signer", () => {
    let api: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
        api.send.mockResolvedValue({ id: "txn-1" } as unknown as SendResponse);
        api.createTransaction.mockResolvedValue({ id: "txn-1" } as unknown as CreateTransactionSuccessResponse);
        vi.spyOn(
            Wallet.prototype as unknown as { resolveServerSignerApiLocator: () => string },
            "resolveServerSignerApiLocator"
        ).mockReturnValue(DERIVED_SERVER_LOCATOR);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe.each(CREATING_CALLS)("$name", ({ chain, chainType, call, created }) => {
        // The request as the API would report it: only the quorum's members can approve it.
        const arrangeQuorumAwaitingApproval = () =>
            api.getTransaction.mockResolvedValue({
                id: "txn-1",
                status: "awaiting-approval",
                chainType,
                approvals: { pending: [createQuorumPendingApproval({ quorum: QUORUM })], submitted: [] },
            } as never);

        describe.each(["api-key", "external-wallet"] as const)("with an %s active signer", (activeSigner) => {
            let wallet: Wallet<Chain>;

            beforeEach(async () => {
                wallet = await createMockWallet(chain, api, activeSigner);
                arrangeQuorumAwaitingApproval();
            });

            describe.each([true, false, undefined])("and prepareOnly %s", (prepareOnly) => {
                it("creates the request as the quorum and returns it unsigned, without waiting", async () => {
                    const outcome = await settle(call(wallet, { prepareOnly, signer: QUORUM.locator }));

                    expect(outcome).toStrictEqual({ value: createdRequest("txn-1") });
                    expect(created(api)).toEqual({ calls: 1, signer: QUORUM.locator });
                    expect(api.getTransaction).not.toHaveBeenCalled();
                    expect(api.approveTransaction).not.toHaveBeenCalled();
                });
            });
        });

        describe("when the same call is made twice", () => {
            it("creates two requests and returns each one's id", async () => {
                const wallet = await createMockWallet(chain, api, "api-key");
                arrangeQuorumAwaitingApproval();
                api.send.mockResolvedValueOnce({ id: "txn-1" } as unknown as SendResponse);
                api.send.mockResolvedValueOnce({ id: "txn-2" } as unknown as SendResponse);
                api.createTransaction.mockResolvedValueOnce({
                    id: "txn-1",
                } as unknown as CreateTransactionSuccessResponse);
                api.createTransaction.mockResolvedValueOnce({
                    id: "txn-2",
                } as unknown as CreateTransactionSuccessResponse);

                const first = await settle(call(wallet, { prepareOnly: false, signer: QUORUM.locator }));
                const second = await settle(call(wallet, { prepareOnly: false, signer: QUORUM.locator }));

                expect([first, second]).toStrictEqual([
                    { value: createdRequest("txn-1") },
                    { value: createdRequest("txn-2") },
                ]);
                expect(created(api).calls).toBe(2);
                expect(api.getTransaction).not.toHaveBeenCalled();
            });
        });
    });
});

describe("creating calls with a signer that is not a quorum", () => {
    let api: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
        api.send.mockResolvedValue({ id: "txn-1" } as unknown as SendResponse);
        api.createTransaction.mockResolvedValue({ id: "txn-1" } as unknown as CreateTransactionSuccessResponse);
        api.getTransaction.mockResolvedValue({
            id: "txn-1",
            status: "success",
            onChain: { txId: LANDED_HASH, explorerLink: LANDED_EXPLORER_LINK },
        } as never);
        vi.spyOn(
            Wallet.prototype as unknown as { resolveServerSignerApiLocator: () => string },
            "resolveServerSignerApiLocator"
        ).mockReturnValue(DERIVED_SERVER_LOCATOR);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe.each(CREATING_CALLS)("$name", ({ chain, call, created }) => {
        describe.each([
            {
                kind: "the active signer",
                signer: undefined,
                sentSigner: (wallet: Wallet<Chain>) => wallet.signer?.locator(),
            },
            { kind: "an explicit locator", signer: EXPLICIT_LOCATOR, sentSigner: () => EXPLICIT_LOCATOR },
            { kind: "a server signer config", signer: SERVER_CONFIG, sentSigner: () => DERIVED_SERVER_LOCATOR },
        ])("acting as $kind", ({ signer, sentSigner }) => {
            let wallet: Wallet<Chain>;

            beforeEach(async () => {
                wallet = await createMockWallet(chain, api, "api-key");
            });

            it("waits for the transaction to land when prepareOnly is false", async () => {
                const outcome = await settle(call(wallet, { prepareOnly: false, signer }));

                expect(outcome).toStrictEqual({
                    value: { hash: LANDED_HASH, explorerLink: LANDED_EXPLORER_LINK, transactionId: "txn-1" },
                });
                expect(created(api).signer).toBe(sentSigner(wallet));
            });

            it("returns the created request without waiting when prepareOnly is true", async () => {
                const outcome = await settle(call(wallet, { prepareOnly: true, signer }));

                expect(outcome).toStrictEqual({ value: createdRequest("txn-1") });
                expect(api.getTransaction).not.toHaveBeenCalled();
            });
        });
    });
});
