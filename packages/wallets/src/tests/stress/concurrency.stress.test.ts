/**
 * m7 concurrency stress: overlapping public calls on one wallet, and on wrapper wallets (`EVMWallet.from`,
 * `StellarWallet.from`) of it, under random fake latencies so their awaits interleave.
 *
 * Every run checks that each call settles with a result or an SDK error, and that the local recovery list matches the
 * API. The active-signer and signing checks (the caller's last choice stays active; no request is created or signed by
 * a key the caller did not choose) hold strictly in batches that cannot hit a known bug; in the others a violation must
 * match a known bug (`BUG:` repros below), so anything new still fails the run.
 *
 * Throwaway m7 code: pragmatic by design. Replay: STRESS_SEED=<n> STRESS_RUNS=1.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { P256 } from "ox";
import { EVMWallet } from "../../wallets/evm";
import { StellarWallet } from "../../wallets/stellar";
import type { Wallet } from "../../wallets/wallet";
import type { Chain } from "../../chains/chains";
import { QuorumSignerNotSupportedError } from "../../utils/errors";
import { comparableLocator } from "./fake-api";
import {
    drive,
    forEachSeed,
    quorumOf,
    recipientFor,
    settle,
    StressDeviceStorage,
    stressEnv,
    stressRuns,
    stressSeed,
    useStressTimers,
    type Rng,
    type StressEnv,
    type TestKey,
} from "./harness";

// biome-ignore lint/suspicious/noExplicitAny: the SDK's generic configs are not worth spelling out here
type Any = any;
type AnyWallet = Wallet<Chain>;
type DeviceChain = "base-sepolia" | "stellar";
const DEVICE_CHAINS: DeviceChain[] = ["base-sepolia", "stellar"];

let env: StressEnv;
const seed = stressSeed();

beforeEach(() => {
    useStressTimers();
    env = stressEnv(seed);
});

afterEach(() => {
    env.dispose();
    vi.useRealTimers();
});

// ---------------------------------------------------------------------------------------------------------------------
// Helpers (the fake and the harness are not edited: latency is added by wrapping `fetch` and the key storage here)
// ---------------------------------------------------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Each API call waits a random 0..maxMs of fake time before the fake sees it. */
function jitterFetch(target: StressEnv, random: Rng, maxMs: number) {
    const inner = target.fake.fetch;
    vi.stubGlobal("fetch", async (input: Any, init?: Any) => {
        const ms = random.int(0, maxMs);
        if (ms > 0) await sleep(ms);
        return inner(input, init);
    });
}

/** A device key storage whose calls also take a random 0..maxMs of fake time (a platform keystore is async too). */
class JitteryDeviceStorage extends StressDeviceStorage {
    constructor(
        random: () => number,
        private readonly jitter: Rng,
        private readonly maxMs: number
    ) {
        super(random);
    }
    async #wait() {
        const ms = this.jitter.int(0, this.maxMs);
        if (ms > 0) await sleep(ms);
    }
    override async generateKey(args: Any = {}) {
        await this.#wait();
        return super.generateKey(args);
    }
    override async getKey(address: string) {
        await this.#wait();
        return super.getKey(address);
    }
    override async hasKey(publicKeyBase64: string) {
        await this.#wait();
        return super.hasKey(publicKeyBase64);
    }
    // Signs as StressDeviceStorage does, but tells hex from base64 strictly: the harness treats any message starting
    // with "0x" as hex, so a Stellar base64 hash that happens to start with "0x" (1 in 4096) fails to sign there.
    override async signMessage(address: string, message: string) {
        await this.#wait();
        this.calls.push({ method: "signMessage", args: [address, message] });
        const base64 = this.addressMap.get(address);
        if (!base64) throw new Error(`No key mapped for address: ${address}`);
        const privateKey = this.keys.get(base64);
        if (!privateKey) throw new Error(`No private key for pubkey: ${base64}`);
        const payload = /^0x([0-9a-fA-F]{2})*$/.test(message)
            ? (message as `0x${string}`)
            : (`0x${Buffer.from(message, "base64").toString("hex")}` as `0x${string}`);
        const { r, s } = P256.sign({ payload, hash: true, privateKey, extraEntropy: false });
        return { r: `0x${r.toString(16).padStart(64, "0")}`, s: `0x${s.toString(16).padStart(64, "0")}` };
    }
    override async mapAddressToKey(address: string, publicKeyBase64: string) {
        await this.#wait();
        return super.mapAddressToKey(address, publicKeyBase64);
    }
}

const same = (left: string | undefined | null, right: string | undefined | null) =>
    left != null && right != null && comparableLocator(left) === comparableLocator(right);

const locatorOf = (config: Any): string =>
    config.type === "quorum"
        ? config.locator
        : config.type === "external-wallet"
          ? `external-wallet:${config.address}`
          : config.locator;

/** A JS runtime error (TypeError, RangeError...) is a crash, not an SDK error. */
function isTypedError(error: unknown): boolean {
    return (
        error instanceof Error &&
        !(error instanceof TypeError) &&
        !(error instanceof RangeError) &&
        !(error instanceof ReferenceError) &&
        !(error instanceof SyntaxError)
    );
}

