/**
 * m7 stress: approvals and acting as a quorum (EDD 007 §7 "Role", "Approval", "A quorum forces prepareOnly").
 * Several wallet instances stand for several devices of one user; the fake tells them apart by the JWT's `#device`
 * suffix (see approvals.helpers.ts). Throwaway, never merged.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrossmintSDKError } from "@crossmint/common-sdk-base";
import { EVMWallet } from "../../wallets/evm";
import { StellarWallet } from "../../wallets/stellar";
import type { Wallet } from "../../wallets/wallet";
import {
    InvalidSignerError,
    QuorumSelectionAmbiguousError,
    SignatureFailedError,
    TransactionExpiredError,
    TransactionFailedError,
    TransactionNotAvailableError,
    TransactionNotCreatedError,
    TransactionSendingFailedError,
} from "../../utils/errors";
import {
    drive,
    forEachSeed,
    quorumOf,
    recipientFor,
    rng,
    settle,
    stressEnv,
    stressRuns,
    stressSeed,
    useStressTimers,
    type Rng,
    type StressEnv,
    type TestKey,
} from "./harness";
import {
    adapterFor,
    addPendingEntry,
    createArgs,
    describeTopology,
    deviceSdk,
    expectedRole,
    flatIdentity,
    quorumRecords,
    randomTopology,
    submittedApprovals,
    tagDevices,
    type DeviceLog,
    type Topology,
} from "./approvals.helpers";

// biome-ignore lint/suspicious/noExplicitAny: throwaway stress code
type Any = any;
type Chain = "base-sepolia" | "stellar";
const CHAINS: Chain[] = ["base-sepolia", "stellar"];

let env: StressEnv;
let devices: DeviceLog;
const seed = stressSeed();

beforeEach(() => {
    useStressTimers();
    env = stressEnv(seed);
    devices = tagDevices(env.fake);
});

afterEach(() => {
    env.dispose();
    vi.useRealTimers();
});

/**
 * A lost race on a request with several pending entries, as the SDK surfaces it: the API's 409 for a flat signer another
 * call already submitted, or its 400 for a member of a quorum entry another call completed. Either rejects the batch.
 */
const isAlreadySubmitted = (error: unknown) =>
    (error instanceof TransactionFailedError || error instanceof SignatureFailedError) &&
    /already submitted|is not pending for signer/.test((error as Error).message);

const errorOf = (outcome: { value: unknown } | { error: unknown }) => ("error" in outcome ? outcome.error : null);
const describeError = (error: unknown) =>
    error instanceof Error ? `${error.constructor.name}: ${error.message.slice(0, 300)}` : String(error);

/** A typed SDK error: a CrossmintSDKError subclass, never a TypeError or a bare Error. */
function expectTyped(error: unknown) {
    expect(error, describeError(error)).toBeInstanceOf(CrossmintSDKError);
    expect(error).not.toBeInstanceOf(TypeError);
}

async function walletOn(device: string, chain: Chain): Promise<Wallet<Any>> {
    return await drive(deviceSdk(env, device).getWallet({ chain } as Any));
}

async function quorumWallet(chain: Chain, size = 3, threshold = 2) {
    const members = Array.from({ length: size }, () => env.key(chain));
    const created = await drive(
        deviceSdk(env, "creator").createWallet({ chain, recoveryMethods: [quorumOf(members, threshold)] } as Any)
    );
    const quorum = quorumRecords(env.fake, created.address).recovery[0];
    return { members, address: created.address, quorum };
}

async function memberDevice(device: string, chain: Chain, key: TestKey, how: "useSigner" | "useRecoveryMethod") {
    const wallet = await walletOn(device, chain);
    if (how === "useSigner") {
        await drive(wallet.useSigner(key.config));
    } else {
        await drive(wallet.useRecoveryMethod(key.config));
    }
    return wallet;
}

// ---------------------------------------------------------------------------------------------------------------------
// Targeted scenarios
// ---------------------------------------------------------------------------------------------------------------------

