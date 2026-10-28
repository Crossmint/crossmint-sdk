import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import type { Chain } from "../chains/chains";
import type { RecoverySignerConfigForChain } from "../signers/types";
import { QuorumRequestError, QuorumSignerNotSupportedError } from "../utils/errors";
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

const QUORUM = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
const MALFORMED_QUORUM = "email:bob@acme.com";
const MALFORMED_MESSAGE = `Malformed quorum locator: ${MALFORMED_QUORUM}`;
const BOTH_OPTIONS_MESSAGE = "Pass either signer or quorum, not both";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const STELLAR_CONTRACT = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const TYPED_DATA = {
    domain: { name: "App", version: "1", chainId: 84532, verifyingContract: RECIPIENT },
    types: { Mail: [{ name: "contents", type: "string" }] },
    primaryType: "Mail",
    message: { contents: "hello" },
    chain: "base-sepolia",
} as const;
// A recovery method that cannot be assembled: if a call activated it, the call would throw.
const UNASSEMBLABLE_RECOVERY = [{ type: "external-wallet", address: "RecoveryAddress123" }];

// A request whose only pending entry is the quorum, as the wallets API returns it.
const awaitingQuorum = (id: string, chainType: string) => ({
    id,
    status: "awaiting-approval",
    chainType,
    approvals: { pending: [createQuorumPendingApproval({ quorum: QUORUM })], submitted: [] },
});

// One public call that creates a request: `create` runs it with `options`, `sentSigner` reads the signer it sent.
type CreatingPath = {
    name: string;
    chain: Chain;
    kind: "transaction" | "signature";
    create: (wallet: Wallet<Chain>, options: object) => Promise<unknown>;
    createCall: (api: MockedApiClient) => MockedFunction<(...args: never[]) => unknown>;
    sentSigner: (api: MockedApiClient) => unknown;
};

const createdTransactionSigner = (api: MockedApiClient) => api.createTransaction.mock.calls[0][1].params.signer;

const CREATING_PATHS: CreatingPath[] = [
    {
        name: "send",
        chain: "base-sepolia",
        kind: "transaction",
        create: (wallet, options) => wallet.send(RECIPIENT, "usdc", "1", options as never),
        createCall: (api) => api.send as never,
        sentSigner: (api) => api.send.mock.calls[0][2].signer,
    },
    {
        name: "EVM sendTransaction",
        chain: "base-sepolia",
        kind: "transaction",
        create: (wallet, options) =>
            EVMWallet.from(wallet).sendTransaction({ to: RECIPIENT, value: 1n, options: options as never }),
        createCall: (api) => api.createTransaction as never,
        sentSigner: createdTransactionSigner,
    },
    {
        name: "Solana sendTransaction",
        chain: "solana",
        kind: "transaction",
        create: (wallet, options) =>
            SolanaWallet.from(wallet).sendTransaction({
                serializedTransaction: createMockSolanaSerializedTransaction(),
                options: options as never,
            }),
        createCall: (api) => api.createTransaction as never,
        sentSigner: createdTransactionSigner,
    },
    {
        name: "Stellar sendTransaction",
        chain: "stellar",
        kind: "transaction",
        create: (wallet, options) =>
            StellarWallet.from(wallet).sendTransaction({
                contractId: STELLAR_CONTRACT,
                method: "transfer",
                args: {},
                options: options as never,
            }),
        createCall: (api) => api.createTransaction as never,
        sentSigner: createdTransactionSigner,
    },
    {
        name: "Stellar upgrade",
        chain: "stellar",
        kind: "transaction",
        create: (wallet, options) => StellarWallet.from(wallet).upgrade(options as never),
        createCall: (api) => api.createTransaction as never,
        sentSigner: createdTransactionSigner,
    },
    {
        name: "Stellar migrate",
        chain: "stellar",
        kind: "transaction",
        create: (wallet, options) => StellarWallet.from(wallet).migrate(options as never),
        createCall: (api) => api.createTransaction as never,
        sentSigner: createdTransactionSigner,
    },
    {
        name: "EVM signMessage",
        chain: "base-sepolia",
        kind: "signature",
        create: (wallet, options) =>
            EVMWallet.from(wallet).signMessage({ message: "hello", options: options as never }),
        createCall: (api) => api.createSignature as never,
        sentSigner: (api) => api.createSignature.mock.calls[0][1].params.signer,
    },
    {
        name: "EVM signTypedData",
        chain: "base-sepolia",
        kind: "signature",
        create: (wallet, options) =>
            EVMWallet.from(wallet).signTypedData({ ...TYPED_DATA, options: options as never } as never),
        createCall: (api) => api.createSignature as never,
        sentSigner: (api) => api.createSignature.mock.calls[0][1].params.signer,
    },
];

