/**
 * The m7 fault matrix: every public method × every route it calls × every fault kind × phase. A scenario builds the
 * wallet state (`setup`), makes one public call (`act`), and says what a correct result looks like (`verify`) and what
 * a retry must never leave behind (`invariant`). The runner records, per cell, how the call ended and how its retry
 * ended, and classifies anything that is not a typed error, a correct success, or a clean retry.
 *
 * Throwaway m7 code: pragmatic by design.
 */
import { ApiClientError, CrossmintSDKError } from "@crossmint/common-sdk-base";
import { vi } from "vitest";
import type { FaultKind, FaultRule, RouteName } from "./fake-api";
import { settle, stressEnv, type StressEnv } from "./harness";

// biome-ignore lint/suspicious/noExplicitAny: the SDK's generic configs are not worth spelling out here
export type Any = any;

export type Ctx = { env: StressEnv; wallet?: Any; [key: string]: Any };

export type Scenario = {
    name: string;
    setup: (env: StressEnv) => Promise<Ctx>;
    act: (ctx: Ctx) => Promise<unknown>;
    /** Throws when a resolved call is not what a fault-free call returns (a silent wrong success). */
    verify: (ctx: Ctx, value: unknown) => void | Promise<void>;
    /** After the retry: a description of the duplicate the call left on the server, or null. */
    invariant?: (ctx: Ctx) => string | null;
    /** The retry after a failed call; defaults to `act` on the same objects, as an app would retry. */
    retry?: (ctx: Ctx) => Promise<unknown>;
};

export type FaultSpec = { label: string; fault: FaultKind; phase: "before" | "after" };

/** How a call ended. */
export type Outcome =
    | "ok" // resolved and verified
    | "typed" // a CrossmintSDKError subclass
    | "api-client" // ApiClientError (5xx / non-JSON)
    | "network-raw" // fetch's own TypeError("fetch failed"), passed through untouched
    | "null-known" // a TypeError on a JSON `null` body (the known `"error" in null` finding)
    | "untyped" // a plain Error (not one of the SDK's typed errors)
    | "TypeError"
    | "SyntaxError"
    | "silent" // resolved, but `verify` rejected the value
    | "hang";

export type Cell = {
    scenario: string;
    route: RouteName;
    occurrence: number;
    fault: string;
    phase: "before" | "after";
    outcome: Outcome;
    detail: string;
    retry?: "ok" | "skipped" | `failed: ${string}`;
    duplicate?: string | null;
};

export function classify(error: unknown, fault?: FaultKind): { outcome: Outcome; detail: string } {
    const detail = error instanceof Error ? `${error.constructor.name}: ${error.message}`.slice(0, 220) : String(error);
    if (error instanceof ApiClientError) return { outcome: "api-client", detail };
    if (error instanceof CrossmintSDKError) return { outcome: "typed", detail };
    if (error instanceof TypeError && error.message === "fetch failed") return { outcome: "network-raw", detail };
    if (error instanceof TypeError && fault?.type === "null-body" && /null/.test(error.message)) {
        return { outcome: "null-known", detail };
    }
    if (error instanceof TypeError) return { outcome: "TypeError", detail };
    if (error instanceof SyntaxError) return { outcome: "SyntaxError", detail };
    if (error instanceof Error && error.message.includes("did not settle")) return { outcome: "hang", detail };
    return { outcome: "untyped", detail };
}

/** Faults applied to every route occurrence, in the "before" phase; a lost response ("after") uses one kind. */
export const BASE_FAULTS: FaultSpec[] = [
    { label: "503", fault: { type: "status", status: 503 }, phase: "before" },
    { label: "400", fault: { type: "status", status: 400, message: "Bad Request" }, phase: "before" },
    { label: "404", fault: { type: "status", status: 404, message: "Not Found" }, phase: "before" },
    {
        label: "401-jwt-expired",
        fault: { type: "status", status: 401, message: "JWT expired", code: "ERROR_JWT_EXPIRED" },
        phase: "before",
    },
    { label: "429", fault: { type: "status", status: 429, message: "Too Many Requests" }, phase: "before" },
    { label: "html-502", fault: { type: "html", status: 502 }, phase: "before" },
    { label: "html-403", fault: { type: "html", status: 403 }, phase: "before" },
    { label: "null-body", fault: { type: "null-body" }, phase: "before" },
    { label: "network", fault: { type: "network" }, phase: "before" },
    { label: "delay-3s", fault: { type: "delay", ms: 3_000 }, phase: "before" },
    { label: "lost-503", fault: { type: "status", status: 503 }, phase: "after" },
    { label: "lost-network", fault: { type: "network" }, phase: "after" },
    { label: "lost-html-502", fault: { type: "html", status: 502 }, phase: "after" },
];

