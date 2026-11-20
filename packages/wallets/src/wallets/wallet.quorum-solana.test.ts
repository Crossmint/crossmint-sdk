import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { Keypair, type VersionedTransaction } from "@solana/web3.js";
import type { ApiClient } from "../api";
import type { Chain } from "../chains/chains";
import type { QuorumMember, RecoverySignerConfigForChain, SignerConfigForChain } from "../signers/types";
import { DeviceSignerAwaitingApprovalError, QuorumApprovingMembersRequiredError } from "../utils/errors";
import { createDeviceSigner } from "@/utils/device-signers";
import { EVMWallet } from "./evm";
import { SolanaWallet } from "./solana";
import { StellarWallet } from "./stellar";
import { Wallet } from "./wallet";
import {
    QUORUM_SERVER_MEMBER_SECRET,
    QUORUM_TEST_PROJECT_ID,
    createMockApiClient,
    createMockSolanaSerializedTransaction,
    createMockWallet,
    createQuorumApiEntryWith,
    createQuorumPendingApproval,
    serverMemberAddress,
    signerNotFound,
    type MockedApiClient,
} from "./__tests__/test-helpers";

vi.mock("@/utils/device-signers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/utils/device-signers")>();
    return { ...actual, createDeviceSigner: vi.fn() };
});

const SOLANA_RECIPIENT = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const VALID_UNTIL = "2026-11-24T10:00:00.000Z";

// A person's Ed25519 key: the config this client holds (signing with the real key) and its member entry.
function ed25519Member() {
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    const config = {
        type: "external-wallet",
        address,
        onSign: vi.fn(async (transaction: VersionedTransaction) => {
            transaction.sign([keypair]);
            return transaction;
        }),
        onSignBytes: vi.fn(async (payload: string) =>
            bs58.encode(nacl.sign.detached(bs58.decode(payload), keypair.secretKey))
        ),
    } as unknown as SignerConfigForChain<"solana">;
    const member = { type: "external-wallet", address, locator: `external-wallet:${address}` } as QuorumMember;
    return { keypair, config, member };
}

const serverMember = () => {
    const address = serverMemberAddress("solana");
    return { type: "server", address, locator: `server:${address}` } as QuorumMember;
};

// The calls that create a request a quorum signer or approver acts in. `sent` reads the approvingMembers it sent.
type QuorumCall = {
    name: string;
    run: (wallet: Wallet<Chain>, options: object) => Promise<unknown>;
    called: (api: MockedApiClient) => boolean;
    sent: (api: MockedApiClient) => unknown;
};

const sendTransactionOn = (wallet: Wallet<Chain>, options: object) => {
    switch (wallet.chain) {
        case "solana":
            return SolanaWallet.from(wallet).sendTransaction({
                serializedTransaction: createMockSolanaSerializedTransaction(),
                options: options as never,
            });
        case "stellar":
            return StellarWallet.from(wallet).sendTransaction({
                contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                method: "transfer",
                args: {},
                options: options as never,
            });
        default:
            return EVMWallet.from(wallet).sendTransaction({
                to: "0x1111111111111111111111111111111111111111",
                value: 1n,
                options: options as never,
            });
    }
};

const RECIPIENTS: Record<string, string> = {
    solana: SOLANA_RECIPIENT,
    stellar: "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY",
    "base-sepolia": "0x1111111111111111111111111111111111111111",
};

const createdParams = (api: MockedApiClient) =>
    api.createTransaction.mock.calls[0][1].params as { signer?: string; approvingMembers?: string[] };