const describeError = (error: unknown) =>
    error instanceof Error ? `${error.constructor.name}: ${error.message.slice(0, 160)}` : String(error);

/** The wallet's recovery locators as the fake stores them, and as the SDK lists them locally. */
function recoveryListsOf(wallet: AnyWallet, target: StressEnv) {
    const api = (target.fake.renderedWallet(wallet.address).config.recoveryMethods as Any[])
        .map((entry) => comparableLocator(entry.locator))
        .sort();
    const local = wallet.recoveryMethods.map((entry) => comparableLocator(locatorOf(entry))).sort();
    return { api, local };
}

/** The request id an approvals call targets. */
const requestIdOf = (path: string) => /\/(?:transactions|signatures)\/([^/]+)\/approvals$/.exec(path)?.[1];

/** A flat wallet: an external-wallet recovery key and a device signer, created through the public SDK. */
async function flatDeviceWallet(target: StressEnv, chain: DeviceChain, device: StressDeviceStorage) {
    const recovery = target.key(chain);
    const wallet = (await drive(
        target
            .sdk()
            .createWallet({ chain, recovery: recovery.config, options: { deviceSignerKeyStorage: device } } as Any)
    )) as AnyWallet;
    const deviceLocator = device.locatorFor(wallet.address) as string;
    expect(wallet.signer?.locator()).toBe(deviceLocator);
    return { wallet, recovery, deviceLocator };
}

/** The same wallet read again on a device whose key is gone, so it needs recovery. */
async function lostKeyWallet(target: StressEnv, chain: DeviceChain, device: StressDeviceStorage, recovery: TestKey) {
    const created = (await drive(
        target
            .sdk()
            .createWallet({ chain, recovery: recovery.config, options: { deviceSignerKeyStorage: device } } as Any)
    )) as AnyWallet;
    await device.deleteKey(created.address);
    const wallet = (await drive(
        target.sdk().getWallet({ chain, recovery: recovery.config, options: { deviceSignerKeyStorage: device } } as Any)
    )) as AnyWallet;
    expect(wallet.needsRecovery()).toBe(true);
    return wallet;
}

const wrap = (wallet: AnyWallet): AnyWallet =>
    (wallet.chain === "stellar" ? StellarWallet.from(wallet) : EVMWallet.from(wallet)) as unknown as AnyWallet;

// ---------------------------------------------------------------------------------------------------------------------
// Deterministic repros
// ---------------------------------------------------------------------------------------------------------------------

/** `it.fails` keeps the file green while a bug stands; STRESS_SHOW_BUGS=1 runs the repros as plain tests to show why. */
const bugIt = process.env.STRESS_SHOW_BUGS ? it : it.fails;