/** Fields worth dropping from each route's response (malformed but plausible bodies). */
export const DROP_FIELDS: Partial<Record<RouteName, string[]>> = {
    createWallet: ["address", "config", "config.adminSigner", "config.recoveryMethods", "chainType"],
    getWallet: ["address", "config", "config.adminSigner", "config.recoveryMethods", "type"],
    send: ["id", "approvals"],
    createTransaction: ["id", "approvals"],
    getTransaction: ["status", "approvals", "approvals.pending", "onChain", "chainType"],
    approveTransaction: ["status", "approvals"],
    createSignature: ["id"],
    getSignature: ["status", "approvals", "outputSignature"],
    approveSignature: ["status", "outputSignature"],
    registerSigner: ["locator", "type", "chains", "transaction"],
    getSigner: ["locator", "type", "chains", "transaction"],
    removeSigner: ["id"],
    addRecoveryMethod: ["tx", "recoveryMethods"],
    removeRecoveryMethod: ["id"],
    listTransactions: ["transactions"],
};

export type MatrixOptions = {
    seed: number;
    /** Route occurrences per route to fault (0 = first call to it, 1 = second, ...). */
    occurrences?: number;
    faults?: FaultSpec[];
    drops?: boolean;
    /** Keep only these cells (sampling for the default run). */
    sample?: (cell: { route: RouteName; occurrence: number; fault: string; phase: string }) => boolean;
};

/** The routes `act` calls, in order, on a fault-free run. */
export async function discoverRoutes(scenario: Scenario, seed: number): Promise<RouteName[]> {
    const env = stressEnv(seed);
    try {
        const ctx = await scenario.setup(env);
        const start = env.fake.calls.length;
        const outcome = await settle(scenario.act(ctx));
        if ("error" in outcome) {
            const error = new Error(`${scenario.name}: the fault-free call failed: ${String(outcome.error)}`);
            (error as Error & { cause?: unknown }).cause = outcome.error;
            throw error;
        }
        await scenario.verify(ctx, outcome.value);
        return env.fake.calls.slice(start).map((call) => call.route);
    } finally {
        env.dispose();
    }
}

/** Runs one cell: a fresh env, the scenario's setup, the fault on `route`'s `occurrence`-th call, the call, a retry. */
export async function runCell(
    scenario: Scenario,
    seed: number,
    route: RouteName,
    occurrence: number,
    spec: FaultSpec
): Promise<Cell> {
    const env = stressEnv(seed);
    try {
        const ctx = await scenario.setup(env);
        const rule: FaultRule = {
            route,
            skip: occurrence,
            times: 1,
            phase: spec.phase,
            fault: spec.fault,
            label: spec.label,
        };
        env.fake.faults.add(rule);
        const outcome = await settle(scenario.act(ctx), { maxMs: 5 * 60_000 });
        env.fake.faults.clear();
        const cell: Cell = {
            scenario: scenario.name,
            route,
            occurrence,
            fault: spec.label,
            phase: spec.phase,
            outcome: "ok",
            detail: "",
        };
        if ("value" in outcome) {
            try {
                await scenario.verify(ctx, outcome.value);
            } catch (error) {
                cell.outcome = "silent";
                cell.detail = error instanceof Error ? error.message.slice(0, 220) : String(error);
            }
            cell.duplicate = scenario.invariant?.(ctx) ?? null;
            return cell;
        }
        const { outcome: kind, detail } = classify(outcome.error, spec.fault);
        cell.outcome = kind;
        cell.detail = detail;
        if (kind === "hang") {
            cell.retry = "skipped";
            return cell;
        }
        const retried = await settle((scenario.retry ?? scenario.act)(ctx), { maxMs: 5 * 60_000 });
        if ("error" in retried) {
            const { detail: retryDetail } = classify(retried.error);
            cell.retry = `failed: ${retryDetail}`;
        } else {
            try {
                await scenario.verify(ctx, retried.value);
                cell.retry = "ok";
            } catch (error) {
                cell.retry = `failed: verify: ${error instanceof Error ? error.message.slice(0, 160) : String(error)}`;
            }
        }
        cell.duplicate = scenario.invariant?.(ctx) ?? null;
        return cell;
    } finally {
        env.fake.faults.clear();
        env.dispose();
    }
}