const QUORUM_CALLS: QuorumCall[] = [
    {
        name: "send",
        run: (wallet, options) => wallet.send(RECIPIENTS[wallet.chain], "usdc", "1", options as never),
        called: (api) => api.send.mock.calls.length > 0,
        sent: (api) => api.send.mock.calls[0][2].approvingMembers,
    },
    {
        name: "sendTransaction",
        run: sendTransactionOn,
        called: (api) => api.createTransaction.mock.calls.length > 0,
        sent: (api) => createdParams(api).approvingMembers,
    },
    {
        name: "addSigner",
        run: (wallet, options) =>
            wallet.addSigner({ type: "external-wallet", address: "NewSigner444" } as never, options as never),
        called: (api) => api.registerSigner.mock.calls.length > 0,
        sent: (api) => api.registerSigner.mock.calls[0][1].approvingMembers,
    },
    {
        name: "removeSigner",
        run: (wallet, options) =>
            wallet.removeSigner({ type: "external-wallet", address: "Delegated333" } as never, options as never),
        called: (api) => api.removeSigner.mock.calls.length > 0,
        sent: (api) => api.removeSigner.mock.calls[0][2].approvingMembers,
    },
    {
        name: "addRecoveryMethod",
        run: (wallet, options) =>
            wallet.addRecoveryMethod({ type: "external-wallet", address: "NewRecovery555" } as never, options as never),
        called: (api) => api.registerRecoveryMethod.mock.calls.length > 0,
        sent: (api) => api.registerRecoveryMethod.mock.calls[0][1].approvingMembers,
    },
    {
        name: "removeRecoveryMethod",
        run: (wallet, options) => wallet.removeRecoveryMethod({ type: "api-key" } as never, options as never),
        called: (api) => api.removeRecoveryMethod.mock.calls.length > 0,
        sent: (api) => api.removeRecoveryMethod.mock.calls[0][2].approvingMembers,
    },
];

// Every create and signer-change call answers with one request awaiting approval.
function mockQuorumResponses(api: MockedApiClient, chain: Chain) {
    const awaiting = { id: "txn-1", status: "awaiting-approval", validUntil: VALID_UNTIL };
    api.send.mockResolvedValue(awaiting as never);
    api.createTransaction.mockResolvedValue(awaiting as never);
    api.registerSigner.mockResolvedValue(
        (chain === "solana" || chain === "stellar"
            ? {
                  type: "external-wallet",
                  address: "NewSigner444",
                  locator: "external-wallet:NewSigner444",
                  transaction: awaiting,
              }
            : {
                  type: "external-wallet",
                  address: "NewSigner444",
                  locator: "external-wallet:NewSigner444",
                  chains: { [chain]: { ...awaiting, onChain: {} } },
              }) as never
    );
    api.removeSigner.mockResolvedValue(awaiting as never);
    api.registerRecoveryMethod.mockResolvedValue({
        recoveryMethods: {
            type: "external-wallet",
            address: "NewRecovery555",
            locator: "external-wallet:NewRecovery555",
        },
        tx: awaiting,
    } as never);
    api.removeRecoveryMethod.mockResolvedValue(awaiting as never);
}