describe.each(DEVICE_CHAINS)("signer changes overlapping other calls on one wallet (%s)", (chain) => {
    // SignerManager.#withActiveSigner swaps the recovery signer in for the change and restores, in `finally`, the
    // signer it saw on entry. B enters while A's recovery signer is active, so B saves A's recovery signer; A finishes
    // first and restores the device, then B "restores" A's recovery signer, which stays active for good.
    bugIt(
        "BUG: two overlapping signer changes: the second fails with InvalidSignerError, the recovery signer stays active, and the next send signs with the recovery key",
        async () => {
            const { wallet, recovery, deviceLocator } = await flatDeviceWallet(env, chain, env.device());
            // B's registration reaches the API late, so A finishes first.
            env.fake.faults.add({ route: "registerSigner", skip: 1, times: 1, fault: { type: "delay", ms: 5_000 } });

            const first = wallet.addSigner(env.key(chain).config);
            const second = wallet.addSigner(env.key(chain).config);
            const changes = await drive(Promise.allSettled([first, second]));
            const activeAfterChanges = wallet.signer?.locator();
            const recoverySignsBefore = recovery.signCount();
            const sent = await settle(wallet.send(recipientFor(chain, env.rng), "usdc", "1"));

            expect({
                changes: changes.map((change) =>
                    change.status === "fulfilled" ? "landed" : describeError(change.reason)
                ),
                activeAfterChanges,
                send: "error" in sent ? describeError(sent.error) : "landed",
                sendSigner: env.fake.callsTo("send").at(-1)?.body.signer,
                recoverySignaturesForTheSend: recovery.signCount() - recoverySignsBefore,
            }).toEqual({
                changes: ["landed", "landed"],
                activeAfterChanges: deviceLocator,
                send: "landed",
                sendSigner: deviceLocator,
                recoverySignaturesForTheSend: 0,
            });
        }
    );

    // The send reads the active signer while addSigner has swapped the recovery signer in, so it creates the
    // transaction as the recovery key and signs it with that key.
    bugIt(
        "BUG: a send started while a signer change runs is created and signed by the recovery key, not the active device signer",
        async () => {
            const { wallet, recovery, deviceLocator } = await flatDeviceWallet(env, chain, env.device());

            const change = wallet.addSigner(env.key(chain).config);
            const sent = wallet.send(recipientFor(chain, env.rng), "usdc", "1");
            await drive(Promise.all([change, sent]));

            expect({
                sendSigner: env.fake.callsTo("send")[0].body.signer,
                recoverySignatures: recovery.signCount(),
            }).toEqual({ sendSigner: deviceLocator, recoverySignatures: 1 });
        }
    );

    // The same restore in `finally` puts back the signer the change saw on entry, over the caller's later choice.
    bugIt(
        "BUG: a useSigner() the caller awaited while a signer change waits for its transaction is reverted when the change finishes",
        async () => {
            const { wallet, deviceLocator } = await flatDeviceWallet(env, chain, env.device());
            const operational = env.key(chain);
            await drive(wallet.addSigner(operational.config));
            expect(wallet.signer?.locator()).toBe(deviceLocator);

            // The change's approval is in; it is waiting for its transaction to land.
            env.fake.faults.add({ route: "getTransaction", skip: 1, times: 1, fault: { type: "delay", ms: 5_000 } });
            const change = wallet.addSigner(env.key(chain).config);
            await vi.advanceTimersByTimeAsync(1_500);
            await drive(wallet.useSigner(operational.config));
            expect(wallet.signer?.locator()).toBe(operational.locator);
            const changed = await settle(change);

            expect({
                change: "error" in changed ? describeError(changed.error) : "landed",
                active: wallet.signer?.locator(),
            }).toEqual({ change: "landed", active: operational.locator });
        }
    );

    // The change signs its approval with whatever signer is active when it gets there, not the recovery signer it
    // swapped in: after a useSigner() the recovery key is not among the held signers, so collectApprovals throws
    // InvalidSignerError. Through recovery (send on a wallet that lost its device key), the send fails, the device
    // registration is left unapproved with its key deleted, and `finally` resets the active signer to none.
    bugIt(
        "BUG: a useSigner() made while recovery registers the device signer fails the send with InvalidSignerError and leaves no active signer",
        async () => {
            const recovery = env.key(chain);
            const device = env.device();
            const wallet = await lostKeyWallet(env, chain, device, recovery);
            const operational = env.key(chain);
            const admin = (await drive(env.sdk().getWallet({ chain, recovery: recovery.config } as Any))) as AnyWallet;
            await drive(admin.addSigner(operational.config));

            // The registration reaches the API late, so the caller's useSigner() lands before its approval.
            env.fake.faults.add({ route: "registerSigner", times: 1, fault: { type: "delay", ms: 5_000 } });
            const sent = settle(wallet.send(recipientFor(chain, env.rng), "usdc", "1"));
            await vi.advanceTimersByTimeAsync(500);
            await drive(wallet.useSigner(operational.config));
            const outcome = await sent;

            expect({
                send: "error" in outcome ? describeError(outcome.error) : "landed",
                active: wallet.signer?.locator(),
            }).toEqual({ send: "landed", active: operational.locator });
        }
    );

    // DeviceRecoveryService.recover() sets the new device signer active once its registration lands
    // (device-recovery-service.ts:292), over a useSigner() the caller made while the registration was landing.
    bugIt(
        "BUG: recover() sets its new device signer active over a useSigner() the caller awaited while recovery ran",
        async () => {
            const recovery = env.key(chain);
            const device = env.device();
            const wallet = await lostKeyWallet(env, chain, device, recovery);
            const operational = env.key(chain);
            const admin = (await drive(env.sdk().getWallet({ chain, recovery: recovery.config } as Any))) as AnyWallet;
            await drive(admin.addSigner(operational.config));

            // The registration is approved; recovery waits for it to land while the caller picks a signer.
            env.fake.faults.add({ route: "getTransaction", skip: 1, times: 1, fault: { type: "delay", ms: 5_000 } });
            const recovered = settle(wallet.recover());
            await vi.advanceTimersByTimeAsync(1_500);
            await drive(wallet.useSigner(operational.config));
            expect(wallet.signer?.locator()).toBe(operational.locator);
            const outcome = await recovered;

            expect({
                recover: "error" in outcome ? describeError(outcome.error) : "done",
                active: wallet.signer?.locator(),
            }).toEqual({ recover: "done", active: operational.locator });
        }
    );
});

