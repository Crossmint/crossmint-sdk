/**
 * m7 stress: signer setups and the default signer. Seeded setups (chain, recovery methods, delegated signers, device key
 * storage, how the caller gets the wallet) go into the fake wallets API; the SDK's default signer, needsRecovery(),
 * signers(), send without useSigner, useSigner / useRecoveryMethod for every key and EVMWallet/StellarWallet/SolanaWallet
 * .from are then checked against the setup.
 *
 * `fingerprint` writes a per-seed outcome summary of quorum-free setups to SETUPS_FINGERPRINT_OUT, for the differential
 * against `main` (run the same file there with `-t fingerprint`).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidSignerError, TransactionNotCreatedError, WalletCreationError } from "../../utils/errors";
import { EVMWallet } from "../../wallets/evm";
import { drive, forEachSeed, rng, settle, stressEnv, stressRuns, stressSeed, useStressTimers } from "./harness";
import {
    buildWorld,
    comparable,
    callerWallet,
    describeSetup,
    fakePasskeyProvider,
    fakeSignerStatuses,
    fakeTeeConnection,
    fromProbes,
    generateSetup,
    isApproved,
    isBadError,
    labelOf,
    outcomeOf,
    sendFrom,
    sendOutcome,
    type SetupKey,
    type Setup,
    type World,
} from "./setups.helpers";

// biome-ignore lint/suspicious/noExplicitAny: throwaway stress code
type Any = any;

beforeEach(() => {
    useStressTimers();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

// ---------------------------------------------------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------------------------------------------------

type Built = { world: World; construct: { value: Any } | { error: unknown } };

async function withWorld<T>(
    seed: number,
    setup: Setup,
    body?: (world: World, wallet: Any) => Promise<T>
): Promise<Built & { result?: T }> {
    const world = await buildWorld(seed, setup);
    try {
        const construct = await settle(callerWallet(world));
        if ("error" in construct || body == null) return { world, construct };
        const result = await body(world, construct.value);
        return { world, construct, result };
    } finally {
        world.env.dispose();
    }
}

type Target = { label: string; config: (world: World) => Any; expect: "accept" | "reject" | "quorum" | "member" };

const flat = (key: SetupKey) => key.kind !== "quorum";

function findKey(world: World, label: string): SetupKey {
    for (const key of [...world.recovery, ...world.delegated, ...world.foreign]) {
        if (key.label === label) return key;
        for (const member of key.members ?? []) if (member.label === label) return member;
    }
    throw new Error(`no key ${label}`);
}

/** Every key the caller might pass to useSigner, with what the SDK should do with it. */
function useSignerTargets(world: World, { quorums }: { quorums: boolean }): Target[] {
    const targets: Target[] = [];
    for (const key of world.recovery.filter(flat)) {
        targets.push({ label: key.label, config: (w) => findKey(w, key.label).full, expect: "accept" });
        if (key.kind === "external-wallet") {
            targets.push({ label: `${key.label}(bare)`, config: (w) => findKey(w, key.label).bare, expect: "reject" });
        }
    }
    for (const key of world.delegated.filter(flat)) {
        targets.push({ label: key.label, config: (w) => findKey(w, key.label).full, expect: "accept" });
    }
    // EVM addresses compare ignoring case (decided): a lowercased address names the same key.
    for (const key of [...world.recovery, ...world.delegated].filter(
        (key) => key.kind === "external-wallet" && world.setup.chain === "base-sepolia"
    )) {
        targets.push({
            label: `${key.label}(lower)`,
            config: (w) => {
                const full = findKey(w, key.label).full;
                return { ...full, address: full.address.toLowerCase() };
            },
            expect: "accept",
        });
    }
    targets.push({ label: "device", config: () => ({ type: "device" }), expect: world.storage ? "accept" : "reject" });
    for (const key of world.foreign) {
        targets.push({ label: key.label, config: (w) => findKey(w, key.label).full, expect: "reject" });
    }
    if (!world.recovery.some((key) => key.kind === "api-key")) {
        targets.push({ label: "F:api-key", config: () => ({ type: "api-key" }), expect: "reject" });
    }
    if (quorums) {
        for (const key of [...world.recovery, ...world.delegated].filter((key) => key.kind === "quorum")) {
            targets.push({ label: key.label, config: (w) => findKey(w, key.label).full, expect: "quorum" });
            for (const member of key.members ?? []) {
                // A member that is also a flat recovery method or registered signer is that, not a member.
                targets.push({ label: member.label, config: (w) => findKey(w, member.label).full, expect: "member" });
            }
        }
    }
    return targets.filter((target, index) => targets.findIndex((other) => other.label === target.label) === index);
}