describe("approvingMembers on Solana", () => {
    let api: MockedApiClient;
    let wallet: Wallet<Chain>;
    const alice = ed25519Member();
    const bob = ed25519Member();
    const server = serverMember();
    const quorum = createQuorumApiEntryWith([alice.member, bob.member, server], { threshold: 2, memberCount: 3 });

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient({ projectId: QUORUM_TEST_PROJECT_ID } as Partial<MockedApiClient>);
        mockQuorumResponses(api, "solana");
        wallet = await createMockWallet("solana", api, "api-key", [
            { type: "api-key" },
            quorum,
        ] as unknown as RecoverySignerConfigForChain<"solana">[]);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("addSigner when the signer's add is already awaiting the quorum", () => {
        const NEW_SIGNER = { type: "external-wallet", address: "NewSigner444" };
        // The earlier add, as the API returns it: its quorum entry lists the members it designated.
        const pendingAdd = (designated: QuorumMember[]) => ({
            ...NEW_SIGNER,
            locator: "external-wallet:NewSigner444",
            transaction: {
                id: "tx-earlier",
                status: "awaiting-approval",
                approvals: { pending: [createQuorumPendingApproval({ quorum, pending: designated })], submitted: [] },
            },
        });

        it("resumes the earlier add when the same members approve it, in any order", async () => {
            api.getSigner.mockResolvedValue(pendingAdd([alice.member, bob.member]) as never);

            const result = await wallet.addSigner(
                NEW_SIGNER as never,
                {
                    signer: quorum.locator,
                    approvingMembers: [bob.member.locator, alice.config],
                } as never
            );

            expect(api.registerSigner).not.toHaveBeenCalled();
            expect(result).toMatchObject({ transactionId: "tx-earlier" });
        });

        it("registers again with the new members when other members approve it", async () => {
            api.getSigner.mockResolvedValue(pendingAdd([alice.member, bob.member]) as never);

            await wallet.addSigner(
                NEW_SIGNER as never,
                {
                    signer: quorum.locator,
                    approvingMembers: [alice.member.locator, server.locator],
                } as never
            );

            expect(api.registerSigner).toHaveBeenCalledTimes(1);
            expect(api.registerSigner.mock.calls[0][1].approvingMembers).toEqual([
                alice.member.locator,
                server.locator,
            ]);
        });
    });

    describe.each(QUORUM_CALLS)("$name with a quorum in the signer option", ({ run, called, sent }) => {
        it.each([
            { missing: "no approvingMembers", options: {} },
            { missing: "an empty approvingMembers", options: { approvingMembers: [] } },
        ])(
            "throws QuorumApprovingMembersRequiredError naming the quorum, and sends nothing, for $missing",
            async ({ options }) => {
                const error = await run(wallet, { signer: quorum.locator, ...options }).catch(
                    (thrown: unknown) => thrown
                );

                expect(error).toBeInstanceOf(QuorumApprovingMembersRequiredError);
                expect((error as QuorumApprovingMembersRequiredError).quorumLocator).toBe(quorum.locator);
                expect(called(api)).toBe(false);
            }
        );

        it("sends member locators as given", async () => {
            await run(wallet, { signer: quorum.locator, approvingMembers: [alice.member.locator, server.locator] });

            expect(sent(api)).toEqual([alice.member.locator, server.locator]);
        });

        it("sends member configs as their locators, a server member's secret as its derived address", async () => {
            await run(wallet, {
                signer: quorum.locator,
                approvingMembers: [alice.config, { type: "server", secret: QUORUM_SERVER_MEMBER_SECRET }],
            });

            expect(sent(api)).toEqual([alice.member.locator, server.locator]);
            expect(JSON.stringify(sent(api))).not.toContain(QUORUM_SERVER_MEMBER_SECRET);
        });

        it("sends repeated members as given, for the API to reject", async () => {
            await run(wallet, { signer: quorum.locator, approvingMembers: [alice.member.locator, alice.config] });

            expect(sent(api)).toEqual([alice.member.locator, alice.member.locator]);
        });

        it("returns the request unsigned, signing nothing", async () => {
            const result = await run(wallet, { signer: quorum.locator, approvingMembers: [alice.member.locator] });

            expect(result).toMatchObject({ transactionId: "txn-1" });
            expect(api.approveTransaction).not.toHaveBeenCalled();
        });
    });

    describe.each(QUORUM_CALLS.filter(({ name }) => name !== "send" && name !== "sendTransaction"))(
        "$name approved by the recovery quorum of the member selected with useRecoveryMethod",
        ({ run, called, sent }) => {
            beforeEach(async () => {
                await wallet.useRecoveryMethod(alice.config as never);
            });

            it("throws QuorumApprovingMembersRequiredError without approvingMembers, and sends nothing", async () => {
                await expect(run(wallet, {})).rejects.toBeInstanceOf(QuorumApprovingMembersRequiredError);
                expect(called(api)).toBe(false);
            });

            it("sends the quorum as approver with the approving members", async () => {
                await run(wallet, { approvingMembers: [alice.member.locator, bob.member.locator] });

                expect(sent(api)).toEqual([alice.member.locator, bob.member.locator]);
            });
        }
    );

    describe.each([
        {
            call: "removeSigner",
            remove: (w: Wallet<Chain>, target: object, o: object) => w.removeSigner(target as never, o as never),
        },
        {
            call: "removeRecoveryMethod",
            remove: (w: Wallet<Chain>, target: object, o: object) =>
                w.removeRecoveryMethod(target as never, o as never),
        },
    ])(
        "$call of a quorum given by its threshold and members, with a quorum approver and no approvingMembers",
        ({ remove }) => {
            it("throws QuorumApprovingMembersRequiredError before reading the wallet", async () => {
                const target = { type: "quorum", threshold: 2, members: [alice.config, bob.config] };

                const error = await remove(wallet, target, { signer: quorum.locator }).catch(
                    (thrown: unknown) => thrown
                );

                expect(error).toBeInstanceOf(QuorumApprovingMembersRequiredError);
                expect(api.getWallet).not.toHaveBeenCalled();
                expect(api.removeSigner).not.toHaveBeenCalled();
                expect(api.removeRecoveryMethod).not.toHaveBeenCalled();
            });
        }
    );

    describe.each(QUORUM_CALLS)("$name with a signer that is not a quorum", ({ run, sent }) => {
        it("sends approvingMembers as given, for the API to reject", async () => {
            await run(wallet, { signer: "api-key", prepareOnly: true, approvingMembers: [alice.member.locator] });

            expect(sent(api)).toEqual([alice.member.locator]);
        });

        it("sends no approvingMembers when none are passed", async () => {
            await run(wallet, { signer: "api-key", prepareOnly: true });

            expect(sent(api)).toBeUndefined();
        });
    });
});

