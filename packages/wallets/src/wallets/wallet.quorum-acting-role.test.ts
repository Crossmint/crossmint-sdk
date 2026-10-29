import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../api";
import type { Chain } from "../chains/chains";
import type { QuorumMember, RecoverySignerConfigForChain, SignerConfigForChain } from "../signers/types";
import { QuorumSelectionAmbiguousError, SignatureAwaitingApprovalError } from "../utils/errors";
import { EVMWallet } from "./evm";
import { StellarWallet } from "./stellar";
import { Wallet } from "./wallet";
import {
    EVM_TYPED_DATA,
    createMockApiClient,
    createQuorumApiEntry,
    createQuorumApiEntryWith,
    createQuorumPendingApproval,
    signatureOver,
    type MockedApiClient,
} from "./__tests__/test-helpers";

const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";
const STELLAR_ADDRESS = "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const SUCCESS = {
    id: "txn-1",
    status: "success",
    onChain: { txId: "0xhash", explorerLink: "https://explorer.example/tx/0xhash" },
};

// Bob holds only his own key; it is a member of the wallet's quorums and nothing else.
const bobConfig = (address: string) =>
    ({
        type: "external-wallet",
        address,
        onSign: vi.fn(async (payload: string) => signatureOver(payload)),
    }) as unknown as SignerConfigForChain<Chain>;
const bobMember = (address: string) =>
    ({ type: "external-wallet", address, locator: `external-wallet:${address}` }) as QuorumMember;
const BOB_EVM = "0x4444444444444444444444444444444444444444";
const BOB_STELLAR = "GBOBMEMBERKEY";

const awaiting = (id: string, pending: object[], chainType = "evm") => ({
    id,
    status: "awaiting-approval",
    chainType,
    approvals: { pending, submitted: [] },
});

async function settle<T>(call: Promise<T>): Promise<{ value?: T; error?: unknown }> {
    const outcome = call.then(
        (value) => ({ value }),
        (error: unknown) => ({ error })
    );
    await vi.runAllTimersAsync();
    return outcome;
}

// A wallet whose recovery methods and listed signers are given, with Bob's member key selected.
async function walletWithBob(
    api: MockedApiClient,
    { recovery = [{ type: "api-key" }], signers = [] }: { recovery?: object[]; signers?: object[] },
    chain: Chain = "base-sepolia"
) {
    const wallet = new Wallet(
        {
            chain,
            address: chain === "stellar" ? STELLAR_ADDRESS : EVM_ADDRESS,
            recovery: recovery as unknown as RecoverySignerConfigForChain<Chain>[],
        },
        api as unknown as ApiClient
    );
    await wallet.waitForInit();
    // Chain wallets are built with `from()`, a new object, so the spy goes on the shared prototype.
    const signersSpy = vi.spyOn(Wallet.prototype, "signers").mockResolvedValue(signers as never);
    await wallet.useSigner(bobConfig(chain === "stellar" ? BOB_STELLAR : BOB_EVM));
    return { wallet, signersSpy };
}

const sentSendSigner = (api: MockedApiClient) => api.send.mock.calls[0][2].signer;
const createdTransactionSigner = (api: MockedApiClient) =>
    (api.createTransaction.mock.calls[0][1].params as { signer?: string }).signer;