describe.each(DEVICE_CHAINS)("wrapper wallets of one wallet (%s)", (chain) => {
    // Each wrapper has its own `#recovering`, so both run DeviceRecoveryService.recover(); both reach
    // createDeviceSigner before either generated a key, and the shared storage maps the wallet address to the key
    // generated last. Both keys are registered; the other wrapper's device signer names the first key but the storage
    // signs with the second, so its approvals carry an invalid signature.
    bugIt(
        "BUG: two wrappers recovering at once register two device keys, and one of them then signs with the other's key",
        async () => {
            const recovery = env.key(chain);
            const device = env.device();
            const base = await lostKeyWallet(env, chain, device, recovery);
            const signersBefore = env.fake.signersOf(base.address).length;
            const [first, second] = [wrap(base), wrap(base)];

            const outcomes = await drive(
                Promise.allSettled([
                    first.send(recipientFor(chain, env.rng), "usdc", "1"),
                    second.send(recipientFor(chain, env.rng), "usdc", "1"),
                ])
            );

            expect({
                outcomes: outcomes.map((outcome) => outcome.status),
                newDeviceSigners: env.fake.signersOf(base.address).length - signersBefore,
                firstSigner: first.signer?.locator(),
                secondSigner: second.signer?.locator(),
            }).toEqual({
                outcomes: ["fulfilled", "fulfilled"],
                newDeviceSigners: 1,
                firstSigner: device.locatorFor(base.address),
                secondSigner: device.locatorFor(base.address),
            });
        }
    );

    // A wrapper of a wallet with no active signer runs its own initDefaultSigner in the background. It checks the
    // active signer only on entry, then sets the device signer it found, over a useSigner() made in the meantime.
    bugIt(
        "BUG: a wrapper's background signer initialization overwrites a useSigner() the caller already awaited",
        async () => {
            const recovery = env.key(chain);
            const device = env.device();
            const base = await lostKeyWallet(env, chain, device, recovery);
            await drive(wrap(base).recover()); // another wrapper recovered: the shared storage now holds a key
            expect(base.signer).toBeUndefined();

            const wrapper = wrap(base);
            await drive(wrapper.useSigner(recovery.config));
            const afterUseSigner = wrapper.signer?.locator();
            await drive(wrapper.waitForInit());

            expect({ afterUseSigner, afterInit: wrapper.signer?.locator() }).toEqual({
                afterUseSigner: recovery.locator,
                afterInit: recovery.locator,
            });
        }
    );
});

describe.each(DEVICE_CHAINS)("a recovery-method selection across wrappers (%s)", (chain) => {
    // The wrapper constructors copy `recoveryMember` (a quorum member selection) but not SignerManager's flat
    // `#selectedRecovery`, so a wrapper made after useRecoveryMethod() on a wallet with several recovery methods has
    // no approver and throws RecoveryMethodRequiredError where the wallet itself would add the signer.
    bugIt(
        "BUG: EVMWallet.from()/StellarWallet.from() drop a flat useRecoveryMethod() selection, so the wrapper cannot change signers",
        async () => {
            const { wallet } = await flatDeviceWallet(env, chain, env.device());
            const second = env.key(chain);
            await drive(wallet.addRecoveryMethod(second.config));
            await drive(wallet.useRecoveryMethod(second.config));

            const added = await settle(wrap(wallet).addSigner(env.key(chain).config));

            expect("error" in added ? describeError(added.error) : "added").toBe("added");
            expect(env.fake.callsTo("registerSigner").at(-1)?.body.approver).toBe(second.locator);
        }
    );
});

describe.each(DEVICE_CHAINS)("overlapping approvals with a stand-in member (%s)", (chain) => {
    // approve() with no active signer swaps the selected member in (withStandInSigner → #withActiveSigner). The second
    // approve() sees the first one's stand-in as active, so it does not swap; when the first restores "no signer", the
    // second's approveTransactionInternal calls require() and throws as if the wallet were read-only.
    bugIt(
        "BUG: two overlapping approve() calls by a stand-in member: the second throws once the first one ends",
        async () => {
            const [alice, bob, carol] = [env.key(chain), env.key(chain), env.key(chain)];
            const wallet = (await drive(
                env.sdk().createWallet({ chain, recoveryMethods: [quorumOf([alice, bob, carol], 2)] } as Any)
            )) as AnyWallet;
            expect(wallet.signer).toBeUndefined();
            const quorum = env.fake.renderedWallet(wallet.address).config.recoveryMethods[0].locator;
            const client = env.client();
            const walletLocator = chain === "stellar" ? "me:stellar:smart" : "me:evm:smart";
            const token = chain === "stellar" ? "stellar:usdc" : "base-sepolia:usdc";
            const create = async () =>
                (
                    (await client.send(walletLocator, token, {
                        recipient: recipientFor(chain, env.rng),
                        amount: "1",
                        signer: quorum,
                    } as Any)) as Any
                ).id as string;
            const [first, second] = [await create(), await create()];
            await drive(wallet.useRecoveryMethod(alice.config));
            // The second approval reads its request late, after the first one has finished.
            env.fake.faults.add({ route: "getTransaction", skip: 1, times: 1, fault: { type: "delay", ms: 5_000 } });

            const outcomes = await drive(
                Promise.allSettled([
                    wallet.approve({ transactionId: first }),
                    wallet.approve({ transactionId: second }),
                ])
            );

            const rejected = outcomes.find((outcome) => outcome.status === "rejected") as PromiseRejectedResult;
            expect(rejected?.reason).not.toBeInstanceOf(QuorumSignerNotSupportedError);
            expect(outcomes.map((outcome) => outcome.status)).toEqual(["fulfilled", "fulfilled"]);
        }
    );
});

// ---------------------------------------------------------------------------------------------------------------------
// Randomized interleavings
// ---------------------------------------------------------------------------------------------------------------------

/** Known bugs a randomized batch may hit, keyed by the repro above that pins each one down. */
type KnownBug =
    | "overlapping-swaps-leak-recovery"
    | "send-during-swap-uses-recovery"
    | "swap-reverts-use-signer"
    | "recover-overwrites-use-signer"
    | "wrappers-register-two-devices"
    | "standin-approve-overlap";

