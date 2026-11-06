/**
 * Shared harness for the m7 stress suites: a seeded PRNG, the real ApiClient wired to the fake wallets API through the
 * global `fetch`, a real P-256 device key storage, and real keys for members and signers on each chain.
 *
 * Throwaway m7 code: pragmatic by design.
 */
import { vi } from "vitest";
import { isHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { P256 } from "ox";
import base58 from "bs58";
import nacl from "tweetnacl";
import { Keypair, type VersionedTransaction } from "@solana/web3.js";
import { ApiClient } from "../../api/client";
import { CrossmintWallets } from "../../sdk";
import { WalletFactory } from "../../wallets/wallet-factory";
import { DeviceSignerKeyStorage } from "../../utils/device-signers/DeviceSignerKeyStorage";
import { SDK_NAME, SDK_VERSION } from "../../utils/constants";
import { ed25519KeypairFromSeed, ed25519Sign } from "../../utils/ed25519";
import { encodeStellarPublicKey } from "../../utils/stellar";
import { FakeWalletsApi, type FakeApiOptions } from "./fake-api";

// ---------------------------------------------------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------------------------------------------------

export type Rng = {
    readonly seed: number;
    /** Uniform [0, 1). */
    next(): number;
    /** Integer in [lo, hi], both inclusive. */
    int(lo: number, hi: number): number;
    pick<T>(items: readonly T[]): T;
    bool(probability?: number): boolean;
    /** A shuffled copy. */
    shuffle<T>(items: readonly T[]): T[];
    bytes(length: number): Uint8Array;
    hex(bytes: number): `0x${string}`;
    /** An independent stream, so one consumer's draws do not shift another's. */
    fork(label: string): Rng;
};

/** mulberry32: small, fast, good enough to drive stress runs; one seed always replays the same run. */
export function rng(seed: number): Rng {
    let state = seed >>> 0;
    const next = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const self: Rng = {
        seed: seed >>> 0,
        next,
        int(lo, hi) {
            return lo + Math.floor(next() * (hi - lo + 1));
        },
        pick(items) {
            if (items.length === 0) throw new Error("rng.pick on an empty list");
            return items[Math.floor(next() * items.length)];
        },
        bool(probability = 0.5) {
            return next() < probability;
        },
        shuffle(items) {
            const copy = [...items];
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(next() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy;
        },
        bytes(length) {
            const out = new Uint8Array(length);
            for (let i = 0; i < length; i++) out[i] = Math.floor(next() * 256);
            return out;
        },
        hex(bytes) {
            return `0x${Buffer.from(self.bytes(bytes)).toString("hex")}`;
        },
        fork(label) {
            let hash = state ^ 0x9e3779b9;
            for (let i = 0; i < label.length; i++) hash = Math.imul(hash ^ label.charCodeAt(i), 0x01000193);
            return rng(hash >>> 0);
        },
    };
    return self;
}

let printedSeed: number | null = null;

/** `STRESS_SEED` from the environment, else a random one; printed once so a failing run can be replayed. */
export function stressSeed(): number {
    const fromEnv = process.env.STRESS_SEED;
    const seed = fromEnv != null && fromEnv !== "" ? Number(fromEnv) >>> 0 : Math.floor(Math.random() * 2 ** 32) >>> 0;
    if (printedSeed !== seed) {
        printedSeed = seed;
        console.info(`[stress] STRESS_SEED=${seed}`);
    }
    return seed;
}

/** `STRESS_RUNS` from the environment, else `fallback`. */
export function stressRuns(fallback: number): number {
    const fromEnv = Number(process.env.STRESS_RUNS);
    return Number.isInteger(fromEnv) && fromEnv > 0 ? fromEnv : fallback;
}

/**
 * Runs `body` once per seed, starting at `stressSeed()` (or `firstSeed`). A failure is rethrown with `seed=<n>` in
 * its message: `STRESS_SEED=<n> STRESS_RUNS=1` replays exactly that run.
 */
export async function forEachSeed(
    runs: number,
    body: (seed: number) => Promise<void>,
    firstSeed: number = stressSeed()
): Promise<void> {
    for (let i = 0; i < runs; i++) {
        const seed = (firstSeed + i) >>> 0;
        try {
            await body(seed);
        } catch (error) {
            const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
            const wrapped = new Error(`seed=${seed} (replay: STRESS_SEED=${seed} STRESS_RUNS=1) ${message}`);
            (wrapped as Error & { cause?: unknown }).cause = error;
            if (error instanceof Error && error.stack != null) wrapped.stack = `${wrapped.message}\n${error.stack}`;
            throw wrapped;
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------------------------------------------------

/** Fake timers the SDK's sleeps and pollers run on; `Date.now()` too, so request expiry follows fake time. */
export function useStressTimers() {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
}

/**
 * Advances fake time until `promise` settles, so the SDK's sleeps and polls run without wall-clock waits. Throws if it
 * has not settled after `maxMs` of fake time (a hang is a finding, not a slow test).
 */
export async function drive<T>(promise: Promise<T>, { stepMs = 250, maxMs = 15 * 60_000 } = {}): Promise<T> {
    const outcome = await settle(promise, { stepMs, maxMs });
    if ("error" in outcome) throw outcome.error;
    return outcome.value as T;
}

/** As {@link drive}, but returns `{ value }` or `{ error }` instead of throwing. */
export async function settle<T>(
    promise: Promise<T>,
    { stepMs = 250, maxMs = 15 * 60_000 } = {}
): Promise<{ value: T } | { error: unknown }> {
    let outcome: { value: T } | { error: unknown } | null = null;
    promise.then(
        (value) => {
            outcome = { value };
        },
        (error: unknown) => {
            outcome = { error };
        }
    );
    let elapsed = 0;
    while (outcome == null) {
        if (elapsed > maxMs) {
            return { error: new Error(`drive: the call did not settle within ${maxMs}ms of fake time (hang)`) };
        }
        await vi.advanceTimersByTimeAsync(stepMs);
        elapsed += stepMs;
    }
    return outcome;
}

// ---------------------------------------------------------------------------------------------------------------------
// The real ApiClient
// ---------------------------------------------------------------------------------------------------------------------

export type ApiClientOptions = {
    usageOrigin?: "client" | "server";
    environment?: "development" | "staging";
    projectId?: string;
    /** The JWT the client sends; the fake treats it as the user id behind `me:` locators. */
    jwt?: string;
};

export const STRESS_PROJECT_ID = "stress-project";

/**
 * A real `ApiClient` (`src/api/client.ts`) whose requests go to `fake`: `fetch` is stubbed globally, so the real
 * `get` / `post` / `delete` / `makeRequest` run, URLs, headers and the 5xx / non-JSON throwing included. Built with
 * `Object.create` because the constructor validates a signed API key; the instance fields its methods read are set here.
 */
export function realApiClient(fake: FakeWalletsApi, options: ApiClientOptions = {}): ApiClient {
    vi.stubGlobal("fetch", fake.fetch);
    return buildApiClient(options);
}

/** As {@link realApiClient}, without touching `fetch` (when it is already stubbed). */
export function buildApiClient({
    usageOrigin = "client",
    environment = "development",
    projectId = STRESS_PROJECT_ID,
    jwt = "stress-user",
}: ApiClientOptions = {}): ApiClient {
    const prefix = `${usageOrigin === "server" ? "sk" : "ck"}_${environment}`;
    const crossmint = {
        apiKey: `${prefix}_stress`,
        jwt,
        setJwt(next: string) {
            return { ...crossmint, jwt: next };
        },
    };
    const client = Object.create(ApiClient.prototype) as ApiClient;
    Object.assign(client, {
        apiPrefix: "api/2025-06-09/wallets",
        unstableApiPrefix: "api/unstable/wallets",
        // `@crossmint/common-sdk-base` ValidateApiKeySuccessResult.
        parsedAPIKey: { isValid: true, environment, projectId, usageOrigin, prefix },
        internalConfig: { sdkMetadata: { name: SDK_NAME, version: SDK_VERSION } },
        crossmint,
    });
    return client;
}

/** The public SDK entry point over `apiClient` (its constructor also validates the API key). */
export function walletsSdk(apiClient: ApiClient): CrossmintWallets {
    const sdk = Object.create(CrossmintWallets.prototype) as CrossmintWallets;
    Object.assign(sdk, { walletFactory: new WalletFactory(apiClient) });
    return sdk;
}

// ---------------------------------------------------------------------------------------------------------------------
// Device key storage
// ---------------------------------------------------------------------------------------------------------------------

/**
 * One device's P-256 key storage: a port of quickstart-devkit's `MockDeviceSignerKeyStorage` (signing with
 * `hash: true` since ebdf2f24), plus the saved signer locators the built-in storages keep apart from the keys.
 * A lost key is `deleteKey(walletAddress)` (the saved locator survives) or a new instance (a new device).
 */
export class StressDeviceStorage extends DeviceSignerKeyStorage {
    readonly keys = new Map<string, `0x${string}`>(); // base64 public key → private key
    readonly addressMap = new Map<string, string>(); // wallet address → base64 public key
    readonly savedLocators = new Map<string, string>(); // wallet address → device signer locator
    readonly calls: Array<{ method: string; args: unknown[] }> = [];

    constructor(
        private readonly random: () => number = Math.random,
        private readonly deviceName = "Stress Test Device"
    ) {
        super("ck_development_stress");
    }

    async generateKey({
        address,
    }: {
        address?: string;
        biometricPolicy?: "always" | "session" | "none";
        biometricExpirationTime?: number;
    } = {}): Promise<string> {
        this.calls.push({ method: "generateKey", args: [address] });
        const privateKey = this.#privateKey();
        const publicKey = P256.getPublicKey({ privateKey });
        const xHex = publicKey.x.toString(16).padStart(64, "0");
        const yHex = publicKey.y.toString(16).padStart(64, "0");
        const base64 = Buffer.from(`04${xHex}${yHex}`, "hex").toString("base64");
        this.keys.set(base64, privateKey);
        if (address) this.addressMap.set(address, base64);
        return base64;
    }

    async mapAddressToKey(address: string, publicKeyBase64: string): Promise<void> {
        this.calls.push({ method: "mapAddressToKey", args: [address, publicKeyBase64] });
        this.addressMap.set(address, publicKeyBase64);
    }

    async getKey(address: string): Promise<string | null> {
        this.calls.push({ method: "getKey", args: [address] });
        return this.addressMap.get(address) ?? null;
    }

    async hasKey(publicKeyBase64: string): Promise<boolean> {
        this.calls.push({ method: "hasKey", args: [publicKeyBase64] });
        return this.keys.has(publicKeyBase64);
    }

    async signMessage(address: string, message: string): Promise<{ r: string; s: string }> {
        this.calls.push({ method: "signMessage", args: [address, message] });
        const base64 = this.addressMap.get(address);
        if (!base64) throw new Error(`No key mapped for address: ${address}`);
        const privateKey = this.keys.get(base64);
        if (!privateKey) throw new Error(`No private key for pubkey: ${base64}`);
        const messageHex = message.startsWith("0x")
            ? (message as `0x${string}`)
            : (`0x${Buffer.from(message, "base64").toString("hex")}` as `0x${string}`);
        // Platform P-256 keys SHA-256 the message before signing; on EVM it is the WebAuthn pre-image.
        const { r, s } = P256.sign({ payload: messageHex, hash: true, privateKey, extraEntropy: false });
        return {
            r: `0x${r.toString(16).padStart(64, "0")}`,
            s: `0x${s.toString(16).padStart(64, "0")}`,
        };
    }

    async deleteKey(address: string): Promise<void> {
        this.calls.push({ method: "deleteKey", args: [address] });
        const base64 = this.addressMap.get(address);
        if (base64) this.keys.delete(base64);
        this.addressMap.delete(address);
    }

    getDeviceName(): string {
        return this.deviceName;
    }

    async saveSignerLocator(address: string, signerLocator: string): Promise<void> {
        this.calls.push({ method: "saveSignerLocator", args: [address, signerLocator] });
        this.savedLocators.set(address, signerLocator);
    }

    async getSavedSignerLocator(address: string): Promise<string | null> {
        this.calls.push({ method: "getSavedSignerLocator", args: [address] });
        return this.savedLocators.get(address) ?? null;
    }

    /** The device signer locator of the key this device holds for `address`, if any. */
    locatorFor(address: string): string | null {
        const base64 = this.addressMap.get(address);
        return base64 == null ? null : `device:${base64}`;
    }

    #privateKey(): `0x${string}` {
        // A seeded 32-byte scalar; the odds of one outside [1, n) are negligible, and the curve check rejects it.
        for (;;) {
            const bytes = new Uint8Array(32);
            for (let i = 0; i < 32; i++) bytes[i] = Math.floor(this.random() * 256);
            const candidate = `0x${Buffer.from(bytes).toString("hex")}` as `0x${string}`;
            try {
                P256.getPublicKey({ privateKey: candidate });
                return candidate;
            } catch {
                // draw again
            }
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Keys for members and signers
// ---------------------------------------------------------------------------------------------------------------------

/** A key this client holds: its address and locator, the SDK config that signs with it, and its quorum-member form. */
export type TestKey = {
    chain: "evm" | "solana" | "stellar";
    address: string;
    locator: `external-wallet:${string}`;
    // biome-ignore lint/suspicious/noExplicitAny: the SDK's per-chain config unions are not worth spelling out here
    config: any;
    member: { type: "external-wallet"; address: string };
    /** How many times the key was asked to sign. */
    signCount: () => number;
};

/** A real EVM key (viem): `onSign` returns an EIP-191 signature over the raw hash, as wallet clients do. */
export function evmKey(random: Rng): TestKey {
    let privateKey = random.hex(32);
    for (;;) {
        try {
            privateKeyToAccount(privateKey);
            break;
        } catch {
            privateKey = random.hex(32);
        }
    }
    const account = privateKeyToAccount(privateKey);
    let count = 0;
    const onSign = async (payload: string) => {
        count++;
        return await account.signMessage({ message: isHex(payload) ? { raw: payload } : payload });
    };
    return {
        chain: "evm",
        address: account.address,
        locator: `external-wallet:${account.address}`,
        config: { type: "external-wallet", address: account.address, onSign },
        member: { type: "external-wallet", address: account.address },
        signCount: () => count,
    };
}

/** A real Stellar ed25519 key: `onSign` returns a base64 signature over the base64-decoded payload. */
export function stellarKey(random: Rng): TestKey {
    const { publicKey, secretKey } = ed25519KeypairFromSeed(random.bytes(32));
    const address = encodeStellarPublicKey(publicKey);
    let count = 0;
    const onSign = async (payload: string) => {
        count++;
        return Buffer.from(ed25519Sign(Buffer.from(payload, "base64"), secretKey)).toString("base64");
    };
    return {
        chain: "stellar",
        address,
        locator: `external-wallet:${address}`,
        config: { type: "external-wallet", address, onSign },
        member: { type: "external-wallet", address },
        signCount: () => count,
    };
}

/** A real Solana key: `onSign` signs the transaction, `onSignBytes` a base58 payload. */
export function solanaKey(random: Rng): TestKey {
    const keypair = Keypair.fromSeed(random.bytes(32));
    const address = keypair.publicKey.toBase58();
    let count = 0;
    const onSign = async (transaction: VersionedTransaction) => {
        count++;
        transaction.sign([keypair]);
        return transaction;
    };
    const onSignBytes = async (payload: string) => {
        count++;
        return base58.encode(nacl.sign.detached(base58.decode(payload), keypair.secretKey));
    };
    return {
        chain: "solana",
        address,
        locator: `external-wallet:${address}`,
        config: { type: "external-wallet", address, onSign, onSignBytes },
        member: { type: "external-wallet", address },
        signCount: () => count,
    };
}

/** A real key for `chain`. */
export function keyFor(chain: string, random: Rng): TestKey {
    if (chain === "solana") return solanaKey(random);
    if (chain === "stellar") return stellarKey(random);
    return evmKey(random);
}

/** A recipient address that passes the SDK's address checks on `chain`. */
export function recipientFor(chain: string, random: Rng): string {
    return keyFor(chain, random.fork(`recipient-${chain}`)).address;
}

/** A quorum recovery or signer config over `keys`. */
export function quorumOf(keys: TestKey[], threshold: number) {
    return { type: "quorum" as const, threshold, members: keys.map((key) => key.config) };
}

// ---------------------------------------------------------------------------------------------------------------------
// One-call setup
// ---------------------------------------------------------------------------------------------------------------------

export type StressEnv = {
    seed: number;
    rng: Rng;
    fake: FakeWalletsApi;
    /** A real ApiClient for `jwt` (another device of the same user shares the JWT). */
    client: (options?: ApiClientOptions) => ApiClient;
    /** The public SDK for `jwt`. */
    sdk: (options?: ApiClientOptions) => CrossmintWallets;
    /** A new device. */
    device: (name?: string) => StressDeviceStorage;
    key: (chain: string) => TestKey;
    dispose: () => void;
};

/** A fake API and everything around it for one seed; call `dispose()` (or `vi.unstubAllGlobals()`) afterwards. */
export function stressEnv(seed: number, fakeOptions: FakeApiOptions = {}): StressEnv {
    const random = rng(seed);
    const apiRandom = random.fork("api");
    const keyRandom = random.fork("keys");
    const deviceRandom = random.fork("devices");
    const fake = new FakeWalletsApi({ random: apiRandom.next, ...fakeOptions });
    vi.stubGlobal("fetch", fake.fetch);
    let devices = 0;
    return {
        seed,
        rng: random,
        fake,
        client: (options) => buildApiClient(options),
        sdk: (options) => walletsSdk(buildApiClient(options)),
        device: (name) => new StressDeviceStorage(deviceRandom.fork(`device-${devices++}`).next, name),
        key: (chain) => keyFor(chain, keyRandom),
        dispose: () => vi.unstubAllGlobals(),
    };
}
