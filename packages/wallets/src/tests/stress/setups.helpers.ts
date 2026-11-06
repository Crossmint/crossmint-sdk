/**
 * m7 stress helpers for signer setups and the default signer: a seeded setup generator, a world builder that puts the
 * setup into the fake wallets API through the raw ApiClient (so the setup does not depend on the SDK version), the
 * caller's createWallet / getWallet, probes, and an outcome fingerprint that is comparable across SDK versions.
 *
 * Runs unchanged on `main` (no quorum-only imports); quorum setups are only generated with `{ quorums: true }`.
 *
 * Throwaway m7 code: pragmatic, loosely typed on purpose.
 */
import base58 from "bs58";
import { deriveServerSignerDetails } from "../../signers/server";
import { EVMWallet } from "../../wallets/evm";
import { StellarWallet } from "../../wallets/stellar";
import { SolanaWallet } from "../../wallets/solana";
import {
    STRESS_PROJECT_ID,
    keyFor,
    recipientFor,
    rng,
    settle,
    stressEnv,
    type Rng,
    type StressDeviceStorage,
    type StressEnv,
} from "./harness";

// biome-ignore lint/suspicious/noExplicitAny: throwaway stress code
type Any = any;

export type Chain = "base-sepolia" | "stellar" | "solana";
export type FlatKind = "api-key" | "email" | "phone" | "passkey" | "external-wallet" | "server";
export type DelegatedKind = Exclude<FlatKind, "api-key"> | "quorum";
export type DeviceMode = "none" | "empty" | "approved" | "pending" | "unknown";
export type CallerMode = "create" | "create-existing" | "get";
export type RecoverySpec = { kind: FlatKind } | { kind: "quorum"; members: FlatKind[]; threshold: number };
export type DelegatedSpec = {
    kind: DelegatedKind;
    members?: FlatKind[];
    threshold?: number;
    state: "genesis" | "late" | "pending";
};

export type Setup = {
    seed: number;
    chain: Chain;
    recovery: RecoverySpec[];
    delegated: DelegatedSpec[];
    device: DeviceMode;
    deviceSaved: boolean;
    caller: CallerMode;
    recoveryArg: "omit" | "full" | "bare" | "subset";
    recoveryForm: "recovery" | "recoveryMethods";
    signersArg: "omit" | "match" | "subset" | "empty" | "foreign";
    /** Which eligible approver approves pending / late registrations. */
    approverPick: number;
};

const CHAINS: Chain[] = ["base-sepolia", "stellar", "solana"];

const chainTypeOf = (chain: Chain) => (chain === "solana" ? "solana" : chain === "stellar" ? "stellar" : "evm");
export const meLocator = (chain: Chain) => `me:${chainTypeOf(chain)}:smart`;

function flatKindsFor(chain: Chain): FlatKind[] {
    const kinds: FlatKind[] = ["api-key", "email", "phone", "external-wallet", "server"];
    return chain === "base-sepolia" ? [...kinds, "passkey"] : kinds;
}

function memberKindsFor(chain: Chain): FlatKind[] {
    const kinds: FlatKind[] = ["external-wallet", "external-wallet", "email", "phone", "server"];
    return chain === "base-sepolia" ? [...kinds, "passkey"] : kinds;
}

function pickFlat(r: Rng, chain: Chain, taken: FlatKind[]): FlatKind {
    // api-key at most once per list; anything else may repeat with a different key.
    const kinds = flatKindsFor(chain).filter((kind) => kind !== "api-key" || !taken.includes("api-key"));
    return r.pick(kinds);
}

function quorumSpec(r: Rng, chain: Chain): { kind: "quorum"; members: FlatKind[]; threshold: number } {
    const size = r.int(2, 3);
    const members = Array.from({ length: size }, () => r.pick(memberKindsFor(chain)));
    return { kind: "quorum", members, threshold: r.int(1, size) };
}