const CHAIN_TYPES: Record<string, string> = { "base-sepolia": "evm", solana: "solana", stellar: "stellar" };

// preAuth can start an OTP flow or a device recovery, so a call that cannot succeed must stop before it.
const spyOnPreAuth = () =>
    vi.spyOn(Wallet.prototype as unknown as { preAuthIfNeeded: () => Promise<void> }, "preAuthIfNeeded");

const MALFORMED_QUORUMS = [
    { form: "a malformed quorum locator", quorum: MALFORMED_QUORUM, message: MALFORMED_MESSAGE },
    {
        form: "a quorum object with a malformed locator",
        quorum: { ...QUORUM, locator: "quorum:not-a-uuid" },
        message: "Malformed quorum locator: quorum:not-a-uuid",
    },
];

describe("the quorum option on calls that create a request", () => {
    let api: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        api = createMockApiClient();
        api.send.mockResolvedValue({ id: "request-1" } as never);
        api.createTransaction.mockResolvedValue({ id: "request-1" } as never);
        api.createSignature.mockResolvedValue({ id: "request-1" } as never);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each(CREATING_PATHS)("$name", ({ chain, kind, create, createCall, sentSigner }) => {
        let wallet: Wallet<Chain>;
        const preparedId = kind === "transaction" ? "transactionId" : "signatureId";

        beforeEach(async () => {
            wallet = await createMockWallet(chain, api, "external-wallet");
            api.getTransaction.mockResolvedValue(awaitingQuorum("request-1", CHAIN_TYPES[chain]) as never);
            api.getSignature.mockResolvedValue(awaitingQuorum("request-1", CHAIN_TYPES[chain]) as never);
        });

        describe.each([
            { form: "a quorum object", quorum: QUORUM },
            { form: "a quorum locator", quorum: QUORUM.locator },
        ])("with $form and prepareOnly", ({ quorum }) => {
            it("creates the request as the quorum and returns it prepared, without approving", async () => {
                const result = await create(wallet, { quorum, prepareOnly: true });

                expect(sentSigner(api)).toBe(QUORUM.locator);
                expect((result as Record<string, unknown>)[preparedId]).toBe("request-1");
                expect(api.getTransaction).not.toHaveBeenCalled();
                expect(api.getSignature).not.toHaveBeenCalled();
            });
        });

        describe("with a quorum and no prepareOnly", () => {
            it("creates the request once and stops at the quorum approval guard", async () => {
                await expect(create(wallet, { quorum: QUORUM })).rejects.toThrow(QuorumSignerNotSupportedError);

                expect(createCall(api)).toHaveBeenCalledTimes(1);
                expect(sentSigner(api)).toBe(QUORUM.locator);
            });
        });

        describe.each(MALFORMED_QUORUMS)("with $form", ({ quorum, message }) => {
            it("throws before authenticating or creating the request", async () => {
                const preAuth = spyOnPreAuth();

                await expect(create(wallet, { quorum, prepareOnly: true })).rejects.toThrow(message);

                expect(preAuth).not.toHaveBeenCalled();
                expect(createCall(api)).not.toHaveBeenCalled();
            });
        });
    });

    // Signature calls take no `signer` option, so only transaction calls can be given both.
    describe.each(CREATING_PATHS.filter(({ kind }) => kind === "transaction"))(
        "$name with both signer and quorum",
        ({ chain, create, createCall }) => {
            it("throws before authenticating or creating the request", async () => {
                const wallet = await createMockWallet(chain, api, "external-wallet");
                const preAuth = spyOnPreAuth();

                await expect(
                    create(wallet, { signer: "external-wallet:0xabc", quorum: QUORUM, prepareOnly: true })
                ).rejects.toThrow(BOTH_OPTIONS_MESSAGE);

                expect(preAuth).not.toHaveBeenCalled();
                expect(createCall(api)).not.toHaveBeenCalled();
            });
        }
    );

    describe("Stellar upgrade with a quorum, when the wallet is already locked", () => {
        it("skips the upgrade phase and creates the migration as the quorum", async () => {
            const wallet = await createMockWallet("stellar", api, "external-wallet");
            api.createTransaction
                .mockResolvedValueOnce({ error: true, statusCode: 409, message: "Wallet is locked" } as never)
                .mockResolvedValueOnce({ id: "txn-migrate" } as never);

            const result = await StellarWallet.from(wallet).upgrade({ quorum: QUORUM, prepareOnly: true });

            expect(result.transactionId).toBe("txn-migrate");
            expect(api.createTransaction.mock.calls[1][1].params).toEqual({
                transaction: { type: "migrate-wallet" },
                signer: QUORUM.locator,
            });
        });
    });

    describe("Solana sendTransaction, when the API has no quorums for the wallet", () => {
        it("throws QuorumRequestError with the API's reason", async () => {
            const wallet = await createMockWallet("solana", api, "external-wallet");
            api.createTransaction.mockResolvedValue({
                error: true,
                code: "QUORUM_SIGNER_UNSUPPORTED",
                message: "Quorum signers are not supported for 'solana-smart-wallet' wallets yet.",
            } as never);

            const sending = SolanaWallet.from(wallet).sendTransaction({
                serializedTransaction: createMockSolanaSerializedTransaction(),
                options: { quorum: QUORUM } as never,
            });

            await expect(sending).rejects.toBeInstanceOf(QuorumRequestError);
            await expect(sending).rejects.toMatchObject({ reason: "QUORUM_SIGNER_UNSUPPORTED" });
        });
    });
});

