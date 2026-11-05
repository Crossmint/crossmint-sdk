import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../api";
import type { Chain } from "../chains/chains";
import type { QuorumMember, RecoverySignerConfigForChain, SignerConfigForChain } from "../signers/types";
import { QuorumSelectionAmbiguousError, WalletNotAvailableError } from "../utils/errors";
import { EVMWallet } from "./evm";
import { SolanaWallet } from "./solana";
import { StellarWallet } from "./stellar";
import { Wallet } from "./wallet";
import {
    EVM_TYPED_DATA,
    createMockApiClient,
    createMockSolanaSerializedTransaction,
    createMockWallet,
    createQuorumApiEntry,
    createAwaitingRequest,
    createQuorumApiEntryWith,
    createQuorumPendingApproval,
    settle,
    signatureOver,
    type MockedApiClient,
} from "./__tests__/test-helpers";

const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";
const STELLAR_ADDRESS = "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
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

// The wallet as `getWallet` returns it, listing its recovery methods and delegated signers in its config.
const walletConfigResponse = (
    chain: Chain,
    delegatedSigners: object[],
    recoveryMethods: object[] = [{ type: "api-key" }]
) => ({
    type: "smart",
    chainType: chain === "stellar" ? "stellar" : "evm",
    address: chain === "stellar" ? STELLAR_ADDRESS : EVM_ADDRESS,
    config: { adminSigner: recoveryMethods[0], recoveryMethods, delegatedSigners },
});

// A wallet whose recovery methods and delegated signers are given, with Bob's member key selected.
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
    api.getWallet.mockResolvedValue(walletConfigResponse(chain, signers, recovery) as never);
    await wallet.useSigner(bobConfig(chain === "stellar" ? BOB_STELLAR : BOB_EVM));
    return { wallet, signersSpy };
}