describe("a creating call with a key that is only a quorum member", () => {
    let api: MockedApiClient;
    const bob = bobMember(BOB_EVM);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
        api.send.mockResolvedValue({ id: "txn-1" } as never);
        api.createTransaction.mockResolvedValue({ id: "txn-1" } as never);
        api.createSignature.mockResolvedValue({ id: "sig-1" } as never);
        api.approveTransaction.mockResolvedValue({ id: "txn-1", status: "pending" } as never);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("when the key is in one delegated quorum", () => {
        it("creates the send as that quorum and signs the key's pending member", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            const entry = createQuorumPendingApproval({ quorum: treasury });
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [entry]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            const { value } = await settle(wallet.send(RECIPIENT, "usdc", "1"));

            expect(sentSendSigner(api)).toBe(treasury.locator);
            expect(api.approveTransaction.mock.calls.map((call) => call[2].approvals)).toEqual([
                [{ signer: bob.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
            ]);
            expect(value).toMatchObject({ transactionId: "txn-1", hash: "0xhash" });
        });

        it("creates an EVM sendTransaction as that quorum", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });

            await EVMWallet.from(wallet).sendTransaction({
                to: RECIPIENT,
                value: BigInt(1),
                options: { prepareOnly: true },
            });

            expect(createdTransactionSigner(api)).toBe(treasury.locator);
        });

        it("creates the request as that quorum and signs nothing with prepareOnly", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });

            const prepared = await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(treasury.locator);
            expect(prepared.transactionId).toBe("txn-1");
            expect(api.approveTransaction).not.toHaveBeenCalled();
        });

        it("surfaces the API's rejection when the quorum is not installed yet", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "awaiting-approval" }] });
            api.send.mockResolvedValue({ error: true, message: "Quorum is not installed on base-sepolia" } as never);

            const { error } = await settle(wallet.send(RECIPIENT, "usdc", "1"));

            expect(sentSendSigner(api)).toBe(treasury.locator);
            expect((error as Error).message).toContain("Quorum is not installed on base-sepolia");
        });
    });

    describe("when the key is in one recovery quorum", () => {
        it("creates the send as the recovery quorum", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { recovery: [{ type: "api-key" }, recoveryQuorum] });

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(recoveryQuorum.locator);
        });
    });

    describe("when the key is in a recovery quorum and a delegated quorum", () => {
        it("throws QuorumSelectionAmbiguousError naming both, and creates nothing, on every try", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([bob]);
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, {
                recovery: [{ type: "api-key" }, recoveryQuorum],
                signers: [{ ...treasury, status: "success" }],
            });

            for (let attempt = 0; attempt < 2; attempt++) {
                const sending = wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });
                await expect(sending).rejects.toBeInstanceOf(QuorumSelectionAmbiguousError);
                await expect(sending).rejects.toMatchObject({
                    quorumLocators: [recoveryQuorum.locator, treasury.locator],
                });
            }
            expect(api.send).not.toHaveBeenCalled();
        });
    });

    describe("when an explicit signer is passed", () => {
        it("sends it as given, even when the key is in several quorums", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([bob]);
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, {
                recovery: [{ type: "api-key" }, recoveryQuorum],
                signers: [{ ...treasury, status: "success" }],
            });

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true, signer: treasury.locator });

            expect(sentSendSigner(api)).toBe(treasury.locator);
        });
    });

    describe("when the key was registered as a signer after it was selected", () => {
        it("acts as itself", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet, signersSpy } = await walletWithBob(api, {
                signers: [{ ...treasury, status: "success" }],
            });
            signersSpy.mockResolvedValue([
                { ...treasury, status: "success" },
                { ...bob, status: "success" },
            ] as never);

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(bob.locator);
        });
    });

    describe("when the key is no longer in any quorum", () => {
        it("acts as itself", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet, signersSpy } = await walletWithBob(api, {
                signers: [{ ...treasury, status: "success" }],
            });
            signersSpy.mockResolvedValue([] as never);

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(bob.locator);
        });
    });

    describe("when reading the wallet's signers fails", () => {
        it("throws that error and creates nothing", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet, signersSpy } = await walletWithBob(api, {
                signers: [{ ...treasury, status: "success" }],
            });
            signersSpy.mockRejectedValue(new Error("signers unavailable"));

            await expect(wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true })).rejects.toThrow(
                "signers unavailable"
            );
            expect(api.send).not.toHaveBeenCalled();
        });
    });

    describe("when another key is selected after the member key", () => {
        it("sends that key, without reading the wallet's signers", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const alice = { type: "external-wallet", address: "0x5555555555555555555555555555555555555555" };
            const aliceLocator = `external-wallet:${alice.address}`;
            const { wallet, signersSpy } = await walletWithBob(api, {
                signers: [
                    { ...treasury, status: "success" },
                    { ...alice, locator: aliceLocator, status: "success" },
                ],
            });
            api.getSigner.mockResolvedValue({
                type: "external-wallet",
                locator: aliceLocator,
                chains: { "base-sepolia": { status: "success", id: "s-1" } },
            } as never);
            await wallet.useSigner({ ...alice, onSign: vi.fn() } as unknown as SignerConfigForChain<Chain>);
            signersSpy.mockClear();

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(aliceLocator);
            expect(signersSpy).not.toHaveBeenCalled();
        });
    });
});