describe("the quorum option on approve", () => {
    let api: MockedApiClient;
    let wallet: Wallet<Chain>;

    beforeEach(async () => {
        vi.clearAllMocks();
        api = createMockApiClient();
        wallet = await createMockWallet("base-sepolia", api, "external-wallet");
        api.getTransaction.mockResolvedValue(awaitingQuorum("txn-1", "evm") as never);
        api.getSignature.mockResolvedValue(awaitingQuorum("sig-1", "evm") as never);
    });

    describe.each([
        { kind: "transaction", params: { transactionId: "txn-1" }, read: (a: MockedApiClient) => a.getTransaction },
        { kind: "signature", params: { signatureId: "sig-1" }, read: (a: MockedApiClient) => a.getSignature },
    ])("for a $kind", ({ params, read }) => {
        describe("with a malformed quorum", () => {
            it("throws before reading the request", async () => {
                await expect(wallet.approve({ ...params, quorum: MALFORMED_QUORUM } as never)).rejects.toThrow(
                    MALFORMED_MESSAGE
                );

                expect(read(api)).not.toHaveBeenCalled();
            });
        });

        describe("with a quorum", () => {
            it("reads the request and stops at the quorum approval guard, as without the option", async () => {
                await expect(wallet.approve({ ...params, quorum: QUORUM } as never)).rejects.toThrow(
                    QuorumSignerNotSupportedError
                );

                expect(read(api)).toHaveBeenCalledTimes(1);
            });
        });
    });
});

// One signer-change call: `run` makes it with `options`, `sentApprover` reads the approver it sent.
type SignerChangePath = {
    name: string;
    run: (wallet: Wallet<Chain>, options: object) => Promise<unknown>;
    call: (api: MockedApiClient) => MockedFunction<(...args: never[]) => unknown>;
    sentApprover: (api: MockedApiClient) => unknown;
};