describe.each(CHAINS)("approvals by several devices on %s", (chain) => {
    it("lands exactly at the threshold, whatever the order, each member signing once", async () => {
        const random = rng(seed).fork(`order-${chain}`);
        const { members } = await quorumWallet(chain, 4, 3);
        const creator = await memberDevice("d0", chain, members[0], "useSigner");
        const prepared = await drive(creator.send(recipientFor(chain, env.rng), "usdc", "1"));
        expect(prepared).toEqual({ hash: undefined, explorerLink: undefined, transactionId: expect.any(String) });

        const order = random.shuffle([0, 1, 2, 3]);
        const results: Any[] = [];
        for (const index of order) {
            const wallet = await memberDevice(
                `d${index}`,
                chain,
                members[index],
                random.pick(["useSigner", "useRecoveryMethod"] as const)
            );
            results.push(await drive(wallet.approve({ transactionId: prepared.transactionId })));
        }

        expect(results.map((result) => result.hash != null)).toEqual([false, false, true, true]);
        // The fourth member approves a landed request: nothing is pending, nothing is sent.
        expect(submittedApprovals(env.fake, devices).map((approval) => approval.signers.length)).toEqual([1, 1, 1]);
        const signCounts = members.map((member) => member.signCount());
        expect(signCounts.filter((count) => count === 1)).toHaveLength(3);
        expect(signCounts[order[3]]).toBe(0);
    });

    it("races two devices for the last slot: both end with the landed transaction", async () => {
        const { members } = await quorumWallet(chain, 3, 2);
        const creator = await memberDevice("d0", chain, members[0], "useSigner");
        const prepared = await drive(creator.send(recipientFor(chain, env.rng), "usdc", "1"));
        await drive(creator.approve({ transactionId: prepared.transactionId }));

        const bob = await memberDevice("bob", chain, members[1], "useSigner");
        const carol = await memberDevice("carol", chain, members[2], "useRecoveryMethod");
        const [fromBob, fromCarol] = await drive(
            Promise.all([
                bob.approve({ transactionId: prepared.transactionId }),
                carol.approve({ transactionId: prepared.transactionId }),
            ])
        );

        expect(fromBob.hash).toEqual(expect.any(String));
        expect(fromCarol.hash).toBe(fromBob.hash);
        const statuses = submittedApprovals(env.fake, devices).map((approval) => approval.status);
        expect(statuses).toEqual([201, 201, 422]);
        const request = env.fake.requests.get(prepared.transactionId) as Any;
        expect(request.submitted[0].submitted).toHaveLength(2);
    });

    it("calls the same approve twice in a row and in parallel from two devices holding the same key", async () => {
        const { members } = await quorumWallet(chain, 3, 2);
        const creator = await memberDevice("d0", chain, members[0], "useSigner");
        const prepared = await drive(creator.send(recipientFor(chain, env.rng), "usdc", "1"));

        const first = await drive(creator.approve({ transactionId: prepared.transactionId }));
        const again = await drive(creator.approve({ transactionId: prepared.transactionId }));
        expect([first.hash, again.hash]).toEqual([undefined, undefined]);
        expect(members[0].signCount()).toBe(1);

        // The same key on two more devices, in parallel: resubmissions are ignored, the threshold is not reached.
        const twinA = await memberDevice("twinA", chain, members[0], "useSigner");
        const twinB = await memberDevice("twinB", chain, members[0], "useRecoveryMethod");
        const twins = await drive(
            Promise.all([
                twinA.approve({ transactionId: prepared.transactionId }),
                twinB.approve({ transactionId: prepared.transactionId }),
            ])
        );
        expect(twins.map((twin) => twin.hash)).toEqual([undefined, undefined]);
        const entry = (env.fake.requests.get(prepared.transactionId) as Any).pending[0];
        expect(entry.remaining).toBe(1);
        expect(entry.submitted).toHaveLength(1);
    });

    it("throws TransactionExpiredError once the request expired, from every device, sending nothing", async () => {
        const { members } = await quorumWallet(chain, 3, 2);
        const creator = await memberDevice("d0", chain, members[0], "useSigner");
        const prepared = await drive(creator.send(recipientFor(chain, env.rng), "usdc", "1"));
        await drive(creator.approve({ transactionId: prepared.transactionId }));

        // Let the approval window close on fake time, not by `expire()`.
        await vi.advanceTimersByTimeAsync(16 * 60_000);
        const bob = await memberDevice("bob", chain, members[1], "useSigner");
        const outcomes = await Promise.all([
            settle(bob.approve({ transactionId: prepared.transactionId })),
            settle(creator.approve({ transactionId: prepared.transactionId })),
        ]);

        for (const outcome of outcomes) {
            expect(errorOf(outcome)).toBeInstanceOf(TransactionExpiredError);
        }
        expect(submittedApprovals(env.fake, devices)).toHaveLength(1);
    });

    it("expires between the read and the submission: TransactionExpiredError, not a generic failure", async () => {
        const { members } = await quorumWallet(chain, 3, 2);
        const creator = await memberDevice("d0", chain, members[0], "useSigner");
        const prepared = await drive(creator.send(recipientFor(chain, env.rng), "usdc", "1"));
        const bob = await memberDevice("bob", chain, members[1], "useSigner");
        env.fake.faults.add({
            route: "getTransaction",
            times: 1,
            fault: {
                type: "mutate",
                fn: (body) => {
                    env.fake.expire(prepared.transactionId);
                    return body;
                },
            },
        });

        const outcome = await settle(bob.approve({ transactionId: prepared.transactionId }));

        expect(errorOf(outcome)).toBeInstanceOf(TransactionExpiredError);
        expect(errorOf(outcome)).toEqual(expect.objectContaining({ transactionId: prepared.transactionId }));
    });

    it("signs with the key selected at approval time, not the one that created the request", async () => {
        const { members } = await quorumWallet(chain, 3, 2);
        const device = await memberDevice("d0", chain, members[0], "useSigner");
        const prepared = await drive(device.send(recipientFor(chain, env.rng), "usdc", "1"));

        await drive(device.useSigner(members[1].config));
        const afterSwitch = await drive(device.approve({ transactionId: prepared.transactionId }));

        expect(afterSwitch.hash).toBeUndefined();
        expect(submittedApprovals(env.fake, devices).flatMap((approval) => approval.signers)).toEqual([
            members[1].locator,
        ]);
        expect(members[0].signCount()).toBe(0);
    });

    it("names another quorum explicitly: created unsigned as that quorum, whatever prepareOnly says", async () => {
        const recovery = [env.key(chain), env.key(chain)];
        const other = [env.key(chain), env.key(chain)];
        const created = await drive(
            deviceSdk(env, "creator").createWallet({
                chain,
                recoveryMethods: [quorumOf(recovery, 1), quorumOf(other, 2)],
            } as Any)
        );
        const [, otherQuorum] = quorumRecords(env.fake, created.address).recovery;
        const device = await memberDevice("d0", chain, recovery[0], "useSigner");

        for (const prepareOnly of [true, false, undefined]) {
            const result = await drive(
                device.send(recipientFor(chain, env.rng), "usdc", "1", {
                    signer: otherQuorum.locator,
                    ...(prepareOnly != null ? { prepareOnly } : {}),
                } as Any)
            );
            expect(result).toEqual({ hash: undefined, explorerLink: undefined, transactionId: expect.any(String) });
        }
        expect(env.fake.callsTo("send").map((call) => call.body.signer)).toEqual([
            otherQuorum.locator,
            otherQuorum.locator,
            otherQuorum.locator,
        ]);
        expect(submittedApprovals(env.fake, devices)).toHaveLength(0);
        expect(recovery[0].signCount()).toBe(0);
    });

    it("names a quorum the wallet does not have: a typed creation error, nothing signed", async () => {
        const { members } = await quorumWallet(chain);
        const device = await memberDevice("d0", chain, members[0], "useSigner");

        const outcome = await settle(
            device.send(recipientFor(chain, env.rng), "usdc", "1", {
                signer: "quorum:00000000-0000-4000-8000-000000000000",
            } as Any)
        );

        expect(errorOf(outcome)).toBeInstanceOf(TransactionNotCreatedError);
        expect(members[0].signCount()).toBe(0);
    });

    it("names a flat signer this client does not hold: InvalidSignerError, no approval sent", async () => {
        const recovery = env.key(chain);
        const members = [env.key(chain), env.key(chain)];
        await drive(
            deviceSdk(env, "creator").createWallet({
                chain,
                recoveryMethods: [recovery.config, quorumOf(members, 2)],
            } as Any)
        );
        const device = await memberDevice("d0", chain, members[0], "useSigner");

        const outcome = await settle(
            device.send(recipientFor(chain, env.rng), "usdc", "1", { signer: recovery.locator } as Any)
        );

        expect(errorOf(outcome)).toBeInstanceOf(InvalidSignerError);
        expect(submittedApprovals(env.fake, devices)).toHaveLength(0);
    });
});

