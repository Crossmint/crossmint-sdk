/**
 * m7 stress: device recovery, flat and through a recovery quorum (EDD 007 §7 "Automatic recovery", use case 6).
 *
 * A model-based random walk per seed: the device loses its key, the app restarts, `recover()`, `send` (automatic
 * recovery), members approve, `useRecoveryMethod` / `useSigner`, requests expire and faults hit any route. After every
 * step the walk checks the invariants below against the fake's state; at the end it stops the faults, lets the members
 * approve and checks that recovery completes.
 *
 * Invariants: (a) the SDK never deletes the key of a quorum registration that can still land; (b) a device holds at most
 * one key with a live registration; (c) the API never holds two live registrations for one device signer; (d) every
 * device registration or removal the app creates is approved by its selection (the selected member's quorum, or the
 * selected flat method); (f) `needsRecovery()` and what `recover()` returns match the fake; (g) no programming error,
 * unhandled rejection or hang without a hang fault; then liveness: with the faults stopped and the members approving,
 * recovery completes, the device sends, and on Stellar the old devices this storage saved are gone.
 * Known findings (the `BUG:` repros below) are counted, not failed on. `STRESS_KIND` / `STRESS_CHAIN` force a wallet
 * kind or chain, `STRESS_STEPS` the walk length, `STRESS_VERBOSE` / `STRESS_CALLS` print the walk.
 *
 * Replay one run: `STRESS_SEED=<n> STRESS_RUNS=1 pnpm exec vitest run src/tests/stress/device-recovery.stress.test.ts`.
 * Throwaway m7 code, never merged.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Wallet } from "../../wallets/wallet";
import type { FakeRequest, FaultKind, RouteName } from "./fake-api";
import {
    drive,
    forEachSeed,
    quorumOf,
    recipientFor,
    rng as seededRng,
    settle,
    stressEnv,
    stressRuns,
    useStressTimers,
    type Rng,
    type StressEnv,
} from "./harness";
import {
    type Any,
    apiSignerStatus,
    approveParams,
    approvedByQuorum,
    describeError,
    isFaultError,
    isLive,
    isProgrammingError,
    registrationsOf,
    rejectable,
    removalsOf,
    type RejectableKey,
    TrackedDevice,
} from "./device-recovery.helpers";

type Chain = "base-sepolia" | "stellar";
type Kind = "quorum" | "flat1" | "flat2" | "mixed";
type Selection = { kind: "member"; key: RejectableKey } | { kind: "flat"; key: RejectableKey } | null;

const CHAINS: Chain[] = ["base-sepolia", "stellar"];
const KINDS: Kind[] = ["quorum", "quorum", "flat1", "flat2", "mixed"];
const HANG_MS = 3 * 60_000;
const lower = (value: string | undefined | null) => (value == null ? value : value.toLowerCase());

// ---------------------------------------------------------------------------------------------------------------------
// Unhandled rejections are a finding of their own.
// ---------------------------------------------------------------------------------------------------------------------

const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => {
    unhandled.push(reason);
};
beforeAll(() => {
    process.on("unhandledRejection", onUnhandled);
});
afterAll(() => {
    process.off("unhandledRejection", onUnhandled);
});

beforeEach(() => {
    useStressTimers();
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

// ---------------------------------------------------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------------------------------------------------

type Outcome<T> = { value: T } | { error: unknown };

export class Walk {
    readonly env: StressEnv;
    readonly rng: Rng;
    readonly members: RejectableKey[];
    readonly flats: RejectableKey[];
    readonly stranger: RejectableKey;
    readonly devices: TrackedDevice[] = [];
    device: TrackedDevice;
    address = "";
    quorumLocator: string | null = null;
    wallet: Wallet<Any> | null = null;
    selection: Selection = null;
    /** The selection the app re-applies on start. */
    preferred: Selection = null;
    readonly known: string[] = [];
    readonly log: string[] = [];
    readonly violations: string[] = [];
    step = 0;
    stepSelections: Selection[] = [];
    #faultsAtStep = 0;
    #callsAtStep = 0;
    #reported = new Set<string>();

    constructor(
        seed: number,
        readonly chain: Chain,
        readonly kind: Kind,
        readonly threshold: number
    ) {
        this.env = stressEnv(seed, { approvalTtlMs: 2 * 60 * 60_000 });
        this.rng = this.env.rng.fork("walk");
        const needsMembers = kind === "quorum" || kind === "mixed";
        this.members = needsMembers ? [0, 1, 2].map(() => rejectable(this.env.key(chain))) : [];
        this.flats = kind === "flat1" ? [rejectable(this.env.key(chain))] : kind === "quorum" ? [] : [];
        if (kind === "flat2") this.flats.push(rejectable(this.env.key(chain)), rejectable(this.env.key(chain)));
        if (kind === "mixed") this.flats.push(rejectable(this.env.key(chain)));
        this.stranger = rejectable(this.env.key(chain));
        this.device = this.newDevice();
    }

    get fake() {
        return this.env.fake;
    }

    newDevice(): TrackedDevice {
        const device = new TrackedDevice(this.env.rng.fork(`device-${this.devices.length}`).next);
        device.base64Messages = this.chain === "stellar";
        this.devices.push(device);
        return device;
    }

    note(line: string) {
        this.log.push(`#${this.step} ${line}`);
    }

    violate(key: string, message: string) {
        if (this.#reported.has(key)) return;
        this.#reported.add(key);
        this.violations.push(`#${this.step} ${message}`);
        this.note(`VIOLATION ${message}`);
    }

    faultsThisStep() {
        return this.fake.faults.fired.slice(this.#faultsAtStep);
    }

    callsThisStep() {
        return this.fake.calls.slice(this.#callsAtStep);
    }

    recoveryConfig(): Any {
        const quorum = this.members.length > 0 ? quorumOf(this.members, this.threshold) : null;
        switch (this.kind) {
            case "quorum":
                return { recoveryMethods: [quorum] };
            case "flat1":
                return { recovery: this.flats[0].config };
            case "flat2":
                return { recoveryMethods: this.flats.map((key) => key.config) };
            case "mixed":
                return { recoveryMethods: [this.flats[0].config, quorum] };
        }
    }

    walletArgs(): Any {
        const options = { deviceSignerKeyStorage: this.device };
        return this.kind === "flat1"
            ? { chain: this.chain, recovery: this.flats[0].config, options }
            : { chain: this.chain, options };
    }

    /** Runs an SDK call, driving fake time; a hang without a hang fault and a programming error are violations. */
    async run<T>(label: string, call: () => Promise<T>, actor: "app" | "member" = "app"): Promise<Outcome<T>> {
        let promise: Promise<T>;
        try {
            promise = call();
        } catch (error) {
            promise = Promise.reject(error);
        }
        const outcome = await settle(promise, { stepMs: 500, maxMs: HANG_MS });
        if ("error" in outcome) {
            const error = outcome.error;
            const message = describeError(error);
            if (error instanceof Error && error.message.startsWith("drive: the call did not settle")) {
                const hangFired = this.faultsThisStep().some((fault) => fault.fault === "hang");
                this.note(`${label} HANG${hangFired ? " (hang fault)" : ""}`);
                if (!hangFired) this.violate(`hang-${label}-${this.step}`, `${label} hung with no hang fault`);
                if (actor === "app") {
                    this.wallet = null;
                    this.selection = null;
                }
                return outcome;
            }
            this.note(`${label} threw ${message}`);
            if (isProgrammingError(error)) {
                this.violate(`prog-${message}`, `${label} threw a programming error: ${message}`);
            }
            return outcome;
        }
        return outcome;
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Setup
    // -----------------------------------------------------------------------------------------------------------------

    async create() {
        const outcome = await this.run("createWallet", () =>
            this.env.sdk().createWallet({
                chain: this.chain,
                ...this.recoveryConfig(),
                options: { deviceSignerKeyStorage: this.device },
            } as Any)
        );
        if ("error" in outcome) throw outcome.error;
        this.wallet = outcome.value as Wallet<Any>;
        this.address = this.wallet.address;
        const recovery = this.fake.renderedWallet(this.address).config.recoveryMethods;
        this.quorumLocator = recovery.find((entry: Any) => entry.type === "quorum")?.locator ?? null;
        const held = this.device.heldLocator(this.address);
        if (held == null || apiSignerStatus(this.fake, this.address, this.chain, held) !== "active") {
            throw new Error(`setup: the created wallet has no active device signer (${held})`);
        }
        this.preferred = this.defaultSelection();
        this.note(`created ${this.kind} on ${this.chain} threshold=${this.threshold} device=${held.slice(0, 20)}`);
    }

    defaultSelection(): Selection {
        if (this.kind === "quorum") return { kind: "member", key: this.rng.pick(this.members) };
        if (this.kind === "flat2") return { kind: "flat", key: this.rng.pick(this.flats) };
        if (this.kind === "mixed") {
            return this.rng.bool()
                ? { kind: "member", key: this.rng.pick(this.members) }
                : { kind: "flat", key: this.flats[0] };
        }
        return null;
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Steps
    // -----------------------------------------------------------------------------------------------------------------

    async restart(reselect: boolean) {
        this.wallet = null;
        this.selection = null;
        const outcome = await this.run("restart", () => this.env.sdk().getWallet(this.walletArgs()));
        if ("error" in outcome) return;
        this.wallet = outcome.value as Wallet<Any>;
        this.note(`restart needsRecovery=${this.wallet.needsRecovery()} signer=${this.wallet.signer?.type ?? "none"}`);
        this.checkNeedsRecoveryAfterInit();
        if (reselect && this.preferred != null) {
            await this.select(this.preferred);
        }
    }

    async ensureApp(): Promise<Wallet<Any> | null> {
        if (this.wallet == null) await this.restart(this.rng.bool(0.8));
        return this.wallet;
    }

    async select(selection: NonNullable<Selection>) {
        const wallet = this.wallet;
        if (wallet == null) return;
        const outcome = await this.run(`useRecoveryMethod(${selection.kind})`, () =>
            wallet.useRecoveryMethod(selection.key.config)
        );
        if ("value" in outcome) {
            this.selection = selection;
            this.preferred = selection;
            this.stepSelections.push(selection);
        } else if (!isFaultError(outcome.error)) {
            this.violate(
                `select-${describeError(outcome.error)}`,
                `useRecoveryMethod of a valid key threw ${describeError(outcome.error)}`
            );
        }
    }

    async stepLoseKey() {
        if (this.rng.bool(0.6)) {
            await this.device.loseKey(this.address);
            this.note("loseKey (deleteKey; the saved locator survives)");
        } else {
            this.device = this.newDevice();
            this.note("loseKey (a new device)");
        }
        await this.restart(this.rng.bool(0.8));
    }

    async stepRecover() {
        const wallet = await this.ensureApp();
        if (wallet == null) return;
        const outcome = await this.run("recover", () => wallet.recover());
        if ("value" in outcome) {
            this.note(`recover → ${JSON.stringify(outcome.value) ?? "undefined"}`);
            this.remember(outcome.value);
            this.checkAfterRecover(wallet, outcome.value);
        }
    }

    remember(result: Any) {
        const id = result?.transactionId ?? result?.signatureId;
        if (id != null) this.known.push(id);
    }

    async stepSend() {
        const wallet = await this.ensureApp();
        if (wallet == null) return;
        const outcome = await this.run("send", () => wallet.send(recipientFor(this.chain, this.rng), "usdc", "1"));
        if ("value" in outcome) {
            const value: Any = outcome.value;
            this.note(`send → hash=${value.hash != null} tx=${value.transactionId}`);
        }
    }

    async stepConcurrent() {
        const wallet = await this.ensureApp();
        if (wallet == null) return;
        const generatedBefore = this.device.calls.filter((call) => call.method === "generateKey").length;
        const outcome = await this.run("recover‖send", () =>
            Promise.allSettled([
                wallet.recover(),
                wallet.send(recipientFor(this.chain, this.rng), "usdc", "1"),
                wallet.recover(),
            ])
        );
        if ("value" in outcome) {
            const [first, , third] = outcome.value as PromiseSettledResult<Any>[];
            this.note(`recover‖send‖recover → ${outcome.value.map((r) => r.status).join(",")}`);
            if (first.status === "fulfilled") this.remember(first.value);
            if (first.status === "fulfilled" && third.status === "fulfilled") {
                if (JSON.stringify(first.value) !== JSON.stringify(third.value)) {
                    this.violate(
                        `concurrent-${this.step}`,
                        `two concurrent recover() calls returned different results: ${JSON.stringify(first.value)} vs ${JSON.stringify(third.value)}`
                    );
                }
            }
        }
        const generated = this.device.calls.filter((call) => call.method === "generateKey").length - generatedBefore;
        if (generated > 1) {
            this.violate(`concurrent-keys-${this.step}`, `one shared recovery run generated ${generated} keys`);
        }
    }

    /** One member (or the flat recovery method) approves a live request. */
    async stepApprove() {
        const live = [...this.fake.requests.values()].filter(
            (request) => request.walletAddress === this.address && request.status === "awaiting-approval"
        );
        if (live.length === 0) return;
        const knownLive = live.filter((request) => this.known.includes(request.id));
        const request = knownLive.length > 0 && this.rng.bool(0.75) ? this.rng.pick(knownLive) : this.rng.pick(live);
        const quorumPending = request.pending.find((entry: Any) => entry.kind === "quorum") as Any;
        let key: RejectableKey | undefined;
        if (quorumPending != null) {
            key = this.rng.pick(this.members);
        } else {
            const flatPending = request.pending.find((entry: Any) => entry.kind === "flat") as Any;
            key = this.flats.find((flat) => lower(flat.locator) === lower(flatPending?.signer?.locator));
        }
        if (key == null) return;
        const onApp =
            this.wallet != null && this.selection?.kind === "member" && this.selection.key === key && this.rng.bool(0.4)
                ? this.wallet
                : null;
        const label = `approve(${request.purpose}) by ${key.address.slice(0, 8)}${onApp ? " on the app" : ""}`;
        if (onApp != null) {
            const outcome = await this.run(label, () => onApp.approve(approveParams(request) as Any));
            if ("value" in outcome) this.note(`${label} → hash=${(outcome.value as Any)?.hash != null}`);
            return;
        }
        const member = await this.run(
            "member getWallet",
            () => this.env.sdk().getWallet({ chain: this.chain } as Any),
            "member"
        );
        if ("error" in member) return;
        const memberWallet = member.value as Wallet<Any>;
        const selected = await this.run(
            "member useRecoveryMethod",
            () => memberWallet.useRecoveryMethod(key.config),
            "member"
        );
        if ("error" in selected) return;
        const outcome = await this.run(label, () => memberWallet.approve(approveParams(request) as Any), "member");
        if ("value" in outcome) this.note(`${label} → hash=${(outcome.value as Any)?.hash != null}`);
    }

    async stepSelect() {
        const wallet = await this.ensureApp();
        if (wallet == null) return;
        const options: Array<NonNullable<Selection> | "stranger"> = [
            ...this.members.map((key) => ({ kind: "member" as const, key })),
            ...this.flats.map((key) => ({ kind: "flat" as const, key })),
            "stranger",
        ];
        const choice = this.rng.pick(options);
        if (choice === "stranger") {
            const outcome = await this.run("useRecoveryMethod(stranger)", () =>
                wallet.useRecoveryMethod(this.stranger.config)
            );
            if ("value" in outcome)
                this.violate(
                    "stranger-select",
                    "useRecoveryMethod accepted a key that is no recovery method or member"
                );
            return;
        }
        await this.select(choice);
        this.note(`useRecoveryMethod(${choice.kind} ${choice.key.address.slice(0, 8)})`);
    }

    async stepUseSigner() {
        const wallet = await this.ensureApp();
        if (wallet == null) return;
        const options: Array<{ label: string; config: Any }> = [
            { label: "device", config: { type: "device" } },
            ...this.members.map((key) => ({ label: "member", config: key.config })),
            ...this.flats.map((key) => ({ label: "flat", config: key.config })),
        ];
        const choice = this.rng.pick(options);
        const outcome = await this.run(`useSigner(${choice.label})`, () => wallet.useSigner(choice.config));
        if ("value" in outcome) this.note(`useSigner(${choice.label}) → needsRecovery=${wallet.needsRecovery()}`);
    }

    stepExpire() {
        const live = [...this.fake.requests.values()].filter(
            (request) => request.walletAddress === this.address && request.status === "awaiting-approval"
        );
        if (live.length === 0) return;
        const preferred = live.filter((request) => request.purpose !== "send" && request.purpose !== "transaction");
        const request = this.rng.pick(preferred.length > 0 && this.rng.bool(0.8) ? preferred : live);
        this.fake.expire(request.id);
        this.note(`expire ${request.purpose} ${request.id.slice(0, 8)}`);
    }

    stepFault() {
        const routes: RouteName[] = [
            "getWallet",
            "getSigner",
            "registerSigner",
            "removeSigner",
            "getTransaction",
            "approveTransaction",
            "getSignature",
            "approveSignature",
            "send",
            "listTransactions",
            "listSignatures",
        ];
        const route = this.rng.pick(routes);
        const kinds: FaultKind[] = [
            { type: "status", status: 503 },
            { type: "status", status: 503 },
            { type: "network" },
            { type: "network" },
            { type: "html", status: 502 },
            { type: "hang" },
            { type: "delay", ms: this.rng.int(100, 4000) },
            ...(route === "getSigner"
                ? [{ type: "status", status: 429 } as FaultKind, { type: "null-body" } as FaultKind]
                : [{ type: "status", status: 404 } as FaultKind]),
        ];
        const fault = this.rng.pick(kinds);
        const phase = fault.type === "null-body" || fault.type === "delay" || !this.rng.bool(0.5) ? "before" : "after";
        const times = this.rng.int(1, 2);
        const skip = this.rng.int(0, 3);
        const label = `${route}:${fault.type}${"status" in fault ? fault.status : ""}:${phase}`;
        this.fake.faults.add({ route, fault, times, skip, phase, label });
        this.note(`arm fault ${label} times=${times} skip=${skip}`);
    }

    stepReject() {
        const keys = [...this.members, ...this.flats];
        if (keys.length === 0) return;
        const key = this.rng.pick(keys);
        key.rejectOnce();
        this.note(`${key.address.slice(0, 8)} will reject its next onSign`);
    }

    async runStep() {
        this.step++;
        for (const device of this.devices) device.step = this.step;
        this.#faultsAtStep = this.fake.faults.fired.length;
        this.#callsAtStep = this.fake.calls.length;
        this.stepSelections = [this.selection];
        const weights: Array<[string, number]> = [
            ["loseKey", 2],
            ["restart", 2],
            ["recover", 5],
            ["send", 3],
            ["approve", 5],
            ["select", 2],
            ["useSigner", 1],
            ["expire", 1],
            ["fault", 4],
            ["concurrent", 1],
            ["reject", 1],
        ];
        const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
        let draw = this.rng.next() * total;
        let step = weights[0][0];
        for (const [name, weight] of weights) {
            draw -= weight;
            if (draw < 0) {
                step = name;
                break;
            }
        }
        switch (step) {
            case "loseKey":
                await this.stepLoseKey();
                break;
            case "restart":
                await this.restart(this.rng.bool(0.8));
                break;
            case "recover":
                await this.stepRecover();
                break;
            case "send":
                await this.stepSend();
                break;
            case "approve":
                await this.stepApprove();
                break;
            case "select":
                await this.stepSelect();
                break;
            case "useSigner":
                await this.stepUseSigner();
                break;
            case "expire":
                this.stepExpire();
                break;
            case "fault":
                this.stepFault();
                break;
            case "concurrent":
                await this.stepConcurrent();
                break;
            case "reject":
                this.stepReject();
                break;
        }
        if (process.env.STRESS_CALLS) {
            this.note(
                `calls: ${this.callsThisStep()
                    .map(
                        (call) =>
                            `${call.seq}:${call.route}${call.status != null ? `=${call.status}` : ""}${call.route === "registerSigner" ? `[${call.body?.approver ?? "-"}]` : ""}`
                    )
                    .join(" ")}`
            );
        }
        const fired = this.faultsThisStep();
        if (fired.length > 0) this.note(`faults fired: ${fired.map((f) => `${f.rule}@${f.route}`).join(", ")}`);
        this.checkApprovers(this.stepSelections);
        this.checkInvariants();
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Invariants
    // -----------------------------------------------------------------------------------------------------------------

    checkInvariants() {
        for (const device of this.devices) {
            // (a) The SDK never deletes the key of a registration a quorum can still approve (or already approved).
            for (const deletion of device.sdkDeletions) {
                if (device.keys.has(deletion.locator.slice("device:".length))) continue;
                const stranded = registrationsOf(this.fake, deletion.locator).filter(
                    (request) => approvedByQuorum(request) && (isLive(request) || request.status === "success")
                );
                if (stranded.length > 0) {
                    const nullBody = this.fake.faults.fired.some((fault) => fault.fault === "null-body");
                    this.violate(
                        `deleted-${deletion.locator}`,
                        `(a) the SDK deleted key ${deletion.locator.slice(0, 20)} at step ${deletion.step} while its quorum registration is ${stranded.map((r) => r.status).join("/")}${nullBody ? " (a getSigner null body fired)" : ""}`
                    );
                }
            }
            // (b) A device holds at most one key with a live registration.
            const pendingKeys = device
                .heldLocators()
                .filter((locator) => registrationsOf(this.fake, locator).some(isLive));
            if (pendingKeys.length > 1) {
                this.violate(
                    `two-pending-keys-${pendingKeys.join()}`,
                    `(b) one device holds ${pendingKeys.length} keys with live registrations`
                );
            }
        }
        // (c) The API never holds two live registrations for one device signer.
        const byLocator = new Map<string, FakeRequest[]>();
        for (const request of this.fake.requests.values()) {
            if (!request.purpose.startsWith("register device:") || !isLive(request)) continue;
            const locator = request.purpose.slice("register ".length);
            byLocator.set(locator, [...(byLocator.get(locator) ?? []), request]);
        }
        for (const [locator, requests] of byLocator) {
            if (requests.length > 1) {
                const quorum = requests.some(approvedByQuorum);
                this.violate(
                    `two-live-${locator}`,
                    `(c) ${requests.length} live registrations for ${locator.slice(0, 20)} (${quorum ? "quorum" : "flat"})`
                );
            }
        }
    }

    /** (d) Every registration and removal the app creates is approved by its selection. */
    checkApprovers(selections: Selection[]) {
        for (const call of this.callsThisStep()) {
            if (call.route !== "registerSigner" && call.route !== "removeSigner") continue;
            if (call.status == null || call.status >= 300) continue;
            const isDevice =
                call.route === "registerSigner"
                    ? call.body?.signer?.type === "device"
                    : decodeURIComponent(call.path).includes("/signers/device:");
            if (!isDevice) continue;
            const approver: string | undefined =
                call.route === "registerSigner" ? call.body?.approver : call.query.approver;
            const allowed: Array<string | undefined> = [];
            for (const selection of selections) {
                if (selection?.kind === "member") allowed.push(this.quorumLocator ?? undefined);
                if (selection?.kind === "flat") allowed.push(selection.key.locator);
                if (selection == null && this.kind === "flat1") allowed.push(undefined, this.flats[0].locator);
            }
            // A removal goes through the quorum that approved the new device, with or without a selection.
            if (call.route === "removeSigner" && this.quorumLocator != null) allowed.push(this.quorumLocator);
            if (!allowed.some((candidate) => lower(candidate) === lower(approver))) {
                this.violate(
                    `approver-${call.seq}`,
                    `(d) ${call.route} approver ${approver} but the selection is ${selections.map((s) => s?.kind ?? "none").join("→")} (${allowed.join(" | ")})`
                );
            }
        }
    }

    /** (f) After init with no fault, needsRecovery() matches whether the held key is an active signer. */
    checkNeedsRecoveryAfterInit() {
        if (this.wallet == null || this.faultsThisStep().length > 0) return;
        const held = this.device.heldLocator(this.address);
        const expected = !(held != null && apiSignerStatus(this.fake, this.address, this.chain, held) === "active");
        if (this.wallet.needsRecovery() !== expected) {
            this.violate(
                `needs-init-${this.step}`,
                `(f) after init needsRecovery()=${this.wallet.needsRecovery()} but the held key ${held?.slice(0, 20)} is ${held == null ? "none" : apiSignerStatus(this.fake, this.address, this.chain, held)}`
            );
        }
    }

    /** (f) What recover() returned matches the fake. */
    checkAfterRecover(wallet: Wallet<Any>, result: Any) {
        if (this.faultsThisStep().length > 0) return;
        if (wallet.signer != null && wallet.signer.type !== "device") return;
        const held = this.device.heldLocator(this.address);
        const status = held == null ? "none" : apiSignerStatus(this.fake, this.address, this.chain, held);
        if (result == null) {
            if (status !== "active" || wallet.needsRecovery() || wallet.signer?.locator() !== held) {
                this.violate(
                    `recover-undefined-${this.step}`,
                    `(f) recover() returned undefined but the held key is ${status}, needsRecovery()=${wallet.needsRecovery()}, signer=${wallet.signer?.locator()?.slice(0, 20)}`
                );
            }
            return;
        }
        const id = result.transactionId ?? result.signatureId;
        const request = this.fake.requests.get(id);
        if (request == null) {
            this.violate(`recover-unknown-${id}`, `(f) recover() returned ${id}, which the API does not have`);
            return;
        }
        if (request.purpose === `register ${held}`) {
            if (!wallet.needsRecovery()) {
                this.violate(
                    `recover-reg-needs-${this.step}`,
                    "(f) recover() returned the registration but needsRecovery() is false"
                );
            }
            return;
        }
        if (request.purpose.startsWith("remove device:")) {
            if (status !== "active" || wallet.needsRecovery()) {
                this.violate(
                    `recover-rm-${this.step}`,
                    `(f) recover() returned a removal but the held key is ${status}, needsRecovery()=${wallet.needsRecovery()}`
                );
            }
            return;
        }
        this.violate(
            `recover-other-${id}`,
            `(f) recover() returned ${request.purpose} (${request.status}); the held key is ${held?.slice(0, 20)}`
        );
    }

    // -----------------------------------------------------------------------------------------------------------------
    // The end: faults stop, members approve, recovery completes.
    // -----------------------------------------------------------------------------------------------------------------

    async approveAsMembers(request: FakeRequest) {
        const quorumPending = request.pending.find((entry: Any) => entry.kind === "quorum") as Any;
        if (quorumPending != null) {
            const signers = this.rng.shuffle(this.members).slice(0, this.threshold);
            for (const key of signers) {
                const member = await this.run(
                    "member getWallet",
                    () => this.env.sdk().getWallet({ chain: this.chain } as Any),
                    "member"
                );
                if ("error" in member) continue;
                const memberWallet = member.value as Wallet<Any>;
                await this.run("member select", () => memberWallet.useRecoveryMethod(key.config), "member");
                const outcome = await this.run(
                    `final approve(${request.purpose})`,
                    () => memberWallet.approve(approveParams(request) as Any),
                    "member"
                );
                if ("error" in outcome) {
                    this.violate(
                        `final-approve-${request.id}-${key.address}`,
                        `liveness: a member's approval of ${request.purpose} threw ${describeError(outcome.error)}`
                    );
                }
            }
        }
    }

    async finish() {
        this.step++;
        this.#faultsAtStep = this.fake.faults.fired.length;
        this.#callsAtStep = this.fake.calls.length;
        this.fake.faults.clear();
        for (const key of [...this.members, ...this.flats]) key.disarm();
        this.note("--- faults stop; the members approve ---");
        // The members approve what the app was told about.
        for (const id of new Set(this.known)) {
            const request = this.fake.requests.get(id);
            if (request?.status === "awaiting-approval") await this.approveAsMembers(request);
        }
        let done = false;
        for (let round = 0; round < 8 && !done; round++) {
            if (this.wallet == null) await this.restart(true);
            const wallet = this.wallet;
            if (wallet == null) {
                this.violate(`final-restart-${round}`, "liveness: getWallet failed with no faults");
                break;
            }
            if (this.selection == null && this.kind !== "flat1") {
                await this.select(this.preferred ?? (this.defaultSelection() as NonNullable<Selection>));
            }
            if (wallet.signer != null && wallet.signer.type !== "device") {
                await this.run("final useSigner(device)", () => wallet.useSigner({ type: "device" } as Any));
            }
            const outcome = await this.run("final recover", () => wallet.recover());
            if (
                "error" in outcome &&
                String((outcome.error as Error)?.message).includes("not found in pending approvals")
            ) {
                // Decided as above: the first recovery method cannot sign a registration the selection approves. Let it
                // expire, so the next recover() registers again with the selection.
                const held = this.device.heldLocator(this.address);
                for (const request of held == null ? [] : registrationsOf(this.fake, held))
                    this.fake.expire(request.id);
                continue;
            }
            if (
                "error" in outcome &&
                String((outcome.error as Error)?.message).includes("Cannot resume pending approval")
            ) {
                // Decided (on main, ticket pending): resuming a flat registration signs with the first recovery method,
                // not the selection. Select it so it can sign.
                await this.select({ kind: "flat", key: this.flats[0] });
                continue;
            }
            if ("error" in outcome) {
                this.violate(
                    `final-recover-${describeError(outcome.error)}`,
                    `liveness: recover() threw ${describeError(outcome.error)} with no faults`
                );
                this.wallet = null;
                continue;
            }
            const result: Any = outcome.value;
            this.note(`final recover → ${JSON.stringify(result) ?? "undefined"}`);
            if (result == null) {
                done = !wallet.needsRecovery();
                if (!done) this.wallet = null;
                continue;
            }
            const request = this.fake.requests.get(result.transactionId ?? result.signatureId);
            if (request == null) {
                this.violate(
                    "final-unknown",
                    `liveness: recover() returned an unknown request ${JSON.stringify(result)}`
                );
                break;
            }
            if (request.status !== "awaiting-approval") {
                // A fully approved request lands with the next API calls.
                this.fake.landAll();
                continue;
            }
            await this.approveAsMembers(request);
        }
        if (!done) {
            this.violate(
                "final-not-done",
                "liveness: recovery did not complete within 8 rounds after the faults stopped"
            );
            return;
        }
        const wallet = this.wallet as Wallet<Any>;
        const held = this.device.heldLocator(this.address);
        const status = held == null ? "none" : apiSignerStatus(this.fake, this.address, this.chain, held);
        if (status !== "active" || wallet.signer?.locator() !== held) {
            this.violate(
                "final-device",
                `liveness: after recovery the held key is ${status} and the signer is ${wallet.signer?.locator()?.slice(0, 20)}`
            );
            return;
        }
        // The old devices this storage saved are removed (Stellar; on EVM the old device may stay, as decided).
        if (this.chain === "stellar") {
            for (const old of new Set(this.device.savedHistory)) {
                if (old === held) continue;
                const oldStatus = apiSignerStatus(this.fake, this.address, this.chain, old);
                if (oldStatus === "active" || oldStatus === "pending") {
                    const removals = removalsOf(this.fake, old);
                    const why =
                        removals.length === 0
                            ? "no removal was ever created"
                            : removals.some(isLive)
                              ? `its removal still waits (${removals.some((r) => this.known.includes(r.id)) ? "returned to the app" : "never returned to the app"})`
                              : removals.every((r) => r.error?.revert != null)
                                ? "its removal expired"
                                : `its removal ${removals.map((r) => r.status).join("/")}`;
                    this.violate(
                        `final-old-${old}`,
                        `liveness: the old device ${old.slice(0, 20)} this storage saved is still ${oldStatus}: ${why} (${removals.some(approvedByQuorum) ? "quorum" : "flat"})`
                    );
                }
            }
        }
        const sent = await this.run("final send", () => wallet.send(recipientFor(this.chain, this.rng), "usdc", "1"));
        if ("error" in sent || (sent.value as Any).hash == null) {
            this.violate(
                "final-send",
                `liveness: the recovered device could not send: ${"error" in sent ? describeError(sent.error) : "no hash"}`
            );
        }
    }
}

export function statsOf(world: Walk): Record<string, number> {
    const requests = [...world.fake.requests.values()];
    const count = (predicate: (request: FakeRequest) => boolean) => requests.filter(predicate).length;
    const deviceRegistration = (request: FakeRequest) => request.purpose.startsWith("register device:");
    const deviceRemoval = (request: FakeRequest) => request.purpose.startsWith("remove device:");
    return {
        walks: 1,
        quorumRegistrations: count((r) => deviceRegistration(r) && approvedByQuorum(r)),
        quorumRegistrationsLanded: count((r) => deviceRegistration(r) && approvedByQuorum(r) && r.status === "success"),
        flatRegistrations: count((r) => deviceRegistration(r) && !approvedByQuorum(r)),
        quorumRemovals: count((r) => deviceRemoval(r) && approvedByQuorum(r)),
        quorumRemovalsLanded: count((r) => deviceRemoval(r) && approvedByQuorum(r) && r.status === "success"),
        flatRemovals: count((r) => deviceRemoval(r) && !approvedByQuorum(r)),
        expired: count((r) => r.status === "failed" && r.error?.revert != null),
        sdkKeyDeletions: world.devices.reduce((sum, device) => sum + device.sdkDeletions.length, 0),
        faultsFired: world.fake.faults.fired.length,
        hangs: world.log.filter((line) => line.includes("HANG")).length,
    };
}

async function walk(seed: number, steps: number, forced?: { chain?: Chain; kind?: Kind }) {
    // A separate stream for the run's shape, so the walk's draws do not depend on it.
    const pick = seededRng((seed ^ 0x5eed) >>> 0);
    const chain = forced?.chain ?? pick.pick(CHAINS);
    const kind = forced?.kind ?? pick.pick(KINDS);
    const threshold = pick.int(1, 3);
    const world = new Walk(seed, chain, kind, threshold);
    const unhandledBefore = unhandled.length;
    try {
        await world.create();
        for (let i = 0; i < steps; i++) await world.runStep();
        await world.finish();
    } finally {
        world.env.dispose();
    }
    for (const reason of unhandled.slice(unhandledBefore)) {
        world.violations.push(`unhandled rejection: ${describeError(reason)}`);
    }
    return world;
}

const STEPS = Number(process.env.STRESS_STEPS ?? 30);

/** Violations the repros below pin down; the walk counts them instead of failing on them. */
const KNOWN: Array<[string, RegExp]> = [
    [
        "old device kept after its removal failed, expired or was dropped (repros 1-3)",
        /liveness: the old device .* is still/,
    ],
    ["deleted key kept as the active signer (repro 4)", /held key is none/],
    // At the fake's signer limit an orphaned old device (repros 1-3) blocks the next registration; the fake also
    // counts an EVM genesis signer removed from the chain (ASSUMPTION in fake-api.ts registerSigner).
    ["signer limit reached by orphaned devices", /limit of \d+ signers/],
    ["key of a quorum registration deleted after a null getSigner body (repro 5)", /^#\d+ \(a\).*null body fired/],
];

describe("device recovery random walks", () => {
    it(
        "keep the device-recovery invariants, flat and through a recovery quorum, on EVM and Stellar",
        async () => {
            const findings: string[] = [];
            const known: Record<string, number> = {};
            const totals: Record<string, number> = {};
            await forEachSeed(stressRuns(200), async (seed) => {
                const world = await walk(seed, STEPS, {
                    chain: (process.env.STRESS_CHAIN as Chain | undefined) ?? undefined,
                    kind: (process.env.STRESS_KIND as Kind | undefined) ?? undefined,
                });
                for (const [key, value] of Object.entries(statsOf(world))) totals[key] = (totals[key] ?? 0) + value;
                if (process.env.STRESS_VERBOSE) {
                    console.info(
                        `seed=${seed} ${world.kind} ${world.chain} t=${world.threshold}\n    ${world.log.join("\n    ")}`
                    );
                }
                const unknown = world.violations.filter((violation) => {
                    const match = KNOWN.find(([, pattern]) => pattern.test(violation));
                    if (match != null) known[match[0]] = (known[match[0]] ?? 0) + 1;
                    return match == null;
                });
                if (unknown.length > 0 || (process.env.STRESS_SHOW_KNOWN && world.violations.length > 0)) {
                    findings.push(
                        `seed=${seed} ${world.kind} ${world.chain} t=${world.threshold}\n  ${world.violations.join("\n  ")}\n  log:\n    ${world.log.join("\n    ")}`
                    );
                }
            });
            console.info(`[device-recovery] coverage ${JSON.stringify(totals)}`);
            console.info(`[device-recovery] known findings hit ${JSON.stringify(known)}`);
            if (findings.length > 0) {
                console.info(findings.join("\n\n"));
            }
            expect(findings).toEqual([]);
        },
        10 * 60_000
    );
});

export { walk };

// ---------------------------------------------------------------------------------------------------------------------
// Deterministic repros of what the walks found. `it.fails` keeps the file green while the behavior stands.
// ---------------------------------------------------------------------------------------------------------------------

const REPRO_SEED = 7;
/** `STRESS_SHOW_BUGS=1` runs the repros as plain tests, to read where each one fails. */
const bug = process.env.STRESS_SHOW_BUGS ? it : it.fails;

async function membersApprove(env: StressEnv, chain: string, members: RejectableKey[], request: Any) {
    let last: Any;
    for (const member of members) {
        const memberWallet: Any = await drive(env.sdk().getWallet({ chain } as Any));
        await drive(memberWallet.useRecoveryMethod(member.config));
        last = await drive(memberWallet.approve(request));
    }
    return last;
}

/** A Stellar wallet with a 2-of-3 recovery quorum whose device lost its key; the app selected Alice. */
async function quorumWalletAfterKeyLoss(chain: Chain = "stellar") {
    const env = stressEnv(REPRO_SEED);
    const members = [0, 1, 2].map(() => rejectable(env.key(chain)));
    const device = env.device();
    const created: Any = await drive(
        env.sdk().createWallet({
            chain,
            recoveryMethods: [quorumOf(members, 2)],
            options: { deviceSignerKeyStorage: device },
        } as Any)
    );
    const address: string = created.address;
    const oldDevice = device.locatorFor(address) as string;
    await device.deleteKey(address);
    const open = async () => {
        const wallet: Any = await drive(
            env.sdk().getWallet({ chain, options: { deviceSignerKeyStorage: device } } as Any)
        );
        await drive(wallet.useRecoveryMethod(members[0].config));
        return wallet;
    };
    const wallet = await open();
    return { env, members, device, address, oldDevice, wallet, open, chain };
}

/** A wallet with one flat external-wallet recovery method whose device lost its key. */
async function flatWalletAfterKeyLoss(chain: Chain = "stellar") {
    const env = stressEnv(REPRO_SEED);
    const recovery = rejectable(env.key(chain));
    const device = env.device();
    const created: Any = await drive(
        env.sdk().createWallet({ chain, recovery: recovery.config, options: { deviceSignerKeyStorage: device } } as Any)
    );
    const address: string = created.address;
    const oldDevice = device.locatorFor(address) as string;
    await device.deleteKey(address);
    const open = async () =>
        (await drive(
            env
                .sdk()
                .getWallet({ chain, recovery: recovery.config, options: { deviceSignerKeyStorage: device } } as Any)
        )) as Any;
    const wallet = await open();
    return { env, recovery, device, address, oldDevice, wallet, open, chain };
}

describe("device recovery repros", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    bug("BUG: the old device signer stays forever once its removal fails (flat, 503 on removeSigner)", async () => {
        const { env, address, oldDevice, wallet, open, chain } = await flatWalletAfterKeyLoss();
        env.fake.faults.failNext("removeSigner", { type: "status", status: 503 });

        await expect(drive(wallet.recover())).resolves.toBeUndefined();
        expect(apiSignerStatus(env.fake, address, chain, oldDevice)).toBe("active");

        // Later runs, with the API healthy again, never retry the removal.
        const restarted = await open();
        await drive(restarted.recover());
        await drive(restarted.send(recipientFor(chain, env.rng), "usdc", "1"));

        expect(apiSignerStatus(env.fake, address, chain, oldDevice)).toBe("absent");
    });

    bug("BUG: the old device signer stays forever once its quorum removal expires", async () => {
        const { env, members, address, oldDevice, wallet, open, chain } = await quorumWalletAfterKeyLoss();
        const registration = await drive(wallet.recover());
        await membersApprove(env, chain, members.slice(0, 2), registration);
        const removal: Any = await drive(wallet.recover());
        expect(env.fake.requests.get(removal.transactionId)?.purpose).toBe(`remove ${oldDevice}`);

        // The members do not approve the removal in time.
        env.fake.expire(removal.transactionId);

        // Neither the same wallet nor a restarted one asks for the removal again.
        await expect(drive(wallet.recover())).resolves.toBeUndefined();
        const restarted = await open();
        const again = await drive(restarted.recover());
        expect(apiSignerStatus(env.fake, address, chain, oldDevice)).toBe("active");
        expect(again).toEqual({ transactionId: expect.any(String) });
    });

    bug(
        "BUG: automatic recovery in send() drops the old device's quorum removal; recover() then returns nothing",
        async () => {
            const { env, members, oldDevice, wallet, chain } = await quorumWalletAfterKeyLoss();
            const registration = await drive(wallet.recover());
            await membersApprove(env, chain, members.slice(0, 2), registration);

            // send() recovers first: the device is active now, and the removal of the old one is created for the quorum.
            const sent: Any = await drive(wallet.send(recipientFor(chain, env.rng), "usdc", "1"));
            expect(sent.hash).toEqual(expect.any(String));
            const removal = removalsOf(env.fake, oldDevice).find(isLive);
            expect(removal?.status).toBe("awaiting-approval");

            // Nothing returned its id, and recover() no longer does: the members cannot approve it through the SDK.
            await expect(drive(wallet.recover())).resolves.toEqual({ transactionId: removal?.id });
        }
    );

    bug(
        "BUG: after a rejected flat re-registration the deleted key stays the active signer and the next recover() registers it",
        async () => {
            const { env, recovery, device, address, wallet, open, chain } = await flatWalletAfterKeyLoss();
            // The app closes while the recovery wallet prompt is open: the registration of the new key is left pending.
            env.fake.faults.failNext("getTransaction", { type: "hang" });
            const first = await settle(wallet.recover(), { stepMs: 500, maxMs: 30_000 });
            expect("error" in first && String((first.error as Error).message)).toContain("did not settle");
            const newDevice = device.locatorFor(address) as string;
            const [pending] = registrationsOf(env.fake, newDevice);
            // It expires before the user opens the app again.
            env.fake.expire(pending.id);

            const reopened = await open();
            expect(reopened.needsRecovery()).toBe(true);
            expect(reopened.signer?.locator()).toBe(newDevice);

            // The user dismisses the wallet prompt of the second registration: the SDK deletes the key...
            recovery.rejectOnce();
            const rejected = await settle(reopened.recover());
            expect("error" in rejected && (rejected.error as Error).name).toBe("UserRejectedRequestError");
            expect(device.locatorFor(address)).toBeNull();

            // ...but keeps it as the active signer, so the next recover() approves the registration of the deleted key.
            await drive(reopened.recover());
            expect(apiSignerStatus(env.fake, address, chain, newDevice)).toBe("active");
            expect(reopened.needsRecovery()).toBe(false);
            expect(reopened.signer?.locator()).toBe(device.locatorFor(address));
        }
    );

    bug(
        "BUG: a 200 getSigner with a null body reads as not registered, so the key of a pending quorum registration is deleted",
        async () => {
            const { env, device, address, oldDevice, wallet } = await quorumWalletAfterKeyLoss();
            const oldEncoded = encodeURIComponent(oldDevice).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            // Lookups of any device signer but the old one answer `null`; the registration is applied but its response lost.
            env.fake.faults.add({
                route: "getSigner",
                path: new RegExp(`/signers/device%3A(?!${oldEncoded.slice("device%3A".length)})`),
                fault: { type: "null-body" },
                times: 5,
            });
            env.fake.faults.add({ route: "registerSigner", fault: { type: "status", status: 503 }, phase: "after" });

            const outcome = await settle(wallet.recover());
            expect("error" in outcome).toBe(true);
            const live = [...env.fake.requests.values()].filter(
                (request) =>
                    request.purpose.startsWith("register device:") && isLive(request) && approvedByQuorum(request)
            );
            expect(live).toHaveLength(1);
            // The registration the members can still approve names a key this device no longer holds.
            expect(device.locatorFor(address)).toBe(live[0].purpose.slice("register ".length));
        }
    );
});

describe("device recovery across app instances", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    bug("BUG: two app instances on one device storage each create a key and a quorum registration", async () => {
        const { env, device, address, open } = await quorumWalletAfterKeyLoss();
        // Two tabs (or a StrictMode double mount) open the wallet after the key was lost and recover at once.
        const [first, second] = [await open(), await open()];
        const generated = () => device.calls.filter((call) => call.method === "generateKey").length;
        const before = generated();

        await drive(Promise.allSettled([first.recover(), second.recover()]));

        const live = [...env.fake.requests.values()].filter(
            (request) => request.purpose.startsWith("register device:") && isLive(request)
        );
        // One device should end with one new key and one registration for the members to approve.
        expect({ keys: generated() - before, registrations: live.length }).toEqual({ keys: 1, registrations: 1 });
        expect(device.locatorFor(address)).toBe(live[0].purpose.slice("register ".length));
    });
});