const SIGNER_CHANGE_PATHS: SignerChangePath[] = [
    {
        name: "addSigner",
        run: (wallet, options) =>
            wallet.addSigner({ type: "external-wallet", address: "NewSigner444" } as never, options as never),
        call: (api) => api.registerSigner as never,
        sentApprover: (api) => api.registerSigner.mock.calls[0][1].approver,
    },
    {
        name: "removeSigner",
        run: (wallet, options) =>
            wallet.removeSigner({ type: "external-wallet", address: "Delegated333" } as never, options as never),
        call: (api) => api.removeSigner as never,
        sentApprover: (api) => api.removeSigner.mock.calls[0][2].approver,
    },
    {
        name: "addRecoveryMethod",
        run: (wallet, options) =>
            wallet.addRecoveryMethod({ type: "external-wallet", address: "NewRecovery555" } as never, options as never),
        call: (api) => api.registerRecoveryMethod as never,
        sentApprover: (api) => api.registerRecoveryMethod.mock.calls[0][1].approver,
    },
    {
        name: "removeRecoveryMethod",
        run: (wallet, options) =>
            wallet.removeRecoveryMethod(
                { type: "external-wallet", address: "RecoveryAddress123" } as never,
                options as never
            ),
        call: (api) => api.removeRecoveryMethod as never,
        sentApprover: (api) => api.removeRecoveryMethod.mock.calls[0][2].approver,
    },
];

// Each chain's register-signer answer: Solana and Stellar return a transaction, EVM a per-chain operation.
const REGISTERED_SIGNER = {
    type: "external-wallet",
    address: "NewSigner444",
    locator: "external-wallet:NewSigner444",
};
const SIGNER_CHANGE_CHAINS = [
    {
        chain: "solana" as const,
        paths: SIGNER_CHANGE_PATHS,
        registered: { ...REGISTERED_SIGNER, transaction: { id: "txn-change", status: "awaiting-approval" } },
    },
    {
        chain: "stellar" as const,
        paths: SIGNER_CHANGE_PATHS,
        registered: { ...REGISTERED_SIGNER, transaction: { id: "txn-change", status: "awaiting-approval" } },
    },
    {
        // Recovery-method changes are not on EVM in this stack.
        chain: "base-sepolia" as const,
        paths: SIGNER_CHANGE_PATHS.filter(({ name }) => name === "addSigner" || name === "removeSigner"),
        registered: {
            ...REGISTERED_SIGNER,
            chains: { "base-sepolia": { id: "txn-change", status: "awaiting-approval", onChain: {} } },
        },
    },
];

describe.each(SIGNER_CHANGE_CHAINS)("the quorum option on signer changes on $chain", ({ chain, paths, registered }) => {
    let api: MockedApiClient;
    let wallet: Wallet<Chain>;

    beforeEach(async () => {
        vi.clearAllMocks();
        api = createMockApiClient();
        api.registerSigner.mockResolvedValue(registered as never);
        api.removeSigner.mockResolvedValue({ id: "txn-change", status: "awaiting-approval" } as never);
        api.registerRecoveryMethod.mockResolvedValue({ tx: { id: "txn-change" } } as never);
        api.removeRecoveryMethod.mockResolvedValue({ id: "txn-change", status: "awaiting-approval" } as never);
        api.getTransaction.mockResolvedValue(awaitingQuorum("txn-change", CHAIN_TYPES[chain]) as never);
        wallet = await createMockWallet(
            chain,
            api,
            "external-wallet",
            UNASSEMBLABLE_RECOVERY as unknown as RecoverySignerConfigForChain<Chain>[]
        );
    });

    describe.each(paths)("$name", ({ run, call, sentApprover }) => {
        describe("with a quorum and prepareOnly", () => {
            it("sends the quorum as the approver and activates no recovery signer", async () => {
                const signerBefore = wallet.signer;

                const result = await run(wallet, { quorum: QUORUM, prepareOnly: true });

                expect(sentApprover(api)).toBe(QUORUM.locator);
                expect((result as { transactionId?: string }).transactionId).toBe("txn-change");
                expect(wallet.signer).toBe(signerBefore);
                expect(api.getTransaction).not.toHaveBeenCalled();
            });
        });

        describe("with a quorum and no prepareOnly", () => {
            it("makes the change request once and stops at the quorum approval guard", async () => {
                await expect(run(wallet, { quorum: QUORUM.locator })).rejects.toThrow(QuorumSignerNotSupportedError);

                expect(call(api)).toHaveBeenCalledTimes(1);
            });
        });

        describe.each(MALFORMED_QUORUMS)("with $form", ({ quorum, message }) => {
            it("throws before making the change request", async () => {
                await expect(run(wallet, { quorum, prepareOnly: true })).rejects.toThrow(message);

                expect(call(api)).not.toHaveBeenCalled();
            });
        });
    });
});