describe("EVM signatures as a quorum", () => {
    const chain = "base-sepolia";

    it.each(["signMessage", "signTypedData"] as const)(
        "%s by a member is requested unsigned; members approve it; a late member gets the signature",
        async (method) => {
            const { members, quorum } = await quorumWallet(chain, 3, 2);
            const device = EVMWallet.from(await memberDevice("d0", chain, members[0], "useSigner"));
            const request =
                method === "signMessage"
                    ? device.signMessage({ message: "hello" })
                    : device.signTypedData({
                          domain: {
                              name: "Stress",
                              version: "1",
                              chainId: 84532,
                              verifyingContract: "0x0000000000000000000000000000000000000001",
                          },
                          types: { Mail: [{ name: "contents", type: "string" }] },
                          primaryType: "Mail",
                          message: { contents: "hi" },
                          chain,
                      } as Any);
            const prepared = await drive(request);
            expect(prepared).toEqual({ signature: undefined, signatureId: expect.any(String) });
            expect(env.fake.callsTo("createSignature")[0].body.params.signer).toBe(quorum.locator);

            const afterFirst = await drive(device.approve({ signatureId: prepared.signatureId }));
            expect(afterFirst).toEqual({ signature: undefined, signatureId: prepared.signatureId });
            const bob = await memberDevice("bob", chain, members[1], "useRecoveryMethod");
            const carol = await memberDevice("carol", chain, members[2], "useSigner");
            const [fromBob, fromCarol] = await drive(
                Promise.all([
                    bob.approve({ signatureId: prepared.signatureId }),
                    carol.approve({ signatureId: prepared.signatureId }),
                ])
            );
            expect(fromBob.signature).toEqual(expect.any(String));
            expect(fromCarol.signature).toBe(fromBob.signature);
            expect(members.map((member) => member.signCount())).toEqual([1, 1, 1]);
        }
    );

    it("an expired signature request throws TransactionExpiredError on approve", async () => {
        const { members } = await quorumWallet(chain, 3, 2);
        const device = EVMWallet.from(await memberDevice("d0", chain, members[0], "useSigner"));
        const prepared = await drive(device.signMessage({ message: "hello" }));
        env.fake.expire(prepared.signatureId);

        const outcome = await settle(device.approve({ signatureId: prepared.signatureId }));

        expect(errorOf(outcome)).toBeInstanceOf(TransactionExpiredError);
    });
});

describe.each(CHAINS)("requests with flat and quorum entries pending on %s", (chain) => {
    async function mixed() {
        const recovery = env.key(chain);
        const quorumMembers = [env.key(chain), env.key(chain), env.key(chain)];
        const created = await drive(
            deviceSdk(env, "creator").createWallet({
                chain,
                recoveryMethods: [recovery.config, quorumOf(quorumMembers, 2)],
            } as Any)
        );
        const quorum = quorumRecords(env.fake, created.address).recovery[0];
        const device = await memberDevice("d0", chain, quorumMembers[0], "useSigner");
        const prepared = await drive(device.send(recipientFor(chain, env.rng), "usdc", "1"));
        addPendingEntry(env.fake, prepared.transactionId, flatIdentity(recovery), env.rng);
        return { recovery, quorumMembers, quorum, prepared };
    }

    it("a client holding the flat key and one member signs both in one submission; one more member lands it", async () => {
        const { recovery, quorumMembers, prepared } = await mixed();
        const device = await memberDevice("d1", chain, quorumMembers[1], "useSigner");
        await drive(device.useRecoveryMethod(recovery.config));

        const first = await drive(device.approve({ transactionId: prepared.transactionId }));
        expect(first.hash).toBeUndefined();
        expect(submittedApprovals(env.fake, devices)[0].signers.sort()).toEqual(
            [recovery.locator, quorumMembers[1].locator].sort()
        );

        const last = await memberDevice("d2", chain, quorumMembers[2], "useSigner");
        expect((await drive(last.approve({ transactionId: prepared.transactionId }))).hash).toEqual(expect.any(String));
    });

    it("the same flat key approved from two devices in parallel while the quorum still waits", async () => {
        const { recovery, prepared } = await mixed();
        const one = await memberDevice("one", chain, recovery, "useSigner");
        const two = await memberDevice("two", chain, recovery, "useSigner");

        const outcomes = await Promise.all([
            settle(one.approve({ transactionId: prepared.transactionId })),
            settle(two.approve({ transactionId: prepared.transactionId })),
        ]);

        const statuses = submittedApprovals(env.fake, devices).map((approval) => approval.status);
        console.info(
            "[approvals] parallel flat double approve:",
            statuses,
            outcomes.map((o) => describeError(errorOf(o)))
        );
        for (const outcome of outcomes) {
            const error = errorOf(outcome);
            if (error != null) {
                expectTyped(error);
            }
        }
    });
});

describe("a Stellar request with one quorum entry per auth entry", () => {
    it("each held member signs every entry's own message once; the request lands when every entry reaches the threshold", async () => {
        const chain = "stellar";
        const { members, quorum } = await quorumWallet(chain, 3, 2);
        const aliceDevice = await memberDevice("alice", chain, members[0], "useSigner");
        const prepared = await drive(aliceDevice.send(recipientFor(chain, env.rng), "usdc", "1"));
        addPendingEntry(env.fake, prepared.transactionId, quorum, env.rng);
        addPendingEntry(env.fake, prepared.transactionId, quorum, env.rng);

        const afterAlice = await drive(aliceDevice.approve({ transactionId: prepared.transactionId }));
        expect(afterAlice.hash).toBeUndefined();
        expect(members[0].signCount()).toBe(3);
        const [first] = submittedApprovals(env.fake, devices);
        expect(first.signers).toEqual([members[0].locator, members[0].locator, members[0].locator]);
        expect(first.status).toBe(201);
        const request = env.fake.requests.get(prepared.transactionId) as Any;
        expect(request.pending.map((entry: Any) => entry.remaining)).toEqual([1, 1, 1]);

        // Approving again signs nothing: Alice is no longer pending in any entry.
        await drive(aliceDevice.approve({ transactionId: prepared.transactionId }));
        expect(members[0].signCount()).toBe(3);

        const carol = await memberDevice("carol", chain, members[2], "useRecoveryMethod");
        const landed = await drive(carol.approve({ transactionId: prepared.transactionId }));
        expect(landed.hash).toEqual(expect.any(String));
        expect(members.map((member) => member.signCount())).toEqual([3, 0, 3]);
    });
});