function useRecoveryTargets(world: World, { quorums }: { quorums: boolean }): Target[] {
    const targets: Target[] = world.recovery
        .filter(flat)
        .map((key) => ({ label: key.label, config: (w: World) => findKey(w, key.label).full, expect: "accept" }));
    const delegated = world.delegated.find(flat);
    if (delegated != null) {
        targets.push({ label: delegated.label, config: (w) => findKey(w, delegated.label).full, expect: "reject" });
    }
    targets.push({ label: "F:external-wallet", config: (w) => findKey(w, "F:external-wallet").full, expect: "reject" });
    if (quorums) {
        for (const key of world.recovery.filter((key) => key.kind === "quorum")) {
            for (const member of key.members ?? []) {
                targets.push({ label: member.label, config: (w) => findKey(w, member.label).full, expect: "member" });
            }
        }
    }
    return targets.filter((target, index) => targets.findIndex((other) => other.label === target.label) === index);
}

/**
 * The default signer `Wallet.initDefaultSigner` should pick (src/wallets/wallet.ts ~288), from the setup alone: the
 * device signer when key storage is given, else the single delegated signer, else the first recovery method that signs
 * alone, when it can be assembled. null = no signer.
 */
function expectedInit(world: World): { active: string | null; needsRecovery: boolean } {
    const { setup, storage, args } = world;
    const statuses = fakeSignerStatuses(world);
    if (storage != null) {
        if (setup.caller === "create") {
            return setup.chain === "solana"
                ? { active: null, needsRecovery: true }
                : { active: labelOf(world, world.deviceLocator), needsRecovery: false };
        }
        if (setup.device === "empty") return { active: null, needsRecovery: true };
        return {
            active: labelOf(world, world.deviceLocator),
            needsRecovery: !isApproved(statuses.get(world.deviceLocator ?? "")),
        };
    }
    const rendered = world.env.fake.renderedWallet(world.address as string).config;
    let initial: Any[] = rendered.delegatedSigners;
    let fromArgs = false;
    if (initial.length === 1 && (initial[0].type === "server" || initial[0].type === "external-wallet")) {
        initial = args.signers ?? [];
        fromArgs = true;
    }
    const singles = initial.filter((signer) => signer.type !== "quorum");
    const callerRecovery: Any[] = args.recoveryMethods ?? (args.recovery != null ? [args.recovery] : []);
    if (singles.length === 0) {
        // The API's order, which is the caller's order on creation.
        const firstSingle = (rendered.recoveryMethods as Any[]).find((entry) => entry.type !== "quorum");
        const recovery =
            firstSingle == null
                ? undefined
                : world.recovery.find((key) =>
                      firstSingle.type === "api-key"
                          ? key.kind === "api-key"
                          : comparable(key.locator) === comparable(firstSingle.locator)
                  );
        if (recovery == null) return { active: null, needsRecovery: false };
        const passed = callerRecovery.find(
            (config) =>
                config.type === recovery.kind &&
                (recovery.kind === "external-wallet"
                    ? config.address === recovery.full.address
                    : recovery.kind === "server"
                      ? config.secret === recovery.full.secret || config.address === recovery.bare.address
                      : true)
        );
        const canSign =
            recovery.kind === "external-wallet"
                ? typeof passed?.onSign === "function"
                : recovery.kind === "server"
                  ? passed?.secret != null
                  : true;
        return { active: canSign ? recovery.label : null, needsRecovery: false };
    }
    if (singles.length > 1) return { active: null, needsRecovery: false };
    const single = singles[0];
    const key = world.delegated.find(
        (k) =>
            k.kind === single.type &&
            (single.locator != null
                ? k.locator.toLowerCase() === single.locator.toLowerCase()
                : JSON.stringify(k.full) === JSON.stringify(single))
    );
    if (single.type === "device") return { active: null, needsRecovery: false };
    const canSign =
        single.type === "external-wallet"
            ? fromArgs && typeof single.onSign === "function"
            : single.type === "server"
              ? fromArgs && single.secret != null
              : true;
    return { active: canSign ? key?.label ?? "?" : null, needsRecovery: false };
}

type ProbeReport = { violations: string[]; lines: string[]; fingerprint: Record<string, unknown> };