/** A seeded wallet setup and what the caller does with it. */
export function generateSetup(seed: number, { quorums }: { quorums: boolean }): Setup {
    const r = rng(seed).fork("setup");
    const chain = r.pick(CHAINS);
    const allowQuorum = quorums && chain !== "solana";

    const shape = allowQuorum
        ? r.pick(["flat", "flat", "flat", "quorum-alone", "quorum-first", "mixed"] as const)
        : ("flat" as const);
    const recovery: RecoverySpec[] = [];
    if (shape === "flat") {
        const count = r.pick([1, 1, 1, 2, 2, 3]);
        for (let i = 0; i < count; i++) {
            recovery.push({ kind: pickFlat(r, chain, recovery.map((entry) => entry.kind as FlatKind)) });
        }
    } else if (shape === "quorum-alone") {
        recovery.push(quorumSpec(r, chain));
    } else if (shape === "quorum-first") {
        recovery.push(quorumSpec(r, chain));
        recovery.push({ kind: pickFlat(r, chain, []) });
    } else {
        const entries: RecoverySpec[] = [{ kind: pickFlat(r, chain, []) }, quorumSpec(r, chain)];
        if (r.bool()) entries.push({ kind: pickFlat(r, chain, entries.map((entry) => entry.kind as FlatKind)) });
        recovery.push(...r.shuffle(entries));
    }

    const hasApiKey = recovery.some((entry) => entry.kind === "api-key");
    const hasNonCustodialApprover = recovery.some((entry) => entry.kind !== "api-key");
    const delegatedCount = r.pick([0, 0, 1, 1, 2, 3]);
    const delegated: DelegatedSpec[] = [];
    for (let i = 0; i < delegatedCount; i++) {
        const kinds: DelegatedKind[] = flatKindsFor(chain).filter((kind) => kind !== "api-key") as DelegatedKind[];
        const kind: DelegatedKind = allowQuorum && r.bool(0.25) ? "quorum" : r.pick(kinds);
        let state = r.pick(["genesis", "genesis", "late", "pending"] as const);
        if (state === "pending" && !hasNonCustodialApprover) state = "genesis";
        if (state === "late" && !hasApiKey && !recovery.some((entry) => entry.kind === "external-wallet")) {
            state = "genesis";
        }
        if (kind === "quorum") {
            const spec = quorumSpec(r, chain);
            delegated.push({ kind, members: spec.members, threshold: spec.threshold, state });
        } else {
            delegated.push({ kind, state });
        }
    }

    let device = r.pick(["none", "none", "empty", "approved", "pending", "unknown"] as const) as DeviceMode;
    if (chain === "solana" && (device === "approved" || device === "pending")) device = r.pick(["empty", "unknown"]);
    if (device === "pending" && !hasNonCustodialApprover) device = "approved";
    const deviceSaved = r.bool(0.3);

    let caller = r.pick(["get", "get", "create-existing", "create"] as const) as CallerMode;
    if (caller === "create") {
        for (const entry of delegated) entry.state = "genesis";
        if (device === "approved" || device === "pending") device = "empty";
    }
    const recoveryArg =
        caller === "create"
            ? "full"
            : caller === "create-existing"
              ? r.pick(["full", "full", "bare", "subset"] as const)
              : r.pick(["omit", "omit", "full", "bare", "subset"] as const);
    const recoveryForm = r.pick(["recovery", "recoveryMethods"] as const);
    let signersArg: Setup["signersArg"] =
        caller === "create"
            ? delegated.length > 0
                ? "match"
                : r.pick(["omit", "empty"] as const)
            : r.pick(["omit", "omit", "match", "subset", "empty", "foreign"] as const);
    if (caller === "create" && delegated.length === 0 && signersArg === "match") signersArg = "omit";
    return {
        seed,
        chain,
        recovery,
        delegated,
        device,
        deviceSaved,
        caller,
        recoveryArg,
        recoveryForm,
        signersArg,
        approverPick: r.int(0, 7),
    };
}