type OpRecord = {
    name: string;
    swap: boolean;
    start: number;
    end?: number;
    outcome?: { value: unknown } | { error: unknown };
};

type Batch = {
    ops: OpRecord[];
    run: (name: string, swap: boolean, call: () => Promise<unknown>, startAfterMs: number) => Promise<void>;
    settleAll: () => Promise<void>;
};

function batch(): Batch {
    const ops: OpRecord[] = [];
    const running: Promise<void>[] = [];
    return {
        ops,
        run(name, swap, call, startAfterMs) {
            const record: OpRecord = { name, swap, start: Number.NaN };
            ops.push(record);
            const promise = (async () => {
                if (startAfterMs > 0) await sleep(startAfterMs);
                record.start = Date.now();
                try {
                    record.outcome = { value: await call() };
                } catch (error) {
                    record.outcome = { error };
                }
                record.end = Date.now();
            })();
            running.push(promise);
            return promise;
        },
        async settleAll() {
            const outcome = await settle(Promise.all(running), { maxMs: 20 * 60_000 });
            if ("error" in outcome) throw outcome.error;
        },
    };
}

/** Whether two ops ran at the same time (fake clock, inclusive: one fake instant still interleaves microtasks). */
const overlap = (a: OpRecord, b: OpRecord) =>
    a !== b && a.end != null && b.end != null && a.start <= b.end && b.start <= a.end;

function assertSettledAndTyped(ops: OpRecord[], label: string) {
    for (const op of ops) {
        expect(op.outcome, `${label}: ${op.name} did not settle`).toBeDefined();
        if (op.outcome != null && "error" in op.outcome) {
            expect(
                isTypedError(op.outcome.error),
                `${label}: ${op.name} threw a runtime error: ${describeError(op.outcome.error)}`
            ).toBe(true);
        }
    }
}

const knownTally = new Map<KnownBug, number>();
let seedHits = new Set<KnownBug>();
const noteKnown = (bug: KnownBug, detail = "") => {
    knownTally.set(bug, (knownTally.get(bug) ?? 0) + 1);
    seedHits.add(bug);
    if (process.env.STRESS_DEBUG) console.info(`[known] ${bug} ${detail}`);
};

