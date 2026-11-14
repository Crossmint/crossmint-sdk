import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";
import type { ApiClient } from "../api";
import type { Chain } from "../chains/chains";
import type { QuorumMember, SignerConfigForChain } from "../signers/types";
import { QuorumSelectionAmbiguousError, SignatureNotAvailableError } from "../utils/errors";
import { createDeviceSigner } from "@/utils/device-signers";
import { EVMWallet } from "./evm";
import { Wallet } from "./wallet";
import {
    UNSIGNED_TRANSACTION,
    activeSignerMember,
    createAwaitingRequest,
    createHeldSigner,
    createMockApiClient,
    createMockWallet,
    createQuorumApiEntryWith,
    createQuorumPendingApproval,
    createSigningWallet,
    randomStellarMessage,
    settle,
    signatureOver,
    signerNotFound,
    type MockedApiClient,
} from "./__tests__/test-helpers";

vi.mock("@/utils/device-signers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/utils/device-signers")>();
    return { ...actual, createDeviceSigner: vi.fn() };
});

const CHAIN = "base-sepolia" as const;
const WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const NEW_SIGNER = "0x9999999999999999999999999999999999999999";
const E1 = "0x7777777777777777777777777777777777777777";
const E2 = "0x8888888888888888888888888888888888888888";
const ALICE = "0x6666666666666666666666666666666666666666";
const BOB = "0x5555555555555555555555555555555555555555";
const DAVE = "0x3333333333333333333333333333333333333333";
const MIXED_CASE = getAddress("0xabcdef0123456789abcdef0123456789abcdef01");
const SERVER_SECRET = "a".repeat(64);

const keyConfig = (address: string) =>
    ({
        type: "external-wallet",
        address,
        onSign: vi.fn(async (payload: string) => signatureOver(payload)),
    }) as unknown as SignerConfigForChain<Chain>;
const memberOf = (address: string) =>
    ({ type: "external-wallet", address, locator: `external-wallet:${address}` }) as QuorumMember;
const storedRecovery = (address: string) => ({ type: "external-wallet", address });
const flatEntry = (locator: string, message = "0xfeed") => ({ signer: { type: "external-wallet", locator }, message });

const LANDED = {
    id: "txn-1",
    status: "success",
    onChain: { txId: "0xhash", explorerLink: "https://explorer.example/tx" },
};
const registeredResponse = (address: string) => ({
    type: "external-wallet",
    address,
    locator: `external-wallet:${address}`,
    chains: { [CHAIN]: { id: "txn-change", status: "awaiting-approval", onChain: {} } },
});
const walletConfigResponse = (delegatedSigners: object[], recoveryMethods: object[]) => ({
    type: "smart",
    chainType: "evm",
    address: WALLET_ADDRESS,
    config: { adminSigner: recoveryMethods[0], recoveryMethods, delegatedSigners },
});

// Key storage for one device, as the built-in storages behave; `getKey` is overridable per test.
const deviceKeyStorage = () => {
    let savedLocator: string | null = null;
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
    };
};

// An EVM wallet with the given recovery methods; `signers()` lists `signers`.
async function evmWallet(
    api: MockedApiClient,
    recovery: object[],
    { signers = [], options }: { signers?: object[]; options?: object } = {}
) {
    const wallet = new Wallet(
        { chain: CHAIN, address: WALLET_ADDRESS, recovery: recovery as never, options: options as never },
        api as unknown as ApiClient
    );
    await wallet.waitForInit();
    vi.spyOn(wallet, "signers").mockResolvedValue(signers as never);
    return wallet;
}

const approvalsSent = (api: MockedApiClient) =>
    api.approveTransaction.mock.calls.flatMap(
        (call) => (call[2] as { approvals: Array<{ signer: string }> }).approvals
    );

