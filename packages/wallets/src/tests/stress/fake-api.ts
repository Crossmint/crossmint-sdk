/**
 * A stateful fake of the Crossmint wallets API (2025-06-09) for the m7 stress suites.
 *
 * It sits behind the global `fetch`, so the real `ApiClient` (and the real `CrossmintApiClient.makeRequest`, with its
 * 5xx / non-JSON throwing) runs on every call. Shapes come from the SDK's own reading code, its fixtures
 * (`src/wallets/__tests__/test-helpers.ts`) and, where those are silent, from crossbit-main (`approval-processor.ts`,
 * `quorum-approval-state.ts`, `evm-signer-policy.ts`, `signers.dto.ts`). Behavior the SDK expects but neither source
 * pins down is marked `// ASSUMPTION:`.
 *
 * Throwaway m7 code: pragmatic, loosely typed on purpose (responses go through JSON anyway).
 */
import { getAddress, recoverAddress, recoverMessageAddress } from "viem";
import { P256, PublicKey as OxPublicKey } from "ox";
import base58 from "bs58";
import { ed25519 } from "@noble/curves/ed25519";
import { PublicKey as SolanaPublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

// biome-ignore lint/suspicious/noExplicitAny: responses are JSON
type Json = any;

export type ChainType = "evm" | "solana" | "stellar";
export type RequestStatus = "awaiting-approval" | "pending" | "failed" | "success";

export type RouteName =
    | "createWallet"
    | "getWallet"
    | "createTransaction"
    | "listTransactions"
    | "getTransaction"
    | "approveTransaction"
    | "createSignature"
    | "listSignatures"
    | "getSignature"
    | "approveSignature"
    | "send"
    | "registerSigner"
    | "getSigner"
    | "removeSigner"
    | "addRecoveryMethod"
    | "removeRecoveryMethod"
    | "getBalance"
    | "unknown";

export const API_PREFIX = "api/2025-06-09/wallets";

/** The wallets API's message for an expired request (crossbit-main `TRANSACTION_EXPIRED_MESSAGE`). */
export const TRANSACTION_EXPIRED_MESSAGE =
    "The transaction expired before it could be submitted. Create a new transaction.";
/** The 422 the approvals route answers once nothing non-custodial is pending (crossbit-main `approval-processor.ts`). */
export const ALREADY_COMPLETE_MESSAGE = "Already has the required number of approvals";

// ---------------------------------------------------------------------------------------------------------------------
// Faults
// ---------------------------------------------------------------------------------------------------------------------

export type FaultKind =
    /** A JSON error body `{ error: true, statusCode, message, code? }`; a status >= 500 makes the client throw. */
    | { type: "status"; status: number; message?: string; code?: string }
    /** A non-JSON body (an HTML 502 from a load balancer): the client throws on any non-ok non-JSON response. */
    | { type: "html"; status: number }
    /** A 200 whose JSON body is `null`. */
    | { type: "null-body"; status?: number }
    /** Runs the real handler, then deletes a dotted path (`"approvals"`, `"chains.base-sepolia.status"`) from its body. */
    | { type: "drop-field"; path: string }
    /** Runs the real handler, then replaces its body with `fn(body)`. */
    | { type: "mutate"; fn: (body: Json) => Json }
    /** Runs the real handler after `ms` (fake timers apply). */
    | { type: "delay"; ms: number }
    /** Never resolves. */
    | { type: "hang" }
    /** `fetch` rejects with `TypeError("fetch failed")`, as undici does when the connection drops. */
    | { type: "network" };

export type FaultRule = {
    route?: RouteName | RouteName[];
    method?: string;
    /** Tested against `"METHOD /path?query"`. */
    path?: RegExp;
    /** How many matching calls to fail; default 1, or unlimited when `probability` is set. */
    times?: number;
    /** Fail each matching call with this probability (seeded rng). */
    probability?: number;
    /** Let this many matching calls through first. */
    skip?: number;
    /**
     * "before" (default): the server never sees the call. "after": the handler runs and changes state, then the
     * response is lost (only for `status`, `html`, `null-body`, `hang`, `network`).
     */
    phase?: "before" | "after";
    fault: FaultKind;
    label?: string;
};

type ActiveRule = FaultRule & { id: number; seen: number; fired: number };

export class FaultInjector {
    #rules: ActiveRule[] = [];
    #nextId = 1;
    readonly fired: Array<{ seq: number; rule: string; route: RouteName; fault: FaultKind["type"] }> = [];

    constructor(private readonly random: () => number) {}

    add(rule: FaultRule): { remove: () => void } {
        const active: ActiveRule = { ...rule, id: this.#nextId++, seen: 0, fired: 0 };
        this.#rules.push(active);
        return { remove: () => (this.#rules = this.#rules.filter((r) => r !== active)) };
    }

    /** Fail the next `times` calls to `route`. */
    failNext(route: RouteName, fault: FaultKind, times = 1, phase: "before" | "after" = "before") {
        return this.add({ route, fault, times, phase });
    }

    clear() {
        this.#rules = [];
    }

    take(call: { seq: number; method: string; route: RouteName; target: string }): ActiveRule | null {
        for (const rule of this.#rules) {
            if (rule.route != null) {
                const routes = Array.isArray(rule.route) ? rule.route : [rule.route];
                if (!routes.includes(call.route)) continue;
            }
            if (rule.method != null && rule.method.toUpperCase() !== call.method) continue;
            if (rule.path != null && !rule.path.test(call.target)) continue;
            rule.seen++;
            if (rule.skip != null && rule.seen <= rule.skip) continue;
            const limit = rule.times ?? (rule.probability != null ? Number.POSITIVE_INFINITY : 1);
            if (rule.fired >= limit) continue;
            if (rule.probability != null && this.random() >= rule.probability) continue;
            rule.fired++;
            this.fired.push({
                seq: call.seq,
                rule: rule.label ?? `#${rule.id}`,
                route: call.route,
                fault: rule.fault.type,
            });
            return rule;
        }
        return null;
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------------------------------------------------

/** A single signer as the API renders it (`{ type, locator, ...identity fields }`). */
export type Identity = { type: string; locator: string; [field: string]: Json };
export type QuorumRecord = { type: "quorum"; locator: string; threshold: number; members: Identity[] };
export type RecoveryEntry = Identity | QuorumRecord;

type MemberPending = { member: Identity; message: string };
type MemberSubmitted = MemberPending & { signature: string; submittedAt: string };
type FlatEntry = { kind: "flat"; signer: Identity; message: string; signature?: string; submittedAt?: string };
type QuorumEntry = {
    kind: "quorum";
    quorum: QuorumRecord;
    message: string;
    threshold: number;
    remaining: number;
    pending: MemberPending[];
    submitted: MemberSubmitted[];
};
type Entry = FlatEntry | QuorumEntry;

export type FakeRequest = {
    id: string;
    kind: "transaction" | "signature";
    walletAddress: string;
    chainType: ChainType;
    chain: string;
    status: RequestStatus;
    pending: Entry[];
    submitted: Entry[];
    createdAt: string;
    completedAt?: string;
    expiresAt: number;
    params: Json;
    onChain: Json;
    sendParams?: Json;
    signatureType?: string;
    outputSignature?: string;
    error?: Json;
    ticksUntilLanded: number;
    failOnLanding: boolean;
    /** What the request does once it lands (a signer or recovery change). */
    onLanded?: () => void;
    purpose: string;
};

type ChainAuth = { requestId: string; requestKind: "transaction" | "signature" };

export type DelegatedRecord = {
    identity: Identity | QuorumRecord;
    scopes?: Json[];
    /** Registered at wallet creation: approved with no request. */
    genesis: boolean;
    /** EVM: the request authorizing each chain. */
    evmChains?: Record<string, ChainAuth>;
    /** EVM: chains a genesis signer was removed from (crossbit-main `genesisRemovedChains`). */
    genesisRemovedChains?: string[];
    /** Solana / Stellar: the request authorizing the signer. */
    auth?: ChainAuth;
    deleted: boolean;
    createdAt: string;
};

export type WalletRecord = {
    address: string;
    chainType: ChainType;
    user: string;
    alias?: string;
    owner: string;
    createdAt: string;
    recovery: RecoveryEntry[];
    delegated: DelegatedRecord[];
    apiKeySigner: Identity;
    deviceSignersSupported: boolean;
};

export type CallLog = {
    seq: number;
    method: string;
    route: RouteName;
    path: string;
    query: Record<string, string>;
    body: Json;
    user: string;
    status?: number;
    fault?: string;
    response?: Json;
};

export type FakeApiOptions = {
    /** Uniform [0, 1); pass the harness rng for replayable runs. */
    random?: () => number;
    /** Verify approval signatures against the signer's key where the fake can (EVM / Stellar / Solana keys, devices). */
    verifySignatures?: boolean;
    /** API calls (of any route) a fully approved transaction waits before it lands; 0 = on the next call. */
    landAfterTicks?: number;
    /** How long a request waits for approvals before it expires (`Date.now()`, so fake timers apply). */
    approvalTtlMs?: number;
    /** Delegated signers a wallet can hold (non-deleted, non-failed). */
    signerLimit?: number;
    /** Recovery methods a wallet can hold. */
    recoveryLimit?: number;
    /** Whether a wallet's provider takes device signers, per chain type. */
    deviceSigners?: Partial<Record<ChainType, boolean>>;
    /** Allow quorums on Solana (the SDK cannot approve them there). */
    solanaQuorums?: boolean;
};

const STATUS_TEXT: Record<number, string> = {
    200: "OK",
    201: "Created",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
};

type Result = { status: number; body: Json };

class HttpError {
    constructor(readonly result: Result) {}
}

const ok = (body: Json, status = 200): Result => ({ status, body });
// ASSUMPTION: Nest-style error bodies carry `statusCode` next to `error`, `message` and `code` (as the SDK fixtures do);
// the SDK reads only `error`, `message` and `code`.
const errorBody = (status: number, message: string, code?: string) => ({
    error: true,
    statusCode: status,
    message,
    ...(code != null ? { code } : {}),
});
const fail = (status: number, message: string, code?: string): never => {
    throw new HttpError({ status, body: errorBody(status, message, code) });
};

// ---------------------------------------------------------------------------------------------------------------------
// Locators
// ---------------------------------------------------------------------------------------------------------------------

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** The API's `normalizeLocator`: an EVM address compares checksummed (case-insensitively), anything else exactly. */
export function comparableLocator(locator: string): string {
    const norm = (value: string) => (EVM_ADDRESS.test(value) ? value.toLowerCase() : value);
    const separator = locator.indexOf(":");
    if (separator === -1) return norm(locator);
    return `${locator.slice(0, separator)}:${norm(locator.slice(separator + 1))}`;
}

export function sameLocator(left: string, right: string): boolean {
    return comparableLocator(left) === comparableLocator(right);
}

const isQuorum = (entry: { type: string }): entry is QuorumRecord => entry.type === "quorum";

// crossbit-main `isGenesisDelegatedSigner`: registered at wallet creation and never re-registered per chain since.
const isGenesisDelegated = (record: DelegatedRecord) =>
    record.genesis && (record.evmChains == null || record.genesisRemovedChains != null);

// ASSUMPTION: a representative subset of crossbit-main's `ALL_AA_CHAINS` (the SDK only reads the wallet's own chain).
const EVM_AA_CHAINS = ["base-sepolia", "base", "polygon-amoy", "polygon", "arbitrum-sepolia", "optimism-sepolia"];
const isApiKeyLocator = (locator: string) => locator === "api-key" || locator.startsWith("api-key:");

function matchesIdentity(entry: RecoveryEntry, locator: string): boolean {
    if (isQuorum(entry)) return entry.locator === locator;
    if (entry.type === "api-key") return isApiKeyLocator(locator);
    return sameLocator(entry.locator, locator);
}

const STELLAR_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** The 32-byte ed25519 key of a `G...` StrKey address. */
export function decodeStellarPublicKey(address: string): Uint8Array {
    let bits = 0;
    let value = 0;
    const out: number[] = [];
    for (const char of address) {
        const index = STELLAR_ALPHABET.indexOf(char);
        if (index === -1) throw new Error(`Invalid StrKey character ${char}`);
        value = ((value << 5) | index) & 0xffff;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    if (out.length !== 35) throw new Error(`Invalid StrKey length for ${address}`);
    return Uint8Array.from(out.slice(1, 33));
}

function isSolanaAddress(value: string): boolean {
    try {
        return base58.decode(value).length === 32;
    } catch {
        return false;
    }
}

function devicePublicKeyFromLocator(locator: string): OxPublicKey.PublicKey {
    const bytes = Buffer.from(locator.slice("device:".length), "base64");
    if (bytes.length !== 65 || bytes[0] !== 4) throw new Error(`Malformed device locator ${locator}`);
    return OxPublicKey.fromBytes(new Uint8Array(bytes));
}

function deviceLocatorFromPublicKey(publicKey: { x: string; y: string }): string {
    const hex = (value: string) => BigInt(value).toString(16).padStart(64, "0");
    return `device:${Buffer.from(`04${hex(publicKey.x)}${hex(publicKey.y)}`, "hex").toString("base64")}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// The fake
// ---------------------------------------------------------------------------------------------------------------------

export class FakeWalletsApi {
    readonly calls: CallLog[] = [];
    readonly faults: FaultInjector;
    readonly wallets = new Map<string, WalletRecord>();
    readonly requests = new Map<string, FakeRequest>();
    readonly options: Required<Omit<FakeApiOptions, "deviceSigners">> & {
        deviceSigners: Record<ChainType, boolean>;
    };
    /** Fail the landing of the next N transactions that complete their approvals (status "failed"). */
    failNextLandings = 0;
    /** Probability that a fully approved transaction fails to land. */
    landingFailureRate = 0;
    #seq = 0;

    constructor(options: FakeApiOptions = {}) {
        this.options = {
            random: options.random ?? Math.random,
            verifySignatures: options.verifySignatures ?? true,
            landAfterTicks: options.landAfterTicks ?? 1,
            // ASSUMPTION: the approval window; crossbit-main expires requests on a timer we do not model exactly.
            approvalTtlMs: options.approvalTtlMs ?? 15 * 60_000,
            // ASSUMPTION: limits. The backend has per-provider limits; the SDK only reads the error code.
            signerLimit: options.signerLimit ?? 10,
            recoveryLimit: options.recoveryLimit ?? 5,
            // ASSUMPTION: Solana providers reject device signers (the SDK's DEVICE_SIGNER_NOT_SUPPORTED fallback exists
            // for "a Solana smart wallet's underlying provider"); EVM and Stellar take them.
            deviceSigners: { evm: true, stellar: true, solana: false, ...options.deviceSigners },
            solanaQuorums: options.solanaQuorums ?? false,
        };
        this.faults = new FaultInjector(this.options.random);
    }

    /** The `fetch` to stub globally: `vi.stubGlobal("fetch", fake.fetch)`. */
    fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
        const rawBody = typeof init?.body === "string" ? init.body : undefined;
        let body: Json;
        try {
            body = rawBody != null ? JSON.parse(rawBody) : undefined;
        } catch {
            body = rawBody;
        }
        const headers = new Headers(init?.headers);
        const authorization = headers.get("authorization");
        // ASSUMPTION: the JWT stands for the user behind `me:` locators (one wallet per user, chain type and alias).
        const user = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "default-user";
        const segments = url.pathname
            .replace(/^\/+/, "")
            .split("/")
            .filter((segment) => segment !== "")
            .map((segment) => decodeURIComponent(segment));
        const query = Object.fromEntries(url.searchParams.entries());
        const route = routeOf(method, segments);
        const call: CallLog = {
            seq: ++this.#seq,
            method,
            route: route.name,
            path: `/${segments.join("/")}`,
            query,
            body,
            user,
        };
        this.calls.push(call);
        this.tick();

        const target = `${method} ${url.pathname}${url.search}`;
        const rule = this.faults.take({ seq: call.seq, method, route: route.name, target });
        if (rule != null) {
            call.fault = rule.label ?? rule.fault.type;
        }
        const run = () => this.dispatch(route, { method, body, query, user, headers });

        if (rule != null) {
            const fault = rule.fault;
            switch (fault.type) {
                case "delay":
                    await new Promise((resolve) => setTimeout(resolve, fault.ms));
                    return this.respond(call, await run());
                case "drop-field": {
                    const result = await run();
                    if (result.body != null && typeof result.body === "object") {
                        deletePath(result.body, fault.path);
                    }
                    return this.respond(call, result);
                }
                case "mutate": {
                    const result = await run();
                    return this.respond(call, { status: result.status, body: fault.fn(result.body) });
                }
                default: {
                    if (rule.phase === "after") {
                        await run();
                    }
                    return this.faultResponse(call, route.name, fault);
                }
            }
        }
        return this.respond(call, await run());
    };

    // -----------------------------------------------------------------------------------------------------------------
    // Inspection helpers
    // -----------------------------------------------------------------------------------------------------------------

    callsTo(route: RouteName): CallLog[] {
        return this.calls.filter((call) => call.route === route);
    }

    walletByAddress(address: string): WalletRecord | undefined {
        for (const wallet of this.wallets.values()) {
            if (sameLocator(wallet.address, address)) return wallet;
        }
        return undefined;
    }

    /** The wallet a `me:` locator names for `user` (the JWT the client sends; "default-user" without one). */
    walletForMe(locator: string, user = "default-user"): WalletRecord | undefined {
        const parsed = parseMeLocator(locator);
        if (parsed == null) return undefined;
        return this.wallets.get(walletKey(user, parsed.chainType, parsed.alias));
    }

    /** The non-deleted delegated signers of a wallet, as `GET signers/:locator` renders them. */
    signersOf(address: string): Json[] {
        const wallet = this.walletByAddress(address);
        if (wallet == null) return [];
        return wallet.delegated.filter((record) => !record.deleted).map((record) => this.renderSigner(wallet, record));
    }

    renderedWallet(address: string): Json {
        const wallet = this.walletByAddress(address);
        return wallet == null ? undefined : this.renderWallet(wallet);
    }

    renderedRequest(id: string): Json {
        const request = this.requests.get(id);
        return request == null ? undefined : this.renderRequest(request);
    }

    /** Expire a request still awaiting approvals now, as if its approval window closed. */
    expire(id: string) {
        const request = this.requests.get(id);
        if (request != null && request.status === "awaiting-approval") {
            this.expireRequest(request);
        }
    }

    /** Land every fully approved transaction now. */
    landAll() {
        for (const request of this.requests.values()) {
            if (request.status === "pending") this.land(request);
        }
    }

    /** One unit of server time: lands transactions whose countdown ran out and expires requests past their window. */
    tick() {
        const now = Date.now();
        for (const request of this.requests.values()) {
            if (request.status === "pending") {
                request.ticksUntilLanded--;
                if (request.ticksUntilLanded < 0) this.land(request);
            } else if (request.status === "awaiting-approval" && now > request.expiresAt) {
                this.expireRequest(request);
            }
        }
    }

    // -----------------------------------------------------------------------------------------------------------------
    // HTTP plumbing
    // -----------------------------------------------------------------------------------------------------------------

    private respond(call: CallLog, result: Result): Response {
        call.status = result.status;
        call.response = result.body;
        return new Response(JSON.stringify(result.body), {
            status: result.status,
            statusText: STATUS_TEXT[result.status] ?? "",
            headers: { "content-type": "application/json; charset=utf-8" },
        });
    }

    private faultResponse(call: CallLog, route: RouteName, fault: FaultKind): Response | Promise<Response> {
        switch (fault.type) {
            case "hang":
                return new Promise<Response>(() => {});
            case "network":
                call.status = 0;
                return Promise.reject(new TypeError("fetch failed"));
            case "html":
                call.status = fault.status;
                return new Response(
                    `<html><body><h1>${fault.status} ${STATUS_TEXT[fault.status] ?? ""}</h1></body></html>`,
                    {
                        status: fault.status,
                        statusText: STATUS_TEXT[fault.status] ?? "",
                        headers: { "content-type": "text/html" },
                    }
                );
            case "null-body":
                return this.respond(call, { status: fault.status ?? 200, body: null });
            case "status": {
                const defaultMessage =
                    fault.status === 404 && route === "getSigner"
                        ? "Signer not found"
                        : STATUS_TEXT[fault.status] ?? "Error";
                // The 404 an unknown signer gets, byte for byte (test-helpers `signerNotFound`).
                const body =
                    fault.status === 404 && route === "getSigner" && fault.message == null && fault.code == null
                        ? { error: true, message: "Signer not found" }
                        : errorBody(fault.status, fault.message ?? defaultMessage, fault.code);
                return this.respond(call, { status: fault.status, body });
            }
            default:
                throw new Error(`Unhandled fault ${(fault as FaultKind).type}`);
        }
    }

    private async dispatch(
        route: Route,
        ctx: { method: string; body: Json; query: Record<string, string>; user: string; headers: Headers }
    ): Promise<Result> {
        try {
            if (route.name === "unknown") {
                return { status: 404, body: errorBody(404, `Cannot ${ctx.method} ${route.raw}`) };
            }
            if (route.name === "createWallet") {
                return this.createWallet(ctx.body, ctx.user, route.serverSide === true);
            }
            const wallet = this.resolveWallet(route.wallet as string, ctx.user);
            switch (route.name) {
                case "getWallet":
                    return ok(this.renderWallet(wallet));
                case "createTransaction":
                    return this.createTransaction(wallet, ctx.body);
                case "listTransactions":
                    return ok({ transactions: this.listRequests(wallet, "transaction", ctx.query) });
                case "getTransaction":
                    return ok(this.renderRequest(this.requireRequest(wallet, route.id as string, "transaction")));
                case "approveTransaction":
                    return await this.approve(this.requireRequest(wallet, route.id as string, "transaction"), ctx.body);
                case "createSignature":
                    return this.createSignature(wallet, ctx.body);
                case "listSignatures":
                    return ok({ signatures: this.listRequests(wallet, "signature", ctx.query) });
                case "getSignature":
                    return ok(this.renderRequest(this.requireRequest(wallet, route.id as string, "signature")));
                case "approveSignature":
                    return await this.approve(this.requireRequest(wallet, route.id as string, "signature"), ctx.body);
                case "send":
                    return this.send(wallet, route.token as string, ctx.body);
                case "registerSigner":
                    return this.registerSigner(wallet, ctx.body);
                case "getSigner":
                    return this.getSigner(wallet, route.signer as string);
                case "removeSigner":
                    return this.removeSigner(wallet, route.signer as string, ctx.query);
                case "addRecoveryMethod":
                    return this.addRecoveryMethod(wallet, ctx.body);
                case "removeRecoveryMethod":
                    return this.removeRecoveryMethod(wallet, route.signer as string, ctx.query);
                case "getBalance":
                    // ASSUMPTION: balances are not modelled; the stress suites do not read them.
                    return { status: 404, body: errorBody(404, "Balances are not modelled by the fake") };
            }
            return { status: 404, body: errorBody(404, `Cannot ${ctx.method} ${route.raw}`) };
        } catch (error) {
            if (error instanceof HttpError) return error.result;
            // The backend answers an unhandled exception with a 500, which the client throws as ApiClientError.
            return { status: 500, body: errorBody(500, error instanceof Error ? error.message : String(error)) };
        }
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Randomness
    // -----------------------------------------------------------------------------------------------------------------

    private randomBytes(length: number): Uint8Array {
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) bytes[i] = Math.floor(this.options.random() * 256);
        return bytes;
    }

    private randomHex(bytes: number): string {
        return `0x${Buffer.from(this.randomBytes(bytes)).toString("hex")}`;
    }

    /** A version-4 UUID, as Crossmint assigns quorum ids and request ids. */
    private uuid(): string {
        const bytes = this.randomBytes(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Buffer.from(bytes).toString("hex");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    private randomAddress(chainType: ChainType, contract = false): string {
        switch (chainType) {
            case "evm":
                return getAddress(this.randomHex(20));
            case "solana":
                return base58.encode(this.randomBytes(32));
            case "stellar": {
                const chars = Array.from(this.randomBytes(55), (b) => STELLAR_ALPHABET[b % 32]).join("");
                return `${contract ? "C" : "G"}${chars}`;
            }
        }
    }

    private now(): string {
        return new Date(Date.now()).toISOString();
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Wallets
    // -----------------------------------------------------------------------------------------------------------------

    private resolveWallet(locator: string, user: string): WalletRecord {
        const wallet = locator.startsWith("me:") ? this.walletForMe(locator, user) : this.walletByAddress(locator);
        if (wallet == null) {
            // ASSUMPTION: the message; the SDK only checks for `error` in the body.
            fail(404, `Wallet ${locator} not found`);
        }
        return wallet as WalletRecord;
    }

    private createWallet(body: Json, user: string, serverSide: boolean): Result {
        if (body == null || body.type !== "smart") fail(400, "Only smart wallets are supported");
        const chainType = body.chainType as ChainType;
        if (!["evm", "solana", "stellar"].includes(chainType)) fail(400, `Unsupported chain type ${chainType}`);
        const config = body.config ?? {};
        if (config.adminSigner != null && config.recoveryMethods != null) {
            fail(
                400,
                "Only one of `adminSigner` and `recoveryMethods` can be provided",
                "RECOVERY_ADMIN_SIGNER_CONFLICT"
            );
        }
        const recoveryInputs: Json[] =
            config.recoveryMethods ?? (config.adminSigner != null ? [config.adminSigner] : []);
        if (!Array.isArray(recoveryInputs) || recoveryInputs.length === 0) {
            fail(400, "A recovery method is required");
        }
        const alias: string | undefined = body.alias ?? undefined;
        // Server-side calls (sk_ keys) name the owner; client-side calls own the wallet through the JWT.
        const owner = serverSide ? body.owner ?? `userId:${user}` : `userId:${user}`;
        const ownerUser = serverSide && body.owner != null ? String(body.owner).replace(/^userId:/, "") : user;
        const key = walletKey(ownerUser, chainType, alias);
        const existing = this.wallets.get(key);
        if (existing != null) {
            // ASSUMPTION: creating a wallet the user already has for this chain type and alias returns that wallet
            // unchanged (the SDK then validates the caller's config against it in createWalletInstance).
            return ok(this.renderWallet(existing), 200);
        }
        const address = this.randomAddress(chainType, chainType === "stellar");
        const wallet: WalletRecord = {
            address,
            chainType,
            user: ownerUser,
            alias,
            owner,
            createdAt: this.now(),
            recovery: [],
            delegated: [],
            apiKeySigner: this.apiKeyIdentity(chainType),
            deviceSignersSupported: this.options.deviceSigners[chainType],
        };
        const recovery = recoveryInputs.map((input) => this.resolveRecoveryInput(wallet, input));
        this.assertRecoveryList(wallet, recovery);
        wallet.recovery = recovery;

        const delegatedInputs: Json[] = config.delegatedSigners ?? [];
        for (const input of delegatedInputs) {
            const identity = this.resolveSignerInput(wallet, input?.signer ?? input);
            this.assertDelegatable(wallet, identity);
            if (wallet.delegated.some((record) => sameLocator(record.identity.locator, identity.locator))) {
                fail(400, `Delegated signer ${identity.locator} is listed twice`);
            }
            wallet.delegated.push({
                identity,
                scopes: input?.scopes,
                genesis: true,
                deleted: false,
                createdAt: this.now(),
            });
        }
        this.wallets.set(key, wallet);
        return ok(this.renderWallet(wallet), 201);
    }

    private apiKeyIdentity(chainType: ChainType): Identity {
        const address = this.randomAddress(chainType);
        // crossbit-main documents the api-key locator as `api-key:<address>`.
        return { type: "api-key", address, locator: `api-key:${address}` };
    }

    private assertRecoveryList(wallet: WalletRecord, recovery: RecoveryEntry[]) {
        if (recovery.length > this.options.recoveryLimit) {
            fail(
                400,
                `A wallet can have at most ${this.options.recoveryLimit} recovery signers`,
                "SIGNER_LIMIT_EXCEEDED"
            );
        }
        const seen = new Set<string>();
        for (const entry of recovery) {
            const key = isQuorum(entry) ? quorumCompositionKey(entry) : comparableLocator(entry.locator);
            if (seen.has(key)) {
                fail(400, "The recovery list contains the same signer more than once", "RECOVERY_DUPLICATE_SIGNER");
            }
            seen.add(key);
        }
    }

    private resolveRecoveryInput(wallet: WalletRecord, input: Json): RecoveryEntry {
        const identity = this.resolveSignerInput(wallet, input);
        if (identity.type === "device") {
            fail(400, "A device signer cannot be a recovery signer");
        }
        return identity;
    }

    /** A signer the API is given (a locator string or a config object) as the API stores and renders it. */
    private resolveSignerInput(wallet: WalletRecord, input: Json): RecoveryEntry {
        if (typeof input === "string") {
            return this.identityFromLocator(wallet, input);
        }
        if (input == null || typeof input !== "object" || typeof input.type !== "string") {
            fail(400, `Invalid signer ${JSON.stringify(input)}`);
        }
        switch (input.type) {
            case "api-key":
                return wallet.apiKeySigner;
            case "external-wallet":
            case "server":
                if (typeof input.address !== "string") fail(400, `${input.type} signer requires an address`);
                this.assertChainAddress(wallet, input.address);
                return { type: input.type, address: input.address, locator: `${input.type}:${input.address}` };
            case "email": {
                if (typeof input.email !== "string") fail(400, "email signer requires an email");
                // ASSUMPTION: the API stores emails trimmed and lowercased (the SDK's normalizeEmail does the same).
                const email = input.email.trim().toLowerCase();
                return {
                    type: "email",
                    email,
                    locator: `email:${email}`,
                    address: this.randomAddress(wallet.chainType),
                };
            }
            case "phone":
                if (typeof input.phone !== "string") fail(400, "phone signer requires a phone");
                return {
                    type: "phone",
                    phone: input.phone,
                    locator: `phone:${input.phone}`,
                    address: this.randomAddress(wallet.chainType),
                };
            case "passkey":
                if (typeof input.id !== "string" || input.publicKey == null)
                    fail(400, "passkey signer requires id and publicKey");
                return {
                    type: "passkey",
                    id: input.id,
                    name: input.name ?? input.id,
                    publicKey: input.publicKey,
                    validatorContractVersion: "0.0.0",
                    locator: `passkey:${input.id}`,
                };
            case "device":
                if (input.publicKey == null) fail(400, "device signer requires a publicKey");
                return {
                    type: "device",
                    publicKey: { x: input.publicKey.x, y: input.publicKey.y },
                    locator: deviceLocatorFromPublicKey(input.publicKey),
                    ...(input.name != null ? { name: input.name } : {}),
                };
            case "quorum":
                return this.resolveQuorumInput(wallet, input);
            default:
                return fail(400, `Unsupported signer type ${input.type}`);
        }
    }

    private identityFromLocator(wallet: WalletRecord, locator: string): RecoveryEntry {
        if (isApiKeyLocator(locator)) return wallet.apiKeySigner;
        const separator = locator.indexOf(":");
        if (separator === -1) {
            // ASSUMPTION: a bare address is an external wallet.
            this.assertChainAddress(wallet, locator);
            return { type: "external-wallet", address: locator, locator: `external-wallet:${locator}` };
        }
        const type = locator.slice(0, separator);
        const value = locator.slice(separator + 1);
        switch (type) {
            case "external-wallet":
            case "server":
                this.assertChainAddress(wallet, value);
                return { type, address: value, locator };
            case "email":
                return this.resolveSignerInput(wallet, { type: "email", email: value });
            case "phone":
                return this.resolveSignerInput(wallet, { type: "phone", phone: value });
            case "device": {
                devicePublicKeyFromLocator(locator);
                const bytes = Buffer.from(value, "base64");
                return {
                    type: "device",
                    publicKey: {
                        x: `0x${bytes.subarray(1, 33).toString("hex")}`,
                        y: `0x${bytes.subarray(33, 65).toString("hex")}`,
                    },
                    locator,
                };
            }
            case "quorum": {
                const quorum = this.findQuorum(wallet, locator);
                if (quorum == null) fail(400, `Quorum ${locator} not found`);
                return quorum as QuorumRecord;
            }
            default:
                return fail(400, `Invalid signer locator ${locator}`);
        }
    }

    private assertChainAddress(wallet: WalletRecord, address: string) {
        const valid =
            wallet.chainType === "evm"
                ? EVM_ADDRESS.test(address)
                : wallet.chainType === "solana"
                  ? isSolanaAddress(address)
                  : /^[GC][A-Z2-7]{55}$/.test(address);
        if (!valid) fail(400, `Invalid ${wallet.chainType} address ${address}`);
    }

    private resolveQuorumInput(wallet: WalletRecord, input: Json): QuorumRecord {
        if (wallet.chainType === "solana" && !this.options.solanaQuorums) {
            // ASSUMPTION: Solana has no quorum support yet (the SDK's Solana adapter has no quorum approvals).
            fail(400, "Quorum signers are not supported on Solana", "QUORUM_SIGNER_UNSUPPORTED");
        }
        const members: Json[] = Array.isArray(input.members) ? input.members : [];
        const threshold = input.threshold;
        // ASSUMPTION: the bounds behind the API's QUORUM_* codes (the SDK only maps the codes).
        if (members.length < 2) fail(400, "A quorum needs at least 2 members", "QUORUM_TOO_FEW_MEMBERS");
        if (members.length > 10) fail(400, "A quorum has at most 10 members", "QUORUM_SIZE_INVALID");
        if (!Number.isInteger(threshold) || threshold < 1) fail(400, "Invalid quorum threshold", "QUORUM_SIZE_INVALID");
        if (threshold > members.length) {
            fail(400, "The threshold exceeds the number of members", "QUORUM_THRESHOLD_EXCEEDS_MEMBERS");
        }
        const resolved: Identity[] = members.map((member) => {
            if (member?.type === "quorum") fail(400, "Nested quorums are not allowed", "NESTED_QUORUM_NOT_ALLOWED");
            if (member?.type === "device" || member?.type === "api-key") {
                fail(400, `A ${member.type} signer cannot be a quorum member`, "QUORUM_MEMBER_TYPE_NOT_ALLOWED");
            }
            if (member?.type === "passkey" && wallet.chainType === "solana") {
                fail(400, "Passkey members are not supported on Solana", "QUORUM_MEMBER_TYPE_UNSUPPORTED");
            }
            const identity = this.resolveSignerInput(wallet, member) as Identity;
            // A member's rendered form carries no derived address for email/phone (createQuorumFixture).
            if (identity.type === "email" || identity.type === "phone") {
                const { address: _address, ...rest } = identity;
                return rest as Identity;
            }
            return identity;
        });
        const locators = resolved.map((member) => comparableLocator(member.locator));
        if (new Set(locators).size !== locators.length) {
            fail(400, "A quorum lists the same member twice", "QUORUM_MEMBER_DUPLICATED");
        }
        return { type: "quorum", locator: `quorum:${this.uuid()}`, threshold, members: resolved };
    }

    private findQuorum(wallet: WalletRecord, locator: string): QuorumRecord | undefined {
        const recovery = wallet.recovery.find((entry) => isQuorum(entry) && entry.locator === locator);
        if (recovery != null) return recovery as QuorumRecord;
        const delegated = wallet.delegated.find(
            (record) => !record.deleted && isQuorum(record.identity) && record.identity.locator === locator
        );
        return delegated?.identity as QuorumRecord | undefined;
    }

    private assertDelegatable(wallet: WalletRecord, identity: RecoveryEntry) {
        if (identity.type === "api-key") fail(400, "An api-key signer cannot be a delegated signer");
        if (identity.type === "device" && !wallet.deviceSignersSupported) {
            fail(400, "Device signers are not supported for this wallet", "DEVICE_SIGNER_NOT_SUPPORTED");
        }
        if (!isQuorum(identity) && wallet.recovery.some((entry) => matchesIdentity(entry, identity.locator))) {
            // crossbit-main `EvmSignerPolicy.assertNotAdminSigner`.
            fail(400, `Delegated signer ${identity.locator} cannot be the same as the admin signer`);
        }
    }

    private renderWallet(wallet: WalletRecord): Json {
        return {
            chainType: wallet.chainType,
            type: "smart",
            address: wallet.address,
            owner: wallet.owner,
            ...(wallet.alias != null ? { alias: wallet.alias } : {}),
            createdAt: wallet.createdAt,
            config: {
                // `adminSigner` is required by the 2025-06-09 schema and may be a quorum; `recoveryMethods` lists all.
                adminSigner: this.renderRecovery(wallet.recovery[0]),
                recoveryMethods: wallet.recovery.map((entry) => this.renderRecovery(entry)),
                // ASSUMPTION: pending registrations are listed too (crossbit-main stores the record at request time and
                // the SDK finds a pending device registration "through the wallet's signers").
                delegatedSigners: wallet.delegated
                    .filter((record) => !record.deleted)
                    .map((record) => this.renderSigner(wallet, record)),
            },
        };
    }

    private renderRecovery(entry: RecoveryEntry): Json {
        return structuredClone(entry);
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Delegated signers
    // -----------------------------------------------------------------------------------------------------------------

    private findRecord(wallet: WalletRecord, locator: string): DelegatedRecord | undefined {
        return wallet.delegated.find((record) => !record.deleted && matchesIdentity(record.identity, locator));
    }

    private authOn(wallet: WalletRecord, record: DelegatedRecord, chain: string): ChainAuth | "genesis" | undefined {
        if (wallet.chainType === "evm") {
            const auth = record.evmChains?.[chain];
            if (auth != null) return auth;
            // A signer registered at wallet creation is installed on every chain until removed there (crossbit-main
            // `isGenesisInstallLiveOn`).
            return isGenesisDelegated(record) && !(record.genesisRemovedChains ?? []).includes(chain)
                ? "genesis"
                : undefined;
        }
        return record.auth ?? (record.genesis ? "genesis" : undefined);
    }

    private authStatus(auth: ChainAuth | "genesis" | undefined): RequestStatus | undefined {
        if (auth == null) return undefined;
        if (auth === "genesis") return "success";
        return this.requests.get(auth.requestId)?.status;
    }

    private isActiveOn(wallet: WalletRecord, record: DelegatedRecord, chain: string): boolean {
        return this.authStatus(this.authOn(wallet, record, chain)) === "success";
    }

    private renderSigner(wallet: WalletRecord, record: DelegatedRecord): Json {
        const base: Json = {
            ...structuredClone(record.identity),
            ...(record.scopes != null ? { scopes: record.scopes } : {}),
        };
        if (wallet.chainType === "evm") {
            const chains =
                record.evmChains == null
                    ? undefined
                    : Object.fromEntries(
                          Object.entries(record.evmChains).map(([chain, auth]) => [chain, this.renderEvmAuth(auth)])
                      );
            // crossbit-main `withGenesisChains`: a genesis signer renders without `chains` until it is removed from a
            // chain; then every other chain renders `{ status: "success" }`.
            if (record.genesisRemovedChains != null) {
                const live = EVM_AA_CHAINS.filter((chain) => !record.genesisRemovedChains?.includes(chain));
                base.chains = {
                    ...Object.fromEntries(live.map((chain) => [chain, { status: "success" }])),
                    ...chains,
                };
            } else if (chains != null) {
                base.chains = chains;
            }
            return base;
        }
        if (record.auth != null) {
            const request = this.requests.get(record.auth.requestId);
            if (request != null) base.transaction = this.renderRequest(request, { omitParams: true });
        }
        return base;
    }

    // crossbit-main `DelegatedSignerSignatureV2025ResponseSchema`: a registration transaction renders whole (without
    // params); a signature request renders `{ status: "active" }` once approved, else `{ status, id, approvals }`.
    private renderEvmAuth(auth: ChainAuth): Json {
        const request = this.requests.get(auth.requestId);
        if (request == null) return { status: "failed" };
        if (auth.requestKind === "transaction") return this.renderRequest(request, { omitParams: true });
        if (request.status === "success") return { status: "active" };
        return { status: request.status, id: request.id, approvals: this.renderApprovals(request) };
    }

    private getSigner(wallet: WalletRecord, locator: string): Result {
        const record = this.findRecord(wallet, locator);
        if (record == null) {
            // Admin (recovery) signers are not delegated signers either: the SDK expects a 404 for them.
            return { status: 404, body: { error: true, message: "Signer not found" } };
        }
        return ok(this.renderSigner(wallet, record));
    }

    private chainOf(wallet: WalletRecord, chain: Json): string {
        if (wallet.chainType !== "evm") return wallet.chainType;
        if (typeof chain !== "string" || chain === "") fail(400, "chain is required for EVM wallets");
        return chain as string;
    }

    private registerSigner(wallet: WalletRecord, body: Json): Result {
        const chain = this.chainOf(wallet, body?.chain);
        const identity = this.resolveSignerInput(wallet, body?.signer);
        this.assertDelegatable(wallet, identity);
        const approver = this.resolveApprover(wallet, body?.approver);

        let record = isQuorum(identity) ? undefined : this.findRecord(wallet, identity.locator);
        if (record != null) {
            const status = this.authStatus(this.authOn(wallet, record, chain));
            if (status === "success") {
                // ASSUMPTION: the wording; the SDK's isAlreadyApprovedSignerError looks for "delegated signer",
                // "already" and "approved".
                fail(400, `Delegated signer ${identity.locator} is already approved on ${chain}`);
            }
            // A pending or failed registration is replaced by the new one (crossbit-main `addSigner` drops the stored
            // record with the same locator).
        } else {
            const active = wallet.delegated.filter((existing) => {
                if (existing.deleted) return false;
                const statuses =
                    wallet.chainType === "evm" && existing.evmChains != null
                        ? Object.values(existing.evmChains).map((auth) => this.authStatus(auth))
                        : [this.authStatus(this.authOn(wallet, existing, chain))];
                return statuses.some((status) => status !== "failed");
            });
            if (active.length >= this.options.signerLimit) {
                fail(
                    400,
                    `The wallet has reached its limit of ${this.options.signerLimit} signers`,
                    "SIGNER_LIMIT_EXCEEDED"
                );
            }
        }

        // crossbit-main `EVMSmartWalletService.createDelegatedSigner`: a quorum approver or quorum signer always
        // installs by transaction; otherwise only `deployImmediately: true` does.
        const kind: "transaction" | "signature" =
            wallet.chainType !== "evm" || body?.deployImmediately === true || isQuorum(approver) || isQuorum(identity)
                ? "transaction"
                : "signature";
        const request = this.createRequest(wallet, {
            kind,
            chain,
            approver,
            params: { signer: identity.locator, ...(wallet.chainType === "evm" ? { chain } : {}) },
            purpose: `register ${identity.locator}`,
        });
        const auth: ChainAuth = { requestId: request.id, requestKind: kind };
        if (record == null) {
            record = { identity, genesis: false, deleted: false, createdAt: this.now() };
            wallet.delegated.push(record);
        }
        record.scopes = body?.scopes ?? record.scopes;
        if (wallet.chainType === "evm") {
            record.evmChains = { ...(record.evmChains ?? {}), [chain]: auth };
        } else {
            record.auth = auth;
        }
        this.completeIfApproved(request);
        return ok(this.renderSigner(wallet, record), 201);
    }

    private removeSigner(wallet: WalletRecord, locator: string, query: Record<string, string>): Result {
        const chain = this.chainOf(wallet, query.chain ?? (wallet.chainType === "evm" ? undefined : wallet.chainType));
        const record = this.findRecord(wallet, locator);
        if (record == null) {
            // ASSUMPTION: the message.
            return { status: 404, body: errorBody(404, "Signer not found") };
        }
        const approver = this.resolveApprover(wallet, query.approver);
        const request = this.createRequest(wallet, {
            kind: "transaction",
            chain,
            approver,
            params: { signer: record.identity.locator, ...(wallet.chainType === "evm" ? { chain } : {}) },
            purpose: `remove ${record.identity.locator}`,
        });
        // ASSUMPTION: the signer leaves the wallet once its removal lands, not when it is requested.
        // crossbit-main `softRemoveSigner`: an EVM signer drops this chain's registration (a genesis signer records the
        // chain as removed) and is soft-deleted once none is left; a genesis signer is never soft-deleted.
        request.onLanded = () => {
            if (wallet.chainType !== "evm") {
                record.deleted = true;
                return;
            }
            const genesis = isGenesisDelegated(record);
            if (record.evmChains?.[chain] != null) {
                const { [chain]: _removed, ...rest } = record.evmChains;
                record.evmChains = rest;
            } else if (genesis && !(record.genesisRemovedChains ?? []).includes(chain)) {
                record.genesisRemovedChains = [...(record.genesisRemovedChains ?? []), chain];
            }
            if (genesis) return;
            if (Object.keys(record.evmChains ?? {}).length === 0) record.deleted = true;
        };
        this.completeIfApproved(request);
        return ok(this.renderRequest(request), 201);
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Recovery methods
    // -----------------------------------------------------------------------------------------------------------------

    private addRecoveryMethod(wallet: WalletRecord, body: Json): Result {
        const chain = this.chainOf(wallet, body?.chain ?? (wallet.chainType === "evm" ? undefined : wallet.chainType));
        if (body?.approver == null) fail(400, "approver is required");
        const entry = this.resolveRecoveryInput(wallet, body?.recoveryMethods);
        if (!isQuorum(entry) && wallet.recovery.some((existing) => matchesIdentity(existing, entry.locator))) {
            fail(400, "The signer is already a recovery method of this wallet", "RECOVERY_DUPLICATE_SIGNER");
        }
        if (
            isQuorum(entry) &&
            wallet.recovery.some(
                (existing) => isQuorum(existing) && quorumCompositionKey(existing) === quorumCompositionKey(entry)
            )
        ) {
            fail(400, "The quorum is already a recovery method of this wallet", "RECOVERY_DUPLICATE_SIGNER");
        }
        if (!isQuorum(entry) && this.findRecord(wallet, entry.locator) != null) {
            fail(
                400,
                "A recovery signer cannot also be registered as an operational signer",
                "RECOVERY_SIGNER_CONFLICT"
            );
        }
        if (wallet.recovery.length >= this.options.recoveryLimit) {
            fail(
                400,
                `A wallet can have at most ${this.options.recoveryLimit} recovery signers`,
                "SIGNER_LIMIT_EXCEEDED"
            );
        }
        const approver = this.resolveApprover(wallet, body.approver);
        const request = this.createRequest(wallet, {
            kind: "transaction",
            chain,
            approver,
            params: { recoveryMethod: entry.locator },
            purpose: `add recovery ${entry.locator}`,
        });
        // ASSUMPTION: the method is listed once the transaction that installs it lands.
        request.onLanded = () => {
            if (!wallet.recovery.some((existing) => existing.locator === entry.locator)) wallet.recovery.push(entry);
        };
        this.completeIfApproved(request);
        return ok({ recoveryMethods: this.renderRecovery(entry), tx: this.renderRequest(request) }, 201);
    }

    private removeRecoveryMethod(wallet: WalletRecord, locator: string, query: Record<string, string>): Result {
        const chain = this.chainOf(wallet, query.chain ?? (wallet.chainType === "evm" ? undefined : wallet.chainType));
        if (query.approver == null) fail(400, "approver is required");
        const entry = wallet.recovery.find((existing) => matchesIdentity(existing, locator));
        if (entry == null) fail(404, `Recovery method ${locator} not found`);
        if (wallet.recovery.length === 1) {
            // ASSUMPTION: a wallet keeps at least one recovery method.
            fail(400, "A wallet must keep at least one recovery method");
        }
        const approver = this.resolveApprover(wallet, query.approver);
        const request = this.createRequest(wallet, {
            kind: "transaction",
            chain,
            approver,
            params: { recoveryMethod: (entry as RecoveryEntry).locator },
            purpose: `remove recovery ${(entry as RecoveryEntry).locator}`,
        });
        request.onLanded = () => {
            wallet.recovery = wallet.recovery.filter((existing) => existing !== entry);
        };
        this.completeIfApproved(request);
        return ok(this.renderRequest(request), 201);
    }

    /**
     * The approver of a signer change (crossbit-main `EvmSignerPolicy.resolveApproverForChain`): an explicit one must
     * be a recovery method or recovery quorum; without one, the wallet's sole recovery method that signs alone.
     */
    private resolveApprover(wallet: WalletRecord, explicit: Json): RecoveryEntry {
        const listed = () =>
            `'approver' must be one of the wallet's recovery signers. It should be ${wallet.recovery
                .map((entry) => entry.locator)
                .join(", ")}`;
        if (explicit != null && explicit !== "") {
            const approver = wallet.recovery.find((entry) => matchesIdentity(entry, String(explicit)));
            if (approver == null) fail(400, listed());
            return approver as RecoveryEntry;
        }
        // ASSUMPTION: `effectiveAdminSigners` leaves quorums out, so a wallet with exactly one recovery method that
        // signs alone defaults to it even next to recovery quorums.
        const singles = wallet.recovery.filter((entry) => !isQuorum(entry));
        if (singles.length !== 1) fail(400, listed());
        return singles[0];
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Requests
    // -----------------------------------------------------------------------------------------------------------------

    /** Who signs a transaction or signature the caller creates as `signer`. */
    private resolveRequestSigner(wallet: WalletRecord, signer: Json, chain: string): RecoveryEntry {
        if (signer == null || signer === "") {
            // ASSUMPTION: without a signer the wallet's sole recovery method signs (the SDK always sends one).
            return this.resolveApprover(wallet, undefined);
        }
        const locator = String(signer);
        const recovery = wallet.recovery.find((entry) => matchesIdentity(entry, locator));
        if (recovery != null) return recovery;
        const record = this.findRecord(wallet, locator);
        if (record != null) {
            if (!this.isActiveOn(wallet, record, chain)) {
                // ASSUMPTION: the wording.
                fail(400, `Signer ${locator} is not approved on ${chain}`);
            }
            return record.identity;
        }
        // ASSUMPTION: the wording.
        return fail(400, `Signer ${locator} is not a signer of wallet ${wallet.address}`);
    }

    private createTransaction(wallet: WalletRecord, body: Json): Result {
        const params = body?.params ?? {};
        const chain = this.chainOf(wallet, params.chain ?? (wallet.chainType === "evm" ? undefined : wallet.chainType));
        const approver = this.resolveRequestSigner(wallet, params.signer, chain);
        const request = this.createRequest(wallet, {
            kind: "transaction",
            chain,
            approver,
            params,
            purpose: "transaction",
        });
        this.completeIfApproved(request);
        return ok(this.renderRequest(request), 201);
    }

    private send(wallet: WalletRecord, tokenLocator: string, body: Json): Result {
        const chain = wallet.chainType === "evm" ? tokenLocator.split(":")[0] : wallet.chainType;
        const amount = Number(body?.amount);
        if (!Number.isFinite(amount) || amount <= 0) fail(400, `Invalid amount ${body?.amount}`);
        if (typeof body?.recipient !== "string" || body.recipient === "") fail(400, "recipient is required");
        const approver = this.resolveRequestSigner(wallet, body.signer, chain);
        const request = this.createRequest(wallet, {
            kind: "transaction",
            chain,
            approver,
            params: { signer: body.signer, ...(wallet.chainType === "evm" ? { chain } : {}) },
            purpose: "send",
        });
        request.sendParams = { token: tokenLocator, params: { recipient: body.recipient, amount: body.amount } };
        this.completeIfApproved(request);
        return ok(this.renderRequest(request), 201);
    }

    private createSignature(wallet: WalletRecord, body: Json): Result {
        if (wallet.chainType !== "evm") {
            // ASSUMPTION: the wording; the SDK refuses signatures on non-EVM chains before calling.
            fail(400, "Signatures are only supported for EVM smart wallets");
        }
        const params = body?.params ?? {};
        const chain = this.chainOf(wallet, params.chain);
        const approver = this.resolveRequestSigner(wallet, params.signer, chain);
        const request = this.createRequest(wallet, {
            kind: "signature",
            chain,
            approver,
            params,
            purpose: "signature",
            signatureType: body?.type ?? "message",
        });
        this.completeIfApproved(request);
        return ok(this.renderRequest(request), 201);
    }

    private requireRequest(wallet: WalletRecord, id: string, kind: "transaction" | "signature"): FakeRequest {
        const request = this.requests.get(id);
        if (request == null || request.kind !== kind || !sameLocator(request.walletAddress, wallet.address)) {
            // ASSUMPTION: the message.
            fail(404, `${kind === "transaction" ? "Transaction" : "Signature"} ${id} not found`);
        }
        return request as FakeRequest;
    }

    private listRequests(wallet: WalletRecord, kind: "transaction" | "signature", query: Record<string, string>) {
        const all = [...this.requests.values()]
            .filter((request) => request.kind === kind && sameLocator(request.walletAddress, wallet.address))
            .reverse();
        const page = Number(query.page ?? 1);
        const perPage = Number(query.perPage ?? all.length);
        if (!Number.isFinite(page) || !Number.isFinite(perPage) || perPage <= 0)
            return all.map((r) => this.renderRequest(r));
        return all.slice((page - 1) * perPage, page * perPage).map((request) => this.renderRequest(request));
    }

    private createRequest(
        wallet: WalletRecord,
        args: {
            kind: "transaction" | "signature";
            chain: string;
            approver: RecoveryEntry;
            params: Json;
            purpose: string;
            signatureType?: string;
        }
    ): FakeRequest {
        const id = this.uuid();
        const { message, onChain } = this.newPayload(wallet, args.approver);
        // Every quorum member signs the same message (crossbit-main `pendingApprovalFor`, Stellar `constructApprovals`).
        const entry: Entry = isQuorum(args.approver)
            ? {
                  kind: "quorum",
                  quorum: args.approver,
                  message,
                  threshold: args.approver.threshold,
                  remaining: args.approver.threshold,
                  pending: args.approver.members.map((member) => ({ member, message })),
                  submitted: [],
              }
            : { kind: "flat", signer: args.approver, message };
        const request: FakeRequest = {
            id,
            kind: args.kind,
            walletAddress: wallet.address,
            chainType: wallet.chainType,
            chain: args.chain,
            status: "awaiting-approval",
            pending: [entry],
            submitted: [],
            createdAt: this.now(),
            expiresAt: Date.now() + this.options.approvalTtlMs,
            params: structuredClone(args.params ?? {}),
            onChain: args.kind === "transaction" ? onChain : undefined,
            signatureType: args.signatureType,
            ticksUntilLanded: 0,
            failOnLanding: false,
            purpose: args.purpose,
        };
        this.requests.set(id, request);
        return request;
    }

    /** The approval message and the `onChain` payload of a new request, per chain. */
    private newPayload(wallet: WalletRecord, approver: RecoveryEntry): { message: string; onChain: Json } {
        switch (wallet.chainType) {
            case "evm": {
                const hash = this.randomHex(32);
                return {
                    message: hash,
                    onChain: {
                        userOperation: { sender: wallet.address, nonce: this.randomHex(8), callData: "0x" },
                        userOperationHash: hash,
                    },
                };
            }
            case "stellar": {
                // A 32-byte auth entry preimage hash, base64 (test-helpers `randomStellarMessage`).
                const hash = Buffer.from(this.randomBytes(32)).toString("base64");
                return {
                    message: hash,
                    onChain: { transaction: { method: "call" }, expiration: 1_000_000 },
                };
            }
            case "solana": {
                // A real v0 transaction whose fee payer is the flat signer when it is a Solana key, so an external
                // wallet signer can sign `onChain.transaction` and find itself among the account keys.
                const payerAddress =
                    !isQuorum(approver) && typeof approver.address === "string" && isSolanaAddress(approver.address)
                        ? approver.address
                        : wallet.address;
                const payer = new SolanaPublicKey(payerAddress);
                const message = new TransactionMessage({
                    payerKey: payer,
                    recentBlockhash: base58.encode(this.randomBytes(32)),
                    instructions: [
                        SystemProgram.transfer({
                            fromPubkey: payer,
                            toPubkey: new SolanaPublicKey(wallet.address),
                            lamports: 0,
                        }),
                    ],
                }).compileToV0Message();
                const transaction = new VersionedTransaction(message);
                return {
                    message: base58.encode(message.serialize()),
                    onChain: { transaction: base58.encode(transaction.serialize()), lastValidBlockHeight: 1_000_000 },
                };
            }
        }
    }

    private pendingNonCustodial(request: FakeRequest): Entry[] {
        return request.pending.filter((entry) =>
            entry.kind === "quorum" ? entry.remaining > 0 : entry.signer.type !== "api-key"
        );
    }

    /**
     * Once nothing non-custodial is pending the custodial (api-key) signer signs and the request moves on: a
     * transaction to "pending" (it lands after `landAfterTicks` calls), a signature to "success".
     * ASSUMPTION: the api-key entry moves to `submitted` at that point; crossbit-main signs it in the workflow.
     */
    private completeIfApproved(request: FakeRequest) {
        if (request.status !== "awaiting-approval" || this.pendingNonCustodial(request).length > 0) return;
        const submittedAt = this.now();
        for (const entry of [...request.pending]) {
            if (entry.kind === "flat" && entry.signer.type === "api-key") {
                request.pending = request.pending.filter((other) => other !== entry);
                request.submitted.push({ ...entry, signature: this.randomHex(65), submittedAt });
            }
        }
        if (request.kind === "signature") {
            // ASSUMPTION: an EVM signature is ready as soon as its approvals are in.
            request.status = "success";
            request.outputSignature = this.randomHex(65);
            request.completedAt = submittedAt;
            request.onLanded?.();
            return;
        }
        request.status = "pending";
        request.ticksUntilLanded = this.options.landAfterTicks;
        if (this.failNextLandings > 0) {
            this.failNextLandings--;
            request.failOnLanding = true;
        } else if (this.landingFailureRate > 0 && this.options.random() < this.landingFailureRate) {
            request.failOnLanding = true;
        }
    }

    private land(request: FakeRequest) {
        request.completedAt = this.now();
        if (request.failOnLanding) {
            request.status = "failed";
            request.error = { reason: "failed_to_land_on_chain", message: "The transaction failed to land on chain" };
            return;
        }
        request.status = "success";
        const txId =
            request.chainType === "evm"
                ? this.randomHex(32)
                : request.chainType === "solana"
                  ? base58.encode(this.randomBytes(64))
                  : Buffer.from(this.randomBytes(32)).toString("hex");
        request.onChain = {
            ...request.onChain,
            txId,
            explorerLink: `https://explorer.fake/${request.chain}/tx/${txId}`,
        };
        request.onLanded?.();
    }

    private expireRequest(request: FakeRequest) {
        request.status = "failed";
        request.completedAt = this.now();
        // test-helpers `createExpiredRequest`.
        request.error = {
            reason: "execution_reverted",
            message: "Execution reverted, see 'revert' for details",
            revert: { type: "wallet_authorization", reason: TRANSACTION_EXPIRED_MESSAGE },
        };
    }

    private isExpired(request: FakeRequest): boolean {
        return request.status === "failed" && request.error?.revert?.reason === TRANSACTION_EXPIRED_MESSAGE;
    }

    private renderApprovals(request: FakeRequest): Json {
        return {
            pending: request.pending.map((entry) => this.renderEntry(entry)),
            submitted: request.submitted.map((entry) => this.renderEntry(entry)),
        };
    }

    private renderEntry(entry: Entry): Json {
        if (entry.kind === "flat") {
            return {
                signer: structuredClone(entry.signer),
                message: entry.message,
                ...(entry.signature != null ? { signature: entry.signature, submittedAt: entry.submittedAt } : {}),
            };
        }
        return {
            signer: { type: "quorum", locator: entry.quorum.locator },
            quorumApprovals: {
                threshold: entry.threshold,
                remaining: entry.remaining,
                pending: entry.pending.map(({ member, message }) => ({ member: structuredClone(member), message })),
                submitted: entry.submitted.map((submitted) => ({ ...structuredClone(submitted) })),
            },
        };
    }

    private renderRequest(request: FakeRequest, { omitParams = false } = {}): Json {
        const base: Json = {
            id: request.id,
            status: request.status,
            chainType: request.chainType,
            walletType: "smart",
            createdAt: request.createdAt,
            ...(request.completedAt != null ? { completedAt: request.completedAt } : {}),
            approvals: this.renderApprovals(request),
            ...(request.error != null ? { error: structuredClone(request.error) } : {}),
        };
        if (request.kind === "signature") {
            return {
                ...base,
                type: request.signatureType,
                params: structuredClone(request.params),
                ...(request.outputSignature != null ? { outputSignature: request.outputSignature } : {}),
            };
        }
        return {
            ...base,
            ...(omitParams ? {} : { params: structuredClone(request.params) }),
            onChain: structuredClone(request.onChain),
            ...(request.sendParams != null ? { sendParams: structuredClone(request.sendParams) } : {}),
        };
    }

    // -----------------------------------------------------------------------------------------------------------------
    // Approvals (crossbit-main `ApprovalProcessor.process` + the transaction service around it)
    // -----------------------------------------------------------------------------------------------------------------

    private async approve(request: FakeRequest, body: Json): Promise<Result> {
        if (request.status === "awaiting-approval" && Date.now() > request.expiresAt) {
            this.expireRequest(request);
        }
        if (this.isExpired(request)) {
            // wallet.quorum-approve.test.ts: the API answers an approval of an expired request with this 422.
            return { status: 422, body: errorBody(422, TRANSACTION_EXPIRED_MESSAGE, "TRANSACTION_EXPIRED") };
        }
        const input: Json[] = body?.approvals;
        if (!Array.isArray(input) || input.length === 0) fail(400, "approvals must be a non-empty array");
        for (const approval of input) {
            if (typeof approval?.signer !== "string") fail(400, "Each approval needs a signer locator");
        }

        const approvals = input.filter((approval) => !this.isQuorumMemberResubmission(request, approval));
        if (approvals.length === 0) {
            return ok(this.renderRequest(request), 201);
        }
        if (this.pendingNonCustodial(request).length === 0) {
            fail(422, ALREADY_COMPLETE_MESSAGE);
        }

        const flatByLocator = new Map<string, FlatEntry[]>();
        // A member keyed by its locator, with every quorum entry it is pending in (one quorum may have several entries,
        // one per Stellar auth entry); a member pending in two different quorums is rejected.
        const memberByLocator = new Map<
            string,
            { quorumLocator: string; members: Array<{ entry: QuorumEntry; member: MemberPending }> }
        >();
        for (const entry of request.pending) {
            if (entry.kind === "flat") {
                const key = comparableLocator(entry.signer.locator);
                flatByLocator.set(key, [...(flatByLocator.get(key) ?? []), entry]);
                continue;
            }
            for (const member of entry.pending) {
                const key = comparableLocator(member.member.locator);
                const existing = memberByLocator.get(key);
                if (existing == null) {
                    memberByLocator.set(key, { quorumLocator: entry.quorum.locator, members: [{ entry, member }] });
                    continue;
                }
                if (existing.quorumLocator !== entry.quorum.locator) {
                    fail(
                        422,
                        `Signer '${member.member.locator}' belongs to multiple quorums ('${existing.quorumLocator}' and '${entry.quorum.locator}'), which is not supported`
                    );
                }
                existing.members.push({ entry, member });
            }
        }
        for (const key of memberByLocator.keys()) {
            if (flatByLocator.has(key)) {
                // crossbit-main throws a plain Error here, which surfaces as a 500.
                fail(500, `Signer '${key}' is both a standalone signer and a quorum member, which is not supported`);
            }
        }

        type Candidate = { flat?: FlatEntry; quorum?: QuorumEntry; member?: MemberPending };
        const validated: Array<{ locator: string; signature: string; candidates: Candidate[] }> = [];
        for (const approval of approvals) {
            const key = comparableLocator(approval.signer);
            const flat = flatByLocator.get(key);
            const member = memberByLocator.get(key);
            const candidates: Candidate[] =
                flat != null && flat.length > 0
                    ? flat.map((entry) => ({ flat: entry }))
                    : member?.members.map(({ entry, member: pending }) => ({ quorum: entry, member: pending })) ?? [];
            if (candidates.length === 0) {
                const alreadySubmitted =
                    request.submitted.some((entry) =>
                        entry.kind === "flat"
                            ? comparableLocator(entry.signer.locator) === key
                            : entry.submitted.some((s) => comparableLocator(s.member.locator) === key)
                    ) ||
                    request.pending.some(
                        (entry) =>
                            entry.kind === "quorum" &&
                            entry.submitted.some((s) => comparableLocator(s.member.locator) === key)
                    );
                if (alreadySubmitted) {
                    fail(409, `Signature for signer '${approval.signer}' already submitted`);
                }
                const pendingSigners = Array.from(
                    new Set(
                        request.pending.flatMap((entry) =>
                            entry.kind === "flat"
                                ? [entry.signer.locator]
                                : [entry.quorum.locator, ...entry.pending.map((m) => m.member.locator)]
                        )
                    )
                );
                fail(
                    400,
                    `Signature is not pending for signer '${approval.signer}'. The pending signers for this transaction are: ${pendingSigners.join(", ")}`
                );
            }
            const signature = encodeSignature(approval.signature);
            const valid: Candidate[] = [];
            for (const candidate of candidates) {
                const identity = candidate.flat?.signer ?? (candidate.member as MemberPending).member;
                const message = candidate.flat?.message ?? (candidate.member as MemberPending).message;
                if (await this.verify(request, identity, message, approval.signature)) valid.push(candidate);
            }
            if (valid.length === 0) fail(400, "Invalid signature");
            validated.push({ locator: approval.signer, signature, candidates: valid });
        }

        const seenSignatures = new Set<string>();
        for (const entry of validated) {
            const signatureKey = `${comparableLocator(entry.locator)}:${entry.signature}`;
            if (seenSignatures.has(signatureKey)) {
                fail(409, `The same signature was submitted twice for signer '${entry.locator}' in this submission`);
            }
            seenSignatures.add(signatureKey);
        }

        const taken = new Set<Candidate["flat"] | MemberPending>();
        const assigned = validated.map((entry) => {
            const candidate = entry.candidates.find((c) => !taken.has(c.flat ?? c.member));
            if (candidate == null) {
                fail(
                    409,
                    `Duplicate signature for signer '${entry.locator}': it matches the same pending approval as another signature in this submission`
                );
            }
            taken.add((candidate as Candidate).flat ?? (candidate as Candidate).member);
            return { ...entry, candidate: candidate as Candidate };
        });

        if (request.status !== "awaiting-approval") {
            fail(409, `Transaction '${request.id}' is no longer awaiting approval`);
        }

        const submittedAt = this.now();
        for (const { signature, candidate } of assigned) {
            if (candidate.flat != null) {
                const entry = candidate.flat;
                request.pending = request.pending.filter((other) => other !== entry);
                request.submitted.push({ ...entry, signature, submittedAt });
                continue;
            }
            const quorum = candidate.quorum as QuorumEntry;
            const member = candidate.member as MemberPending;
            if (quorum.remaining <= 0) continue;
            // crossbit-main `WalletTransactionRepository`: the member moves pending → submitted and `remaining`
            // drops; once it reaches 0 the whole entry moves to the top-level `submitted`, its unsigned members
            // still listed under its own `pending`.
            quorum.pending = quorum.pending.filter((other) => other !== member);
            quorum.submitted.push({ ...member, signature, submittedAt });
            quorum.remaining--;
            if (quorum.remaining === 0) {
                request.pending = request.pending.filter((other) => other !== quorum);
                request.submitted.push(quorum);
            }
        }
        this.completeIfApproved(request);
        return ok(this.renderRequest(request), 201);
    }

    /** crossbit-main `isQuorumMemberResubmission`: a member that already signed is ignored, not rejected. */
    private isQuorumMemberResubmission(request: FakeRequest, approval: Json): boolean {
        const key = comparableLocator(String(approval?.signer));
        const quorumEntries = [...request.pending, ...request.submitted].filter(
            (entry): entry is QuorumEntry => entry.kind === "quorum"
        );
        const submissions = quorumEntries.flatMap((entry) =>
            entry.submitted.filter((s) => comparableLocator(s.member.locator) === key)
        );
        if (submissions.length === 0) return false;
        const stillPending = this.pendingNonCustodial(request).some(
            (entry) => entry.kind === "quorum" && entry.pending.some((m) => comparableLocator(m.member.locator) === key)
        );
        if (!stillPending) return true;
        const signature = encodeSignature(approval.signature);
        return submissions.some((s) => s.signature === signature);
    }

    /** Whether `signature` is `identity`'s signature over `message`, for the key types the fake can check. */
    private async verify(request: FakeRequest, identity: Identity, message: string, signature: Json): Promise<boolean> {
        if (signature == null || signature === "") return false;
        if (!this.options.verifySignatures) return true;
        try {
            switch (identity.type) {
                case "external-wallet":
                    return await verifyExternalWallet(request.chainType, identity.address, message, signature);
                case "device":
                    return verifyDevice(request.chainType, identity.locator, message, signature);
                case "api-key":
                    // Custodial: the API signs it, a client never does.
                    return false;
                default:
                    // ASSUMPTION: email / phone / server / passkey signatures come from a TEE or WebAuthn; the fake
                    // accepts any non-empty one.
                    return true;
            }
        } catch {
            return false;
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Signature checks
// ---------------------------------------------------------------------------------------------------------------------

/** How a submitted signature is stored and compared (crossbit-main stores non-EVM device signatures as JSON). */
function encodeSignature(signature: Json): string {
    return typeof signature === "string" ? signature : JSON.stringify(signature);
}

// ASSUMPTION: EVM external wallets are checked as a Kernel ECDSA validator checks them: an EIP-191 signature over the
// raw hash, or a signature of the hash itself.
async function verifyExternalWallet(chainType: ChainType, address: string, message: string, signature: Json) {
    if (typeof signature !== "string") return false;
    switch (chainType) {
        case "evm": {
            if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) return false;
            const raw = message as `0x${string}`;
            const sig = signature as `0x${string}`;
            const personal = await recoverMessageAddress({ message: { raw }, signature: sig });
            if (personal.toLowerCase() === address.toLowerCase()) return true;
            const direct = await recoverAddress({ hash: raw, signature: sig });
            return direct.toLowerCase() === address.toLowerCase();
        }
        case "stellar":
            // ASSUMPTION: a Stellar external wallet returns a base64 ed25519 signature over the decoded 32-byte hash,
            // as the SDK's own StellarServerSigner does.
            return ed25519.verify(
                Buffer.from(signature, "base64"),
                Buffer.from(message, "base64"),
                decodeStellarPublicKey(address)
            );
        case "solana":
            return ed25519.verify(base58.decode(signature), base58.decode(message), base58.decode(address));
    }
}

// A platform P-256 key SHA-256s the message before signing (quickstart-devkit mock storage, commit ebdf2f24).
function verifyDevice(chainType: ChainType, locator: string, message: string, signature: Json) {
    if (signature == null || typeof signature !== "object" || signature.r == null || signature.s == null) return false;
    const payload =
        chainType === "evm"
            ? new Uint8Array(Buffer.from(message.replace(/^0x/, ""), "hex"))
            : chainType === "stellar"
              ? new Uint8Array(Buffer.from(message, "base64"))
              : base58.decode(message);
    return P256.verify({
        hash: true,
        payload,
        publicKey: devicePublicKeyFromLocator(locator),
        signature: { r: BigInt(signature.r), s: BigInt(signature.s) },
    });
}

// ---------------------------------------------------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------------------------------------------------

type Route = {
    name: RouteName;
    raw: string;
    wallet?: string;
    id?: string;
    signer?: string;
    token?: string;
    serverSide?: boolean;
};

function routeOf(method: string, segments: string[]): Route {
    const raw = `/${segments.join("/")}`;
    const unknown: Route = { name: "unknown", raw };
    if (segments[0] !== "api" || segments[1] !== "2025-06-09" || segments[2] !== "wallets") return unknown;
    const rest = segments.slice(3);
    if (method === "POST" && (rest.length === 0 || (rest.length === 1 && rest[0] === "me"))) {
        return { name: "createWallet", raw, serverSide: rest.length === 0 };
    }
    const [wallet, resource, id, sub] = rest;
    if (wallet == null) return unknown;
    const base = { raw, wallet };
    if (resource == null) return method === "GET" ? { ...base, name: "getWallet" } : unknown;
    switch (resource) {
        case "transactions":
        case "signatures": {
            const isTx = resource === "transactions";
            if (id == null) {
                if (method === "POST") return { ...base, name: isTx ? "createTransaction" : "createSignature" };
                if (method === "GET") return { ...base, name: isTx ? "listTransactions" : "listSignatures" };
                return unknown;
            }
            if (sub == null && method === "GET") return { ...base, id, name: isTx ? "getTransaction" : "getSignature" };
            if (sub === "approvals" && method === "POST") {
                return { ...base, id, name: isTx ? "approveTransaction" : "approveSignature" };
            }
            return unknown;
        }
        case "tokens":
            return method === "POST" && sub === "transfers" && id != null
                ? { ...base, token: id, name: "send" }
                : unknown;
        case "signers":
            if (id == null) return method === "POST" ? { ...base, name: "registerSigner" } : unknown;
            if (method === "GET") return { ...base, signer: id, name: "getSigner" };
            if (method === "DELETE") return { ...base, signer: id, name: "removeSigner" };
            return unknown;
        case "recovery-methods":
            if (id == null) return method === "POST" ? { ...base, name: "addRecoveryMethod" } : unknown;
            return method === "DELETE" ? { ...base, signer: id, name: "removeRecoveryMethod" } : unknown;
        case "balances":
            return method === "GET" ? { ...base, name: "getBalance" } : unknown;
        default:
            return unknown;
    }
}

function parseMeLocator(locator: string): { chainType: ChainType; alias?: string } | null {
    const match = /^me:(evm|solana|stellar):smart(?::alias:(.+))?$/.exec(locator);
    if (match == null) return null;
    return { chainType: match[1] as ChainType, alias: match[2] };
}

function walletKey(user: string, chainType: ChainType, alias: string | undefined): string {
    return `${user}|${chainType}|${alias ?? ""}`;
}

function quorumCompositionKey(quorum: QuorumRecord): string {
    return `${quorum.threshold}:${quorum.members
        .map((member) => comparableLocator(member.locator))
        .sort()
        .join(",")}`;
}

function deletePath(target: Json, path: string) {
    const parts = path.split(".");
    let cursor = target;
    for (const part of parts.slice(0, -1)) {
        if (cursor == null || typeof cursor !== "object") return;
        cursor = cursor[part];
    }
    if (cursor != null && typeof cursor === "object") delete cursor[parts[parts.length - 1]];
}