export function describeSetup(setup: Setup): string {
    const spec = (entry: RecoverySpec | DelegatedSpec) =>
        entry.kind === "quorum"
            ? `quorum(${entry.threshold}/${(entry.members ?? []).join("+")})`
            : (entry.kind as string);
    return [
        setup.chain,
        `recovery=[${setup.recovery.map(spec).join(",")}]`,
        `delegated=[${setup.delegated.map((entry) => `${spec(entry)}:${entry.state}`).join(",")}]`,
        `device=${setup.device}${setup.deviceSaved ? "+saved" : ""}`,
        `caller=${setup.caller}(recovery:${setup.recoveryArg}/${setup.recoveryForm}, signers:${setup.signersArg})`,
    ].join(" ");
}

// ---------------------------------------------------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------------------------------------------------

export type SetupKey = {
    label: string;
    kind: FlatKind | "quorum" | "device";
    /** The API locator; for quorums, filled in once the API assigns it. */
    locator: string;
    /** The SDK config that can sign (onSign, secret, ids). */
    full: Any;
    /** The config without what the API cannot store (no onSign, no secret). */
    bare: Any;
    /** What the raw API takes for it (createWallet / registerSigner / quorum member). */
    apiInput: Any;
    members?: SetupKey[];
    threshold?: number;
    spec?: DelegatedSpec;
};

/** A P-256 point as decimal strings, as a passkey `publicKey` carries it (fixed: the fake does not verify passkeys). */
const PASSKEY_POINT = {
    x: "48439561293906451759052585252797914202762949526041747995844080717082404635286",
    y: "36134250956749795798585127919587881956611106672985015071877198253568414405109",
};

function makeKey(env: StressEnv, values: Rng, chain: Chain, kind: FlatKind, label: string): SetupKey {
    const n = values.int(1000, 9999);
    switch (kind) {
        case "api-key":
            return {
                label,
                kind,
                locator: "api-key",
                full: { type: "api-key" },
                bare: { type: "api-key" },
                apiInput: { type: "api-key" },
            };
        case "email": {
            const email = `user${n}@stress.test`;
            const config = { type: "email", email };
            return { label, kind, locator: `email:${email}`, full: config, bare: config, apiInput: config };
        }
        case "phone": {
            const phone = `+1555${n}${values.int(100, 999)}`;
            const config = { type: "phone", phone };
            return { label, kind, locator: `phone:${phone}`, full: config, bare: config, apiInput: config };
        }
        case "passkey": {
            const id = `pk-${n}-${values.int(100, 999)}`;
            const config = { type: "passkey", id, name: id, publicKey: PASSKEY_POINT };
            return { label, kind, locator: `passkey:${id}`, full: config, bare: config, apiInput: config };
        }
        case "external-wallet": {
            const key = env.key(chain);
            return {
                label,
                kind,
                locator: key.locator,
                full: key.config,
                bare: { type: "external-wallet", address: key.address },
                apiInput: { type: "external-wallet", address: key.address },
            };
        }
        case "server": {
            const secret = `xmsk1_${Buffer.from(values.bytes(32)).toString("hex")}`;
            const { derivedAddress } = deriveServerSignerDetails(
                { type: "server", secret } as Any,
                chain as Any,
                STRESS_PROJECT_ID,
                "development"
            );
            return {
                label,
                kind,
                locator: `server:${derivedAddress}`,
                full: { type: "server", secret },
                bare: { type: "server", address: derivedAddress },
                apiInput: { type: "server", address: derivedAddress },
            };
        }
    }
}

function makeQuorum(
    env: StressEnv,
    values: Rng,
    chain: Chain,
    kinds: FlatKind[],
    threshold: number,
    label: string,
    overlap?: { random: Rng; pool: SetupKey[] }
): SetupKey {
    // Now and then a member is a key the wallet already has (a flat recovery method, a delegated signer or another
    // quorum's member), drawn from its own stream so quorum-free setups draw the same keys as before.
    const members: SetupKey[] = [];
    kinds.forEach((kind, index) => {
        const candidates = (overlap?.pool ?? []).filter(
            (key) => key.kind !== "api-key" && key.kind !== "quorum" && !members.includes(key)
        );
        if (overlap != null && candidates.length > 0 && overlap.random.bool(0.3)) {
            members.push(overlap.random.pick(candidates));
            return;
        }
        members.push(makeKey(env, values, chain, kind, `${label}.m${index}:${kind}`));
    });
    return {
        label,
        kind: "quorum",
        locator: "",
        full: { type: "quorum", threshold, members: members.map((member) => member.full) },
        bare: { type: "quorum", threshold, members: members.map((member) => member.bare) },
        apiInput: { type: "quorum", threshold, members: members.map((member) => member.apiInput) },
        members,
        threshold,
    };
}