describe("exotic key selection and signing", () => {
    let api: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
        // biome-ignore lint/suspicious/noExplicitAny: projectId lives on the real ApiClient
        (api as any).projectId = "test-project";
        api.getSigner.mockRejectedValue(signerNotFound());
        api.send.mockResolvedValue({ id: "txn-1" } as never);
        api.approveTransaction.mockResolvedValue({ id: "txn-1", status: "pending" } as never);
        api.registerSigner.mockResolvedValue(registeredResponse(NEW_SIGNER) as never);
        vi.mocked(createDeviceSigner).mockResolvedValue({
            type: "device",
            publicKey: { x: "0x01", y: "0x02" },
            locator: "device:newKey",
            name: "Test Device",
        } as never);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("EVMWallet.from", () => {
        describe("when a recovery method was selected on the base wallet", () => {
            it("keeps that recovery method as the approver of a signer change", async () => {
                const wallet = await evmWallet(api, [storedRecovery(E1), storedRecovery(E2)]);
                await wallet.useRecoveryMethod(keyConfig(E2));
                const evm = EVMWallet.from(wallet);
                await evm.waitForInit();

                const { error } = await settle(evm.addSigner(keyConfig(NEW_SIGNER) as never, { prepareOnly: true }));

                expect(error).toBeUndefined();
                expect(api.registerSigner.mock.calls[0]?.[1].approver).toBe(`external-wallet:${E2}`);
            });
        });

        describe("when the server recovery secret was given to the base wallet", () => {
            it("approves a signer change with that secret", async () => {
                const wallet = await evmWallet(api, [{ type: "server", secret: SERVER_SECRET }]);
                const evm = EVMWallet.from(wallet);
                await evm.waitForInit();

                const { error } = await settle(evm.addSigner(keyConfig(NEW_SIGNER) as never, { prepareOnly: true }));

                expect(error).toBeUndefined();
                expect(api.registerSigner).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe("external-wallet matching", () => {
        describe("when the caller spells a recovery method's address in another case", () => {
            it("selects it as the recovery method, not as a member of its quorum", async () => {
                const quorum = createQuorumApiEntryWith([memberOf(MIXED_CASE)]);
                const wallet = await evmWallet(api, [storedRecovery(MIXED_CASE), quorum]);
                await wallet.useRecoveryMethod(keyConfig(MIXED_CASE.toLowerCase()));

                await settle(wallet.addSigner(keyConfig(NEW_SIGNER) as never, { prepareOnly: true }));

                const approver = String(api.registerSigner.mock.calls[0]?.[1].approver);
                expect(approver.toLowerCase()).toBe(`external-wallet:${MIXED_CASE.toLowerCase()}`);
            });
        });

        describe("when the caller spells a registered signer's address in another case", () => {
            it("selects the registered signer", async () => {
                const registered = {
                    type: "external-wallet",
                    address: MIXED_CASE,
                    locator: `external-wallet:${MIXED_CASE}`,
                };
                const wallet = await evmWallet(api, [{ type: "api-key" }], {
                    signers: [{ ...registered, status: "success" }],
                });
                api.getSigner.mockResolvedValue(registered as never);

                await expect(wallet.useSigner(keyConfig(MIXED_CASE.toLowerCase()))).resolves.toBeUndefined();
            });
        });
    });

    describe("useRecoveryMethod", () => {
        describe("when a recovery quorum added through quorum approval has landed", () => {
            it("selects a member of the new quorum", async () => {
                const oldQuorum = createQuorumApiEntryWith([memberOf(ALICE), memberOf(BOB)]);
                const newQuorum = createQuorumApiEntryWith([memberOf(ALICE), memberOf(BOB), memberOf(DAVE)]);
                const wallet = await evmWallet(api, [oldQuorum]);
                api.registerRecoveryMethod.mockResolvedValue({
                    recoveryMethods: newQuorum,
                    tx: { id: "txn-change" },
                } as never);
                await wallet.useRecoveryMethod(keyConfig(ALICE));
                await wallet.addRecoveryMethod({
                    type: "quorum",
                    threshold: 2,
                    members: [keyConfig(ALICE), keyConfig(BOB), keyConfig(DAVE)],
                } as never);
                api.getWallet.mockResolvedValue(walletConfigResponse([], [oldQuorum, newQuorum]) as never);

                await expect(wallet.useRecoveryMethod(keyConfig(DAVE))).resolves.toBeUndefined();
            });
        });
    });

    describe("approve", () => {
        describe("when only a recovery method is selected and the device has no key yet", () => {
            it("signs with the recovery method and registers no device signer", async () => {
                api.getWallet.mockResolvedValue(walletConfigResponse([], [storedRecovery(E1)]) as never);
                const wallet = await evmWallet(api, [storedRecovery(E1)], {
                    options: { deviceSignerKeyStorage: deviceKeyStorage() },
                });
                await wallet.useRecoveryMethod(keyConfig(E1));
                api.getTransaction
                    .mockResolvedValueOnce(
                        createAwaitingRequest("txn-1", [flatEntry(`external-wallet:${E1}`)]) as never
                    )
                    .mockResolvedValue(LANDED as never);

                await settle(wallet.approve({ transactionId: "txn-1" }));

                expect(api.registerSigner).not.toHaveBeenCalled();
                expect(approvalsSent(api).map((approval) => approval.signer)).toEqual([`external-wallet:${E1}`]);
            });
        });

        describe("when a Stellar quorum request also waits on another party's auth entry", () => {
            // OPEN: should approve() skip a flat entry no held key can sign, or fail as today?
            it("submits the held member's approval and leaves the other entry", async () => {
                const member = activeSignerMember("stellar");
                const quorum = createQuorumApiEntryWith([member]);
                const wallet = await createSigningWallet("stellar", api);
                api.getTransaction.mockResolvedValue(
                    createAwaitingRequest(
                        "txn-1",
                        [
                            flatEntry("external-wallet:GOTHERPARTY", randomStellarMessage()),
                            createQuorumPendingApproval({
                                quorum,
                                pending: [member],
                                createMessage: randomStellarMessage,
                            }),
                        ],
                        "stellar"
                    ) as never
                );

                const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

                expect(
                    approvalsSent(api).map((approval) => approval.signer),
                    String(error)
                ).toEqual([member.locator]);
            });
        });

        describe("when the active signer is an api-key and an additional signer's entry is pending", () => {
            it("signs that entry with the additional signer", async () => {
                const extra = `external-wallet:${E2}`;
                const wallet = await createMockWallet(CHAIN, api, "api-key");
                api.getTransaction
                    .mockResolvedValueOnce(createAwaitingRequest("txn-1", [flatEntry(extra)]) as never)
                    .mockResolvedValue(LANDED as never);

                await settle(
                    wallet.approve({
                        transactionId: "txn-1",
                        options: { additionalSigners: [createHeldSigner(extra)] },
                    })
                );

                expect(approvalsSent(api).map((approval) => approval.signer)).toEqual([extra]);
            });
        });

        describe("when an additional signer repeats a held member in another case", () => {
            it("signs that member once", async () => {
                const member = memberOf(MIXED_CASE);
                const treasury = createQuorumApiEntryWith([member]);
                const wallet = await evmWallet(api, [{ type: "api-key" }], {
                    signers: [{ ...treasury, status: "success" }],
                });
                await wallet.useSigner(keyConfig(MIXED_CASE.toLowerCase()));
                api.getTransaction
                    .mockResolvedValueOnce(
                        createAwaitingRequest("txn-1", [
                            createQuorumPendingApproval({ quorum: treasury, pending: [member] }),
                        ]) as never
                    )
                    .mockResolvedValue(LANDED as never);

                await settle(
                    wallet.approve({
                        transactionId: "txn-1",
                        options: { additionalSigners: [createHeldSigner(member.locator)] },
                    })
                );

                expect(approvalsSent(api)).toHaveLength(1);
            });
        });
    });

    describe("send", () => {
        describe("when the signer option names a quorum and this client holds no key", () => {
            it("creates the request unsigned", async () => {
                const quorum = createQuorumApiEntryWith([memberOf(ALICE)]);
                const wallet = await evmWallet(api, [storedRecovery(E1)]);

                const { value, error } = await settle(wallet.send(RECIPIENT, "usdc", "1", { signer: quorum.locator }));

                expect(error).toBeUndefined();
                expect(api.send.mock.calls[0]?.[2].signer).toBe(quorum.locator);
                expect(value).toStrictEqual(UNSIGNED_TRANSACTION);
            });
        });

        describe("when the held key's own registration is pending and it is a member of an installed quorum", () => {
            it("creates the request as the quorum", async () => {
                const member = memberOf(ALICE);
                const treasury = createQuorumApiEntryWith([member]);
                const ownEntry = {
                    ...member,
                    chains: { [CHAIN]: { id: "txn-own", status: "awaiting-approval", onChain: {} } },
                };
                const wallet = await evmWallet(api, [{ type: "api-key" }], {
                    signers: [
                        { ...member, status: "awaiting-approval" },
                        { ...treasury, status: "success" },
                    ],
                });
                api.getSigner.mockResolvedValue(ownEntry as never);
                api.getWallet.mockResolvedValue(
                    walletConfigResponse([ownEntry, treasury], [{ type: "api-key" }]) as never
                );
                await wallet.useSigner(keyConfig(ALICE));

                await settle(wallet.send(RECIPIENT, "usdc", "1"));

                expect(api.send.mock.calls[0]?.[2].signer).toBe(treasury.locator);
            });
        });

        describe("when the held passkey is a quorum member and the passkey recovery method has no stored id", () => {
            it("creates the request as the quorum", async () => {
                const passkeyMember = {
                    type: "passkey",
                    id: "cred-dave",
                    name: "Dave",
                    publicKey: { x: "11", y: "22" },
                    locator: "passkey:cred-dave",
                } as QuorumMember;
                const treasury = createQuorumApiEntryWith([passkeyMember]);
                const wallet = await evmWallet(api, [{ type: "passkey" }], {
                    signers: [{ ...treasury, status: "success" }],
                });
                api.getWallet.mockResolvedValue(walletConfigResponse([treasury], [{ type: "passkey" }]) as never);
                await wallet.useSigner({
                    type: "passkey",
                    id: "cred-dave",
                    name: "Dave",
                    publicKey: { x: "11", y: "22" },
                    onSignWithPasskey: vi.fn(),
                } as never);

                await settle(wallet.send(RECIPIENT, "usdc", "1"));

                expect(api.send.mock.calls[0]?.[2].signer).toBe(treasury.locator);
            });
        });

        describe("when the member's quorum is still being added", () => {
            it("creates the request as the member itself", async () => {
                const member = memberOf(ALICE);
                const treasury = createQuorumApiEntryWith([member]);
                const pendingTreasury = {
                    ...treasury,
                    chains: { [CHAIN]: { id: "txn-q", status: "awaiting-approval", onChain: {} } },
                };
                const wallet = await evmWallet(api, [{ type: "api-key" }], {
                    signers: [{ ...treasury, status: "awaiting-approval" }],
                });
                api.getWallet.mockResolvedValue(
                    walletConfigResponse([pendingTreasury], [{ type: "api-key" }]) as never
                );
                await wallet.useSigner(keyConfig(ALICE));

                await settle(wallet.send(RECIPIENT, "usdc", "1"));

                expect(api.send.mock.calls[0]?.[2].signer).toBe(member.locator);
            });
        });
    });

    describe("recover", () => {
        describe("when a pending device registration waits on the selected, non-default recovery method", () => {
            it("approves it with the selected recovery method", async () => {
                const storage = deviceKeyStorage();
                storage.getKey.mockResolvedValue("pendingKey");
                api.getSigner.mockResolvedValue({
                    type: "device",
                    locator: "device:pendingKey",
                    publicKey: { x: "0x01", y: "0x02" },
                    name: "Test Device",
                    chains: {
                        [CHAIN]: {
                            id: "txn-1",
                            status: "awaiting-approval",
                            onChain: {},
                            approvals: { pending: [flatEntry(`external-wallet:${E2}`)], submitted: [] },
                        },
                    },
                } as never);
                const wallet = await evmWallet(api, [storedRecovery(E1), storedRecovery(E2)], {
                    options: { deviceSignerKeyStorage: storage },
                });
                await wallet.useRecoveryMethod(keyConfig(E2));
                api.getTransaction
                    .mockResolvedValueOnce(
                        createAwaitingRequest("txn-1", [flatEntry(`external-wallet:${E2}`)]) as never
                    )
                    .mockResolvedValue(LANDED as never);

                const { error } = await settle(wallet.recover());

                expect(error).toBeUndefined();
                expect(approvalsSent(api).map((approval) => approval.signer)).toEqual([`external-wallet:${E2}`]);
            });
        });
    });

    describe("useSigner", () => {
        describe("when a passkey without id is auto-selected", () => {
            it("leaves the caller's config unchanged", async () => {
                const registered = { type: "passkey", id: "cred-1", locator: "passkey:cred-1" };
                const wallet = await evmWallet(api, [{ type: "api-key" }], {
                    signers: [{ ...registered, status: "success" }],
                });
                api.getSigner.mockResolvedValue(registered as never);
                const config = { type: "passkey", onSignWithPasskey: vi.fn() } as { type: "passkey"; id?: string };

                await wallet.useSigner(config as never);

                expect(config.id).toBeUndefined();
            });
        });

        describe("when it is called before the wallet's initialization finishes", () => {
            it("keeps the selected signer over the device key found later", async () => {
                const storage = deviceKeyStorage();
                storage.getKey.mockImplementation(
                    () => new Promise((resolve) => setTimeout(() => resolve("devKey"), 50))
                );
                const registered = { type: "external-wallet", address: E1, locator: `external-wallet:${E1}` };
                api.getSigner.mockImplementation(
                    async (_wallet, locator) =>
                        (String(locator).startsWith("device:")
                            ? { type: "device", locator, publicKey: { x: "0x01", y: "0x02" }, name: "Test Device" }
                            : registered) as never
                );
                const wallet = new Wallet(
                    {
                        chain: CHAIN,
                        address: WALLET_ADDRESS,
                        recovery: { type: "api-key" } as never,
                        options: { deviceSignerKeyStorage: storage as never },
                    },
                    api as unknown as ApiClient
                );
                vi.spyOn(wallet, "signers").mockResolvedValue([{ ...registered, status: "success" }] as never);

                await wallet.useSigner(keyConfig(E1));
                await settle(wallet.waitForInit());

                expect(wallet.signer?.locator()).toBe(`external-wallet:${E1}`);
            });
        });
    });

    describe("signMessage", () => {
        describe("when the signature still waits on a single signer's approval", () => {
            // OPEN: should this return the unsigned shape, or a typed awaiting-approval error as transactions do?
            it("fails with an awaiting-approval error", async () => {
                const evm = EVMWallet.from(await createMockWallet(CHAIN, api, "api-key"));
                api.createSignature.mockResolvedValue({ id: "sig-1" } as never);
                api.getSignature.mockResolvedValue(
                    createAwaitingRequest("sig-1", [flatEntry(`external-wallet:${E2}`)]) as never
                );

                const { error } = await settle(evm.signMessage({ message: "hello" }));

                expect(error).not.toBeInstanceOf(SignatureNotAvailableError);
                expect(String((error as Error)?.message)).toMatch(/awaiting approval/i);
            });
        });
    });

    describe("signer changes", () => {
        describe("when the selected member belongs to two recovery quorums", () => {
            it("fails as ambiguous, and an explicit quorum signer resolves it", async () => {
                const first = createQuorumApiEntryWith([memberOf(ALICE)]);
                const second = createQuorumApiEntryWith([memberOf(ALICE)]);
                const wallet = await evmWallet(api, [first, second]);
                await wallet.useRecoveryMethod(keyConfig(ALICE));

                await expect(
                    wallet.addSigner(keyConfig(NEW_SIGNER) as never, { prepareOnly: true })
                ).rejects.toBeInstanceOf(QuorumSelectionAmbiguousError);
                await wallet.addSigner(keyConfig(NEW_SIGNER) as never, { prepareOnly: true, signer: first.locator });

                expect(api.registerSigner.mock.calls[0]?.[1].approver).toBe(first.locator);
            });
        });

        describe("when the recovery method's onSign throws", () => {
            it("restores the active signer", async () => {
                const failing = {
                    type: "external-wallet",
                    address: E1,
                    onSign: vi.fn().mockRejectedValue(new Error("user rejected")),
                };
                const wallet = await createMockWallet(CHAIN, api, "external-wallet", [failing as never]);
                const activeBefore = wallet.signer?.locator();
                api.getTransaction.mockResolvedValue(
                    createAwaitingRequest("txn-change", [flatEntry(`external-wallet:${E1}`)]) as never
                );

                const { error } = await settle(wallet.addSigner(keyConfig(NEW_SIGNER) as never));

                expect(error).toBeDefined();
                expect(wallet.signer?.locator()).toBe(activeBefore);
            });
        });
    });
});