describe("addSigner with a quorum, for a signer registered before", () => {
    const RECOVERY_ADDRESS = "0x3333333333333333333333333333333333333333";
    const RECOVERY_LOCATOR = `external-wallet:${RECOVERY_ADDRESS}`;
    const NEW_SIGNER_LOCATOR = "external-wallet:0x4444444444444444444444444444444444444444";
    let api: MockedApiClient;
    let wallet: Wallet<Chain>;

    beforeEach(async () => {
        vi.clearAllMocks();
        api = createMockApiClient();
        const recovery = {
            type: "external-wallet",
            address: RECOVERY_ADDRESS,
            onSign: vi.fn(async () => "0xrecovery"),
        };
        wallet = await createMockWallet("base-sepolia", api, "external-wallet", [
            recovery,
        ] as unknown as RecoverySignerConfigForChain<Chain>[]);
        vi.spyOn(Wallet.prototype as unknown as { sleep: () => Promise<void> }, "sleep").mockResolvedValue();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const addAgain = () =>
        wallet.addSigner(
            { type: "external-wallet", address: NEW_SIGNER_LOCATOR.slice("external-wallet:".length) } as never,
            { quorum: QUORUM } as never
        );

    describe("when it is already approved", () => {
        it("returns it as success without a new request", async () => {
            api.getSigner.mockResolvedValue({
                type: "external-wallet",
                locator: NEW_SIGNER_LOCATOR,
                chains: { "base-sepolia": { id: "sig-done", status: "success" } },
            } as never);

            const result = await addAgain();

            expect((result as { status: string }).status).toBe("success");
            expect(api.registerSigner).not.toHaveBeenCalled();
        });
    });

    describe("when its registration is still pending", () => {
        it("finishes it with the recovery method, as without the quorum option", async () => {
            api.getSigner.mockResolvedValue({
                type: "external-wallet",
                locator: NEW_SIGNER_LOCATOR,
                chains: { "base-sepolia": { id: "txn-pending", status: "awaiting-approval", onChain: {} } },
            } as never);
            api.getTransaction
                .mockResolvedValueOnce({
                    id: "txn-pending",
                    status: "awaiting-approval",
                    chainType: "evm",
                    approvals: {
                        pending: [
                            {
                                signer: {
                                    type: "external-wallet",
                                    address: RECOVERY_ADDRESS,
                                    locator: RECOVERY_LOCATOR,
                                },
                                message: "0xpending",
                            },
                        ],
                        submitted: [],
                    },
                } as never)
                .mockResolvedValue({
                    id: "txn-pending",
                    status: "success",
                    onChain: { txId: "0xhash", explorerLink: "https://explorer/tx/0xhash" },
                } as never);
            api.approveTransaction.mockResolvedValue({ id: "txn-pending", status: "pending" } as never);

            await addAgain();

            expect(api.registerSigner).not.toHaveBeenCalled();
            const [[, , body]] = api.approveTransaction.mock.calls;
            expect(body.approvals).toEqual([{ signature: "0xrecovery", signer: RECOVERY_LOCATOR }]);
        });
    });
});