/** Runs every probe for one seed; `quorums` turns on quorum setups and quorum-only checks (the stack only). */
async function probeSeed(seed: number, { quorums }: { quorums: boolean }): Promise<ProbeReport> {
    const setup = generateSetup(seed, { quorums });
    const tag = `seed=${seed} ${describeSetup(setup)}`;
    const violations: string[] = [];
    const lines: string[] = [tag];
    const fp: Record<string, unknown> = { seed, setup: describeSetup(setup) };
    const violate = (what: string) => violations.push(`${tag}\n    ${what}`);

    // Construction, the default signer, signers() and a send without useSigner.
    const base = await withWorld(seed, setup, async (world, wallet) => {
        const init = await settle(wallet.waitForInit());
        if ("error" in init) violate(`waitForInit rejected: ${String((init.error as Any)?.message)}`);
        const active = labelOf(world, wallet.signer?.locator());
        const needsRecovery = wallet.needsRecovery();
        fp.active = active;
        fp.activeStatus = wallet.signer?.status ?? null;
        fp.needsRecovery = needsRecovery;
        lines.push(`  init: active=${active} status=${wallet.signer?.status} needsRecovery=${needsRecovery}`);

        if (wallet.signer?.locator()?.startsWith("quorum:")) violate(`a quorum is the active signer`);
        const expected = expectedInit(world);
        if (expected.active !== active || expected.needsRecovery !== needsRecovery) {
            violate(
                `default signer: got active=${active} needsRecovery=${needsRecovery}, expected active=${expected.active} needsRecovery=${expected.needsRecovery}`
            );
        }
        if (world.storage == null && needsRecovery) violate("needsRecovery() without device key storage");

        const listed = await settle(wallet.signers());
        if ("error" in listed) {
            violate(`signers() threw ${String((listed.error as Any)?.message)}`);
            fp.signers = outcomeOf(world, listed, () => "");
        } else {
            const got = (listed.value as Any[])
                .map((signer) => `${labelOf(world, signer.locator)}=${signer.status}`)
                .sort();
            const want = [...fakeSignerStatuses(world).entries()]
                .map(([locator, status]) => `${labelOf(world, locator)}=${status}`)
                .sort();
            fp.signers = got;
            if (JSON.stringify(got) !== JSON.stringify(want)) {
                violate(`signers(): got ${JSON.stringify(got)}, the fake holds ${JSON.stringify(want)}`);
            }
        }

        const callsBefore = world.env.fake.calls.length;
        const keysBefore = world.storage?.keys.size ?? 0;
        const sent = await sendFrom(world, wallet);
        // What the send did on the way: API routes (repeats collapsed) and device keys made.
        fp.sendRoutes = world.env.fake.calls
            .slice(callsBefore)
            .map((call) => `${call.route}${call.status != null && call.status >= 400 ? `:${call.status}` : ""}`)
            .filter((route, index, all) => index === 0 || route !== all[index - 1]);
        fp.sendDeviceKeysMade = (world.storage?.keys.size ?? 0) - keysBefore;
        if ("error" in sent && isBadError(sent.error)) violate(`send threw ${String((sent.error as Any)?.stack)}`);
        if ("error" in sent && String((sent.error as Any)?.message).includes("did not settle")) violate("send hung");
        fp.send = sendOutcome(world, sent);
        fp.afterSend = {
            active: labelOf(world, wallet.signer?.locator()),
            needsRecovery: wallet.needsRecovery(),
        };
        lines.push(`  send: ${fp.send}`);
    });
    fp.construct = outcomeOf(base.world, base.construct, () => "ok");
    lines.push(`  construct: ${fp.construct}`);
    if ("error" in base.construct) {
        if (isBadError(base.construct.error))
            violate(`construct threw ${String((base.construct.error as Any)?.stack)}`);
        const expectedFailure = setup.signersArg === "foreign";
        if (!expectedFailure) violate(`construct failed: ${fp.construct}`);
        if (expectedFailure && !(base.construct.error instanceof WalletCreationError)) {
            violate(`construct with a foreign signer: ${fp.construct}`);
        }
        return { violations, lines, fingerprint: fp };
    }
    if (setup.signersArg === "foreign") violate("construct with a foreign signer succeeded");

    // useSigner for each key, then a send.
    const useSignerOut: Record<string, string> = {};
    for (const target of useSignerTargets(base.world, { quorums })) {
        await withWorld(seed, setup, async (world, wallet) => {
            const config = target.config(world);
            const used = await settle(wallet.useSigner(config));
            if ("error" in used) {
                const error = used.error as Any;
                useSignerOut[target.label] = outcomeOf(world, used, () => "");
                if (isBadError(error)) violate(`useSigner(${target.label}) threw ${error?.stack}`);
                if (target.expect === "accept" || target.expect === "member") {
                    violate(`useSigner(${target.label}) rejected: ${useSignerOut[target.label]}`);
                }
                if (target.expect === "quorum" && !(error instanceof InvalidSignerError)) {
                    violate(`useSigner(${target.label}) with a quorum: ${useSignerOut[target.label]}`);
                }
                return;
            }
            const active = labelOf(world, wallet.signer?.locator());
            if (target.expect === "reject" || target.expect === "quorum") {
                violate(`useSigner(${target.label}) accepted a key it should reject (active=${active})`);
            }
            if (wallet.signer?.locator()?.startsWith("quorum:")) violate(`useSigner(${target.label}): quorum active`);
            if (
                target.label !== "device" &&
                !target.label.endsWith("(bare)") &&
                active !== target.label.replace("(lower)", "")
            ) {
                violate(`useSigner(${target.label}): active is ${active}`);
            }
            if (target.label !== "device" && wallet.needsRecovery()) {
                violate(`useSigner(${target.label}): needsRecovery() still true`);
            }
            if (target.label === "device") {
                const status = fakeSignerStatuses(world).get(wallet.signer?.locator() ?? "");
                if (wallet.needsRecovery() === isApproved(status)) {
                    violate(
                        `useSigner(device): needsRecovery()=${wallet.needsRecovery()} for a device signer whose status is ${status}`
                    );
                }
            }
            const sent = await sendFrom(world, wallet);
            if ("error" in sent && isBadError(sent.error)) {
                violate(`send after useSigner(${target.label}) threw ${(sent.error as Any)?.stack}`);
            }
            const sentOutcome = sendOutcome(world, sent);
            // A key that is only a quorum member acts as its quorum (prepared, unsigned); any other key signs itself.
            if (target.expect === "accept" && sentOutcome === "prepared") {
                violate(`send after useSigner(${target.label}) was prepared, not signed`);
            }
            if (target.expect === "member" && sentOutcome === "landed") {
                violate(`send after useSigner(${target.label}) (a member only) landed without its quorum`);
            }
            useSignerOut[target.label] =
                `ok active=${active} needsRecovery=${wallet.needsRecovery()} send=${sentOutcome}`;
        });
    }
    fp.useSigner = useSignerOut;

    // useSigner(a) then useSigner(b): the second choice wins, its role included (stack sweep only).
    if (quorums) {
        const accepted = useSignerTargets(base.world, { quorums }).filter(
            (target) =>
                (target.expect === "accept" || target.expect === "member") &&
                target.label !== "device" &&
                useSignerOut[target.label]?.startsWith("ok")
        );
        const chainRandom = rng(seed).fork("chain");
        for (let i = 0; i < Math.min(3, accepted.length); i++) {
            const [first, second] = [chainRandom.pick(accepted), chainRandom.pick(accepted)];
            await withWorld(seed, setup, async (world, wallet) => {
                await settle(wallet.useSigner(first.config(world)));
                const used = await settle(wallet.useSigner(second.config(world)));
                if ("error" in used) {
                    violate(`useSigner(${first.label}) then useSigner(${second.label}) rejected the second`);
                    return;
                }
                const active = labelOf(world, wallet.signer?.locator());
                if (active !== second.label.replace("(lower)", "")) {
                    violate(`useSigner(${first.label}) then useSigner(${second.label}): active is ${active}`);
                }
                const sent = sendOutcome(world, await sendFrom(world, wallet));
                const alone = useSignerOut[second.label].replace(/.*send=/, "");
                if (sent !== alone) {
                    violate(
                        `useSigner(${first.label}) then useSigner(${second.label}): send ${sent}, but ${alone} with ${second.label} alone`
                    );
                }
            });
        }
    }
    for (const [label, out] of Object.entries(useSignerOut)) lines.push(`  useSigner(${label}): ${out}`);

    // useRecoveryMethod for each recovery method, a delegated key and a foreign key.
    const useRecoveryOut: Record<string, string> = {};
    for (const target of useRecoveryTargets(base.world, { quorums })) {
        await withWorld(seed, setup, async (world, wallet) => {
            const used = await settle(wallet.useRecoveryMethod(target.config(world)));
            useRecoveryOut[target.label] = outcomeOf(world, used, () => "ok");
            if ("error" in used) {
                if (isBadError(used.error))
                    violate(`useRecoveryMethod(${target.label}) threw ${(used.error as Any)?.stack}`);
                if (target.expect !== "reject")
                    violate(`useRecoveryMethod(${target.label}): ${useRecoveryOut[target.label]}`);
            } else if (target.expect === "reject") {
                violate(`useRecoveryMethod(${target.label}) accepted a key that is no recovery method`);
            }
        });
    }
    fp.useRecoveryMethod = useRecoveryOut;
    for (const [label, out] of Object.entries(useRecoveryOut)) lines.push(`  useRecoveryMethod(${label}): ${out}`);

    // EVMWallet.from / StellarWallet.from / SolanaWallet.from.
    const fromOut: Record<string, string> = {};
    await withWorld(seed, setup, async (world, wallet) => {
        for (const probe of fromProbes(setup.chain)) {
            let made: Any;
            try {
                made = probe.from(wallet);
            } catch (error) {
                fromOut[probe.name] = outcomeOf(world, { error }, () => "");
                if (isBadError(error)) violate(`${probe.name}.from threw ${(error as Any)?.stack}`);
                if (probe.matches) violate(`${probe.name}.from rejected its own chain's wallet`);
                continue;
            }
            if (!probe.matches) {
                // The test setup (src/wallets/__tests__/setup.ts) mocks isValidSolanaAddress as "30 to 45 chars", so
                // an EVM address passes SolanaWallet.from here; the real check is not exercised.
                if (!(probe.name === "SolanaWallet" && setup.chain === "base-sepolia")) {
                    violate(`${probe.name}.from accepted a ${setup.chain} wallet`);
                }
                fromOut[probe.name] = "ok (wrong chain)";
                continue;
            }
            const now = made.needsRecovery();
            const init = await settle(made.waitForInit());
            if ("error" in init) violate(`${probe.name}.from: waitForInit rejected`);
            const after = made.needsRecovery();
            const same = made.signer === wallet.signer;
            fromOut[probe.name] =
                `ok sameSigner=${same} needsRecovery now=${now} afterInit=${after} base=${wallet.needsRecovery()}`;
            if (!same) violate(`${probe.name}.from changed the active signer`);
            if (after !== wallet.needsRecovery()) {
                violate(
                    `${probe.name}.from: needsRecovery()=${after}, the wallet it came from says ${wallet.needsRecovery()}`
                );
            }
        }
    });
    fp.from = fromOut;
    for (const [name, out] of Object.entries(fromOut)) lines.push(`  ${name}.from: ${out}`);
    return { violations, lines, fingerprint: fp };
}