// ---------------------------------------------------------------------------------------------------------------------
// Randomized: topologies × devices × orders
// ---------------------------------------------------------------------------------------------------------------------

type DeviceState = {
    name: string;
    wallet: Wallet<Any>;
    active: TestKey | null;
    recoverySel: TestKey | null;
};

type ModelEntry =
    | { kind: "flat"; key: TestKey; signed: boolean }
    | { kind: "quorum"; locator: string; members: TestKey[]; threshold: number; signed: Set<TestKey> };

const quorumDone = (entry: Extract<ModelEntry, { kind: "quorum" }>) => entry.signed.size >= entry.threshold;
const entryDone = (entry: ModelEntry) => (entry.kind === "flat" ? entry.signed : quorumDone(entry));

function keyByLocator(topology: Topology, locator: string): TestKey | undefined {
    return topology.keys.find((key) => key.locator.toLowerCase() === locator.toLowerCase());
}

async function setUpDevice(
    random: Rng,
    topology: Topology,
    records: ReturnType<typeof quorumRecords>,
    name: string
): Promise<DeviceState> {
    const wallet = await walletOn(name, topology.chain);
    const withRole = topology.keys.filter((key) => expectedRole(topology, records, key).kind !== "unknown");
    const recoveryEligible = topology.keys.filter(
        (key) =>
            topology.recoveryFlat.includes(key) ||
            records.recovery.some((quorum) =>
                quorum.members.some((member) => member.locator.toLowerCase() === key.locator.toLowerCase())
            )
    );
    let active: TestKey | null = null;
    let recoverySel: TestKey | null = null;
    const mode = random.int(0, 2);
    if (mode !== 1 && withRole.length > 0) {
        active = random.pick(withRole);
        await drive(wallet.useSigner(active.config));
    }
    if ((mode !== 0 || active == null) && recoveryEligible.length > 0) {
        recoverySel = random.pick(recoveryEligible);
        await drive(wallet.useRecoveryMethod(recoverySel.config));
    }
    return { name, wallet, active, recoverySel };
}

/** Changes one device's selection between rounds: a new useSigner() or useRecoveryMethod() key. */
async function reselect(
    random: Rng,
    topology: Topology,
    records: ReturnType<typeof quorumRecords>,
    device: DeviceState
) {
    const withRole = topology.keys.filter((key) => expectedRole(topology, records, key).kind !== "unknown");
    const recoveryEligible = topology.keys.filter(
        (key) =>
            topology.recoveryFlat.includes(key) ||
            records.recovery.some((quorum) =>
                quorum.members.some((member) => member.locator.toLowerCase() === key.locator.toLowerCase())
            )
    );
    if (random.bool() && withRole.length > 0) {
        device.active = random.pick(withRole);
        await drive(device.wallet.useSigner(device.active.config));
    } else if (recoveryEligible.length > 0) {
        device.recoverySel = random.pick(recoveryEligible);
        await drive(device.wallet.useRecoveryMethod(device.recoverySel.config));
    }
}

/** The keys an approve() call may sign with, per `#heldSigners`. */
function heldKeys(device: DeviceState, additional: TestKey[], anyQuorumPending: boolean): TestKey[] {
    const walletSigner = device.active ?? device.recoverySel;
    const held = anyQuorumPending ? [...additional, device.active, device.recoverySel] : [...additional, walletSigner];
    return [...new Set(held.filter((key): key is TestKey => key != null))];
}

const stats: Record<string, number> = {};
const count = (what: string) => {
    stats[what] = (stats[what] ?? 0) + 1;
};