describe.each(["base-sepolia", "stellar"] as const)("approvingMembers on %s", (chain) => {
    let api: MockedApiClient;
    let wallet: Wallet<Chain>;
    const member = { type: "email", email: "alice@example.com", locator: "email:alice@example.com" } as QuorumMember;
    const quorum = createQuorumApiEntryWith([member]);

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient({ projectId: QUORUM_TEST_PROJECT_ID } as Partial<MockedApiClient>);
        mockQuorumResponses(api, chain);
        wallet = await createMockWallet(chain, api, "api-key", [
            { type: "api-key" },
            quorum,
        ] as unknown as RecoverySignerConfigForChain<Chain>[]);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe.each(QUORUM_CALLS)("$name with a quorum in the signer option", ({ run, called, sent }) => {
        it("creates the request without approvingMembers, as before", async () => {
            await run(wallet, { signer: quorum.locator });

            expect(called(api)).toBe(true);
            expect(sent(api)).toBeUndefined();
        });

        it("forwards approvingMembers, configs sent as their locators", async () => {
            await run(wallet, {
                signer: quorum.locator,
                approvingMembers: [{ type: "email", email: "alice@example.com" }, "email:bob@example.com"],
            });

            expect(sent(api)).toEqual(["email:alice@example.com", "email:bob@example.com"]);
        });
    });
});