/** Every (route, occurrence) `act` reaches on a fault-free run, up to `occurrences` per route. */
export function routeOccurrences(routes: RouteName[], occurrences: number): Array<[RouteName, number]> {
    const counts = new Map<RouteName, number>();
    const out: Array<[RouteName, number]> = [];
    for (const route of routes) {
        const index = counts.get(route) ?? 0;
        counts.set(route, index + 1);
        if (index < occurrences) out.push([route, index]);
    }
    return out;
}

export async function runMatrix(scenario: Scenario, options: MatrixOptions): Promise<Cell[]> {
    const { seed, occurrences = 2, faults = BASE_FAULTS, drops = true, sample } = options;
    const routes = await discoverRoutes(scenario, seed);
    const cells: Cell[] = [];
    for (const [route, occurrence] of routeOccurrences(routes, occurrences)) {
        const specs: FaultSpec[] = [...faults];
        if (drops) {
            for (const path of DROP_FIELDS[route] ?? []) {
                specs.push({ label: `drop:${path}`, fault: { type: "drop-field", path }, phase: "before" });
            }
            if (route === "getTransaction" || route === "getSignature") {
                specs.push({
                    label: "status:unknown",
                    fault: { type: "mutate", fn: (body) => ({ ...body, status: "processing" }) },
                    phase: "before",
                });
            }
        }
        for (const spec of specs) {
            if (sample != null && !sample({ route, occurrence, fault: spec.label, phase: spec.phase })) continue;
            cells.push(await runCell(scenario, seed, route, occurrence, spec));
        }
    }
    return cells;
}

/** The cells that are neither a typed error with a clean retry nor a verified success, minus the known ones. */
export function anomalies(
    cells: Cell[],
    known: Array<(cell: Cell) => string | null>
): {
    unexpected: Cell[];
    byFinding: Map<string, Cell[]>;
} {
    const unexpected: Cell[] = [];
    const byFinding = new Map<string, Cell[]>();
    for (const cell of cells) {
        if (!isAnomaly(cell)) continue;
        const finding = known.map((match) => match(cell)).find((id) => id != null);
        if (finding == null) {
            unexpected.push(cell);
            continue;
        }
        byFinding.set(finding, [...(byFinding.get(finding) ?? []), cell]);
    }
    return { unexpected, byFinding };
}

export function isAnomaly(cell: Cell): boolean {
    const goodEnd = cell.outcome === "ok" || cell.outcome === "typed" || cell.outcome === "api-client";
    const goodRetry = cell.retry == null || cell.retry === "ok" || cell.retry === "skipped";
    return !goodEnd || !goodRetry || cell.duplicate != null;
}

export function formatCells(cells: Cell[]): string {
    return cells
        .map(
            (cell) =>
                `${cell.scenario} | ${cell.route}#${cell.occurrence} | ${cell.fault}/${cell.phase} | ${cell.outcome}` +
                `${cell.detail ? ` (${cell.detail})` : ""}` +
                `${cell.retry != null ? ` | retry ${cell.retry}` : ""}` +
                `${cell.duplicate != null ? ` | DUPLICATE ${cell.duplicate}` : ""}`
        )
        .join("\n");
}

/** Silences `console.warn` from the SDK's deprecated paths during a matrix (it runs thousands of calls). */
export function quietConsole() {
    vi.spyOn(console, "warn").mockImplementation(() => {});
}