// Behaviors that are known findings (reported as BUG repros below), so the sweep does not re-report them.
const KNOWN = [
    // BUG: EVMWallet/StellarWallet/SolanaWallet.from loses needsRecovery() when it carries a pending device signer.
    /\.from: needsRecovery\(\)=false, the wallet it came from says true/,
    // BUG: createWallet with a server recovery method given by address (no secret) throws a TypeError.
    /recovery:bare[\s\S]*construct (threw|failed|with a foreign signer).*reading 'startsWith'/,
    // BUG: useSigner({ type: "device" }) with a pending or unregistered local key leaves needsRecovery() false.
    /useSigner\(device\): needsRecovery\(\)=false for a device signer whose status is/,
    // BUG: useSigner with a lowercased EVM address of a registered signer or the recovery method: "not registered".
    /useSigner\(\S+\(lower\)\) rejected: throws Error: Signer .* is not registered in this wallet/,
    // BUG: getWallet with a passkey recovery method other than the first passkey one throws WalletCreationError.
    /recovery=\[[^\]]*passkey[^\]]*passkey[\s\S]*construct failed: throws WalletCreationError: Wallet signer configuration mismatch at \\?"id\\?"/,
];

const isKnown = (violation: string) => KNOWN.some((pattern) => pattern.test(violation));

