/**
 * Helpers for the m7 approvals stress suite: devices told apart through the JWT, random wallet topologies with flat and
 * quorum recovery methods and delegated signers, and direct edits of the fake's pending entries (mixed requests).
 *
 * Throwaway m7 code. Wraps the fake (never edits it): `tagDevices` re-stubs `fetch` with a wrapper that strips the
 * device tag from the JWT and records which device made each call.
 */
import { vi } from "vitest";
import type { FakeWalletsApi, QuorumRecord, Identity } from "./fake-api";
import { assembleSigner } from "../../signers";
import type { SignerAdapter } from "../../signers/types";
import type { Rng, StressEnv, TestKey } from "./harness";

// biome-ignore lint/suspicious/noExplicitAny: throwaway stress code
type Any = any;

export const USER = "stress-user";

/** Device of each fake call (by `seq`), from the `#<device>` suffix of the JWT. */
export type DeviceLog = Map<number, string>;

/**
 * Re-stubs `fetch` so `stress-user#<device>` JWTs reach the fake as `stress-user` (one user, one wallet), recording the
 * device of each call. The fake pushes its call log entry synchronously, before its first await.
 */
export function tagDevices(fake: FakeWalletsApi, { serializeApprovals = true } = {}): DeviceLog {
    const log: DeviceLog = new Map();
    // ASSUMPTION: the API applies one approval submission at a time per request (a row lock). The fake checks a
    // member's resubmission before an `await` (signature verification) and commits after it, so two submissions of the
    // same member that overlap there are both counted. Approval POSTs are queued here unless a test asks otherwise.
    let approvals: Promise<unknown> = Promise.resolve();
    const wrapped = (input: Any, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        const auth = headers.get("authorization") ?? "";
        const match = /^Bearer ([^#]+)#(.+)$/.exec(auth);
        let device = "untagged";
        if (match != null) {
            device = match[2];
            headers.set("authorization", `Bearer ${match[1]}`);
        }
        const run = () => {
            const before = fake.calls.length;
            const response = fake.fetch(input, { ...init, headers });
            const call = fake.calls[before];
            if (call != null) {
                log.set(call.seq, device);
            }
            return response;
        };
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (serializeApprovals && (init?.method ?? "GET").toUpperCase() === "POST" && /\/approvals$/.test(url)) {
            const next = approvals.then(run, run);
            approvals = next.catch(() => undefined);
            return next;
        }
        return run();
    };
    vi.stubGlobal("fetch", wrapped);
    return log;
}

export function deviceSdk(env: StressEnv, device: string) {
    return env.sdk({ jwt: `${USER}#${device}` });
}

/** A SignerAdapter for `key`, as `additionalSigners` takes it. */
export function adapterFor(chain: string, key: TestKey): SignerAdapter {
    return assembleSigner(chain as Any, { ...key.config, locator: key.locator } as Any);
}

// ---------------------------------------------------------------------------------------------------------------------
// Topologies
// ---------------------------------------------------------------------------------------------------------------------

export type QuorumSpec = { members: TestKey[]; threshold: number };

export type Topology = {
    chain: "base-sepolia" | "stellar";
    keys: TestKey[];
    recoveryFlat: TestKey[];
    recoveryQuorums: QuorumSpec[];
    delegatedFlat: TestKey[];
    delegatedQuorums: QuorumSpec[];
};

function randomQuorum(random: Rng, keys: TestKey[]): QuorumSpec {
    const size = random.int(2, Math.min(4, keys.length));
    const members = random.shuffle(keys).slice(0, size);
    return { members, threshold: random.int(1, size) };
}

const compositionKey = (spec: QuorumSpec) =>
    `${spec.threshold}:${spec.members
        .map((member) => member.locator.toLowerCase())
        .sort()
        .join(",")}`;

/** A random wallet shape the fake accepts: 1+ recovery methods, quorums overlap, keys sit in several roles. */
export function randomTopology(env: StressEnv, random: Rng, chain: Topology["chain"]): Topology {
    const keys = Array.from({ length: random.int(3, 6) }, () => env.key(chain));
    const recoveryFlat = random.bool(0.4) ? random.shuffle(keys).slice(0, random.int(1, 2)) : [];
    const recoveryQuorums: QuorumSpec[] = [];
    const quorumCount = random.int(recoveryFlat.length === 0 ? 1 : 0, 2);
    const seen = new Set<string>();
    for (let i = 0; i < quorumCount; i++) {
        const spec = randomQuorum(random, keys);
        if (seen.has(compositionKey(spec))) {
            continue;
        }
        seen.add(compositionKey(spec));
        recoveryQuorums.push(spec);
    }
    if (recoveryFlat.length === 0 && recoveryQuorums.length === 0) {
        recoveryQuorums.push(randomQuorum(random, keys));
    }
    const notRecovery = keys.filter((key) => !recoveryFlat.includes(key));
    const delegatedFlat = random.bool(0.4) && notRecovery.length > 0 ? random.shuffle(notRecovery).slice(0, 1) : [];
    const delegatedQuorums: QuorumSpec[] = [];
    const delegatedCount = random.int(0, 2);
    for (let i = 0; i < delegatedCount; i++) {
        delegatedQuorums.push(randomQuorum(random, keys));
    }
    return { chain, keys, recoveryFlat, recoveryQuorums, delegatedFlat, delegatedQuorums };
}

export function describeTopology(topology: Topology): string {
    const name = (key: TestKey) => `k${topology.keys.indexOf(key)}`;
    const quorum = (spec: QuorumSpec) => `${spec.threshold}-of-[${spec.members.map(name).join(",")}]`;
    return [
        `chain=${topology.chain}`,
        `recoveryFlat=[${topology.recoveryFlat.map(name).join(",")}]`,
        `recoveryQuorums=[${topology.recoveryQuorums.map(quorum).join(" ")}]`,
        `delegatedFlat=[${topology.delegatedFlat.map(name).join(",")}]`,
        `delegatedQuorums=[${topology.delegatedQuorums.map(quorum).join(" ")}]`,
    ].join(" ");
}

export function quorumConfig(spec: QuorumSpec) {
    return { type: "quorum" as const, threshold: spec.threshold, members: spec.members.map((key) => key.config) };
}

export function createArgs(topology: Topology) {
    return {
        chain: topology.chain,
        recoveryMethods: [
            ...topology.recoveryFlat.map((key) => key.config),
            ...topology.recoveryQuorums.map(quorumConfig),
        ],
        ...(topology.delegatedFlat.length + topology.delegatedQuorums.length > 0
            ? {
                  signers: [
                      ...topology.delegatedFlat.map((key) => key.config),
                      ...topology.delegatedQuorums.map(quorumConfig),
                  ],
              }
            : {}),
    };
}

/** The fake's quorum records of the wallet, recovery first, in the order the topology lists them. */
export function quorumRecords(fake: FakeWalletsApi, address: string) {
    const wallet = fake.walletByAddress(address);
    if (wallet == null) {
        throw new Error("no wallet");
    }
    const recovery = wallet.recovery.filter((entry): entry is QuorumRecord => entry.type === "quorum");
    const delegated = wallet.delegated
        .filter((record) => !record.deleted && record.identity.type === "quorum")
        .map((record) => record.identity as QuorumRecord);
    return { recovery, delegated, all: [...recovery, ...delegated] };
}

// ---------------------------------------------------------------------------------------------------------------------
// The role a held key acts as, per EDD 007 §7 "Role" (transaction scope)
// ---------------------------------------------------------------------------------------------------------------------

export type ExpectedRole =
    | { kind: "self"; locator: string }
    | { kind: "quorum"; locator: string }
    | { kind: "ambiguous" }
    | { kind: "unknown" };

const sameKey = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

export function expectedRole(
    topology: Topology,
    records: ReturnType<typeof quorumRecords>,
    key: TestKey
): ExpectedRole {
    if (topology.recoveryFlat.includes(key)) {
        return { kind: "self", locator: key.locator };
    }
    if (topology.delegatedFlat.includes(key)) {
        return { kind: "self", locator: key.locator };
    }
    const quorums = records.all.filter((quorum) => quorum.members.some((m) => sameKey(m.locator, key.locator)));
    if (quorums.length > 1) {
        return { kind: "ambiguous" };
    }
    if (quorums.length === 1) {
        return { kind: "quorum", locator: quorums[0].locator };
    }
    return { kind: "unknown" };
}

// ---------------------------------------------------------------------------------------------------------------------
// Direct edits of pending entries (requests that mix flat and quorum entries)
// ---------------------------------------------------------------------------------------------------------------------

function freshMessage(chainType: string, random: Rng): string {
    if (chainType === "stellar") {
        return Buffer.from(random.bytes(32)).toString("base64");
    }
    return random.hex(32);
}

/** Adds a pending entry for `approver` (a flat identity or a quorum record) to a request still awaiting approval. */
export function addPendingEntry(
    fake: FakeWalletsApi,
    requestId: string,
    approver: Identity | QuorumRecord,
    random: Rng
): string {
    const request = fake.requests.get(requestId);
    if (request == null) {
        throw new Error(`no request ${requestId}`);
    }
    const message = freshMessage(request.chainType, random);
    if (approver.type === "quorum") {
        const quorum = approver as QuorumRecord;
        request.pending.push({
            kind: "quorum",
            quorum,
            message,
            threshold: quorum.threshold,
            remaining: quorum.threshold,
            pending: quorum.members.map((member) => ({ member, message })),
            submitted: [],
        } as Any);
    } else {
        request.pending.push({ kind: "flat", signer: approver, message } as Any);
    }
    return message;
}

export function flatIdentity(key: TestKey): Identity {
    return { type: "external-wallet", address: key.address, locator: key.locator };
}

/** Every approval the SDK submitted, with the device that sent it. */
export function submittedApprovals(fake: FakeWalletsApi, devices: DeviceLog, requestId?: string) {
    return fake.calls
        .filter((call) => call.route === "approveTransaction" || call.route === "approveSignature")
        .filter((call) => requestId == null || call.path.includes(`/${requestId}/`))
        .map((call) => ({
            seq: call.seq,
            device: devices.get(call.seq) ?? "untagged",
            status: call.status,
            signers: ((call.body?.approvals ?? []) as Array<{ signer: string }>).map((approval) => approval.signer),
            response: call.response,
        }));
}