async function randomApprovalRun(runSeed: number, chain: Chain) {
    const random = rng(runSeed).fork(`approvals-${chain}`);
    const topology = randomTopology(env, random, chain);
    const label = describeTopology(topology);
    const created = await drive(deviceSdk(env, "creator").createWallet(createArgs(topology) as Any));
    const records = quorumRecords(env.fake, created.address);

    const deviceCount = random.int(2, 4);
    const fleet: DeviceState[] = [];
    for (let i = 0; i < deviceCount; i++) {
        fleet.push(await setUpDevice(random, topology, records, `dev${i}`));
    }

    // --- create a request from a device that has an active signer --------------------------------------------------
    const creators = fleet.filter((device) => device.active != null);
    if (creators.length === 0) {
        count("no creator");
        return;
    }
    const creator = random.pick(creators);
    const explicitQuorum = records.all.length > 0 && random.bool(0.25) ? random.pick(records.all) : null;
    const prepareOnly = random.pick([true, false, undefined]);
    const isEvm = chain === "base-sepolia";
    const kind = isEvm
        ? random.pick(["send", "sendTransaction", "signMessage", "signTypedData"] as const)
        : random.pick(["send", "sendTransaction"] as const);
    const isSignature = kind === "signMessage" || kind === "signTypedData";
    const options: Any = {
        ...(prepareOnly != null ? { prepareOnly } : {}),
        ...(explicitQuorum != null ? { signer: explicitQuorum.locator } : {}),
    };
    const role =
        explicitQuorum != null
            ? { kind: "quorum" as const, locator: explicitQuorum.locator }
            : expectedRole(topology, records, creator.active as TestKey);
    const createCall = (): Promise<Any> => {
        const recipient = recipientFor(chain, env.rng);
        switch (kind) {
            case "send":
                return creator.wallet.send(recipient, "usdc", "1", options);
            case "sendTransaction":
                return isEvm
                    ? EVMWallet.from(creator.wallet).sendTransaction({
                          to: recipient,
                          value: BigInt(1),
                          options,
                      } as Any)
                    : StellarWallet.from(creator.wallet).sendTransaction({
                          contractId: recipient,
                          method: "transfer",
                          args: {},
                          options,
                      } as Any);
            case "signMessage":
                return EVMWallet.from(creator.wallet).signMessage({ message: `m-${runSeed}`, options } as Any);
            case "signTypedData":
                return EVMWallet.from(creator.wallet).signTypedData({
                    domain: {
                        name: "Stress",
                        version: "1",
                        chainId: 84532,
                        verifyingContract: "0x0000000000000000000000000000000000000001",
                    },
                    types: { Mail: [{ name: "contents", type: "string" }] },
                    primaryType: "Mail",
                    message: { contents: `c-${runSeed}` },
                    chain,
                    options,
                } as Any);
        }
    };
    const createRoute = isSignature ? "createSignature" : kind === "send" ? "send" : "createTransaction";
    const createdBefore = env.fake.callsTo(createRoute).length;
    const outcome = await settle(createCall());
    const context = `${label} creator=${creator.name} active=k${topology.keys.indexOf(creator.active as TestKey)} kind=${kind} prepareOnly=${prepareOnly} explicit=${explicitQuorum?.locator ?? "-"}`;

    if (role.kind === "ambiguous") {
        expect(errorOf(outcome), context).toBeInstanceOf(QuorumSelectionAmbiguousError);
        expect(env.fake.callsTo(createRoute).length, context).toBe(createdBefore);
        count("ambiguous");
        return;
    }
    if ("error" in outcome) {
        throw new Error(`${context}: create threw ${describeError(outcome.error)}`);
    }
    const sentSigner = (() => {
        const call = env.fake.callsTo(createRoute).at(-1) as Any;
        return createRoute === "send" ? call.body.signer : call.body.params.signer;
    })();
    expect(sentSigner?.toLowerCase(), context).toBe((role as Any).locator.toLowerCase());
    const result = outcome.value as Any;
    const requestId: string = isSignature ? result.signatureId : result.transactionId;
    const isQuorumRequest = role.kind === "quorum";

    if (!isQuorumRequest && prepareOnly !== true) {
        // A flat signer that is not prepareOnly signs and waits.
        if (isSignature) {
            expect(result.signature, context).toEqual(expect.any(String));
        } else {
            expect(result.hash, context).toEqual(expect.any(String));
        }
        count("flat signed at creation");
        return;
    }
    // A quorum (or prepareOnly) returns the request unsigned.
    if (isSignature) {
        expect(result, context).toEqual({ signature: undefined, signatureId: expect.any(String) });
    } else {
        expect(result, context).toEqual({
            hash: undefined,
            explorerLink: undefined,
            transactionId: expect.any(String),
        });
    }
    expect(submittedApprovals(env.fake, devices, requestId), context).toHaveLength(0);

    // --- the model of the request's pending entries ------------------------------------------------------------------
    const entries: ModelEntry[] = [];
    if (isQuorumRequest) {
        const record = records.all.find((quorum) => quorum.locator === (role as Any).locator);
        if (record == null) {
            throw new Error("quorum record not found");
        }
        entries.push({
            kind: "quorum",
            locator: record.locator,
            members: record.members.map((member) => keyByLocator(topology, member.locator) as TestKey),
            threshold: record.threshold,
            signed: new Set(),
        });
    } else {
        entries.push({ kind: "flat", key: creator.active as TestKey, signed: false });
    }
    // Sometimes add an entry that overlaps none of the existing ones (the fake rejects overlapping ones outright).
    if (random.bool(0.35)) {
        const used = new Set(entries.flatMap((entry) => (entry.kind === "flat" ? [entry.key] : entry.members)));
        const freeQuorums = records.all.filter(
            (quorum) => !quorum.members.some((member) => used.has(keyByLocator(topology, member.locator) as TestKey))
        );
        const freeKeys = topology.keys.filter((key) => !used.has(key));
        if (freeQuorums.length > 0 && random.bool()) {
            const extra = random.pick(freeQuorums);
            addPendingEntry(env.fake, requestId, extra, random);
            entries.push({
                kind: "quorum",
                locator: extra.locator,
                members: extra.members.map((member) => keyByLocator(topology, member.locator) as TestKey),
                threshold: extra.threshold,
                signed: new Set(),
            });
        } else if (freeKeys.length > 0) {
            const extra = random.pick(freeKeys);
            addPendingEntry(env.fake, requestId, flatIdentity(extra), random);
            entries.push({ kind: "flat", key: extra, signed: false });
        }
    }
    const expire = random.bool(0.15) ? random.int(0, 4) : -1;
    // Sometimes the fully approved transaction fails to land.
    const landingFails = !isSignature && random.bool(0.15);
    if (landingFails) {
        env.fake.failNextLandings = 1;
    }

    // --- approval rounds ------------------------------------------------------------------------------------------------
    let done = false;
    let expired = false;
    for (let round = 0; round < 8 && !done; round++) {
        if (round === expire) {
            env.fake.expire(requestId);
            expired = true;
        }
        if (random.bool(0.25)) {
            await reselect(random, topology, records, random.pick(fleet));
            count("reselected");
        }
        const parallel = random.bool(0.35);
        // A parallel round may run the same wallet instance twice.
        const participants = parallel
            ? Array.from({ length: random.int(2, 3) }, () => random.pick(fleet))
            : [random.pick(fleet)];
        const pendingEntries = entries.filter((entry) => !entryDone(entry));
        const anyQuorumPending = pendingEntries.some((entry) => entry.kind === "quorum");
        const pendingFlatKeys = pendingEntries.flatMap((entry) => (entry.kind === "flat" ? [entry.key] : []));
        const plans = participants.map((device) => {
            const additional = random.bool(0.3) ? random.shuffle(topology.keys).slice(0, random.int(1, 2)) : [];
            for (const key of pendingFlatKeys) {
                if (random.bool(0.5) && !additional.includes(key)) {
                    additional.push(key);
                }
            }
            return { device, additional, held: heldKeys(device, additional, anyQuorumPending) };
        });
        const signsBefore = new Map(topology.keys.map((key) => [key, key.signCount()]));
        const pendingBefore = pendingEntries.map((entry) => ({
            unsigned: entry.kind === "flat" ? [entry.key] : entry.members.filter((member) => !entry.signed.has(member)),
        }));
        const approvalsBefore = submittedApprovals(env.fake, devices, requestId).length;
        const outcomes = await Promise.all(
            plans.map(({ device, additional }) =>
                settle(
                    device.wallet.approve({
                        ...(isSignature ? { signatureId: requestId } : { transactionId: requestId }),
                        ...(additional.length > 0
                            ? { options: { additionalSigners: additional.map((key) => adapterFor(chain, key)) } }
                            : {}),
                    } as Any)
                )
            )
        );
        const name = (key: TestKey | null) => (key == null ? "-" : `k${topology.keys.indexOf(key)}`);
        const roundContext = `${context} round=${round} parallel=${parallel} landingFails=${landingFails} plans=${plans
            .map(
                (plan) =>
                    `${plan.device.name}{active=${name(plan.device.active)} sel=${name(plan.device.recoverySel)} add=[${plan.additional.map(name).join(",")}] held=[${plan.held.map(name).join(",")}]}`
            )
            .join(
                " "
            )} outcomes=${outcomes.map((o) => ("error" in o ? describeError(o.error) : JSON.stringify(o.value))).join(" | ")}`;

        // (1) No approval for a key the device does not hold; no key twice in one submission.
        const sent = submittedApprovals(env.fake, devices, requestId).slice(approvalsBefore);
        for (const submission of sent) {
            const candidates = plans.filter((p) => p.device.name === submission.device);
            expect(candidates.length, roundContext).toBeGreaterThan(0);
            const heldLocators = candidates.flatMap((plan) => plan.held.map((key) => key.locator.toLowerCase()));
            for (const signer of submission.signers) {
                expect(heldLocators, `${roundContext} sent ${signer}`).toContain(signer.toLowerCase());
            }
            expect(new Set(submission.signers.map((s) => s.toLowerCase())).size, roundContext).toBe(
                submission.signers.length
            );
        }

        // (2) Expected errors; every error is typed.
        const unheldFlat = (held: TestKey[]) =>
            pendingEntries.some((entry) => entry.kind === "flat" && !held.includes(entry.key));
        for (const [index, outcome] of outcomes.entries()) {
            const error = errorOf(outcome);
            if (expired) {
                expect(error, roundContext).toBeInstanceOf(TransactionExpiredError);
                continue;
            }
            if (unheldFlat(plans[index].held)) {
                expect(error, roundContext).toBeInstanceOf(InvalidSignerError);
                continue;
            }
            if (error != null) {
                expectTyped(error);
                // Allowed: a landing failure, or (in parallel) the API's 409 for a flat entry another call signed first.
                const allowed = landingFails || (parallel && isAlreadySubmitted(error));
                expect(allowed, `${roundContext} unexpected ${describeError(error)}`).toBe(true);
            }
        }
        if (expired) {
            expect(sent, roundContext).toHaveLength(0);
            count("expired");
            return;
        }

        // (3) Update the model: every held pending member signs (D3), every held flat entry signs.
        // A submission the API rejected (the 409 for a flat entry another call signed first) counts for nothing: the
        // API drops the whole batch, the member signatures in it included.
        const rejected = (index: number) => isAlreadySubmitted(errorOf(outcomes[index]));
        const signingPlans = plans.filter((plan, index) => !unheldFlat(plan.held) && !rejected(index));
        for (const plan of signingPlans) {
            for (const entry of pendingEntries) {
                if (entry.kind === "flat") {
                    if (plan.held.includes(entry.key)) {
                        entry.signed = true;
                    }
                } else {
                    for (const member of entry.members) {
                        if (plan.held.includes(member)) {
                            entry.signed.add(member);
                        }
                    }
                }
            }
        }
        // Sequential rounds: each held key signs exactly once per entry it was pending in (a member never signs twice).
        if (!parallel) {
            const plan = plans[0];
            const failed = errorOf(outcomes[0]) != null;
            for (const key of topology.keys) {
                const expectedSigns = !plan.held.includes(key)
                    ? 0
                    : pendingBefore.filter((entry) => entry.unsigned.includes(key)).length;
                const signed = key.signCount() - (signsBefore.get(key) ?? 0);
                const message = `${roundContext} ${name(key)} signed ${signed}, expected ${expectedSigns}`;
                if (failed) {
                    expect(signed, message).toBeLessThanOrEqual(expectedSigns);
                } else {
                    expect(signed, message).toBe(expectedSigns);
                }
            }
        }

        // (4) The fake agrees with the model; the request completes exactly when every entry is done.
        const shouldComplete = entries.every(entryDone);
        const request = env.fake.requests.get(requestId) as Any;
        const completed =
            ["pending", "success"].includes(request.status) || (landingFails && request.status === "failed");
        expect(completed, `${roundContext} status=${request.status}`).toBe(shouldComplete);
        for (const entry of entries) {
            if (entry.kind !== "quorum") {
                continue;
            }
            const stored = [...request.pending, ...request.submitted].find(
                (candidate: Any) => candidate.kind === "quorum" && candidate.quorum.locator === entry.locator
            );
            expect(stored.remaining, roundContext).toBe(Math.max(0, entry.threshold - entry.signed.size));
            const storedMembers = stored.submitted.map((s: Any) => s.member.locator.toLowerCase());
            expect(new Set(storedMembers).size, `${roundContext} a member counted twice`).toBe(storedMembers.length);
            expect(storedMembers.length, `${roundContext} threshold overcounted`).toBeLessThanOrEqual(entry.threshold);
        }

        // (5) Result shapes: the landed value once every entry is done, the unsigned shape before.
        const values = outcomes.filter((o): o is { value: Any } => "value" in o).map((o) => o.value);
        for (const value of values) {
            if (isSignature) {
                expect(value.signatureId, roundContext).toBe(requestId);
                if (!shouldComplete) {
                    expect(value, roundContext).toEqual({ signature: undefined, signatureId: requestId });
                }
            } else {
                expect(value.transactionId, roundContext).toBe(requestId);
                if (!shouldComplete) {
                    expect(value, roundContext).toEqual({
                        hash: undefined,
                        explorerLink: undefined,
                        transactionId: requestId,
                    });
                }
            }
        }
        if (shouldComplete && !landingFails) {
            const finished = values.filter((value) => (isSignature ? value.signature != null : value.hash != null));
            if (values.length > 0) {
                expect(finished.length, `${roundContext} landed but no approve() returned it`).toBeGreaterThan(0);
            }
            if (!parallel) {
                expect(finished.length, roundContext).toBe(values.length);
            }
        }
        if (shouldComplete && landingFails) {
            // The completing call reports the failed landing; none reports success.
            expect(
                values.filter((value) => value.hash != null),
                roundContext
            ).toHaveLength(0);
            if (!parallel) {
                expect(errorOf(outcomes[0]), roundContext).not.toBeNull();
            }
        }
        done = shouldComplete;
        count(parallel ? "parallel rounds" : "sequential rounds");
        for (const outcome of outcomes) {
            count(errorOf(outcome) == null ? "ok approve" : `error ${(errorOf(outcome) as Error).constructor.name}`);
        }
    }
    count(done ? (landingFails ? "landing failed" : "landed") : "not landed");
    count(`${entries.length} entries`);
}