describe("signer setups on the stack (quorums included)", () => {
    it("default signer, needsRecovery, signers(), send, useSigner, useRecoveryMethod and from() hold for every setup", async () => {
        const all: string[] = [];
        const verbose = process.env.STRESS_VERBOSE === "1";
        await forEachSeed(stressRuns(400), async (seed) => {
            const report = await probeSeed(seed, { quorums: true });
            if (verbose) console.info(report.lines.join("\n"));
            all.push(...report.violations.filter((violation) => !isKnown(violation)));
        });
        expect(all).toEqual([]);
    }, 600_000);
});

describe("fingerprint", () => {
    it("writes the per-seed outcome fingerprint of quorum-free setups", async () => {
        const out = process.env.SETUPS_FINGERPRINT_OUT;
        const first = process.env.SETUPS_FINGERPRINT_SEED != null ? Number(process.env.SETUPS_FINGERPRINT_SEED) : 1000;
        const runs = stressRuns(200);
        const prints: Record<string, unknown>[] = [];
        for (let i = 0; i < runs; i++) {
            const report = await probeSeed(first + i, { quorums: false });
            prints.push(report.fingerprint);
        }
        if (out != null && out !== "") {
            mkdirSync(dirname(out), { recursive: true });
            writeFileSync(out, `${JSON.stringify(prints, null, 2)}\n`);
        }
        expect(prints).toHaveLength(runs);
    }, 600_000);
});

// ---------------------------------------------------------------------------------------------------------------------
// Findings: minimal deterministic repros. `it.fails` keeps the file green while the behavior stands.
// ---------------------------------------------------------------------------------------------------------------------

const options = (storage?: Any) => ({
    clientTEEConnection: fakeTeeConnection(),
    passkeyProvider: fakePasskeyProvider(),
    callbacks: { onAuthRequired: async () => {} },
    ...(storage != null ? { deviceSignerKeyStorage: storage } : {}),
});
const devicePublicKey = (publicKeyBase64: string) => {
    const bytes = Buffer.from(publicKeyBase64, "base64");
    return {
        type: "device",
        publicKey: {
            x: `0x${bytes.subarray(1, 33).toString("hex")}`,
            y: `0x${bytes.subarray(33, 65).toString("hex")}`,
        },
        name: "Stress Test Device",
    };
};
// A wallet whose recovery methods are `recovery` (raw API input), created without the SDK.
async function rawWallet(env: Any, chain: string, recovery: Any[], delegatedSigners: Any[] = []) {
    const chainType = chain === "solana" ? "solana" : chain === "stellar" ? "stellar" : "evm";
    const created: Any = await env.client().createWallet({
        type: "smart",
        chainType,
        config: { recoveryMethods: recovery, delegatedSigners },
    });
    expect(created.error).toBeUndefined();
    return created.address as string;
}
// This device's key, registered and left pending on `approver`'s approval.
async function pendingDevice(env: Any, chain: string, address: string, approver: string) {
    const storage = env.device();
    const publicKeyBase64 = await storage.generateKey({ address });
    const registered: Any = await env.client().registerSigner(`me:${chain === "base-sepolia" ? "evm" : chain}:smart`, {
        signer: devicePublicKey(publicKeyBase64),
        ...(chain === "base-sepolia" ? { chain } : {}),
        approver,
    });
    expect(registered.error).toBeUndefined();
    return { storage, locator: `device:${publicKeyBase64}` };
}