// ---------------------------------------------------------------------------------------------------------------------
// Fake TEE and passkey provider, so email / phone / passkey keys can sign under Node
// ---------------------------------------------------------------------------------------------------------------------

export function fakeTeeConnection(): Any {
    return {
        connectionGeneration: 1,
        async sendAction({ event, data }: { event: string; data: Any }) {
            if (event === "request:get-status") return { status: "success", signerStatus: "ready" };
            if (event === "request:sign") {
                const keyType = data?.data?.keyType;
                const encoding = data?.data?.encoding;
                if (keyType === "secp256k1") {
                    return {
                        status: "success",
                        signature: { bytes: `0x${"ab".repeat(65)}`, encoding: "hex" },
                        publicKey: { bytes: `0x04${"cd".repeat(64)}`, encoding: "hex", keyType },
                    };
                }
                const bytes = (length: number, fill: number) => new Uint8Array(length).fill(fill);
                const encode = (value: Uint8Array) =>
                    encoding === "base58" ? base58.encode(value) : Buffer.from(value).toString("base64");
                return {
                    status: "success",
                    signature: { bytes: encode(bytes(64, 7)), encoding },
                    publicKey: { bytes: encode(bytes(32, 9)), encoding, keyType: "ed25519" },
                };
            }
            return { status: "error", error: `fake TEE: unsupported ${event}` };
        },
    };
}

export function fakePasskeyProvider(): Any {
    return {
        async createPasskey(name: string) {
            return { id: `created-${name}`, publicKey: PASSKEY_POINT };
        },
        async signWithPasskey(_message: string, _credentialId?: string) {
            return {
                signature: { r: `0x${"11".repeat(32)}`, s: `0x${"22".repeat(32)}` },
                metadata: {
                    authenticatorData: `0x${"00".repeat(32)}0500000000`,
                    clientDataJSON: '{"type":"webauthn.get","challenge":"x"}',
                    challengeIndex: 23,
                    typeIndex: 1,
                    userVerificationRequired: true,
                },
            };
        },
    };
}

// ---------------------------------------------------------------------------------------------------------------------
// World: the setup in the fake API, and the caller's wallet
// ---------------------------------------------------------------------------------------------------------------------

export type World = {
    setup: Setup;
    env: StressEnv;
    recovery: SetupKey[];
    delegated: SetupKey[];
    foreign: SetupKey[];
    storage: StressDeviceStorage | null;
    /** The device locator the setup registered or planted, if any. */
    deviceLocator: string | null;
    address: string | null;
    /** The caller's args (createWallet / getWallet). */
    args: Any;
    /** locator (comparable) → label */
    labels: Map<string, string>;
};

export const comparable = (locator: string) => {
    const i = locator.indexOf(":");
    const value = i === -1 ? locator : locator.slice(i + 1);
    const type = i === -1 ? "" : locator.slice(0, i);
    const norm = /^0x[0-9a-fA-F]{40}$/.test(value) ? value.toLowerCase() : value;
    return i === -1 ? norm : `${type}:${norm}`;
};

/** Signs an approval message with a setup key the way the SDK's external-wallet path would. */
async function signWith(chain: Chain, key: SetupKey, message: string): Promise<string> {
    if (chain === "solana") return await key.full.onSignBytes(message);
    return await key.full.onSign(message);
}