describe("randomized overlapping calls on one flat wallet with a device signer", () => {
    afterEach(() => {
        if (knownTally.size > 0) {
            console.info(`[concurrency] known bugs hit: ${JSON.stringify(Object.fromEntries(knownTally))}`);
            knownTally.clear();
        }
    });

    it("every call settles with a result or an SDK error; recovery lists match the API; the caller's signer choice holds except through known bugs", async () => {
        await forEachSeed(stressRuns(80), async (runSeed) => {
            env.dispose();
            env = stressEnv(runSeed);
            const random = env.rng.fork("concurrency");
            const chain = random.pick(DEVICE_CHAINS);
            const lostKey = random.bool(0.35);
            const device = new JitteryDeviceStorage(env.rng.fork("device").next, random.fork("device-jitter"), 400);
            const recovery = env.key(chain);
            const label = `seed=${runSeed} chain=${chain} lostKey=${lostKey}`;
            seedHits = new Set();

            // Setup, sequential: an operational signer to choose and one to remove, a second recovery method to
            // remove, and the original recovery method selected so every change has an approver.
            const created = (await drive(
                env.sdk().createWallet({
                    chain,
                    recovery: recovery.config,
                    options: { deviceSignerKeyStorage: device },
                } as Any)
            )) as AnyWallet;
            const operational = env.key(chain);
            const removable = env.key(chain);
            const secondRecovery = env.key(chain);
            await drive(created.addSigner(operational.config));
            await drive(created.addSigner(removable.config));
            await drive(created.addRecoveryMethod(secondRecovery.config));
            let wallet = created;
            if (lostKey) {
                await device.deleteKey(created.address);
                wallet = (await drive(
                    env.sdk().getWallet({
                        chain,
                        recovery: recovery.config,
                        options: { deviceSignerKeyStorage: device },
                    } as Any)
                )) as AnyWallet;
            }
            await drive(wallet.useRecoveryMethod(recovery.config));
            const recoveryLocators = [recovery.locator, secondRecovery.locator];
            const preBatchChoice = wallet.signer?.locator();
            const callsBefore = env.fake.calls.length;

            jitterFetch(env, random.fork("fetch"), 1_200);
            const runs = batch();
            const count = random.int(2, 5);
            let usedSigner: { locator: string; record: OpRecord } | null = null;
            const menu = [
                "send",
                "send",
                "addSigner",
                "removeSigner",
                "addRecoveryMethod",
                "removeRecoveryMethod",
                "useSigner",
                "recover",
                "signers",
                "isSignerApproved",
            ];
            for (let i = 0; i < count; i++) {
                const name = random.pick(menu);
                const startAfter = random.bool(0.5) ? 0 : random.int(0, 3_000);
                switch (name) {
                    case "send":
                        void runs.run(
                            "send",
                            false,
                            () => wallet.send(recipientFor(chain, random), "usdc", "1"),
                            startAfter
                        );
                        break;
                    case "addSigner":
                        void runs.run("addSigner", true, () => wallet.addSigner(env.key(chain).config), startAfter);
                        break;
                    case "removeSigner":
                        void runs.run("removeSigner", true, () => wallet.removeSigner(removable.config), startAfter);
                        break;
                    case "addRecoveryMethod":
                        void runs.run(
                            "addRecoveryMethod",
                            true,
                            () => wallet.addRecoveryMethod(env.key(chain).config),
                            startAfter
                        );
                        break;
                    case "removeRecoveryMethod":
                        void runs.run(
                            "removeRecoveryMethod",
                            true,
                            () => wallet.removeRecoveryMethod(secondRecovery.config),
                            startAfter
                        );
                        break;
                    case "useSigner": {
                        if (usedSigner != null) break; // one choice per batch keeps "the caller's last choice" exact
                        const choice = random.bool() ? operational : null;
                        const record = runs.ops.length;
                        void runs.run(
                            "useSigner",
                            false,
                            () => wallet.useSigner(choice != null ? choice.config : ({ type: "device" } as Any)),
                            startAfter
                        );
                        usedSigner = { locator: choice?.locator ?? "device", record: runs.ops[record] };
                        break;
                    }
                    case "recover":
                        void runs.run("recover", false, () => wallet.recover(), startAfter);
                        break;
                    case "signers":
                        void runs.run("signers", false, () => wallet.signers(), startAfter);
                        break;
                    case "isSignerApproved":
                        void runs.run(
                            "isSignerApproved",
                            false,
                            () => wallet.isSignerApproved(operational.locator),
                            startAfter
                        );
                        break;
                }
            }
            await runs.settleAll();
            vi.stubGlobal("fetch", env.fake.fetch);
            const opsLabel = `${label} ops=${runs.ops.map((op) => op.name).join(",")}`;

            // 1. Every call settled with a result or an SDK error.
            assertSettledAndTyped(runs.ops, opsLabel);

            // 2. The local recovery list matches the API's.
            const lists = recoveryListsOf(wallet, env);
            expect(lists.local, `${opsLabel}: local recoveryMethods`).toEqual(lists.api);

            // 3. The active signer is the caller's last choice, else the default.
            const swaps = runs.ops.filter((op) => op.swap);
            const recoveries = runs.ops.filter((op) => op.name === "recover" || (lostKey && op.name === "send"));
            const anySwapOverlaps = (op: OpRecord) => swaps.some((other) => overlap(op, other));
            const swapsOverlapEachOther = swaps.some(
                (op) => anySwapOverlaps(op) || recoveries.some((r) => overlap(op, r))
            );
            const deviceNow = device.locatorFor(wallet.address);
            const choiceRecord = (usedSigner as { locator: string; record: OpRecord } | null)?.record;
            const choiceSucceeded = choiceRecord?.outcome != null && "value" in choiceRecord.outcome;
            const choiceLocator = (usedSigner as { locator: string } | null)?.locator;
            const recoveryRan = recoveries.some((op) => op.outcome != null && "value" in op.outcome);
            // useSigner({ type: "device" }) with no local key leaves a keyless placeholder ("device:") for the next
            // transaction's recovery to replace (documented on useSigner).
            const expectedActive = choiceSucceeded
                ? choiceLocator === "device"
                    ? deviceNow ?? "device:"
                    : choiceLocator
                : lostKey
                  ? recoveryRan
                      ? deviceNow
                      : preBatchChoice
                  : preBatchChoice;
            const active = wallet.signer?.locator();
            if (!same(active, expectedActive) && !(expectedActive == null && active == null)) {
                const activeIsRecovery = recoveryLocators.some((locator) => same(active, locator));
                const detail = `${opsLabel} active=${active} expected=${expectedActive} spans=${runs.ops
                    .map(
                        (op) =>
                            `${op.name}[${op.start}-${op.end}]${op.outcome != null && "error" in op.outcome ? `!${describeError(op.outcome.error)}` : ""}`
                    )
                    .join(" ")}`;
                if (activeIsRecovery && swapsOverlapEachOther) {
                    noteKnown("overlapping-swaps-leak-recovery", detail);
                } else if (choiceSucceeded && choiceRecord != null && anySwapOverlaps(choiceRecord)) {
                    noteKnown("swap-reverts-use-signer", detail);
                } else if (
                    choiceSucceeded &&
                    choiceRecord != null &&
                    recoveries.some((op) => overlap(op, choiceRecord) || (op.end ?? 0) >= (choiceRecord.end ?? 0))
                ) {
                    noteKnown("recover-overwrites-use-signer", detail);
                } else {
                    expect.fail(
                        `${opsLabel}: active signer ${active} is not the caller's choice ${expectedActive} (pre-batch ${preBatchChoice}, device ${deviceNow})`
                    );
                }
            }

            // 4. No send is created or approved by a recovery key (the caller never chose one).
            const batchCalls = env.fake.calls.slice(callsBefore);
            const sendRequests = new Set<string>();
            for (const call of batchCalls.filter((c) => c.route === "send")) {
                if (call.response?.id != null) sendRequests.add(call.response.id);
                if (recoveryLocators.some((locator) => same(call.body.signer, locator))) {
                    if (swaps.length > 0) {
                        noteKnown("send-during-swap-uses-recovery", opsLabel);
                    } else {
                        expect.fail(`${opsLabel}: a send was created as the recovery key ${call.body.signer}`);
                    }
                }
            }
            for (const call of batchCalls.filter((c) => c.route === "approveTransaction")) {
                const id = requestIdOf(call.path);
                if (id == null || !sendRequests.has(id)) continue;
                for (const approval of call.body.approvals as Any[]) {
                    if (recoveryLocators.some((locator) => same(approval.signer, locator)) && swaps.length === 0) {
                        expect.fail(`${opsLabel}: a send was approved by the recovery key ${approval.signer}`);
                    }
                }
            }

            // 5. With no known bug hit, the wallet is still usable: a send now lands, created as the active signer.
            if (seedHits.size === 0 && wallet.signer != null) {
                const signerNow = wallet.signer.locator();
                const after = await settle(wallet.send(recipientFor(chain, random), "usdc", "1"));
                if (process.env.STRESS_DEBUG && "error" in after) {
                    console.info(
                        `[follow-up] ${opsLabel} signerNow=${signerNow} error=${(after.error as Error)?.stack?.slice(0, 1500)} spans=${runs.ops
                            .map(
                                (op) =>
                                    `${op.name}[${op.start}-${op.end}]${op.outcome != null && "error" in op.outcome ? `!${describeError(op.outcome.error)}` : ""}`
                            )
                            .join(" ")}`
                    );
                    console.info(
                        `[follow-up] calls ${env.fake.calls
                            .slice(callsBefore)
                            .map(
                                (c) =>
                                    `${c.seq}:${c.method} ${c.route} ${c.status} ${JSON.stringify(c.body?.signer ?? c.body?.approvals?.map((a: Any) => a.signer) ?? c.query ?? "").slice(0, 120)}`
                            )
                            .join("\n")}`
                    );
                }
                expect("error" in after ? describeError(after.error) : "landed", `${opsLabel}: follow-up send`).toBe(
                    "landed"
                );
                // A keyless placeholder is replaced by the device signer the send's recovery registers.
                const expectedSigner = signerNow === "device:" ? device.locatorFor(wallet.address) : signerNow;
                expect(env.fake.callsTo("send").at(-1)?.body.signer, `${opsLabel}: follow-up send signer`).toBe(
                    expectedSigner
                );
                expect(wallet.needsRecovery(), `${opsLabel}: needsRecovery after a landed send`).toBe(false);
            }
        });
    }, 120_000);
});