// SETUPS_BUGS_AS_IT=1 runs the repros as plain tests, to read why each one fails.
const bug = process.env.SETUPS_BUGS_AS_IT === "1" ? it : it.fails;

describe("BUG repros", () => {
    const SEED = 4242;
    // device-recovery-service.ts #resumePendingDeviceSignerApproval signs with requireDefaultRecovery() (the first
    // recovery method that signs alone), not with the approver the pending registration names, nor with the method
    // selected by useRecoveryMethod(). With the registration waiting on the second method, the send fails although
    // the caller holds and selected that key.
    bug(
        "BUG: a pending device registration is resumed with the first recovery method, not the one it waits on",
        async () => {
            const env = stressEnv(SEED);
            try {
                const [first, second] = [env.key("base-sepolia"), env.key("base-sepolia")];
                const address = await rawWallet(env, "base-sepolia", [first.member, second.member]);
                const { storage } = await pendingDevice(env, "base-sepolia", address, second.locator);
                const wallet: Any = await drive(
                    env.sdk().getWallet({
                        chain: "base-sepolia",
                        recoveryMethods: [first.config, second.config],
                        options: options(storage),
                    } as Any)
                );
                expect(wallet.needsRecovery()).toBe(true);
                await drive(wallet.useRecoveryMethod(second.config));

                const sent = await settle(wallet.send(env.key("base-sepolia").address, "usdc", "1"));

                expect("error" in sent ? String((sent.error as Any)?.message) : "landed").toBe("landed");
                expect(second.signCount()).toBeGreaterThan(0);
            } finally {
                env.dispose();
            }
        }
    );

    // wallet-factory.ts matchesRecoverySigner has no passkey branch and returns true for any two passkeys, so
    // validateExistingWalletConfig pairs the caller's passkey with the wallet's first passkey recovery method and
    // compareSignerConfigs then rejects the different credential id.
    bug("BUG: getWallet with the wallet's second passkey recovery method throws WalletCreationError", async () => {
        const env = stressEnv(SEED);
        try {
            const passkey = (id: string) => ({
                type: "passkey",
                id,
                name: id,
                publicKey: { x: "1", y: "2" },
            });
            await rawWallet(env, "base-sepolia", [passkey("pk-first"), passkey("pk-second")]);

            const outcome = await settle(
                env.sdk().getWallet({
                    chain: "base-sepolia",
                    recovery: passkey("pk-second"),
                    options: options(),
                } as Any)
            );

            expect("error" in outcome ? String((outcome.error as Any)?.message) : "ok").toBe("ok");
        } finally {
            env.dispose();
        }
    });

    // wallet-factory.ts resolveRecoverySigner derives a server recovery method's address from its secret without
    // checking there is one; an address-only server config (the form wallet.recoveryMethods returns) reaches
    // stripAndValidateSecret as `undefined.startsWith`.
    bug(
        "BUG: createWallet with a server recovery method given by address, as wallet.recoveryMethods returns it, throws a TypeError",
        async () => {
            const env = stressEnv(SEED);
            try {
                const secret = `xmsk1_${"ab".repeat(32)}`;
                const created: Any = await drive(
                    env.sdk().createWallet({
                        chain: "base-sepolia",
                        recovery: { type: "server", secret },
                        options: options(),
                    } as Any)
                );
                expect(created.recoveryMethods).toEqual([{ type: "server", address: expect.any(String) }]);

                const again = await settle(
                    env.sdk().createWallet({
                        chain: "base-sepolia",
                        recoveryMethods: created.recoveryMethods,
                        options: options(),
                    } as Any)
                );

                expect("error" in again ? again.error : null).not.toBeInstanceOf(TypeError);
            } finally {
                env.dispose();
            }
        }
    );

    // wallet.ts useSigner → resolveNonDeviceSigner: signerIsRegistered (signer-manager.ts signerIsRegistered, `===`) and
    // isRecoverySigner (descriptors/external-wallet.ts matchesRecovery, `===`) compare locators exactly, so a lowercased
    // EVM address of a registered signer or of the recovery method is "not registered".
    bug("BUG: useSigner with a lowercased EVM address of a registered signer throws 'not registered'", async () => {
        const env = stressEnv(SEED);
        try {
            const recovery = env.key("base-sepolia");
            const operational = env.key("base-sepolia");
            await rawWallet(env, "base-sepolia", [recovery.member], [{ signer: operational.locator }]);
            const wallet: Any = await drive(env.sdk().getWallet({ chain: "base-sepolia", options: options() } as Any));

            const used = await settle(
                wallet.useSigner({ ...operational.config, address: operational.address.toLowerCase() })
            );

            expect("error" in used ? String((used.error as Any)?.message) : "ok").toBe("ok");
        } finally {
            env.dispose();
        }
    });

    bug("BUG: useSigner with a lowercased EVM address of the recovery method throws 'not registered'", async () => {
        const env = stressEnv(SEED);
        try {
            const recovery = env.key("base-sepolia");
            await rawWallet(env, "base-sepolia", [recovery.member]);
            const wallet: Any = await drive(env.sdk().getWallet({ chain: "base-sepolia", options: options() } as Any));

            const used = await settle(
                wallet.useSigner({ ...recovery.config, address: recovery.address.toLowerCase() })
            );

            expect("error" in used ? String((used.error as Any)?.message) : "ok").toBe("ok");
        } finally {
            env.dispose();
        }
    });

    // evm.ts / stellar.ts / solana.ts constructors pass `signer: wallet.signer` to a new Wallet, whose
    // initDefaultSigner then returns early (wallet.ts ~290) and whose DeviceRecoveryService starts "unknown": a wallet
    // that needs recovery because its device signer is pending reports needsRecovery() false after from().
    bug("BUG: EVMWallet.from of a wallet whose device signer is pending reports needsRecovery() false", async () => {
        const env = stressEnv(SEED);
        try {
            const recovery = env.key("base-sepolia");
            const address = await rawWallet(env, "base-sepolia", [recovery.member]);
            const { storage } = await pendingDevice(env, "base-sepolia", address, recovery.locator);
            const wallet: Any = await drive(
                env
                    .sdk()
                    .getWallet({ chain: "base-sepolia", recovery: recovery.config, options: options(storage) } as Any)
            );
            expect(wallet.needsRecovery()).toBe(true);

            const evmWallet = EVMWallet.from(wallet);
            await drive(evmWallet.waitForInit());

            expect(evmWallet.needsRecovery()).toBe(true);
        } finally {
            env.dispose();
        }
    });

    // The new Wallet in from() gets the recovery list (secrets already stripped to addresses) but a fresh
    // ServerSignerResolver (wallet.ts constructor ~200) without the recovery derivations, and no
    // useRecoveryMethod() selection: signer changes on the copy fail where they work on the original.
    bug("BUG: EVMWallet.from loses the server recovery secret, so addSigner fails on the copy", async () => {
        const env = stressEnv(SEED);
        try {
            const secret = `xmsk1_${"cd".repeat(32)}`;
            const wallet: Any = await drive(
                env.sdk().createWallet({
                    chain: "base-sepolia",
                    recovery: { type: "server", secret },
                    options: options(),
                } as Any)
            );
            const operational = env.key("base-sepolia");

            const added = await settle(EVMWallet.from(wallet).addSigner(operational.config));

            expect("error" in added ? String((added.error as Any)?.message) : "ok").toBe("ok");
        } finally {
            env.dispose();
        }
    });

    it("control: the same addSigner on the original wallet works", async () => {
        const env = stressEnv(SEED);
        try {
            const secret = `xmsk1_${"cd".repeat(32)}`;
            const wallet: Any = await drive(
                env.sdk().createWallet({
                    chain: "base-sepolia",
                    recovery: { type: "server", secret },
                    options: options(),
                } as Any)
            );
            const operational = env.key("base-sepolia");

            await expect(drive(wallet.addSigner(operational.config))).resolves.toEqual(
                expect.objectContaining({ status: "success" })
            );
        } finally {
            env.dispose();
        }
    });

    bug("BUG: EVMWallet.from loses the useRecoveryMethod() selection, so addSigner fails on the copy", async () => {
        const env = stressEnv(SEED);
        try {
            const [first, second, operational] = [
                env.key("base-sepolia"),
                env.key("base-sepolia"),
                env.key("base-sepolia"),
            ];
            const wallet: Any = await drive(
                env.sdk().createWallet({
                    chain: "base-sepolia",
                    recoveryMethods: [first.config, second.config],
                    signers: [operational.config],
                    options: options(),
                } as Any)
            );
            // The operational signer is the default signer, so only the selection names the approver.
            expect(wallet.signer.locator()).toBe(operational.locator);
            await drive(wallet.useRecoveryMethod(second.config));
            await expect(drive(wallet.addSigner(env.key("base-sepolia").config))).resolves.toBeDefined();

            const added = await settle(EVMWallet.from(wallet).addSigner(env.key("base-sepolia").config));

            expect("error" in added ? String((added.error as Any)?.message) : "ok").toBe("ok");
        } finally {
            env.dispose();
        }
    });

    // wallet.ts useSigner for a device runs DeviceRecoveryService.resolveAvailability, which sets the state to
    // "unknown" as soon as a local key exists (device-recovery-service.ts resolveAvailability), without the approval
    // check initDeviceSigner makes: needsRecovery() turns false for a pending (or unregistered) device key.
    bug("BUG: useSigner({ type: 'device' }) with a pending local key turns needsRecovery() false", async () => {
        const env = stressEnv(SEED);
        try {
            const recovery = env.key("base-sepolia");
            const address = await rawWallet(env, "base-sepolia", [recovery.member]);
            const { storage } = await pendingDevice(env, "base-sepolia", address, recovery.locator);
            const wallet: Any = await drive(
                env
                    .sdk()
                    .getWallet({ chain: "base-sepolia", recovery: recovery.config, options: options(storage) } as Any)
            );
            expect(wallet.needsRecovery()).toBe(true);

            await drive(wallet.useSigner({ type: "device" }));

            expect(wallet.signer.status).toBe("awaiting-approval");
            expect(wallet.needsRecovery()).toBe(true);
        } finally {
            env.dispose();
        }
    });

    // wallet-factory.ts createWalletInstance swaps a lone server / external-wallet delegated signer for the caller's
    // `signers`; without them the wallet has no initial signers, so initDefaultSigner (wallet.ts ~302) falls through to
    // the recovery method, where the documented ladder says "1 signer: try to use that signer" (and leaves none when it
    // cannot be assembled, as for a lone email signer it would use the email signer).
    bug(
        "BUG?: with one delegated external-wallet signer and no `signers` passed, the api-key recovery method becomes the default signer",
        async () => {
            const env = stressEnv(SEED);
            try {
                const operational = env.key("base-sepolia");
                await rawWallet(env, "base-sepolia", [{ type: "api-key" }], [{ signer: operational.locator }]);

                const wallet: Any = await drive(
                    env.sdk().getWallet({ chain: "base-sepolia", options: options() } as Any)
                );

                expect(wallet.signer?.locator()).toBeUndefined();
            } finally {
                env.dispose();
            }
        }
    );
});