/** Builds the setup in the fake, then the caller's args; does not call the SDK. */
export async function buildWorld(seed: number, setup: Setup): Promise<World> {
    const env = stressEnv(seed);
    const values = rng(seed).fork("values");
    const { chain } = setup;

    const overlapRandom = rng(seed).fork("overlap");
    const pool: SetupKey[] = [];
    const remember = (key: SetupKey) => {
        pool.push(...(key.kind === "quorum" ? key.members ?? [] : [key]));
        return key;
    };
    const recovery = setup.recovery.map((spec, index) =>
        remember(
            spec.kind === "quorum"
                ? makeQuorum(env, values, chain, spec.members, spec.threshold, `R${index}:quorum`, {
                      random: overlapRandom,
                      pool,
                  })
                : makeKey(env, values, chain, spec.kind, `R${index}:${spec.kind}`)
        )
    );
    const delegated = setup.delegated.map((spec, index) => {
        const key =
            spec.kind === "quorum"
                ? makeQuorum(env, values, chain, spec.members ?? [], spec.threshold ?? 1, `D${index}:quorum`, {
                      random: overlapRandom,
                      pool,
                  })
                : makeKey(env, values, chain, spec.kind, `D${index}:${spec.kind}`);
        key.spec = spec;
        return remember(key);
    });
    const foreignKinds: FlatKind[] = ["external-wallet", "email", "server", ...(chain === "base-sepolia" ? ["passkey" as const] : [])];
    const foreign = foreignKinds.map((kind) => makeKey(env, values, chain, kind, `F:${kind}`));

    const storage = setup.device === "none" ? null : env.device("caller");
    const world: World = {
        setup,
        env,
        recovery,
        delegated,
        foreign,
        storage,
        deviceLocator: null,
        address: null,
        args: null,
        labels: new Map(),
    };

    if (setup.caller !== "create") {
        await buildExistingWallet(world);
    } else if (setup.device === "unknown" && storage != null) {
        // A key this device made for something else.
        await storage.generateKey({});
    }
    world.args = callerArgs(world);
    refreshLabels(world);
    return world;
}

function refreshLabels(world: World) {
    const labels = new Map<string, string>();
    const add = (key: SetupKey) => {
        if (key.locator !== "" && !labels.has(comparable(key.locator))) labels.set(comparable(key.locator), key.label);
        for (const member of key.members ?? []) add(member);
    };
    for (const key of [...world.recovery, ...world.delegated, ...world.foreign]) add(key);
    if (world.deviceLocator != null) labels.set(world.deviceLocator, `device:${world.setup.device}`);
    world.labels = labels;
}