describe("a Solana key that is only a quorum member", () => {
    let api: MockedApiClient;
    const bob = ed25519Member();
    const treasury = createQuorumApiEntryWith([bob.member]);

    // A Solana wallet whose only delegated signer is `treasury`; Bob's key is the active one.
    async function walletWithBob() {
        const wallet = new Wallet(
            { chain: "solana", address: SOLANA_RECIPIENT, recovery: [{ type: "api-key" }] as never },
            api as unknown as ApiClient
        );
        await wallet.waitForInit();
        const listed = [{ ...treasury, status: "success" }];
        vi.spyOn(Wallet.prototype, "signers").mockResolvedValue(listed as never);
        api.getWallet.mockResolvedValue({
            type: "smart",
            chainType: "solana",
            address: SOLANA_RECIPIENT,
            config: {
                adminSigner: { type: "api-key" },
                recoveryMethods: [{ type: "api-key" }],
                delegatedSigners: listed,
            },
        } as never);
        await wallet.useSigner(bob.config as never);
        return wallet;
    }

    beforeEach(() => {
        vi.clearAllMocks();
        api = createMockApiClient();
        mockQuorumResponses(api, "solana");
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each(QUORUM_CALLS.filter(({ name }) => name === "send" || name === "sendTransaction"))(
        "$name",
        ({ run, called, sent }) => {
            it("throws QuorumApprovingMembersRequiredError naming its quorum without approvingMembers", async () => {
                const wallet = await walletWithBob();

                const error = await run(wallet, {}).catch((thrown: unknown) => thrown);

                expect(error).toBeInstanceOf(QuorumApprovingMembersRequiredError);
                expect((error as QuorumApprovingMembersRequiredError).quorumLocator).toBe(treasury.locator);
                expect(called(api)).toBe(false);
            });

            it("creates the request as its quorum with the approving members and returns it unsigned", async () => {
                const wallet = await walletWithBob();

                const result = await run(wallet, {
                    approvingMembers: [bob.member.locator, treasury.members[1].locator],
                });

                expect(sent(api)).toEqual([bob.member.locator, treasury.members[1].locator]);
                expect(result).toStrictEqual({
                    hash: undefined,
                    explorerLink: undefined,
                    transactionId: "txn-1",
                });
                expect(api.approveTransaction).not.toHaveBeenCalled();
            });
        }
    );

    it("sends the quorum as the created transaction's signer", async () => {
        const wallet = await walletWithBob();

        await sendTransactionOn(wallet, { approvingMembers: [bob.member.locator] });

        expect(createdParams(api).signer).toBe(treasury.locator);
    });
});

describe("device recovery through a Solana recovery quorum", () => {
    const NEW_DEVICE = "device:newKey";
    const OLD_DEVICE = "device:oldKey";
    let api: MockedApiClient;
    let storage: ReturnType<typeof deviceKeyStorage>;
    const alice = ed25519Member();
    const bob = ed25519Member();
    const quorum = createQuorumApiEntryWith([alice.member, bob.member]);
    const approvingMembers = [alice.member.locator, bob.member.locator];
    const deviceEntry = (locator: string, transaction: object) => ({
        type: "device",
        locator,
        publicKey: { x: "0x01", y: "0x02" },
        name: "Test Device",
        transaction,
    });

    function deviceKeyStorage() {
        let savedLocator: string | null = null;
        let savedMembers: string[] | null = null;
        return {
            generateKey: vi.fn().mockResolvedValue("newKey"),
            getKey: vi.fn().mockResolvedValue(null),
            hasKey: vi.fn().mockResolvedValue(false),
            mapAddressToKey: vi.fn().mockResolvedValue(undefined),
            deleteKey: vi.fn().mockResolvedValue(undefined),
            signMessage: vi.fn().mockResolvedValue({ r: "0x1", s: "0x2" }),
            getDeviceName: vi.fn().mockReturnValue("Test Device"),
            saveSignerLocator: vi.fn(async (_address: string, locator: string) => {
                savedLocator = locator;
            }),
            getSavedSignerLocator: vi.fn(async () => savedLocator),
            saveApprovingMembers: vi.fn(async (_address: string, members: string[] | null) => {
                savedMembers = members;
            }),
            getSavedApprovingMembers: vi.fn(async () => savedMembers),
        };
    }

    // A new device with no key yet, on a wallet whose only recovery method is the quorum; Alice is selected.
    async function recoveringWallet(listedSigners: object[] = []) {
        const wallet = new Wallet(
            {
                chain: "solana",
                address: SOLANA_RECIPIENT,
                recovery: [quorum] as never,
                options: { deviceSignerKeyStorage: storage as never },
            },
            api as unknown as ApiClient
        );
        await wallet.waitForInit();
        vi.spyOn(wallet, "signers").mockResolvedValue(listedSigners as never);
        await wallet.useRecoveryMethod(alice.config as never);
        return wallet;
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.mocked(createDeviceSigner).mockResolvedValue({
            type: "device",
            publicKey: { x: "0x01", y: "0x02" },
            locator: NEW_DEVICE,
            name: "Test Device",
        } as never);
        api = createMockApiClient();
        storage = deviceKeyStorage();
        api.getSigner.mockRejectedValue(signerNotFound());
        api.registerSigner.mockResolvedValue(
            deviceEntry(NEW_DEVICE, { id: "tx-add", status: "awaiting-approval" }) as never
        );
        api.removeSigner.mockResolvedValue({ id: "tx-remove", status: "awaiting-approval" } as never);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("recover() without approvingMembers throws QuorumApprovingMembersRequiredError before creating a key", async () => {
        const wallet = await recoveringWallet();

        const error = await wallet.recover().catch((thrown: unknown) => thrown);

        expect(error).toBeInstanceOf(QuorumApprovingMembersRequiredError);
        expect((error as QuorumApprovingMembersRequiredError).quorumLocator).toBe(quorum.locator);
        expect(createDeviceSigner).not.toHaveBeenCalled();
        expect(api.registerSigner).not.toHaveBeenCalled();
        expect(api.getSigner).not.toHaveBeenCalled();
    });

    it("recover({ approvingMembers }) registers the device signer with the quorum and the members", async () => {
        const wallet = await recoveringWallet();

        const result = await wallet.recover({ approvingMembers: [alice.config, bob.member.locator] });

        expect(result).toEqual({ transactionId: "tx-add" });
        expect(api.registerSigner.mock.calls[0][1]).toMatchObject({ approver: quorum.locator, approvingMembers });
        expect(api.approveTransaction).not.toHaveBeenCalled();
    });

    it("recover({ approvingMembers }) once the device landed removes the old device through the quorum", async () => {
        await storage.saveSignerLocator("any", OLD_DEVICE);
        const wallet = await recoveringWallet([{ ...deviceEntry(OLD_DEVICE, {}), status: "success" }]);
        await wallet.recover({ approvingMembers });
        api.getSigner.mockResolvedValue(deviceEntry(NEW_DEVICE, { id: "tx-add", status: "success" }) as never);

        const result = await wallet.recover({ approvingMembers });

        expect(result).toEqual({ transactionId: "tx-remove" });
        expect(api.removeSigner.mock.calls[0][1]).toBe(OLD_DEVICE);
        expect(api.removeSigner.mock.calls[0][2]).toMatchObject({ approver: quorum.locator, approvingMembers });
    });

    // The new device's registration once the members approved it: it names the quorum that approved it.
    const landedDevice = () =>
        deviceEntry(NEW_DEVICE, {
            id: "tx-add",
            status: "success",
            approvals: { pending: [], submitted: [createQuorumPendingApproval({ quorum, pending: [] })] },
        });

    // The device's registration while it awaits the quorum: its quorum entry lists the members it designated.
    const pendingDevice = (designated: QuorumMember[]) =>
        deviceEntry(NEW_DEVICE, {
            id: "tx-add",
            status: "awaiting-approval",
            approvals: { pending: [createQuorumPendingApproval({ quorum, pending: designated })], submitted: [] },
        });

    it("recover({ approvingMembers }) with the members of the pending registration returns it, registering nothing", async () => {
        const wallet = await recoveringWallet();
        await wallet.recover({ approvingMembers });
        api.getSigner.mockResolvedValue(pendingDevice([alice.member, bob.member]) as never);

        const result = await wallet.recover({ approvingMembers: [bob.member.locator, alice.member.locator] });

        expect(result).toEqual({ transactionId: "tx-add" });
        expect(api.registerSigner).toHaveBeenCalledTimes(1);
    });

    it("recover({ approvingMembers }) with other members registers the same device key again with them", async () => {
        const wallet = await recoveringWallet();
        await wallet.recover({ approvingMembers });
        api.getSigner.mockResolvedValue(pendingDevice([alice.member, bob.member]) as never);
        api.registerSigner.mockResolvedValue(
            deviceEntry(NEW_DEVICE, { id: "tx-add-2", status: "awaiting-approval" }) as never
        );
        const others = [alice.member.locator, quorum.members[2].locator];

        const result = await wallet.recover({ approvingMembers: others });

        expect(result).toEqual({ transactionId: "tx-add-2" });
        expect(api.registerSigner).toHaveBeenCalledTimes(2);
        expect(api.registerSigner.mock.calls[1][1]).toMatchObject({
            approver: quorum.locator,
            approvingMembers: others,
            signer: expect.objectContaining({ publicKey: { x: "0x01", y: "0x02" } }),
        });
    });

    it("recover({ approvingMembers }) saves the members' locators, never their keys, for this wallet", async () => {
        const wallet = await recoveringWallet();

        await wallet.recover({ approvingMembers: [alice.config, bob.member.locator] });

        expect(storage.saveApprovingMembers).toHaveBeenCalledWith(SOLANA_RECIPIENT, approvingMembers);
        expect(await storage.getSavedApprovingMembers(SOLANA_RECIPIENT)).toEqual(approvingMembers);
    });

    it("the automatic recover() once the device landed removes the old device with the saved members, then clears them", async () => {
        await storage.saveSignerLocator("any", OLD_DEVICE);
        const wallet = await recoveringWallet([{ ...deviceEntry(OLD_DEVICE, {}), status: "success" }]);
        await wallet.recover({ approvingMembers });
        api.getSigner.mockResolvedValue(landedDevice() as never);

        const result = await wallet.recover();

        expect(result).toEqual({ transactionId: "tx-remove" });
        expect(api.removeSigner.mock.calls[0][1]).toBe(OLD_DEVICE);
        expect(api.removeSigner.mock.calls[0][2]).toMatchObject({ approver: quorum.locator, approvingMembers });
        expect(await storage.getSavedSignerLocator(SOLANA_RECIPIENT)).toBe(NEW_DEVICE);
        expect(await storage.getSavedApprovingMembers(SOLANA_RECIPIENT)).toBeNull();
    });

    it("members passed to recover() win over the saved ones for the old device's removal", async () => {
        await storage.saveSignerLocator("any", OLD_DEVICE);
        const wallet = await recoveringWallet([{ ...deviceEntry(OLD_DEVICE, {}), status: "success" }]);
        await wallet.recover({ approvingMembers });
        api.getSigner.mockResolvedValue(landedDevice() as never);
        const others = [bob.member.locator, quorum.members[2].locator];

        await wallet.recover({ approvingMembers: others });

        expect(api.removeSigner.mock.calls[0][2]).toMatchObject({ approvingMembers: others });
    });

    it("a removal that cannot start for lack of members keeps the old locator and sends nothing", async () => {
        await storage.saveSignerLocator("any", OLD_DEVICE);
        const wallet = await recoveringWallet([{ ...deviceEntry(OLD_DEVICE, {}), status: "success" }]);
        await wallet.recover({ approvingMembers });
        await storage.saveApprovingMembers(SOLANA_RECIPIENT, null);
        api.getSigner.mockResolvedValue(landedDevice() as never);

        await expect(wallet.recover()).resolves.toBeUndefined();

        expect(api.removeSigner).not.toHaveBeenCalled();
        expect(wallet.signer?.locator()).toBe(NEW_DEVICE);
        expect(await storage.getSavedSignerLocator(SOLANA_RECIPIENT)).toBe(OLD_DEVICE);
    });

    it("an empty approvingMembers keeps the saved members for the old device's removal", async () => {
        await storage.saveSignerLocator("any", OLD_DEVICE);
        const wallet = await recoveringWallet([{ ...deviceEntry(OLD_DEVICE, {}), status: "success" }]);
        await wallet.recover({ approvingMembers });
        api.getSigner.mockResolvedValue(landedDevice() as never);

        await wallet.recover({ approvingMembers: [] });

        expect(api.removeSigner.mock.calls[0][2]).toMatchObject({ approvingMembers });
    });

    it("an explicit recover({ approvingMembers }) in the same session retries the outstanding removal", async () => {
        await storage.saveSignerLocator("any", OLD_DEVICE);
        const wallet = await recoveringWallet([{ ...deviceEntry(OLD_DEVICE, {}), status: "success" }]);
        await wallet.recover({ approvingMembers });
        api.getSigner.mockResolvedValue(landedDevice() as never);
        api.removeSigner.mockRejectedValueOnce(new TypeError("fetch failed"));
        await wallet.recover();

        const result = await wallet.recover({ approvingMembers });

        expect(result).toEqual({ transactionId: "tx-remove" });
        expect(api.removeSigner).toHaveBeenCalledTimes(2);
        expect(api.removeSigner.mock.calls[1][2]).toMatchObject({ approver: quorum.locator, approvingMembers });
        expect(await storage.getSavedSignerLocator(SOLANA_RECIPIENT)).toBe(NEW_DEVICE);
        expect(await storage.getSavedApprovingMembers(SOLANA_RECIPIENT)).toBeNull();
    });

    it("members given while an automatic recovery runs are not dropped: the removal it could not start is retried with them", async () => {
        await storage.saveSignerLocator("any", OLD_DEVICE);
        const wallet = await recoveringWallet([{ ...deviceEntry(OLD_DEVICE, {}), status: "success" }]);
        await wallet.recover({ approvingMembers });
        await storage.saveApprovingMembers(SOLANA_RECIPIENT, null);
        api.getSigner.mockResolvedValue(landedDevice() as never);

        const automatic = wallet.recover();
        const explicit = wallet.recover({ approvingMembers });

        await expect(automatic).resolves.toBeUndefined();
        await expect(explicit).resolves.toEqual({ transactionId: "tx-remove" });
        expect(api.removeSigner).toHaveBeenCalledTimes(1);
        expect(api.removeSigner.mock.calls[0][2]).toMatchObject({ approver: quorum.locator, approvingMembers });
        expect(await storage.getSavedSignerLocator(SOLANA_RECIPIENT)).toBe(NEW_DEVICE);
    });

    it("a removal that cannot be created keeps the old locator and the members, and a later load retries it", async () => {
        await storage.saveSignerLocator("any", OLD_DEVICE);
        const listed = [{ ...deviceEntry(OLD_DEVICE, {}), status: "success" }];
        const wallet = await recoveringWallet(listed);
        await wallet.recover({ approvingMembers });
        api.getSigner.mockResolvedValue(landedDevice() as never);
        api.removeSigner.mockRejectedValueOnce(new TypeError("fetch failed"));

        await expect(wallet.recover()).resolves.toBeUndefined();

        expect(wallet.signer?.locator()).toBe(NEW_DEVICE);
        expect(await storage.getSavedSignerLocator(SOLANA_RECIPIENT)).toBe(OLD_DEVICE);
        expect(await storage.getSavedApprovingMembers(SOLANA_RECIPIENT)).toEqual(approvingMembers);

        // A later load: a new wallet object on this device, its key now registered, with no member selected.
        storage.getKey.mockResolvedValue("newKey");
        storage.hasKey.mockResolvedValue(true);
        const reloaded = new Wallet(
            {
                chain: "solana",
                address: SOLANA_RECIPIENT,
                recovery: [quorum] as never,
                options: { deviceSignerKeyStorage: storage as never },
            },
            api as unknown as ApiClient
        );
        await reloaded.waitForInit();
        vi.spyOn(reloaded, "signers").mockResolvedValue([...listed, { ...landedDevice(), status: "success" }] as never);

        await expect(reloaded.recover()).resolves.toEqual({ transactionId: "tx-remove" });
        expect(api.removeSigner.mock.calls.at(-1)?.[1]).toBe(OLD_DEVICE);
        expect(api.removeSigner.mock.calls.at(-1)?.[2]).toMatchObject({ approver: quorum.locator, approvingMembers });
        expect(await storage.getSavedApprovingMembers(SOLANA_RECIPIENT)).toBeNull();
    });

    it("a send while the members still approve the device signer throws DeviceSignerAwaitingApprovalError", async () => {
        const wallet = await recoveringWallet();
        await wallet.recover({ approvingMembers });
        const pending = createQuorumPendingApproval({ quorum, pending: [alice.member, bob.member] });
        api.getSigner.mockResolvedValue(
            deviceEntry(NEW_DEVICE, {
                id: "tx-add",
                status: "awaiting-approval",
                approvals: { pending: [pending], submitted: [] },
            }) as never
        );

        await expect(wallet.send(SOLANA_RECIPIENT, "usdc", "1")).rejects.toBeInstanceOf(
            DeviceSignerAwaitingApprovalError
        );
        expect(api.send).not.toHaveBeenCalled();
        expect(api.registerSigner).toHaveBeenCalledTimes(1);
    });

    it("a send that needs the device recovered throws QuorumApprovingMembersRequiredError and sends nothing", async () => {
        const wallet = await recoveringWallet();
        api.send.mockResolvedValue({ id: "txn-1" } as never);

        await expect(wallet.send(SOLANA_RECIPIENT, "usdc", "1")).rejects.toBeInstanceOf(
            QuorumApprovingMembersRequiredError
        );
        expect(api.registerSigner).not.toHaveBeenCalled();
        expect(api.send).not.toHaveBeenCalled();
    });
});