describe("BUG repros (quorum stack only)", () => {
    const SEED = 4343;

    // FIXED in E2 (6f7ff53a): a quorum given as a key throws InvalidSignerError asking for a member's key.
    it("FIXED: useSigner with a quorum config throws InvalidSignerError asking for a member's key", async () => {
        const env = stressEnv(SEED);
        try {
            const members = [env.key("base-sepolia"), env.key("base-sepolia")];
            const quorum = { type: "quorum", threshold: 1, members: members.map((member) => member.config) };
            const wallet: Any = await drive(
                env.sdk().createWallet({ chain: "base-sepolia", recoveryMethods: [quorum] } as Any)
            );

            const used = await settle(wallet.useSigner(quorum));

            expect("error" in used && used.error).toBeInstanceOf(InvalidSignerError);
            expect(String((used as Any).error.message)).toContain("member's key");
        } finally {
            env.dispose();
        }
    });

    // wallet.ts #recoverIfNeeded discards what recover() returns: with the new device signer still waiting on recovery
    // quorum members, send goes on and creates the transfer with the unapproved device signer, which the API rejects.
    bug(
        "BUG: send while the device registration awaits quorum members sends the transfer with the unapproved device",
        async () => {
            const env = stressEnv(SEED);
            try {
                const members = [env.key("base-sepolia"), env.key("base-sepolia")];
                const address = await rawWallet(env, "base-sepolia", [
                    { type: "quorum", threshold: 2, members: members.map((member) => member.member) },
                ]);
                const quorumLocator = env.fake.renderedWallet(address).config.recoveryMethods[0].locator;
                const storage = env.device();
                const publicKeyBase64 = await storage.generateKey({ address });
                const bytes = Buffer.from(publicKeyBase64, "base64");
                await env.client().registerSigner("me:evm:smart", {
                    signer: {
                        type: "device",
                        publicKey: {
                            x: `0x${bytes.subarray(1, 33).toString("hex")}`,
                            y: `0x${bytes.subarray(33, 65).toString("hex")}`,
                        },
                    },
                    chain: "base-sepolia",
                    approver: quorumLocator,
                } as Any);
                const wallet: Any = await drive(
                    env.sdk().getWallet({ chain: "base-sepolia", options: { deviceSignerKeyStorage: storage } } as Any)
                );
                expect(wallet.needsRecovery()).toBe(true);

                const sent = await settle(wallet.send(env.key("base-sepolia").address, "usdc", "1"));

                expect("error" in sent && sent.error).not.toBeInstanceOf(TransactionNotCreatedError);
                expect(env.fake.callsTo("send")).toHaveLength(0);
            } finally {
                env.dispose();
            }
        }
    );
});

export { drive, stressSeed };