describe.each(CHAINS)("random topologies, devices and orders on %s", (chain) => {
    it("keeps every approval invariant", async () => {
        await forEachSeed(stressRuns(200), async (runSeed) => {
            env.dispose();
            env = stressEnv(runSeed);
            devices = tagDevices(env.fake);
            await randomApprovalRun(runSeed, chain);
        });
        console.info(`[approvals] ${chain} stats`, JSON.stringify(stats));
    }, 120_000);
});

// ---------------------------------------------------------------------------------------------------------------------
// Findings. `it.fails` keeps the file green while the behavior stands; each states the expected behavior.
// `SHOW_BUGS=1` runs them as plain tests, to see each one fail on its own assertion.
// ---------------------------------------------------------------------------------------------------------------------

const bugIt = process.env.SHOW_BUGS ? it : it.fails;

describe("BUG candidates (approvals)", () => {
    const chain = "base-sepolia";

    // signer-manager.ts `withStandInSigner` → `#withHeldKey` → `#withActiveSigner` sets the selected key as the wallet's
    // active signer for the whole approve() call, so any call running meanwhile on the same instance sees it.
    bugIt(
        "BUG: a send() running while a stand-in approve() is in flight signs with the useRecoveryMethod key",
        async () => {
            const [recovery, alice, bob] = [env.key(chain), env.key(chain), env.key(chain)];
            await drive(
                deviceSdk(env, "creator").createWallet({
                    chain,
                    recoveryMethods: [recovery.config, quorumOf([alice, bob], 2)],
                } as Any)
            );
            const aliceDevice = await memberDevice("alice", chain, alice, "useSigner");
            const prepared = await drive(aliceDevice.send(recipientFor(chain, env.rng), "usdc", "1"));
            const device = await walletOn("device", chain);
            await drive(device.useRecoveryMethod(recovery.config));
            // Alone, send() has no signer: useRecoveryMethod does not select one for transactions.
            expect(errorOf(await settle(device.send(recipientFor(chain, env.rng), "usdc", "1")))).not.toBeNull();

            const [, sent] = await Promise.all([
                settle(device.approve({ transactionId: prepared.transactionId })),
                settle(device.send(recipientFor(chain, env.rng), "usdc", "1")),
            ]);

            expect(errorOf(sent)).not.toBeNull();
            expect(recovery.signCount()).toBe(0);
        }
    );

    // signer-manager.ts `#withActiveSigner` restores the signer it saved on entry in `finally`, overwriting a
    // useSigner() made in between.
    bugIt(
        "BUG: useSigner() made while a stand-in approve() is in flight is undone when the approve() returns",
        async () => {
            const { members } = await quorumWallet(chain, 3, 2);
            const [alice, bob, carol] = members;
            const aliceDevice = await memberDevice("alice", chain, alice, "useSigner");
            const prepared = await drive(aliceDevice.send(recipientFor(chain, env.rng), "usdc", "1"));
            const device = await memberDevice("device", chain, bob, "useRecoveryMethod");

            const approving = device.approve({ transactionId: prepared.transactionId });
            await vi.advanceTimersByTimeAsync(10);
            await drive(device.useSigner(carol.config));
            expect(device.signer?.locator()).toBe(carol.locator);
            await drive(approving);

            expect(device.signer?.locator()).toBe(carol.locator);
        }
    );

    // api/client.ts `approveSignature` re-reads the signature on any 422 (transactions only on "Already has the required
    // number of approvals"), so the API's 422 for a member pending in two quorums is dropped and approveSignatureAndWait
    // returns the unsigned shape. The same approval of a transaction throws TransactionFailedError.
    // FIXED in E1 (3b599c44): kept as a regression test.
    it("FIXED: approve({ signatureId }) throws the API's 422 rejection instead of reporting a signature still awaiting approval", async () => {
        const [shared, bob, carol] = [env.key(chain), env.key(chain), env.key(chain)];
        const created = await drive(
            deviceSdk(env, "creator").createWallet({
                chain,
                recoveryMethods: [quorumOf([shared, bob], 2), quorumOf([shared, carol], 2)],
            } as Any)
        );
        const [first, second] = quorumRecords(env.fake, created.address).recovery;
        const device = EVMWallet.from(await memberDevice("device", chain, shared, "useSigner"));
        const transaction = await drive(
            device.send(recipientFor(chain, env.rng), "usdc", "1", { signer: first.locator } as Any)
        );
        addPendingEntry(env.fake, transaction.transactionId, second, env.rng);
        const signature = await drive(device.signMessage({ message: "hi", options: { signer: first.locator } } as Any));
        addPendingEntry(env.fake, signature.signatureId as string, second, env.rng);

        const forTransaction = await settle(device.approve({ transactionId: transaction.transactionId }));
        const forSignature = await settle(device.approve({ signatureId: signature.signatureId as string }));

        expect(errorOf(forTransaction)).toBeInstanceOf(TransactionFailedError);
        expect(submittedApprovals(env.fake, devices).map((approval) => approval.status)).toEqual([422, 422]);
        expect(errorOf(forSignature)).toBeInstanceOf(SignatureFailedError);
    });

    // wallet.ts `#actingRoleLocator` passes every delegated quorum of the wallet config to resolveActingRole, whatever
    // chain it is installed on (`isRegisteredSigner` checks `isSignerOnChain`, the quorums do not).
    bugIt(
        "BUG: a delegated quorum installed on another EVM chain makes a recovery-quorum member's send ambiguous",
        async () => {
            const [recovery, alice, bob, carol] = [env.key(chain), env.key(chain), env.key(chain), env.key(chain)];
            const created = await drive(
                deviceSdk(env, "creator").createWallet({
                    chain,
                    recoveryMethods: [recovery.config, quorumOf([alice, bob], 2)],
                } as Any)
            );
            const recoveryQuorum = quorumRecords(env.fake, created.address).recovery[0];
            const amoy = await drive(deviceSdk(env, "amoy").getWallet({ chain: "polygon-amoy" } as Any));
            await drive(amoy.useRecoveryMethod(recovery.config));
            await drive(amoy.addSigner(quorumOf([alice, carol], 2) as Any));
            const delegated = env.fake.renderedWallet(created.address).config.delegatedSigners[0];
            expect(Object.keys(delegated.chains)).toEqual(["polygon-amoy"]);

            const device = await memberDevice("device", chain, alice, "useSigner");
            const sent = await settle(device.send(recipientFor(chain, env.rng), "usdc", "1"));

            expect(errorOf(sent)).toBeNull();
            expect(env.fake.callsTo("send").at(-1)?.body.signer).toBe(recoveryQuorum.locator);
        }
    );

    // evm.ts (and stellar.ts) constructor copies the selected member (`recoveryMember`) but not `#selectedRecovery`, so
    // the copy has no stand-in key; require() then throws a plain Error.
    bugIt(
        "BUG: EVMWallet.from() drops a flat useRecoveryMethod selection, so its approve() has no key to sign with",
        async () => {
            const [first, second] = [env.key(chain), env.key(chain)];
            await drive(
                deviceSdk(env, "creator").createWallet({ chain, recoveryMethods: [first.config, second.config] } as Any)
            );
            const secondDevice = await memberDevice("second", chain, second, "useSigner");
            const prepared = await drive(
                secondDevice.send(recipientFor(chain, env.rng), "usdc", "1", { prepareOnly: true })
            );
            const device = await memberDevice("device", chain, second, "useRecoveryMethod");

            const outcome = await settle(EVMWallet.from(device).approve({ transactionId: prepared.transactionId }));

            expect(errorOf(outcome)).toBeNull();
            expect(second.signCount()).toBe(1);
        }
    );

    // wallet.ts `approve` has no in-flight dedupe (recover() has one): each call reads the request and signs every held
    // pending member. The API ignores the resubmission, but the key is asked to sign twice.
    bugIt("BUG: two approve() calls in parallel on one wallet sign the same member entry twice", async () => {
        const { members } = await quorumWallet(chain, 3, 2);
        const aliceDevice = await memberDevice("alice", chain, members[0], "useSigner");
        const prepared = await drive(aliceDevice.send(recipientFor(chain, env.rng), "usdc", "1"));
        const device = await memberDevice("device", chain, members[1], "useSigner");

        await drive(
            Promise.all([
                device.approve({ transactionId: prepared.transactionId }),
                device.approve({ transactionId: prepared.transactionId }),
            ])
        );

        expect(members[1].signCount()).toBe(1);
    });

    // wallet.ts `executeApproveTransactionWithErrorHandling` throws TransactionFailedError for any error body; the
    // client (api/client.ts `approveTransaction`) re-reads only on the 422 "Already has the required number of
    // approvals". With a second entry still pending the API answers a lost race with a 409 (flat signer already
    // submitted) or a 400 (member of a quorum entry another call completed) and drops the whole batch.
    bugIt(
        "BUG: losing an approval race on a request with two pending entries throws and drops the batch's other approvals",
        async () => {
            const recovery = env.key(chain);
            const members = [env.key(chain), env.key(chain), env.key(chain)];
            await drive(
                deviceSdk(env, "creator").createWallet({
                    chain,
                    recoveryMethods: [recovery.config, quorumOf(members, 2)],
                } as Any)
            );
            const aliceDevice = await memberDevice("alice", chain, members[0], "useSigner");
            const prepared = await drive(aliceDevice.send(recipientFor(chain, env.rng), "usdc", "1"));
            addPendingEntry(env.fake, prepared.transactionId, flatIdentity(recovery), env.rng);
            const fast = await memberDevice("fast", chain, recovery, "useSigner");
            const slow = await memberDevice("slow", chain, members[1], "useSigner");

            const [, fromSlow] = await Promise.all([
                settle(fast.approve({ transactionId: prepared.transactionId })),
                settle(
                    slow.approve({
                        transactionId: prepared.transactionId,
                        options: { additionalSigners: [adapterFor(chain, recovery)] },
                    })
                ),
            ]);

            expect(errorOf(fromSlow)).toBeNull();
            const entry = (env.fake.requests.get(prepared.transactionId) as Any).pending[0];
            expect(entry.remaining).toBe(1);
        }
    );

    // operation-poller.ts `waitForTransactionOutcome` throws TransactionNotAvailableError for any response with an
    // `error` field before it checks `status === "failed"`, and a transaction that failed to land carries one
    // (openapi `error.reason: "failed_to_land_on_chain"`): TransactionSendingFailedError is unreachable. A later approve()
    // gets the same from wallet.ts `approveTransactionInternal` (`"error" in transaction`).
    bugIt(
        "BUG: the approve() that completes a quorum whose transaction fails to land throws TransactionNotAvailableError",
        async () => {
            const { members } = await quorumWallet(chain, 3, 1);
            const aliceDevice = await memberDevice("alice", chain, members[0], "useSigner");
            const prepared = await drive(aliceDevice.send(recipientFor(chain, env.rng), "usdc", "1"));
            env.fake.failNextLandings = 1;

            const completing = await settle(aliceDevice.approve({ transactionId: prepared.transactionId }));
            const bob = await memberDevice("bob", chain, members[1], "useSigner");
            const later = await settle(bob.approve({ transactionId: prepared.transactionId }));

            expect(env.fake.renderedRequest(prepared.transactionId).error.reason).toBe("failed_to_land_on_chain");
            expect(errorOf(completing)).toBeInstanceOf(TransactionSendingFailedError);
            expect(errorOf(later)).not.toBeInstanceOf(TransactionNotAvailableError);
        }
    );
});

describe("FAKE notes (not SDK bugs)", () => {
    // fake-api.ts `approve` checks a member's resubmission, then awaits signature verification, then commits: two
    // overlapping submissions of one member both pass the check and both decrement `remaining`. The real API is
    // assumed to apply one submission at a time per request; this suite queues approval POSTs (tagDevices).
    bugIt("FAKE: without queued approval POSTs, one member's two overlapping submissions both count", async () => {
        devices = tagDevices(env.fake, { serializeApprovals: false });
        const { members } = await quorumWallet("base-sepolia", 3, 2);
        const aliceDevice = await memberDevice("alice", "base-sepolia", members[0], "useSigner");
        const prepared = await drive(aliceDevice.send(recipientFor("base-sepolia", env.rng), "usdc", "1"));
        const device = await memberDevice("device", "base-sepolia", members[1], "useSigner");

        await drive(
            Promise.all([
                device.approve({ transactionId: prepared.transactionId }),
                device.approve({ transactionId: prepared.transactionId }),
            ])
        );

        expect(env.fake.renderedRequest(prepared.transactionId).status).toBe("awaiting-approval");
    });
});