// What a call made as a quorum returns: the created request, unsigned, as with prepareOnly.
const UNSIGNED_TRANSACTION = { hash: undefined, explorerLink: undefined, transactionId: "txn-1" };
const UNSIGNED_SIGNATURE = { signature: undefined, signatureId: "sig-1" };

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
        it("creates the send as that quorum and returns it unsigned, as with prepareOnly", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });

            const { value } = await settle(wallet.send(RECIPIENT, "usdc", "1"));

            expect(sentSendSigner(api)).toBe(treasury.locator);
            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(value).toStrictEqual(UNSIGNED_TRANSACTION);
        });

        it("creates an EVM sendTransaction as that quorum and returns it unsigned", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });

            const { value } = await settle(EVMWallet.from(wallet).sendTransaction({ to: RECIPIENT, value: BigInt(1) }));

            expect(createdTransactionSigner(api)).toBe(treasury.locator);
            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(value).toStrictEqual(UNSIGNED_TRANSACTION);
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
        it("creates the send as the recovery quorum and returns it unsigned", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { recovery: [{ type: "api-key" }, recoveryQuorum] });

            const { value } = await settle(wallet.send(RECIPIENT, "usdc", "1"));

            expect(sentSendSigner(api)).toBe(recoveryQuorum.locator);
            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(value).toStrictEqual(UNSIGNED_TRANSACTION);
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
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            api.getWallet.mockResolvedValue(walletConfigResponse("base-sepolia", [treasury, bob]) as never);

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(bob.locator);
        });

        it("acts as itself when its registration lists this chain", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            const registered = { ...bob, chains: { "base-sepolia": { id: "sig-9", status: "success" } } };
            api.getWallet.mockResolvedValue(walletConfigResponse("base-sepolia", [treasury, registered]) as never);

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(bob.locator);
        });
    });

    describe("when the key is a registered signer on another chain only", () => {
        it("creates the send as its quorum", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            const elsewhere = { ...bob, chains: { "polygon-amoy": { id: "sig-9", status: "success" } } };
            api.getWallet.mockResolvedValue(walletConfigResponse("base-sepolia", [treasury, elsewhere]) as never);

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(treasury.locator);
        });
    });

    describe("when another client made the key a recovery method after it was selected", () => {
        it("acts as itself", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            api.getWallet.mockResolvedValue(
                walletConfigResponse(
                    "base-sepolia",
                    [treasury],
                    [{ type: "api-key" }, { type: "external-wallet", address: BOB_EVM }]
                ) as never
            );

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(bob.locator);
        });
    });

    describe("when another client added the key to a recovery quorum after it was selected", () => {
        it("throws QuorumSelectionAmbiguousError naming both quorums", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const recoveryQuorum = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            api.getWallet.mockResolvedValue(
                walletConfigResponse("base-sepolia", [treasury], [{ type: "api-key" }, recoveryQuorum]) as never
            );

            const sending = wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            await expect(sending).rejects.toBeInstanceOf(QuorumSelectionAmbiguousError);
            await expect(sending).rejects.toMatchObject({
                quorumLocators: [recoveryQuorum.locator, treasury.locator],
            });
        });
    });

    describe("when the key is in two delegated quorums", () => {
        it("throws QuorumSelectionAmbiguousError naming both, and creates nothing", async () => {
            const first = createQuorumApiEntryWith([bob]);
            const second = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, {
                signers: [
                    { ...first, status: "success" },
                    { ...second, status: "success" },
                ],
            });

            const sending = wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            await expect(sending).rejects.toMatchObject({ quorumLocators: [first.locator, second.locator] });
            expect(api.send).not.toHaveBeenCalled();
        });
    });

    describe("when the key is a registered signer listed with a different address case", () => {
        it("acts as itself", async () => {
            const lowercase = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
            const checksummed = "0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd";
            const member = bobMember(lowercase);
            const treasury = createQuorumApiEntryWith([member]);
            const registered = {
                type: "external-wallet",
                address: checksummed,
                locator: `external-wallet:${checksummed}`,
                status: "success",
            };
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: [{ type: "api-key" }] as unknown as RecoverySignerConfigForChain<Chain>[],
                },
                api as unknown as ApiClient
            );
            await wallet.waitForInit();
            vi.spyOn(Wallet.prototype, "signers").mockResolvedValue([
                { ...treasury, status: "success" },
                registered,
            ] as never);
            api.getWallet.mockResolvedValue(walletConfigResponse("base-sepolia", [treasury, registered]) as never);
            await wallet.useSigner(bobConfig(lowercase));

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(member.locator);
        });
    });

    describe("when the key is no longer in any quorum", () => {
        it("acts as itself", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            api.getWallet.mockResolvedValue(walletConfigResponse("base-sepolia", []) as never);

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(bob.locator);
        });
    });

    describe("when reading the wallet fails", () => {
        it("throws WalletNotAvailableError and creates nothing", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            api.getWallet.mockResolvedValue({ error: true, message: "wallet unavailable" } as never);

            await expect(wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true })).rejects.toBeInstanceOf(
                WalletNotAvailableError
            );
            expect(api.send).not.toHaveBeenCalled();
        });
    });

    describe("when the wallet read returns no config", () => {
        it("throws WalletNotAvailableError and creates nothing", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { recovery: [{ type: "api-key" }, recoveryQuorum] });
            api.getWallet.mockResolvedValue({ type: "smart", chainType: "evm", address: EVM_ADDRESS } as never);

            await expect(wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true })).rejects.toBeInstanceOf(
                WalletNotAvailableError
            );
            expect(api.send).not.toHaveBeenCalled();
        });
    });

    describe("when a delegated quorum's own signer lookup fails", () => {
        it("still counts that quorum, so a key in two quorums gets the ambiguous error", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([bob]);
            const treasury = createQuorumApiEntryWith([bob]);
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: [{ type: "api-key" }, recoveryQuorum] as unknown as RecoverySignerConfigForChain<Chain>[],
                },
                api as unknown as ApiClient
            );
            await wallet.waitForInit();
            api.getWallet.mockResolvedValue(
                walletConfigResponse("base-sepolia", [treasury], [{ type: "api-key" }, recoveryQuorum]) as never
            );
            api.getSigner.mockRejectedValue(new Error("signer lookup failed"));
            await wallet.useSigner(bobConfig(BOB_EVM));

            const sending = wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            await expect(sending).rejects.toBeInstanceOf(QuorumSelectionAmbiguousError);
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
            api.getWallet.mockClear();

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(aliceLocator);
            expect(signersSpy).not.toHaveBeenCalled();
            expect(api.getWallet).not.toHaveBeenCalled();
        });
    });

    describe("when the member key is selected again after it was registered as a signer", () => {
        it("sends it as itself, without reading the wallet", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet, signersSpy } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            signersSpy.mockResolvedValue([
                { ...treasury, status: "success" },
                { ...bob, status: "success" },
            ] as never);
            api.getSigner.mockResolvedValue({
                type: "external-wallet",
                locator: bob.locator,
                chains: { "base-sepolia": { status: "success", id: "s-1" } },
            } as never);
            await wallet.useSigner(bobConfig(BOB_EVM));
            api.getWallet.mockClear();

            await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });

            expect(sentSendSigner(api)).toBe(bob.locator);
            expect(api.getWallet).not.toHaveBeenCalled();
        });
    });

    describe("when a second wallet read would find the key registered", () => {
        it.each([
            {
                name: "send",
                chain: "base-sepolia" as const,
                create: (wallet: Wallet<Chain>) => wallet.send(RECIPIENT, "usdc", "1"),
                unsigned: UNSIGNED_TRANSACTION,
            },
            {
                name: "EVM sendTransaction",
                chain: "base-sepolia" as const,
                create: (wallet: Wallet<Chain>) =>
                    EVMWallet.from(wallet).sendTransaction({ to: RECIPIENT, value: BigInt(1) }),
                unsigned: UNSIGNED_TRANSACTION,
            },
            {
                name: "signMessage",
                chain: "base-sepolia" as const,
                create: (wallet: Wallet<Chain>) => EVMWallet.from(wallet).signMessage({ message: "hello" }),
                unsigned: UNSIGNED_SIGNATURE,
            },
            {
                name: "signTypedData",
                chain: "base-sepolia" as const,
                create: (wallet: Wallet<Chain>) => EVMWallet.from(wallet).signTypedData(EVM_TYPED_DATA as never),
                unsigned: UNSIGNED_SIGNATURE,
            },
            {
                name: "Stellar sendTransaction",
                chain: "stellar" as const,
                create: (wallet: Wallet<Chain>) =>
                    StellarWallet.from(wallet).sendTransaction({
                        contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                        method: "transfer",
                        args: {},
                    }),
                unsigned: UNSIGNED_TRANSACTION,
            },
        ])(
            "$name decides the request's signer and the early return from one read",
            async ({ chain, create, unsigned }) => {
                const member = bobMember(chain === "stellar" ? BOB_STELLAR : BOB_EVM);
                const treasury = createQuorumApiEntryWith([member]);
                const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] }, chain);
                // Only the first read finds the key a member; a second read would find it registered and sign as itself.
                api.getWallet.mockReset();
                api.getWallet.mockResolvedValueOnce(walletConfigResponse(chain, [treasury]) as never);
                api.getWallet.mockResolvedValue(walletConfigResponse(chain, [treasury, member]) as never);

                const { value } = await settle<unknown>(create(wallet));

                expect(api.getWallet).toHaveBeenCalledTimes(1);
                expect(api.approveTransaction).not.toHaveBeenCalled();
                expect(api.approveSignature).not.toHaveBeenCalled();
                expect(value).toStrictEqual(unsigned);
            }
        );
    });

    describe("when the key signs the request later with approve()", () => {
        const approvalsSent = (approve: MockedApiClient["approveTransaction"] | MockedApiClient["approveSignature"]) =>
            approve.mock.calls.map((call) => call[2].approvals);

        it("signs its member entry of a send created as its quorum", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            const entry = createQuorumPendingApproval({ quorum: treasury });
            api.getTransaction.mockResolvedValueOnce(createAwaitingRequest("txn-1", [entry]) as never);
            api.getTransaction.mockResolvedValue({
                id: "txn-1",
                status: "success",
                onChain: { txId: "0xhash", explorerLink: "https://explorer.example/tx/0xhash" },
            } as never);

            const { transactionId } = await wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true });
            const { value } = await settle(wallet.approve({ transactionId }));

            expect(approvalsSent(api.approveTransaction)).toEqual([
                [{ signer: bob.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
            ]);
            expect(value).toMatchObject({ transactionId: "txn-1", hash: "0xhash" });
        });

        it("signs its member entry of a signature requested as its quorum", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });
            const entry = createQuorumPendingApproval({ quorum: treasury });
            api.getSignature.mockResolvedValue(createAwaitingRequest("sig-1", [entry]) as never);
            api.approveSignature.mockResolvedValue({
                id: "sig-1",
                status: "success",
                outputSignature: "0x1271",
            } as never);
            const evmWallet = EVMWallet.from(wallet);

            const { signatureId } = await evmWallet.signMessage({ message: "hello", options: { prepareOnly: true } });
            const { value } = await settle(evmWallet.approve({ signatureId }));

            expect(approvalsSent(api.approveSignature)).toEqual([
                [{ signer: bob.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
            ]);
            expect(value).toEqual({ signature: "0x1271", signatureId: "sig-1" });
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
        it("requests the signature as the key's quorum and returns it unsigned, as with prepareOnly", async () => {
            const treasury = createQuorumApiEntryWith([bob]);
            const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] });

            const { value, error } = await settle(sign(EVMWallet.from(wallet)));

            expect(error).toBeUndefined();
            expect(signatureSigner()).toBe(treasury.locator);
            expect(api.getSignature).not.toHaveBeenCalled();
            expect(api.approveSignature).not.toHaveBeenCalled();
            expect(value).toStrictEqual(UNSIGNED_SIGNATURE);
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
        it.each([false, true])(
            "requests the signature as that quorum and returns it unsigned with prepareOnly %s",
            async (prepareOnly) => {
                const treasury = createQuorumApiEntry();
                const registered = {
                    type: "external-wallet",
                    address: BOB_EVM,
                    locator: bob.locator,
                    status: "success",
                };
                const { wallet } = await walletWithBob(api, {
                    signers: [{ ...treasury, status: "success" }, registered],
                });

                const { value } = await settle(
                    EVMWallet.from(wallet).signMessage({
                        message: "hello",
                        options: { prepareOnly, signer: treasury.locator },
                    })
                );

                expect(signatureSigner()).toBe(treasury.locator);
                expect(api.approveSignature).not.toHaveBeenCalled();
                expect(value).toStrictEqual(UNSIGNED_SIGNATURE);
            }
        );
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

    it("creates sendTransaction as the key's quorum and returns it unsigned", async () => {
        const treasury = createQuorumApiEntryWith([bob]);
        const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] }, "stellar");

        const result = await StellarWallet.from(wallet).sendTransaction({
            contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
            method: "transfer",
            args: {},
        });

        expect(createdTransactionSigner(api)).toBe(treasury.locator);
        expect(api.approveTransaction).not.toHaveBeenCalled();
        expect(result).toStrictEqual(UNSIGNED_TRANSACTION);
    });

    it("sends no signer on upgrade, so the API uses the admin signer, as before", async () => {
        const treasury = createQuorumApiEntryWith([bob]);
        const { wallet } = await walletWithBob(api, { signers: [{ ...treasury, status: "success" }] }, "stellar");

        await StellarWallet.from(wallet).upgrade({ prepareOnly: true });

        expect(api.createTransaction.mock.calls[0][1].params).not.toHaveProperty("signer");
    });
});