describe("randomized recoveries on a wallet and its wrappers", () => {
    afterEach(() => {
        if (knownTally.size > 0) {
            console.info(`[concurrency] known bugs hit: ${JSON.stringify(Object.fromEntries(knownTally))}`);
            knownTally.clear();
        }
    });

    it("every call settles; one instance recovering at a time registers one device key that signs for every instance", async () => {
        await forEachSeed(stressRuns(60), async (runSeed) => {
            env.dispose();
            env = stressEnv(runSeed);
            const random = env.rng.fork("wrappers");
            const chain = random.pick(DEVICE_CHAINS);
            const device = new JitteryDeviceStorage(env.rng.fork("device").next, random.fork("device-jitter"), 400);
            const recovery = env.key(chain);
            const base = await lostKeyWallet(env, chain, device, recovery);
            const signersBefore = env.fake.signersOf(base.address).map((signer: Any) => signer.locator);
            const instances: AnyWallet[] = [base, wrap(base)];
            if (random.bool()) instances.push(wrap(base));
            const label = `seed=${runSeed} chain=${chain} instances=${instances.length}`;

            jitterFetch(env, random.fork("fetch"), 1_200);
            const runs = batch();
            const count = random.int(2, 4);
            for (let i = 0; i < count; i++) {
                const index = random.int(0, instances.length - 1);
                const instance = instances[index];
                const name = random.pick(["send", "recover", "signers"]);
                const startAfter = random.bool(0.5) ? 0 : random.int(0, 4_000);
                const op = `${name}@${index}`;
                if (name === "send") {
                    void runs.run(op, false, () => instance.send(recipientFor(chain, random), "usdc", "1"), startAfter);
                } else if (name === "recover") {
                    void runs.run(op, false, () => instance.recover(), startAfter);
                } else {
                    void runs.run(op, false, () => instance.signers(), startAfter);
                }
            }
            await runs.settleAll();
            vi.stubGlobal("fetch", env.fake.fetch);
            const opsLabel = `${label} ops=${runs.ops.map((op) => op.name).join(",")}`;
            assertSettledAndTyped(runs.ops, opsLabel);

            // Recoveries by different instances that overlapped in time are the known double registration.
            const recovering = runs.ops.filter((op) => !op.name.startsWith("signers"));
            const instanceOf = (op: OpRecord) => op.name.split("@")[1];
            const crossInstanceOverlap = recovering.some((op) =>
                recovering.some((other) => instanceOf(op) !== instanceOf(other) && overlap(op, other))
            );
            const newDevices = env.fake
                .signersOf(base.address)
                .map((signer: Any) => signer.locator as string)
                .filter((locator) => !signersBefore.includes(locator));
            const failures = recovering.filter((op) => op.outcome != null && "error" in op.outcome);
            const clean = newDevices.length <= 1 && failures.length === 0;
            if (process.env.STRESS_DEBUG) {
                console.info(
                    `[wrappers] ${opsLabel} new=${newDevices.length} failures=${failures.length} overlap=${crossInstanceOverlap} spans=${runs.ops
                        .map((op) => `${op.name}[${op.start}-${op.end}]`)
                        .join(" ")}`
                );
            }
            if (!clean) {
                if (crossInstanceOverlap) {
                    noteKnown("wrappers-register-two-devices", opsLabel);
                } else {
                    expect.fail(
                        `${opsLabel}: ${newDevices.length} new device signers, failures ${failures
                            .map((op) => `${op.name}: ${describeError((op.outcome as { error: unknown }).error)}`)
                            .join("; ")}`
                    );
                }
            }
        });
    }, 120_000);
});