async function buildExistingWallet(world: World) {
    const { env, setup, recovery, delegated, storage } = world;
    const { chain } = setup;
    const client = env.client();
    const walletLocator = meLocator(chain);
    const hasQuorum = recovery.some((key) => key.kind === "quorum");
    const recoveryConfig =
        recovery.length === 1 && !hasQuorum
            ? { adminSigner: recovery[0].apiInput }
            : { recoveryMethods: recovery.map((key) => key.apiInput) };

    const delegatedSignerInput = (key: SetupKey) =>
        key.kind === "quorum" || key.kind === "passkey" ? key.apiInput : key.locator;
    const genesis = delegated.filter((key) => key.spec?.state === "genesis");
    let deviceInput: Any = null;
    if (storage != null && setup.device === "approved") {
        const publicKeyBase64 = await storage.generateKey({});
        deviceInput = devicePublicKeyInput(publicKeyBase64, storage.getDeviceName());
        world.deviceLocator = `device:${publicKeyBase64}`;
    }
    const created: Any = await client.createWallet({
        type: "smart",
        chainType: chainTypeOf(chain),
        config: {
            ...recoveryConfig,
            delegatedSigners: [
                ...genesis.map((key) => ({ signer: delegatedSignerInput(key) })),
                ...(deviceInput != null ? [{ signer: deviceInput }] : []),
            ],
        },
    } as Any);
    if (created == null || "error" in created) {
        throw new Error(`setup: createWallet failed: ${JSON.stringify(created)}`);
    }
    world.address = created.address;
    // Quorum locators are assigned by the API.
    const rendered = env.fake.renderedWallet(created.address);
    rendered.config.recoveryMethods.forEach((entry: Any, index: number) => {
        if (entry.type === "quorum") recovery[index].locator = entry.locator;
        if (entry.type === "api-key") recovery[index].locator = entry.locator;
    });
    for (const key of genesis.filter((key) => key.kind === "quorum")) {
        const match = rendered.config.delegatedSigners.find(
            (signer: Any) =>
                signer.type === "quorum" &&
                signer.members.map((m: Any) => comparable(m.locator)).join() ===
                    (key.members ?? []).map((m) => comparable(m.locator)).join()
        );
        key.locator = match?.locator ?? "";
    }

    // Approvers for pending and late registrations.
    const nonCustodial = recovery.filter((key) => key.kind !== "api-key");
    const apiKey = recovery.find((key) => key.kind === "api-key");
    const externalWallet = recovery.find((key) => key.kind === "external-wallet");
    const pendingApprover = nonCustodial.length > 0 ? nonCustodial[setup.approverPick % nonCustodial.length] : null;

    const register = async (signer: Any, approver: SetupKey) => {
        const response: Any = await client.registerSigner(walletLocator as Any, {
            signer,
            ...(chain === "base-sepolia" ? { chain } : {}),
            approver: approver.locator,
        } as Any);
        if (response == null || "error" in response) {
            throw new Error(`setup: registerSigner failed: ${JSON.stringify(response)}`);
        }
        return response;
    };

    for (const key of delegated.filter((key) => key.spec?.state !== "genesis")) {
        const late = key.spec?.state === "late";
        const approver = late ? apiKey ?? externalWallet : pendingApprover;
        if (approver == null) throw new Error("setup: no approver");
        const response = await register(delegatedSignerInput(key), approver);
        if (key.kind === "quorum") key.locator = response.locator;
        if (late && approver.kind === "external-wallet") {
            await approveRegistration(world, response, approver);
        }
    }

    if (storage != null && setup.device === "pending" && pendingApprover != null) {
        const publicKeyBase64 = await storage.generateKey({ address: created.address });
        world.deviceLocator = `device:${publicKeyBase64}`;
        await register(devicePublicKeyInput(publicKeyBase64, storage.getDeviceName()), pendingApprover);
    }
    if (storage != null && setup.device === "approved" && world.deviceLocator != null) {
        await storage.mapAddressToKey(created.address, world.deviceLocator.slice("device:".length));
    }
    if (storage != null && setup.device === "unknown") {
        const publicKeyBase64 = await storage.generateKey({ address: created.address });
        world.deviceLocator = `device:${publicKeyBase64}`;
    }
    if (storage != null && setup.deviceSaved && world.deviceLocator != null) {
        await storage.saveSignerLocator(created.address, world.deviceLocator);
    }
    // The setup's own calls do not count.
    env.fake.calls.length = 0;
}

function devicePublicKeyInput(publicKeyBase64: string, name: string) {
    const bytes = Buffer.from(publicKeyBase64, "base64");
    return {
        type: "device",
        publicKey: {
            x: `0x${bytes.subarray(1, 33).toString("hex")}`,
            y: `0x${bytes.subarray(33, 65).toString("hex")}`,
        },
        name,
    };
}

async function approveRegistration(world: World, registered: Any, approver: SetupKey) {
    const { env, setup } = world;
    const client = env.client();
    const walletLocator = meLocator(setup.chain);
    const request =
        setup.chain === "base-sepolia" ? registered.chains?.[setup.chain] : registered.transaction ?? registered;
    const pending = request?.approvals?.pending?.[0];
    if (pending == null) return;
    const signature = await signWith(setup.chain, approver, pending.message);
    const approvals = { approvals: [{ signer: approver.locator, signature }] };
    const isSignature = setup.chain === "base-sepolia" && request.onChain == null;
    const response: Any = isSignature
        ? await client.approveSignature(walletLocator as Any, request.id, approvals as Any)
        : await client.approveTransaction(walletLocator as Any, request.id, approvals as Any);
    if (response == null || "error" in response) {
        throw new Error(`setup: approval failed: ${JSON.stringify(response)}`);
    }
    env.fake.landAll();
}