describe("a creating call with a key that is not a quorum member", () => {
    describe.each([
        {
            name: "send",
            chain: "base-sepolia" as const,
            create: (wallet: Wallet<Chain>) => wallet.send(RECIPIENT, "usdc", "1", { prepareOnly: true }),
        },
        {
            name: "EVM signMessage",
            chain: "base-sepolia" as const,
            create: (wallet: Wallet<Chain>) =>
                EVMWallet.from(wallet).signMessage({ message: "hello", options: { prepareOnly: true } }),
        },
        {
            name: "Solana sendTransaction",
            chain: "solana" as const,
            create: (wallet: Wallet<Chain>) =>
                SolanaWallet.from(wallet).sendTransaction({
                    serializedTransaction: createMockSolanaSerializedTransaction(),
                    options: { prepareOnly: true },
                }),
        },
        {
            name: "Stellar sendTransaction",
            chain: "stellar" as const,
            create: (wallet: Wallet<Chain>) =>
                StellarWallet.from(wallet).sendTransaction({
                    contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                    method: "transfer",
                    args: {},
                    options: { prepareOnly: true },
                }),
        },
    ])("$name", ({ chain, create }) => {
        it("makes no wallet read", async () => {
            const api = createMockApiClient();
            api.send.mockResolvedValue({ id: "txn-1" } as never);
            api.createTransaction.mockResolvedValue({ id: "txn-1" } as never);
            api.createSignature.mockResolvedValue({ id: "sig-1" } as never);
            const wallet = await createMockWallet(chain, api, "api-key");
            api.getWallet.mockClear();

            await create(wallet);

            expect(api.getWallet).not.toHaveBeenCalled();
        });
    });
});