describe.each(DEVICE_CHAINS)("randomized approvals by quorum members on their own devices (%s)", (chain) => {
    it("each member's approve() settles; the request lands once the threshold is met; no member signs twice", async () => {
        await forEachSeed(stressRuns(40), async (runSeed) => {
            env.dispose();
            env = stressEnv(runSeed);
            const random = env.rng.fork(`quorum-${chain}`);
            const members = [env.key(chain), env.key(chain), env.key(chain)];
            const threshold = random.int(1, 3);
            const creator = (await drive(
                env.sdk().createWallet({ chain, recoveryMethods: [quorumOf(members, threshold)] } as Any)
            )) as AnyWallet;
            const quorum = env.fake.renderedWallet(creator.address).config.recoveryMethods[0].locator;
            const client = env.client();
            const walletLocator = chain === "stellar" ? "me:stellar:smart" : "me:evm:smart";
            const token = chain === "stellar" ? "stellar:usdc" : "base-sepolia:usdc";
            const requests: string[] = [];
            for (let i = random.int(1, 3); i > 0; i--) {
                requests.push(
                    (
                        (await client.send(walletLocator, token, {
                            recipient: recipientFor(chain, random),
                            amount: "1",
                            signer: quorum,
                        } as Any)) as Any
                    ).id
                );
            }
            // Each member on its own device, holding only its own key (selected with useRecoveryMethod).
            const memberWallets: AnyWallet[] = [];
            for (const member of members) {
                const wallet = (await drive(env.sdk().getWallet({ chain } as Any))) as AnyWallet;
                await drive(wallet.useRecoveryMethod(member.config));
                memberWallets.push(wallet);
            }
            const label = `seed=${runSeed} chain=${chain} threshold=${threshold} requests=${requests.length}`;

            jitterFetch(env, random.fork("fetch"), 1_500);
            const runs = batch();
            const signsBefore = members.map((member) => member.signCount());
            // Every member approves every request, in a random order; one member may approve two requests at once.
            for (const [index, wallet] of memberWallets.entries()) {
                for (const transactionId of random.shuffle(requests)) {
                    void runs.run(
                        `approve@${index}:${transactionId.slice(0, 4)}`,
                        false,
                        () => wallet.approve({ transactionId }),
                        random.bool(0.4) ? 0 : random.int(0, 3_000)
                    );
                }
            }
            await runs.settleAll();
            vi.stubGlobal("fetch", env.fake.fetch);
            const opsLabel = `${label} ops=${runs.ops.map((op) => op.name).join(",")}`;
            assertSettledAndTyped(runs.ops, opsLabel);

            // One member approving two requests at once is the known stand-in overlap (QuorumSignerNotSupportedError).
            for (const op of runs.ops) {
                if (op.outcome == null || !("error" in op.outcome)) continue;
                const member = op.name.split(":")[0];
                const ownOverlap = runs.ops.some((other) => other.name.split(":")[0] === member && overlap(op, other));
                if (op.outcome.error instanceof QuorumSignerNotSupportedError && ownOverlap) {
                    noteKnown("standin-approve-overlap");
                } else {
                    expect.fail(`${opsLabel}: ${op.name} failed: ${describeError(op.outcome.error)}`);
                }
            }
            for (const transactionId of requests) {
                for (let i = 0; i < 4; i++) env.fake.tick();
                expect(env.fake.renderedRequest(transactionId).status, `${opsLabel}: ${transactionId}`).toEqual(
                    knownTally.has("standin-approve-overlap") ? expect.any(String) : "success"
                );
            }
            // A member signs each request at most once (a resubmission is ignored by the API but still a prompt).
            const signs = members.map((member, i) => member.signCount() - signsBefore[i]);
            for (const count of signs) {
                expect(count, `${opsLabel}: signatures per member ${signs}`).toBeLessThanOrEqual(requests.length);
            }
        });
    }, 120_000);

    afterEach(() => {
        if (knownTally.size > 0) {
            console.info(`[concurrency] known bugs hit: ${JSON.stringify(Object.fromEntries(knownTally))}`);
            knownTally.clear();
        }
    });
});