function callerArgs(world: World): Any {
    const { setup, recovery, delegated, foreign, storage } = world;
    const r = rng(setup.seed).fork("caller");
    const options: Any = {
        clientTEEConnection: fakeTeeConnection(),
        passkeyProvider: fakePasskeyProvider(),
        // The fake TEE always answers "ready", so no OTP is ever asked for.
        callbacks: { onAuthRequired: async () => {} },
        ...(storage != null ? { deviceSignerKeyStorage: storage } : {}),
    };
    const args: Any = { chain: setup.chain, options };

    const recoveryConfigs = (() => {
        switch (setup.recoveryArg) {
            case "omit":
                return null;
            case "full":
                return r.shuffle(recovery.map((key) => key.full));
            case "bare":
                return r.shuffle(recovery.map((key) => key.bare));
            case "subset": {
                const picked = recovery.filter(() => r.bool());
                return (picked.length > 0 ? picked : [recovery[0]]).map((key) => key.full);
            }
        }
    })();
    if (recoveryConfigs != null) {
        if (setup.recoveryForm === "recovery" && recoveryConfigs.length === 1) args.recovery = recoveryConfigs[0];
        else args.recoveryMethods = recoveryConfigs;
    }

    const signerConfigs = (() => {
        switch (setup.signersArg) {
            case "omit":
                return undefined;
            case "empty":
                return [];
            case "match":
                return delegated.map((key) => key.full);
            case "subset":
                return delegated.filter(() => r.bool()).map((key) => key.full);
            case "foreign":
                return [...delegated.map((key) => key.full), foreign[0].full];
        }
    })();
    if (signerConfigs !== undefined) args.signers = signerConfigs;
    return args;
}

/** Calls the SDK the way the setup's caller does. */
export async function callerWallet(world: World): Promise<Any> {
    const sdk = world.env.sdk();
    const { setup } = world;
    if (setup.caller === "get") return await sdk.getWallet(world.args);
    const created = await sdk.createWallet(world.args);
    if (setup.caller === "create") {
        world.address = created.address;
        // The SDK registered the device (if any) itself.
        if (world.storage != null) {
            const mapped = world.storage.addressMap.get(created.address);
            if (mapped != null) {
                world.deviceLocator = `device:${mapped}`;
            }
        }
        const rendered = world.env.fake.renderedWallet(created.address);
        // The caller may list recovery methods in another order than the setup: match by identity, not index.
        for (const entry of rendered.config.recoveryMethods as Any[]) {
            if (entry.type === "api-key") {
                const key = world.recovery.find((k) => k.kind === "api-key");
                if (key != null) key.locator = entry.locator;
            }
            if (entry.type === "quorum") {
                const key = world.recovery.find(
                    (k) =>
                        k.kind === "quorum" &&
                        (k.members ?? []).map((m) => comparable(m.locator)).join() ===
                            entry.members.map((m: Any) => comparable(m.locator)).join()
                );
                if (key != null) key.locator = entry.locator;
            }
        }
        for (const key of world.delegated.filter((key) => key.kind === "quorum")) {
            const match = rendered.config.delegatedSigners.find(
                (signer: Any) =>
                    signer.type === "quorum" &&
                    signer.members.map((m: Any) => comparable(m.locator)).join() ===
                        (key.members ?? []).map((m) => comparable(m.locator)).join()
            );
            key.locator = match?.locator ?? "";
        }
        refreshLabels(world);
        world.labels.set(world.deviceLocator ?? "", "device:created");
    }
    return created;
}

// ---------------------------------------------------------------------------------------------------------------------
// Normalized outcomes
// ---------------------------------------------------------------------------------------------------------------------

export function labelOf(world: World, locator: string | undefined | null): string | null {
    if (locator == null) return null;
    if (locator === "api-key" || locator.startsWith("api-key:")) {
        return world.recovery.find((key) => key.kind === "api-key")?.label ?? "api-key";
    }
    const known = world.labels.get(comparable(locator)) ?? world.labels.get(locator);
    if (known != null) return known;
    if (locator.startsWith("device:")) return "device:other";
    if (locator.startsWith("quorum:")) return "quorum:other";
    return `other(${locator.split(":")[0]})`;
}