describe("EVM signatures with a key that is only a quorum member", () => {
    let api: MockedApiClient;
    const bob = bobMember(BOB_EVM);
    const signatureSigner = () => api.createSignature.mock.calls[0][1].params.signer;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
        api.createSignature.mockResolvedValue({ id: "sig-1" } as never);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe.each([
        { name: "signMessage", sign: (wallet: EVMWallet) => wallet.signMessage({ message: "hello" }) },
        { name: "signTypedData", sign: (wallet: EVMWallet) => wallet.signTypedData(EVM_TYPED_DATA as never) },
    ])("$name", ({ sign }) => {
        it("requests the signature as the key's quorum and returns it once the key's approval completes it", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            const entry = createQuorumPendingApproval({ quorum: treasury });
            api.getSignature.mockResolvedValue(awaiting("sig-1", [entry]) as never);
            api.approveSignature.mockResolvedValue({
                id: "sig-1",
                status: "success",
                outputSignature: "0x1271",
            } as never);

            const { value } = await settle(sign(EVMWallet.from(wallet)));

            expect(signatureSigner()).toBe(treasury.locator);
            expect(api.approveSignature.mock.calls.map((call) => call[2].approvals)).toEqual([
                [{ signer: bob.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
            ]);
            expect(value).toEqual({ signature: "0x1271", signatureId: "sig-1" });
        });

        it("throws SignatureAwaitingApprovalError when other members must still sign", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const [, ...others] = treasury.members;
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            const after = awaiting("sig-1", [
                createQuorumPendingApproval({ quorum: treasury, pending: others, submitted: [bob], remaining: 1 }),
            ]);
            api.getSignature.mockResolvedValueOnce(
                awaiting("sig-1", [createQuorumPendingApproval({ quorum: treasury })]) as never
            );
            api.getSignature.mockResolvedValue(after as never);
            api.approveSignature.mockResolvedValue(after as never);

            const { error } = await settle(sign(EVMWallet.from(wallet)));

            expect(error).toBeInstanceOf(SignatureAwaitingApprovalError);
            expect(error).toMatchObject({
                signatureId: "sig-1",
                quorums: [{ quorum: treasury.locator, remaining: 1 }],
            });
        });

        it("throws QuorumSelectionAmbiguousError when the key is in two quorums, and requests nothing", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([bob]);
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, {
                recovery: [{ type: "api-key" }, recoveryQuorum],
                signers: [{ ...treasury, status: "success" }],
            });

            const { error } = await settle(sign(EVMWallet.from(wallet)));

            expect(error).toBeInstanceOf(QuorumSelectionAmbiguousError);
            expect(api.createSignature).not.toHaveBeenCalled();
        });
    });

    describe("when signMessage names a quorum in its signer option", () => {
        it("requests the signature as that quorum, for a key that is a registered signer", async () => {
            const treasury = createQuorumApiEntry();
            const registered = { type: "external-wallet", address: BOB_EVM, locator: bob.locator, status: "success" };
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }, registered] });

            await EVMWallet.from(wallet).signMessage({
                message: "hello",
                options: { prepareOnly: true, signer: treasury.locator },
            });

            expect(signatureSigner()).toBe(treasury.locator);
        });
    });
});

describe("Stellar with a key that is only a quorum member", () => {
    let api: MockedApiClient;
    const bob = bobMember(BOB_STELLAR);

    beforeEach(() => {
        vi.clearAllMocks();
        api = createMockApiClient();
        api.createTransaction.mockResolvedValue({ id: "txn-1" } as never);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("creates sendTransaction as the key's quorum", async () => {
        const treasury = createQuorumApiEntryWith([bob]);
        const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] }, "stellar");

        await StellarWallet.from(wallet).sendTransaction({
            contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
            method: "transfer",
            args: {},
            options: { prepareOnly: true },
        });

        expect(createdTransactionSigner(api)).toBe(treasury.locator);
    });

    it("sends no signer on upgrade, so the API uses the admin signer, as before", async () => {
        const treasury = createQuorumApiEntryWith([bob]);
        const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] }, "stellar");

        await StellarWallet.from(wallet).upgrade({ prepareOnly: true });

        expect(api.createTransaction.mock.calls[0][1].params).not.toHaveProperty("signer");
    });
});

describe("a creating call with a key that is not a quorum member", () => {
    it("sends the active key without reading the wallet's signers", async () => {
        const api = createMockApiClient();
        api.send.mockResolvedValue({ id: "txn-1" } as never);
        const wallet = new Wallet(
            { chain: "base-sepolia", address: EVM_ADDRESS, recovery: { type: "api-key" } as never },
            api as unknown as ApiClient
        );
        await wallet.waitForInit();
        const signersSpy = vi.spyOn(Wallet.prototype, "signers").mockResolvedValue([] as never);
        await wallet.useSigner({ type: "api-key" } as never);
        signersSpy.mockClear();

        await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

        expect(sentSendSigner(api)).toBe("api-key");
        expect(signersSpy).not.toHaveBeenCalled();
    });
});