export function normalizeMessage(world: World, message: string): string {
    let out = message;
    const replacements: Array<[string, string]> = [];
    for (const key of [...world.recovery, ...world.delegated, ...world.foreign]) {
        const all = [key, ...(key.members ?? [])];
        for (const k of all) {
            if (k.locator !== "") replacements.push([k.locator, `<${k.label}>`]);
            const value = k.locator.includes(":") ? k.locator.slice(k.locator.indexOf(":") + 1) : "";
            if (value.length > 8) replacements.push([value, `<${k.label}>`]);
        }
    }
    if (world.deviceLocator != null) {
        replacements.push([world.deviceLocator, "<device>"]);
        replacements.push([world.deviceLocator.slice("device:".length), "<device>"]);
    }
    if (world.address != null) replacements.push([world.address, "<wallet>"]);
    replacements.sort((a, b) => b[0].length - a[0].length);
    for (const [from, to] of replacements) {
        out = out.split(from).join(to);
        if (/^(external-wallet:)?0x[0-9a-fA-F]{40}$/.test(from)) out = out.split(from.toLowerCase()).join(to);
    }
    return out
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<uuid>")
        .replace(/0x[0-9a-fA-F]{40}/g, "<addr>")
        .replace(/device:[A-Za-z0-9+/=]{80,}/g, "device:<key>")
        .replace(/"createdAt":"[^"]*"/g, '"createdAt":"<t>"')
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "<time>")
        .slice(0, 400);
}

export function outcomeOf(world: World, outcome: { value: unknown } | { error: unknown }, ok: (value: Any) => string) {
    if ("value" in outcome) return ok(outcome.value);
    const error = outcome.error as Any;
    const name = error?.constructor?.name ?? typeof error;
    return `throws ${name}: ${normalizeMessage(world, String(error?.message ?? error))}`;
}

export const BAD_ERROR_CLASSES = ["TypeError", "ReferenceError", "RangeError", "SyntaxError"];

export function isBadError(error: unknown): boolean {
    return error instanceof Error && BAD_ERROR_CLASSES.includes(error.constructor.name);
}

export function sendOutcome(world: World, outcome: { value: unknown } | { error: unknown }) {
    return outcomeOf(world, outcome, (tx: Any) =>
        tx?.hash != null ? "landed" : tx?.transactionId != null ? "prepared" : `returned ${JSON.stringify(tx)}`
    );
}

export async function sendFrom(world: World, wallet: Any) {
    const recipient = recipientFor(world.setup.chain, rng(world.setup.seed).fork("recipient"));
    return await settle(wallet.send(recipient, "usdc", "1"));
}

/** The status the fake gives a delegated signer on the wallet's chain (as `signers()` should report it). */
export function fakeSignerStatuses(world: World): Map<string, string> {
    const out = new Map<string, string>();
    if (world.address == null) return out;
    for (const signer of world.env.fake.signersOf(world.address)) {
        let status = "success";
        if (world.setup.chain === "base-sepolia") {
            if (signer.chains != null) {
                const entry = signer.chains[world.setup.chain];
                if (entry == null && Object.keys(signer.chains).length > 0) continue;
                status = entry?.status ?? "success";
            }
        } else if (signer.transaction != null) {
            status = signer.transaction.status;
        }
        out.set(signer.locator, status);
    }
    return out;
}

export const isApproved = (status: string | undefined) => status === "success" || status === "active";

/** The SDK wallet class `from` for a chain, and another one. */
export function fromProbes(chain: Chain): Array<{ name: string; from: (wallet: Any) => Any; matches: boolean }> {
    return [
        { name: "EVMWallet", from: (wallet) => EVMWallet.from(wallet), matches: chain === "base-sepolia" },
        { name: "StellarWallet", from: (wallet) => StellarWallet.from(wallet), matches: chain === "stellar" },
        { name: "SolanaWallet", from: (wallet) => SolanaWallet.from(wallet), matches: chain === "solana" },
    ];
}

export { keyFor };
