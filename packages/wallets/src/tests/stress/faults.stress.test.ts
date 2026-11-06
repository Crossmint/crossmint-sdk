/**
 * m7 stress: API faults on every public method, and the wallet factory.
 *
 * 1. A fault matrix: each public call × each route it reaches × each fault kind × phase (before: the server never saw
 *    the call; after: the server applied it, the response was lost). A failure must be a typed SDK error or an
 *    ApiClientError, a success must be the real result, and a retry after a lost response must neither fail for good
 *    nor leave a duplicate behind.
 * 2. Malformed responses.
 * 3. The factory: createWallet / getWallet against existing wallets, with every recovery and signer config.
 *
 * `it.fails` marks an SDK bug: the test states the right behavior, so it fails while the bug stands.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { P256 } from "ox";
import { ApiClientError, CrossmintSDKError } from "@crossmint/common-sdk-base";
import { EVMWallet } from "../../wallets/evm";
import { StellarWallet } from "../../wallets/stellar";
import { WalletCreationError } from "../../utils/errors";
import { drive, forEachSeed, recipientFor, quorumOf, settle, stressEnv, stressRuns, useStressTimers } from "./harness";
import type { StressEnv } from "./harness";
import {
    anomalies,
    type Any,
    type Cell,
    type Ctx,
    formatCells,
    quietConsole,
    runMatrix,
    type Scenario,
} from "./faults.helpers";

const EVM = "base-sepolia";

/** `it.fails` for a bug repro; `STRESS_SHOW_BUGS=1` runs them as plain tests to see how each one fails. */
const bug = process.env.STRESS_SHOW_BUGS != null ? it : it.fails;

beforeEach(() => {
    useStressTimers();
    quietConsole();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

// ---------------------------------------------------------------------------------------------------------------------
// Server-state readers
// ---------------------------------------------------------------------------------------------------------------------

const requestsWith = (env: StressEnv, purpose: string | RegExp) =>
    [...env.fake.requests.values()].filter((request) =>
        typeof purpose === "string" ? request.purpose === purpose : purpose.test(request.purpose)
    );

/** Requests of `purpose` the server approved (pending) or landed (success). */
const approvedWith = (env: StressEnv, purpose: string | RegExp) =>
    requestsWith(env, purpose).filter((request) => request.status === "success" || request.status === "pending");

const atMostOne = (env: StressEnv, purpose: string | RegExp, what: string) => {
    const approved = approvedWith(env, purpose);
    return approved.length > 1 ? `${approved.length} ${what} approved/landed` : null;
};

const onlyWallet = (env: StressEnv) => [...env.fake.wallets.values()];

/** Delegated Stellar signers whose registration landed (a pending or expired one is not installed). */
const activeOnStellar = (env: StressEnv, address: string) =>
    env.fake
        .signersOf(address)
        .filter((signer: Any) => signer.transaction == null || signer.transaction.status === "success");

/** Delegated signers installed on the EVM test chain (no `chains` = a genesis signer, on every chain). */
const activeOnEvm = (env: StressEnv, address: string) =>
    env.fake
        .signersOf(address)
        .filter((signer: Any) => signer.chains == null || ["success", "active"].includes(signer.chains[EVM]?.status));

// ---------------------------------------------------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------------------------------------------------

async function flatWallet(env: StressEnv, chain: string = EVM, extra: Any = {}) {
    const recovery = env.key(chain);
    const wallet = await drive(env.sdk().createWallet({ chain, recovery: recovery.config, ...extra } as Any));
    return { env, wallet, recovery, chain } as Ctx;
}

const sendScenario = (chain: string, label = "flat external-wallet"): Scenario => ({
    name: `${chain} send (${label})`,
    setup: async (env) => {
        const ctx = await flatWallet(env, chain);
        ctx.to = recipientFor(chain, env.rng);
        return ctx;
    },
    act: (ctx) => ctx.wallet.send(ctx.to, "usdc", "1"),
    verify: (ctx, value: Any) => {
        expect(value.hash).toEqual(expect.any(String));
        expect(ctx.env.fake.renderedRequest(value.transactionId).status).toBe("success");
    },
    invariant: (ctx) => atMostOne(ctx.env, "send", "transfers"),
});

const scenarios: Scenario[] = [
    {
        name: "evm createWallet (flat external-wallet)",
        setup: async (env) => ({ env, recovery: env.key(EVM) }),
        act: (ctx) => ctx.env.sdk().createWallet({ chain: EVM, recovery: ctx.recovery.config } as Any),
        verify: (ctx, value: Any) => {
            expect(onlyWallet(ctx.env).map((w) => w.address)).toEqual([value.address]);
            expect(value.recovery.address).toBe(ctx.recovery.address);
        },
        invariant: (ctx) => (ctx.env.fake.wallets.size > 1 ? `${ctx.env.fake.wallets.size} wallets` : null),
    },
    {
        name: "evm createWallet (device storage auto-injected)",
        setup: async (env) => ({ env, recovery: env.key(EVM), device: env.device() }),
        act: (ctx) =>
            ctx.env.sdk().createWallet({
                chain: EVM,
                recovery: ctx.recovery.config,
                options: { deviceSignerKeyStorage: ctx.device },
            } as Any),
        verify: async (ctx, value: Any) => {
            expect(onlyWallet(ctx.env).map((w) => w.address)).toEqual([value.address]);
            // Usable without registering another device signer.
            ctx.wallet = value;
            const tx = await drive(value.send(recipientFor(EVM, ctx.env.rng), "usdc", "1"));
            expect(tx.hash).toEqual(expect.any(String));
            const devices = ctx.env.fake.signersOf(value.address).filter((s: Any) => s.type === "device");
            expect(devices).toHaveLength(1);
        },
        invariant: (ctx) => {
            const [wallet] = onlyWallet(ctx.env);
            const devices = wallet?.delegated.filter((r) => !r.deleted && r.identity.type === "device") ?? [];
            return ctx.env.fake.wallets.size > 1 || devices.length > 1
                ? `${ctx.env.fake.wallets.size} wallets, ${devices.length} device signers`
                : null;
        },
    },
    {
        name: "evm getWallet (recovery + one delegated signer)",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            ctx.op = env.key(EVM);
            await drive(ctx.wallet.addSigner(ctx.op.config));
            return ctx;
        },
        act: (ctx) =>
            ctx.env.sdk().getWallet({ chain: EVM, recovery: ctx.recovery.config, signers: [ctx.op.config] } as Any),
        verify: (ctx, value: Any) => {
            expect(value.address).toBe(ctx.wallet.address);
            expect(value.signer?.locator()).toBe(ctx.op.locator);
            expect(value.signer?.status).toBe("success");
        },
    },
    sendScenario(EVM),
    {
        ...sendScenario(EVM, "api-key recovery"),
        setup: async (env) => {
            const wallet = await drive(env.sdk().createWallet({ chain: EVM, recovery: { type: "api-key" } } as Any));
            return { env, wallet, to: recipientFor(EVM, env.rng) };
        },
    },
    {
        name: "evm sendTransaction",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            ctx.evm = EVMWallet.from(ctx.wallet);
            ctx.to = recipientFor(EVM, env.rng);
            return ctx;
        },
        act: (ctx) => ctx.evm.sendTransaction({ to: ctx.to, value: BigInt(1) }),
        verify: (ctx, value: Any) => {
            expect(value.hash).toEqual(expect.any(String));
            expect(ctx.env.fake.renderedRequest(value.transactionId).status).toBe("success");
        },
        invariant: (ctx) => atMostOne(ctx.env, "transaction", "transactions"),
    },
    {
        name: "evm signMessage",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            ctx.evm = EVMWallet.from(ctx.wallet);
            return ctx;
        },
        act: (ctx) => ctx.evm.signMessage({ message: "hello" }),
        verify: (ctx, value: Any) => {
            expect(value.signature).toMatch(/^0x[0-9a-f]{130}$/);
            expect(ctx.env.fake.renderedRequest(value.signatureId).outputSignature).toBe(value.signature);
        },
    },
    {
        name: "evm signTypedData",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            ctx.evm = EVMWallet.from(ctx.wallet);
            return ctx;
        },
        act: (ctx) =>
            ctx.evm.signTypedData({
                domain: {
                    name: "Stress",
                    version: "1",
                    chainId: 84532,
                    verifyingContract: "0x0000000000000000000000000000000000000001",
                },
                types: { Mail: [{ name: "contents", type: "string" }] },
                primaryType: "Mail",
                message: { contents: "hello" },
                chain: EVM,
            }),
        verify: (ctx, value: Any) => {
            expect(value.signature).toMatch(/^0x[0-9a-f]{130}$/);
            expect(ctx.env.fake.renderedRequest(value.signatureId).outputSignature).toBe(value.signature);
        },
    },
    {
        name: "evm approve (a prepared transfer)",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            ctx.prepared = await drive(ctx.wallet.send(recipientFor(EVM, env.rng), "usdc", "1", { prepareOnly: true }));
            return ctx;
        },
        act: (ctx) => ctx.wallet.approve({ transactionId: ctx.prepared.transactionId }),
        verify: (ctx, value: Any) => {
            expect(value.hash).toEqual(expect.any(String));
            expect(ctx.env.fake.renderedRequest(ctx.prepared.transactionId).status).toBe("success");
        },
    },
    {
        name: "evm addSigner (transaction)",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            ctx.op = env.key(EVM);
            return ctx;
        },
        act: (ctx) => ctx.wallet.addSigner(ctx.op.config),
        verify: (ctx, value: Any) => {
            expect(value.status).toBe("success");
            expect(ctx.env.fake.signersOf(ctx.wallet.address).map((s: Any) => s.locator)).toEqual([ctx.op.locator]);
            expect(ctx.env.fake.signersOf(ctx.wallet.address)[0].chains[EVM].status).toBe("success");
        },
        invariant: (ctx) => atMostOne(ctx.env, /^register /, "registrations"),
    },
    {
        name: "evm addSigner (signature, deployImmediately: false)",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            ctx.op = env.key(EVM);
            return ctx;
        },
        act: (ctx) => ctx.wallet.addSigner(ctx.op.config, { deployImmediately: false }),
        verify: (ctx, value: Any) => {
            expect(value.status).toBe("success");
            expect(ctx.env.fake.signersOf(ctx.wallet.address)[0].chains[EVM]).toEqual({ status: "active" });
        },
        invariant: (ctx) => atMostOne(ctx.env, /^register /, "registrations"),
    },
    {
        name: "evm removeSigner",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            ctx.op = env.key(EVM);
            await drive(ctx.wallet.addSigner(ctx.op.config));
            return ctx;
        },
        act: (ctx) => ctx.wallet.removeSigner(ctx.op.config),
        verify: (ctx, value: Any) => {
            expect(value.status).toBe("success");
            expect(ctx.env.fake.signersOf(ctx.wallet.address)).toEqual([]);
        },
    },
    {
        name: "evm addRecoveryMethod",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            ctx.second = env.key(EVM);
            return ctx;
        },
        act: (ctx) => ctx.wallet.addRecoveryMethod(ctx.second.config),
        verify: (ctx, value: Any) => {
            expect(value.status).toBe("success");
            const listed = ctx.env.fake.renderedWallet(ctx.wallet.address).config.recoveryMethods;
            expect(listed.map((r: Any) => r.locator)).toEqual([ctx.recovery.locator, ctx.second.locator]);
            expect(ctx.wallet.recoveryMethods.map((r: Any) => r.address)).toContain(ctx.second.address);
        },
        invariant: (ctx) => atMostOne(ctx.env, /^add recovery /, "recovery additions"),
    },
    {
        name: "evm removeRecoveryMethod",
        setup: async (env) => {
            const [first, second] = [env.key(EVM), env.key(EVM)];
            const wallet = await drive(
                env.sdk().createWallet({ chain: EVM, recoveryMethods: [first.config, second.config] } as Any)
            );
            await drive(wallet.useRecoveryMethod(first.config));
            return { env, wallet, first, second };
        },
        act: (ctx) => ctx.wallet.removeRecoveryMethod(ctx.second.config),
        verify: (ctx, value: Any) => {
            expect(value.status).toBe("success");
            const listed = ctx.env.fake.renderedWallet(ctx.wallet.address).config.recoveryMethods;
            expect(listed.map((r: Any) => r.locator)).toEqual([ctx.first.locator]);
            expect(ctx.wallet.recoveryMethods).toHaveLength(1);
        },
    },
    {
        name: "evm recover (flat, device key lost)",
        setup: async (env) => {
            const recovery = env.key(EVM);
            const device = env.device();
            const created = await drive(
                env.sdk().createWallet({
                    chain: EVM,
                    recovery: recovery.config,
                    options: { deviceSignerKeyStorage: device },
                } as Any)
            );
            const oldDevice = device.locatorFor(created.address);
            await device.deleteKey(created.address);
            const wallet = await drive(
                env.sdk().getWallet({
                    chain: EVM,
                    recovery: recovery.config,
                    options: { deviceSignerKeyStorage: device },
                } as Any)
            );
            return { env, wallet, recovery, device, oldDevice };
        },
        act: (ctx) => ctx.wallet.recover(),
        verify: (ctx) => {
            const newDevice = ctx.device.locatorFor(ctx.wallet.address);
            expect(newDevice).not.toBe(ctx.oldDevice);
            expect(ctx.wallet.needsRecovery()).toBe(false);
            expect(ctx.wallet.signer?.locator()).toBe(newDevice);
            // The lost device's signer is removed on this chain (a genesis signer stays listed for other chains).
            expect(activeOnEvm(ctx.env, ctx.wallet.address).map((s: Any) => s.locator)).toEqual([newDevice]);
        },
        invariant: (ctx) => {
            const devices = activeOnEvm(ctx.env, ctx.wallet.address).filter((s: Any) => s.type === "device");
            return devices.length > 1 ? `${devices.length} device signers left` : null;
        },
    },
    {
        name: "evm signers()",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            ctx.ops = [env.key(EVM), env.key(EVM)];
            for (const op of ctx.ops) await drive(ctx.wallet.addSigner(op.config));
            return ctx;
        },
        act: (ctx) => ctx.wallet.signers(),
        verify: (ctx, value: Any) => {
            expect(value.map((s: Any) => s.locator).sort()).toEqual(ctx.ops.map((op: Any) => op.locator).sort());
        },
    },
    {
        name: "evm useSigner (registered external-wallet)",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            ctx.op = env.key(EVM);
            await drive(ctx.wallet.addSigner(ctx.op.config));
            return ctx;
        },
        act: (ctx) => ctx.wallet.useSigner(ctx.op.config),
        verify: (ctx) => {
            expect(ctx.wallet.signer?.locator()).toBe(ctx.op.locator);
            expect(ctx.wallet.signer?.status).toBe("success");
        },
    },
    {
        name: "evm transactions()",
        setup: async (env) => {
            const ctx = await flatWallet(env);
            await drive(ctx.wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));
            return ctx;
        },
        act: (ctx) => ctx.wallet.transactions(),
        verify: (_ctx, value: Any) => {
            expect(value.transactions).toHaveLength(1);
        },
    },
    {
        name: "evm quorum member send (prepares)",
        setup: async (env) => {
            const [flat, alice, bob, carol] = [env.key(EVM), env.key(EVM), env.key(EVM), env.key(EVM)];
            const wallet = await drive(
                env.sdk().createWallet({
                    chain: EVM,
                    recoveryMethods: [flat.config, quorumOf([alice, bob, carol], 2)],
                } as Any)
            );
            await drive(wallet.useSigner(alice.config));
            return { env, wallet, alice, bob, to: recipientFor(EVM, env.rng) };
        },
        act: (ctx) => ctx.wallet.send(ctx.to, "usdc", "1"),
        verify: (ctx, value: Any) => {
            expect(value).toEqual({ hash: undefined, explorerLink: undefined, transactionId: expect.any(String) });
            expect(ctx.env.fake.renderedRequest(value.transactionId).status).toBe("awaiting-approval");
            expect(ctx.env.fake.calls.filter((c) => c.route === "send").at(-1)?.body.signer).toMatch(/^quorum:/);
        },
    },
    {
        name: "evm quorum member approve",
        setup: async (env) => {
            const [flat, alice, bob, carol] = [env.key(EVM), env.key(EVM), env.key(EVM), env.key(EVM)];
            const wallet = await drive(
                env.sdk().createWallet({
                    chain: EVM,
                    recoveryMethods: [flat.config, quorumOf([alice, bob, carol], 2)],
                } as Any)
            );
            await drive(wallet.useSigner(alice.config));
            const prepared = await drive(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));
            return { env, wallet, alice, prepared };
        },
        act: (ctx) => ctx.wallet.approve({ transactionId: ctx.prepared.transactionId }),
        verify: (ctx, value: Any) => {
            expect(value.hash).toBeUndefined();
            const pending = ctx.env.fake.renderedRequest(ctx.prepared.transactionId).approvals.pending[0];
            expect(pending.quorumApprovals.remaining).toBe(1);
            expect(pending.quorumApprovals.submitted.map((s: Any) => s.member.locator)).toEqual([ctx.alice.locator]);
        },
    },
    sendScenario("stellar"),
    {
        name: "stellar upgrade",
        setup: async (env) => {
            const ctx = await flatWallet(env, "stellar");
            ctx.stellar = StellarWallet.from(ctx.wallet);
            return ctx;
        },
        act: (ctx) => ctx.stellar.upgrade(),
        verify: (ctx, value: Any) => {
            expect(value.hash).toEqual(expect.any(String));
            expect(ctx.env.fake.renderedRequest(value.transactionId).status).toBe("success");
        },
    },
    {
        name: "stellar migrate",
        setup: async (env) => {
            const ctx = await flatWallet(env, "stellar");
            ctx.stellar = StellarWallet.from(ctx.wallet);
            return ctx;
        },
        act: (ctx) => ctx.stellar.migrate(),
        verify: (ctx, value: Any) => {
            expect(value.hash).toEqual(expect.any(String));
            expect(ctx.env.fake.renderedRequest(value.transactionId).status).toBe("success");
        },
    },
    sendScenario("solana"),
    {
        name: "evm getWallet (device storage, key present)",
        setup: async (env) => {
            const recovery = env.key(EVM);
            const device = env.device();
            const created = await drive(
                env.sdk().createWallet({
                    chain: EVM,
                    recovery: recovery.config,
                    options: { deviceSignerKeyStorage: device },
                } as Any)
            );
            return { env, recovery, device, address: created.address };
        },
        act: (ctx) =>
            ctx.env.sdk().getWallet({
                chain: EVM,
                recovery: ctx.recovery.config,
                options: { deviceSignerKeyStorage: ctx.device },
            } as Any),
        verify: async (ctx, value: Any) => {
            expect(value.address).toBe(ctx.address);
            // Usable without registering another device signer.
            const tx = await drive(value.send(recipientFor(EVM, ctx.env.rng), "usdc", "1"));
            expect(tx.hash).toEqual(expect.any(String));
            ctx.wallet = value;
            expect(activeOnEvm(ctx.env, ctx.address).filter((s: Any) => s.type === "device")).toHaveLength(1);
        },
        invariant: (ctx) => {
            const devices = activeOnEvm(ctx.env, ctx.address).filter((s: Any) => s.type === "device");
            return devices.length > 1 ? `${devices.length} device signers left` : null;
        },
    },
    {
        name: "evm addSigner through a recovery quorum (prepares)",
        setup: async (env) => {
            const [flat, alice, bob, carol] = [env.key(EVM), env.key(EVM), env.key(EVM), env.key(EVM)];
            const wallet = await drive(
                env.sdk().createWallet({
                    chain: EVM,
                    recoveryMethods: [flat.config, quorumOf([alice, bob, carol], 2)],
                } as Any)
            );
            await drive(wallet.useRecoveryMethod(alice.config));
            return { env, wallet, op: env.key(EVM) };
        },
        act: (ctx) => ctx.wallet.addSigner(ctx.op.config),
        verify: (ctx, value: Any) => {
            expect(value.transactionId).toEqual(expect.any(String));
            expect(ctx.env.fake.renderedRequest(value.transactionId).status).toBe("awaiting-approval");
        },
    },
    {
        name: "stellar addSigner",
        setup: async (env) => {
            const ctx = await flatWallet(env, "stellar");
            ctx.op = env.key("stellar");
            return ctx;
        },
        act: (ctx) => ctx.wallet.addSigner(ctx.op.config),
        verify: (ctx, value: Any) => {
            expect(value.status).toBe("success");
            expect(ctx.env.fake.signersOf(ctx.wallet.address).map((s: Any) => s.locator)).toEqual([ctx.op.locator]);
        },
        invariant: (ctx) => atMostOne(ctx.env, /^register /, "registrations"),
    },
    {
        name: "stellar removeSigner",
        setup: async (env) => {
            const ctx = await flatWallet(env, "stellar");
            ctx.op = env.key("stellar");
            await drive(ctx.wallet.addSigner(ctx.op.config));
            return ctx;
        },
        act: (ctx) => ctx.wallet.removeSigner(ctx.op.config),
        verify: (ctx, value: Any) => {
            expect(value.status).toBe("success");
            expect(ctx.env.fake.signersOf(ctx.wallet.address)).toEqual([]);
        },
    },
    {
        name: "stellar quorum member approve",
        setup: async (env) => {
            const [alice, bob, carol] = [env.key("stellar"), env.key("stellar"), env.key("stellar")];
            const wallet = await drive(
                env.sdk().createWallet({ chain: "stellar", recoveryMethods: [quorumOf([alice, bob, carol], 2)] } as Any)
            );
            await drive(wallet.useSigner(alice.config));
            const prepared = await drive(wallet.send(recipientFor("stellar", env.rng), "usdc", "1"));
            return { env, wallet, alice, prepared };
        },
        act: (ctx) => ctx.wallet.approve({ transactionId: ctx.prepared.transactionId }),
        verify: (ctx, value: Any) => {
            expect(value.hash).toBeUndefined();
            const pending = ctx.env.fake.renderedRequest(ctx.prepared.transactionId).approvals.pending[0];
            expect(pending.quorumApprovals.remaining).toBe(1);
        },
    },
    {
        name: "solana addSigner",
        setup: async (env) => {
            const ctx = await flatWallet(env, "solana");
            ctx.op = env.key("solana");
            return ctx;
        },
        act: (ctx) => ctx.wallet.addSigner(ctx.op.config),
        verify: (ctx, value: Any) => {
            expect(value.status).toBe("success");
            expect(ctx.env.fake.signersOf(ctx.wallet.address).map((s: Any) => s.locator)).toEqual([ctx.op.locator]);
        },
        invariant: (ctx) => atMostOne(ctx.env, /^register /, "registrations"),
    },
    {
        name: "stellar recover (flat, device key lost)",
        setup: async (env) => {
            const recovery = env.key("stellar");
            const device = env.device();
            const created = await drive(
                env.sdk().createWallet({
                    chain: "stellar",
                    recovery: recovery.config,
                    options: { deviceSignerKeyStorage: device },
                } as Any)
            );
            const oldDevice = device.locatorFor(created.address);
            await device.deleteKey(created.address);
            const wallet = await drive(
                env.sdk().getWallet({
                    chain: "stellar",
                    recovery: recovery.config,
                    options: { deviceSignerKeyStorage: device },
                } as Any)
            );
            return { env, wallet, device, oldDevice };
        },
        act: (ctx) => ctx.wallet.recover(),
        verify: (ctx) => {
            const newDevice = ctx.device.locatorFor(ctx.wallet.address);
            expect(ctx.wallet.needsRecovery()).toBe(false);
            expect(activeOnStellar(ctx.env, ctx.wallet.address).map((s: Any) => s.locator)).toEqual([newDevice]);
        },
        invariant: (ctx) => {
            const devices = activeOnStellar(ctx.env, ctx.wallet.address).filter((s: Any) => s.type === "device");
            return devices.length > 1 ? `${devices.length} device signers left` : null;
        },
    },
];

// ---------------------------------------------------------------------------------------------------------------------
// The matrix
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Known findings: each matcher names the finding a cell belongs to, or null. The first match wins, so retry and
 * duplicate findings come before the error-typing ones. Every finding has a `BUG:` repro below.
 */
const KNOWN: Array<(cell: Cell) => string | null> = [
    (c) =>
        c.duplicate != null && /transfers|transactions/.test(c.duplicate) ? "F1 transfer sent twice on retry" : null,
    (c) =>
        /\brecover \(/.test(c.scenario) && c.outcome === "silent"
            ? "F2a recover resolves with the lost device's signer installed"
            : null,
    (c) =>
        /\brecover \(/.test(c.scenario) && c.retry?.startsWith("failed: verify") && c.duplicate != null
            ? "F2b recover retry leaves an orphan device signer"
            : null,
    (c) =>
        c.scenario.includes("removeSigner") || c.scenario.includes("removeRecoveryMethod")
            ? c.retry?.includes("not found")
                ? "F5 remove retried after it landed fails"
                : null
            : null,
    (c) =>
        c.scenario.includes("addRecoveryMethod") &&
        (c.retry?.includes("already a recovery method") || c.duplicate?.includes("recovery additions"))
            ? "F5 addRecoveryMethod retried after it landed fails"
            : null,
    (c) =>
        c.route === "getSigner" &&
        (c.outcome === "silent" || (c.outcome === "untyped" && /not registered/.test(c.detail)))
            ? "F3 signers() drops unreadable signers"
            : null,
    (c) => (c.fault.startsWith("drop:") || c.fault === "status:unknown" ? "F6 malformed response" : null),
    (c) => (c.outcome === "untyped" && /Failed to (remove|get transactions)/.test(c.detail) ? "F4 plain Error" : null),
    (c) => (c.outcome === "network-raw" ? "F7 raw fetch TypeError" : null),
    (c) => (c.outcome === "null-known" ? "known: JSON null body" : null),
];

describe("fault matrix", () => {
    it.each(scenarios.map((scenario) => [scenario.name, scenario] as const))(
        "%s",
        async (_name, scenario) => {
            const cells: Cell[] = [];
            await forEachSeed(stressRuns(1), async (runSeed) => {
                cells.push(...(await runMatrix(scenario, { seed: runSeed, occurrences: 3 })));
            });
            const { unexpected, byFinding } = anomalies(cells, KNOWN);
            if (process.env.STRESS_VERBOSE != null || unexpected.length > 0) {
                console.info(
                    `[faults] ${scenario.name}: ${cells.length} cells\n` +
                        [...byFinding.entries()]
                            .map(
                                ([id, c]) =>
                                    `  ${id}: ${c.length} cells` +
                                    (process.env.STRESS_VERBOSE === "2" ? `\n${formatCells(c)}` : "")
                            )
                            .join("\n") +
                        (unexpected.length > 0 ? `\n${formatCells(unexpected)}` : "")
                );
            }
            expect(formatCells(unexpected)).toBe("");
        },
        180_000
    );

    // Known (no fetch timeout): one row, so a fix shows up here.
    it("a hung status poll hangs send() (no fetch timeout; known)", async () => {
        const env = stressEnv(FIXED_SEED);
        const { wallet } = await flatWallet(env);
        env.fake.faults.add({ route: "getTransaction", skip: 1, times: 1, fault: { type: "hang" } });

        const outcome = await settle(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"), { maxMs: 10 * 60_000 });

        expect("error" in outcome && String(outcome.error)).toContain("did not settle");
    });
});

// ---------------------------------------------------------------------------------------------------------------------
// Repros
// ---------------------------------------------------------------------------------------------------------------------

/** Repros use a fixed seed, so they are deterministic whatever STRESS_SEED is. */
const FIXED_SEED = 7;

const isTyped = (error: unknown) => error instanceof CrossmintSDKError || error instanceof ApiClientError;

const describeError = (error: unknown) =>
    error instanceof Error ? `${error.constructor.name}: ${error.message}`.slice(0, 200) : String(error);

/** The call failed with a typed SDK error or an ApiClientError; the message names what it got instead. */
function expectTyped(outcome: { value: unknown } | { error: unknown }) {
    expect("error" in outcome, "the call resolved").toBe(true);
    const { error } = outcome as { error: unknown };
    expect(isTyped(error), `got ${describeError(error)}`).toBe(true);
}

/** The call resolved; the message names the error it threw instead. */
function expectResolved(outcome: { value: unknown } | { error: unknown }) {
    expect("error" in outcome ? describeError(outcome.error) : "resolved").toBe("resolved");
}

/** Records the headers of every request on top of the fake (the fake itself does not log them). */
function recordHeaders(env: StressEnv) {
    const seen: Array<{ method: string; url: string; headers: Headers }> = [];
    vi.stubGlobal("fetch", async (input: Any, init?: RequestInit) => {
        seen.push({ method: init?.method ?? "GET", url: String(input), headers: new Headers(init?.headers) });
        return env.fake.fetch(input, init);
    });
    return seen;
}

describe("F1: a transfer that fails after it was approved is sent twice by a retry", () => {
    bug(
        "BUG: send() fails on one failed status poll after its transfer was approved, so a retry sends it twice",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const { wallet } = await flatWallet(env);
            // getTransaction #0 is approve's read; #1 is the first status poll, after the approval was submitted.
            env.fake.faults.add({ route: "getTransaction", skip: 1, times: 1, fault: { type: "status", status: 503 } });

            const first = await settle(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));
            if ("error" in first) {
                // What an app does with a failed send: send again.
                await drive(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));
            }

            expect(approvedWith(env, "send")).toHaveLength(1);
        }
    );

    bug("BUG: a lost approval response fails send() although the transfer lands; a retry sends it twice", async () => {
        const env = stressEnv(FIXED_SEED);
        const { wallet } = await flatWallet(env);
        env.fake.faults.add({
            route: "approveTransaction",
            times: 1,
            phase: "after",
            fault: { type: "status", status: 503 },
        });

        const first = await settle(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));
        if ("error" in first) {
            await drive(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));
        }

        expect(approvedWith(env, "send")).toHaveLength(1);
    });

    bug(
        "BUG: the SDK sends no x-idempotency-key on POST transfers, so a lost response can never be retried safely",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const wallet = await drive(env.sdk().createWallet({ chain: EVM, recovery: { type: "api-key" } } as Any));
            const seen = recordHeaders(env);

            await drive(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));

            const transfer = seen.find((request) => request.method === "POST" && /\/transfers$/.test(request.url));
            expect(transfer?.headers.get("x-idempotency-key")).toEqual(expect.any(String));
        }
    );
});

describe("F2a: recover() leaves the lost device's signer installed after one transient failure", () => {
    async function lostDeviceWallet(env: StressEnv) {
        const recovery = env.key(EVM);
        const device = env.device();
        const created = await drive(
            env.sdk().createWallet({
                chain: EVM,
                recovery: recovery.config,
                options: { deviceSignerKeyStorage: device },
            } as Any)
        );
        const oldDevice = device.locatorFor(created.address) as string;
        await device.deleteKey(created.address);
        const wallet = await drive(
            env.sdk().getWallet({
                chain: EVM,
                recovery: recovery.config,
                options: { deviceSignerKeyStorage: device },
            } as Any)
        );
        return { wallet, device, oldDevice };
    }

    bug(
        "BUG: recover() resolves with the lost device's signer still installed when its removal fails once",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const { wallet, oldDevice } = await lostDeviceWallet(env);
            env.fake.faults.failNext("removeSigner", { type: "status", status: 503 });

            const outcome = await settle(wallet.recover());
            // Either recover() reports the failure, or a later recover() can still remove the old signer.
            if ("value" in outcome) {
                await drive(wallet.recover());
                expect(activeOnEvm(env, wallet.address).map((s: Any) => s.locator)).not.toContain(oldDevice);
            }
        }
    );

    bug(
        "BUG: recover() keeps the lost device's signer when one GET signers/:locator fails while listing signers",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const { wallet, oldDevice } = await lostDeviceWallet(env);
            env.fake.faults.failNext("getSigner", { type: "status", status: 503 });

            const outcome = await settle(wallet.recover());
            if ("value" in outcome) {
                await drive(wallet.recover());
                expect(activeOnEvm(env, wallet.address).map((s: Any) => s.locator)).not.toContain(oldDevice);
            }
        }
    );
});

describe("F2b: recover() deletes the key of a device whose registration landed", () => {
    bug(
        "BUG: one failed status poll after the registration landed makes recover() delete the new key; the retry leaves that device installed with no key",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const recovery = env.key(EVM);
            const device = env.device();
            const created: Any = await drive(
                env.sdk().createWallet({
                    chain: EVM,
                    recovery: recovery.config,
                    options: { deviceSignerKeyStorage: device },
                } as Any)
            );
            await device.deleteKey(created.address);
            const wallet: Any = await drive(
                env.sdk().getWallet({
                    chain: EVM,
                    recovery: recovery.config,
                    options: { deviceSignerKeyStorage: device },
                } as Any)
            );
            // getTransaction #0 is the registration approve's read; #1 the first poll, after the approval landed.
            env.fake.faults.add({ route: "getTransaction", skip: 1, times: 1, fault: { type: "status", status: 503 } });

            await settle(wallet.recover());
            await drive(wallet.recover());

            // Every installed device signer is one whose key this device holds.
            const installed = activeOnEvm(env, created.address).filter((s: Any) => s.type === "device");
            expect(installed.map((s: Any) => s.locator)).toEqual([device.locatorFor(created.address)]);
        }
    );
});

describe("F3: signers() silently drops a signer it cannot read", () => {
    async function walletWithTwoSigners(env: StressEnv) {
        const ctx = await flatWallet(env);
        ctx.ops = [env.key(EVM), env.key(EVM)];
        for (const op of ctx.ops) await drive(ctx.wallet.addSigner(op.config));
        return ctx;
    }

    bug("BUG: signers() resolves without a signer whose GET signers/:locator answered 503", async () => {
        const env = stressEnv(FIXED_SEED);
        const { wallet, ops } = await walletWithTwoSigners(env);
        env.fake.faults.failNext("getSigner", { type: "status", status: 503 });

        const outcome = await settle(wallet.signers());

        // Either the read fails, or it lists every signer.
        if ("value" in outcome) {
            expect((outcome.value as Any[]).map((s) => s.locator).sort()).toEqual(
                ops.map((op: Any) => op.locator).sort()
            );
        }
    });

    bug(
        "BUG: useSigner() of a registered signer throws 'is not registered' (a plain Error) on one failed GET signers/:locator",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const ctx = await flatWallet(env);
            const op = env.key(EVM);
            await drive(ctx.wallet.addSigner(op.config));
            env.fake.faults.failNext("getSigner", { type: "status", status: 503 });

            const outcome = await settle(ctx.wallet.useSigner(op.config));

            if ("error" in outcome) {
                expect(outcome.error).toBeInstanceOf(ApiClientError);
            }
        }
    );
});

describe("F4: plain Error where the SDK has typed errors", () => {
    bug("BUG: removeSigner() throws a plain Error on an API error; an expired JWT is not JWTExpiredError", async () => {
        const env = stressEnv(FIXED_SEED);
        const ctx = await flatWallet(env);
        const op = env.key(EVM);
        await drive(ctx.wallet.addSigner(op.config));
        env.fake.faults.failNext("removeSigner", {
            type: "status",
            status: 401,
            message: "JWT expired",
            code: "ERROR_JWT_EXPIRED",
        });

        const outcome = await settle(ctx.wallet.removeSigner(op.config));

        expectTyped(outcome);
    });

    bug("BUG: removeRecoveryMethod() throws a plain Error on an API error", async () => {
        const env = stressEnv(FIXED_SEED);
        const [first, second] = [env.key(EVM), env.key(EVM)];
        const wallet = await drive(
            env.sdk().createWallet({ chain: EVM, recoveryMethods: [first.config, second.config] } as Any)
        );
        await drive(wallet.useRecoveryMethod(first.config));
        env.fake.faults.failNext("removeRecoveryMethod", { type: "status", status: 400, message: "Bad Request" });

        const outcome = await settle(wallet.removeRecoveryMethod(second.config));

        expectTyped(outcome);
    });

    bug("BUG: transactions() throws a plain Error on an API error", async () => {
        const env = stressEnv(FIXED_SEED);
        const { wallet } = await flatWallet(env);
        env.fake.faults.failNext("listTransactions", { type: "status", status: 400, message: "Bad Request" });

        const outcome = await settle(wallet.transactions());

        expectTyped(outcome);
    });
});

describe("F5: signer changes retried after they landed fail for good", () => {
    bug("BUG: a retried removeSigner() whose removal already landed fails with 'Signer not found'", async () => {
        const env = stressEnv(FIXED_SEED);
        const ctx = await flatWallet(env);
        const op = env.key(EVM);
        await drive(ctx.wallet.addSigner(op.config));
        // The removal lands; the first status poll fails, so the call fails.
        env.fake.faults.add({ route: "getTransaction", skip: 1, times: 1, fault: { type: "status", status: 503 } });
        await settle(ctx.wallet.removeSigner(op.config));

        await expect(drive(ctx.wallet.removeSigner(op.config))).resolves.toMatchObject({ status: "success" });
    });

    bug(
        "BUG: a retried addRecoveryMethod() whose addition already landed fails with 'already a recovery method'",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const ctx = await flatWallet(env);
            const second = env.key(EVM);
            env.fake.faults.add({ route: "getTransaction", skip: 1, times: 1, fault: { type: "status", status: 503 } });
            await settle(ctx.wallet.addRecoveryMethod(second.config));

            await expect(drive(ctx.wallet.addRecoveryMethod(second.config))).resolves.toMatchObject({
                status: "success",
            });
        }
    );
});

describe("F6: malformed responses", () => {
    bug("BUG: a landed transaction without onChain crashes send() with a TypeError", async () => {
        const env = stressEnv(FIXED_SEED);
        const wallet = await drive(env.sdk().createWallet({ chain: EVM, recovery: { type: "api-key" } } as Any));
        env.fake.faults.add({
            route: "getTransaction",
            probability: 1,
            fault: {
                type: "mutate",
                fn: (body) => (body.status === "success" ? { ...body, onChain: undefined } : body),
            },
        });

        const outcome = await settle(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));

        expectTyped(outcome);
    });

    bug("BUG: addRecoveryMethod() crashes with a TypeError on a response without tx", async () => {
        const env = stressEnv(FIXED_SEED);
        const ctx = await flatWallet(env);
        env.fake.faults.failNext("addRecoveryMethod", { type: "drop-field", path: "tx" });

        const outcome = await settle(ctx.wallet.addRecoveryMethod(env.key(EVM).config));

        expectTyped(outcome);
    });

    bug("BUG: approvals without pending on a status poll crash approve() with a TypeError", async () => {
        const env = stressEnv(FIXED_SEED);
        const [flat, alice, bob, carol] = [env.key(EVM), env.key(EVM), env.key(EVM), env.key(EVM)];
        const wallet = await drive(
            env
                .sdk()
                .createWallet({ chain: EVM, recoveryMethods: [flat.config, quorumOf([alice, bob, carol], 2)] } as Any)
        );
        await drive(wallet.useSigner(alice.config));
        const prepared = await drive(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));
        // The approve's own read is fine; the status poll after it carries `approvals` without `pending`.
        env.fake.faults.add({
            route: "getTransaction",
            skip: 1,
            times: 1,
            fault: { type: "drop-field", path: "approvals.pending" },
        });

        const outcome = await settle(wallet.approve({ transactionId: (prepared as Any).transactionId }));

        if ("error" in outcome) expectTyped(outcome);
    });

    bug("BUG: a quorum entry without quorumApprovals.pending crashes approve() with a TypeError", async () => {
        const env = stressEnv(FIXED_SEED);
        const [flat, alice, bob, carol] = [env.key(EVM), env.key(EVM), env.key(EVM), env.key(EVM)];
        const wallet = await drive(
            env
                .sdk()
                .createWallet({ chain: EVM, recoveryMethods: [flat.config, quorumOf([alice, bob, carol], 2)] } as Any)
        );
        await drive(wallet.useSigner(alice.config));
        const prepared = await drive(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));
        env.fake.faults.failNext("getTransaction", {
            type: "drop-field",
            path: "approvals.pending.0.quorumApprovals.pending",
        });

        const outcome = await settle(wallet.approve({ transactionId: (prepared as Any).transactionId }));

        if ("error" in outcome) expectTyped(outcome);
    });

    bug("BUG: a recovery quorum without members crashes useSigner() with a TypeError", async () => {
        const env = stressEnv(FIXED_SEED);
        const [flat, alice, bob, carol] = [env.key(EVM), env.key(EVM), env.key(EVM), env.key(EVM)];
        await drive(
            env
                .sdk()
                .createWallet({ chain: EVM, recoveryMethods: [flat.config, quorumOf([alice, bob, carol], 2)] } as Any)
        );
        env.fake.faults.failNext("getWallet", { type: "drop-field", path: "config.recoveryMethods.1.members" });
        const wallet = await drive(env.sdk().getWallet({ chain: EVM } as Any));

        const outcome = await settle(wallet.useSigner(alice.config));

        if ("error" in outcome) expectTyped(outcome);
    });

    bug(
        "BUG: a send response without id makes a quorum member's send() resolve with transactionId undefined",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const [flat, alice, bob, carol] = [env.key(EVM), env.key(EVM), env.key(EVM), env.key(EVM)];
            const wallet = await drive(
                env.sdk().createWallet({
                    chain: EVM,
                    recoveryMethods: [flat.config, quorumOf([alice, bob, carol], 2)],
                } as Any)
            );
            await drive(wallet.useSigner(alice.config));
            env.fake.faults.failNext("send", { type: "drop-field", path: "id" });

            const outcome = await settle(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));

            if ("value" in outcome) expect((outcome.value as Any).transactionId).toEqual(expect.any(String));
            else expectTyped(outcome);
        }
    );

    bug(
        "BUG: an EVM registration whose chains entry is for another chain throws a plain Error from addSigner()",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const ctx = await flatWallet(env);
            env.fake.faults.failNext("registerSigner", {
                type: "mutate",
                fn: (body) => ({ ...body, chains: { base: body.chains?.[EVM] } }),
            });

            const outcome = await settle(ctx.wallet.addSigner(env.key(EVM).config));

            expectTyped(outcome);
        }
    );

    bug("BUG: a wallet response without config crashes getWallet() with a TypeError", async () => {
        const env = stressEnv(FIXED_SEED);
        await flatWallet(env);
        env.fake.faults.failNext("getWallet", { type: "drop-field", path: "config" });

        const outcome = await settle(env.sdk().getWallet({ chain: EVM } as Any));

        expectTyped(outcome);
    });

    it("an unknown signer type in delegatedSigners is a typed UnknownSignerTypeError, not a crash", async () => {
        const env = stressEnv(FIXED_SEED);
        const ctx = await flatWallet(env);
        await drive(ctx.wallet.addSigner(env.key(EVM).config));
        env.fake.faults.failNext("getWallet", {
            type: "mutate",
            fn: (body) => ({
                ...body,
                config: {
                    ...body.config,
                    delegatedSigners: body.config.delegatedSigners.map((s: Any) => ({ ...s, type: "smart-card" })),
                },
            }),
        });

        const outcome = await settle(env.sdk().getWallet({ chain: EVM } as Any));

        if ("error" in outcome) expectTyped(outcome);
    });

    it("an unknown transaction status ends the wait with a typed error", async () => {
        const env = stressEnv(FIXED_SEED);
        const { wallet } = await flatWallet(env);
        env.fake.faults.add({
            route: "getTransaction",
            skip: 1,
            times: 1,
            fault: { type: "mutate", fn: (body) => ({ ...body, status: "submitted" }) },
        });

        const outcome = await settle(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));

        expectTyped(outcome);
    });
});

describe("F7: a dropped connection", () => {
    bug("BUG: a dropped connection surfaces as fetch's raw TypeError('fetch failed'), not an SDK error", async () => {
        const env = stressEnv(FIXED_SEED);
        await flatWallet(env);
        env.fake.faults.failNext("getWallet", { type: "network" });

        const outcome = await settle(env.sdk().getWallet({ chain: EVM } as Any));

        expectTyped(outcome);
    });
});

// ---------------------------------------------------------------------------------------------------------------------
// The factory
// ---------------------------------------------------------------------------------------------------------------------

const SECRET_A = `xmsk1_${"a1".repeat(32)}`;
const SECRET_B = `xmsk1_${"b2".repeat(32)}`;

/** A passkey the fake can store: `onCreatePasskey` returns a fixed credential. */
function passkey(id: string) {
    const point = P256.getPublicKey({ privateKey: `0x${"11".repeat(31)}${id.length.toString(16).padStart(2, "0")}` });
    return {
        type: "passkey" as const,
        name: id,
        onCreatePasskey: async () => ({ id, publicKey: { x: point.x.toString(), y: point.y.toString() } }),
        onSignWithPasskey: async () => ({ signature: { r: "0x1", s: "0x1" }, metadata: {} }),
    };
}

type RecoveryCase = {
    label: string;
    chains: string[];
    server?: boolean;
    /** The recovery args, and the same wallet's args named differently (a mismatch). */
    make: (env: StressEnv, chain: string) => { args: Any; mismatch?: Any };
};

const RECOVERY_CASES: RecoveryCase[] = [
    {
        label: "external-wallet",
        chains: [EVM, "stellar", "solana"],
        make: (env, chain) => ({
            args: { recovery: env.key(chain).config },
            mismatch: { recovery: env.key(chain).config },
        }),
    },
    {
        label: "api-key",
        chains: [EVM, "stellar", "solana"],
        make: (env, chain) => ({
            args: { recovery: { type: "api-key" } },
            mismatch: { recovery: env.key(chain).config },
        }),
    },
    {
        label: "server secret",
        chains: [EVM, "stellar", "solana"],
        server: true,
        make: () => ({
            args: { recovery: { type: "server", secret: SECRET_A } },
            mismatch: { recovery: { type: "server", secret: SECRET_B } },
        }),
    },
    {
        label: "email",
        chains: [EVM, "stellar", "solana"],
        make: () => ({
            args: { recovery: { type: "email", email: "Stress.User@example.com" } },
            mismatch: { recovery: { type: "email", email: "someone.else@example.com" } },
        }),
    },
    {
        label: "phone",
        chains: [EVM, "stellar", "solana"],
        make: () => ({
            args: { recovery: { type: "phone", phone: "+15555550100" } },
            mismatch: { recovery: { type: "phone", phone: "+15555550199" } },
        }),
    },
    {
        label: "passkey (created, no id)",
        chains: [EVM],
        make: () => ({
            args: { recovery: passkey("cred-a") },
            mismatch: { recovery: { type: "passkey", id: "cred-z" } },
        }),
    },
    {
        label: "two flat methods",
        chains: [EVM, "stellar", "solana"],
        make: (env, chain) => {
            const [a, b] = [env.key(chain), env.key(chain)];
            return {
                args: { recoveryMethods: [a.config, b.config] },
                mismatch: { recoveryMethods: [a.config, env.key(chain).config] },
            };
        },
    },
    {
        label: "flat + quorum",
        chains: [EVM, "stellar"],
        make: (env, chain) => {
            const [flat, a, b, c] = [env.key(chain), env.key(chain), env.key(chain), env.key(chain)];
            return {
                args: { recoveryMethods: [flat.config, quorumOf([a, b, c], 2)] },
                mismatch: { recoveryMethods: [flat.config, quorumOf([a, b, c], 3)] },
            };
        },
    },
];

describe("factory: every recovery config, created then read back", () => {
    const cases = RECOVERY_CASES.flatMap((c) => c.chains.map((chain) => [c.label, chain, c] as const));

    it.each(cases)(
        "%s on %s: createWallet, createWallet again, getWallet, and a mismatching getWallet",
        async (_l, chain, c) => {
            const env = stressEnv(FIXED_SEED);
            const { args, mismatch } = c.make(env, chain);
            const sdk = env.sdk(c.server ? { usageOrigin: "server" } : {});
            const owner = c.server ? { owner: "userId:stress-user" } : {};
            const get = (extra: Any) =>
                c.server
                    ? sdk.getWallet(created.address, { chain, ...extra } as Any)
                    : sdk.getWallet({ chain, ...extra } as Any);

            const created: Any = await drive(sdk.createWallet({ chain, ...args, ...owner } as Any));
            const again: Any = await drive(sdk.createWallet({ chain, ...args, ...owner } as Any));
            const read: Any = await drive(get(args));

            expect([again.address, read.address]).toEqual([created.address, created.address]);
            expect(read.recoveryMethods).toHaveLength(created.recoveryMethods.length);
            if (mismatch != null) {
                const outcome = await settle(get(mismatch));
                expect("error" in outcome && outcome.error).toBeInstanceOf(WalletCreationError);
            }
        }
    );
});

describe("factory: matching an existing wallet's config", () => {
    it("matches a recovery quorum given with members reordered and in another address case", async () => {
        const env = stressEnv(FIXED_SEED);
        const [flat, a, b, c] = [env.key(EVM), env.key(EVM), env.key(EVM), env.key(EVM)];
        await drive(
            env.sdk().createWallet({ chain: EVM, recoveryMethods: [flat.config, quorumOf([a, b, c], 2)] } as Any)
        );
        const lower = (key: Any) => ({ ...key.config, address: key.address.toLowerCase() });

        const read: Any = await drive(
            env.sdk().getWallet({
                chain: EVM,
                recoveryMethods: [
                    flat.config,
                    { type: "quorum", threshold: 2, members: [lower(c), a.config, lower(b)] },
                ],
            } as Any)
        );

        expect(read.recoveryMethods.map((r: Any) => r.type)).toEqual(["external-wallet", "quorum"]);
    });

    bug(
        "BUG: getWallet rejects the wallet's own external-wallet recovery method given in another address case",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const recovery = env.key(EVM);
            await drive(env.sdk().createWallet({ chain: EVM, recovery: recovery.config } as Any));

            const outcome = await settle(
                env.sdk().getWallet({
                    chain: EVM,
                    recovery: { ...recovery.config, address: recovery.address.toLowerCase() },
                } as Any)
            );

            expectResolved(outcome);
        }
    );

    it("rejects a server secret that derives to another address, and accepts the right one", async () => {
        const env = stressEnv(FIXED_SEED);
        const sdk = env.sdk({ usageOrigin: "server" });
        const created: Any = await drive(
            sdk.createWallet({ chain: EVM, recovery: { type: "server", secret: SECRET_A }, owner: "userId:u" } as Any)
        );

        const wrong = await settle(
            sdk.getWallet(created.address, { chain: EVM, recovery: { type: "server", secret: SECRET_B } } as Any)
        );
        const right: Any = await drive(
            sdk.getWallet(created.address, { chain: EVM, recovery: { type: "server", secret: SECRET_A } } as Any)
        );

        expect("error" in wrong && wrong.error).toBeInstanceOf(WalletCreationError);
        expect(right.recovery).toEqual({ type: "server", address: created.recovery.address });
        expect(JSON.stringify(right.recoveryMethods)).not.toContain(SECRET_A.slice(6));
    });

    it("matches a delegated passkey without an id when the wallet has one", async () => {
        const env = stressEnv(FIXED_SEED);
        const recovery = env.key(EVM);
        const created: Any = await drive(
            env.sdk().createWallet({ chain: EVM, recovery: recovery.config, signers: [passkey("cred-1")] } as Any)
        );

        const read: Any = await drive(
            env.sdk().getWallet({ chain: EVM, recovery: recovery.config, signers: [{ type: "passkey" }] } as Any)
        );

        expect(read.address).toBe(created.address);
    });

    it("asks for the passkey id when the wallet has two passkeys and getWallet names one without it", async () => {
        const env = stressEnv(FIXED_SEED);
        const recovery = env.key(EVM);
        const wallet: Any = await drive(
            env.sdk().createWallet({ chain: EVM, recovery: recovery.config, signers: [passkey("cred-1")] } as Any)
        );
        // The second passkey is added later (two at creation is its own finding below).
        const second = await passkey("cred-22").onCreatePasskey();
        await drive(wallet.addSigner({ type: "passkey", ...second, name: "cred-22" } as Any));

        const ambiguous = await settle(
            env.sdk().getWallet({ chain: EVM, recovery: recovery.config, signers: [{ type: "passkey" }] } as Any)
        );

        expect("error" in ambiguous && ambiguous.error).toBeInstanceOf(WalletCreationError);
    });

    bug(
        "BUG: createWallet with two new passkey signers creates the wallet, then throws 'you must provide the passkey ID'",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const args = {
                chain: EVM,
                recovery: env.key(EVM).config,
                signers: [passkey("cred-1"), passkey("cred-22")],
            } as Any;

            const outcome = await settle(env.sdk().createWallet(args));

            expect(env.fake.wallets.size).toBe(1);
            expectResolved(outcome);
        }
    );

    bug(
        "BUG: getWallet with signers throws a TypeError when the wallet config has no adminSigner (latent: crossbit-main always renders it)",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const [first, second, op] = [env.key(EVM), env.key(EVM), env.key(EVM)];
            const wallet = await drive(
                env.sdk().createWallet({ chain: EVM, recoveryMethods: [first.config, second.config] } as Any)
            );
            await drive(wallet.useRecoveryMethod(first.config));
            await drive(wallet.addSigner(op.config));
            // `adminSigner` is deprecated; `recoveryMethods` lists every method.
            env.fake.faults.failNext("getWallet", { type: "drop-field", path: "config.adminSigner" });

            const outcome = await settle(
                env.sdk().getWallet({
                    chain: EVM,
                    recoveryMethods: [first.config, second.config],
                    signers: [op.config],
                } as Any)
            );

            expectResolved(outcome);
        }
    );
});

describe("factory: the auto-injected device signer", () => {
    it("registers the device signer on EVM and the wallet signs with it", async () => {
        const env = stressEnv(FIXED_SEED);
        const device = env.device();
        const wallet: Any = await drive(
            env.sdk().createWallet({
                chain: EVM,
                recovery: env.key(EVM).config,
                options: { deviceSignerKeyStorage: device },
            } as Any)
        );

        expect(wallet.signer?.locator()).toBe(device.locatorFor(wallet.address));
        expect(wallet.needsRecovery()).toBe(false);
    });

    it("retries without the device signer on DEVICE_SIGNER_NOT_SUPPORTED, and the wallet sends", async () => {
        const env = stressEnv(FIXED_SEED, { deviceSigners: { evm: false } });
        const recovery = env.key(EVM);
        const wallet: Any = await drive(
            env.sdk().createWallet({
                chain: EVM,
                recovery: recovery.config,
                signers: [env.key(EVM).config],
                options: { deviceSignerKeyStorage: env.device() },
            } as Any)
        );

        expect(env.fake.callsTo("createWallet").map((c) => c.status)).toEqual([400, 201]);
        expect(env.fake.callsTo("createWallet")[1].body.config.delegatedSigners).toHaveLength(1);
        await drive(wallet.useSigner(recovery.config));
        const tx: Any = await drive(wallet.send(recipientFor(EVM, env.rng), "usdc", "1"));
        expect(tx.hash).toEqual(expect.any(String));
    });

    it("does not retry when the caller named the device signer, and the error is typed", async () => {
        const env = stressEnv(FIXED_SEED, { deviceSigners: { evm: false } });

        const outcome = await settle(
            env.sdk().createWallet({
                chain: EVM,
                recovery: env.key(EVM).config,
                signers: [{ type: "device" }],
                options: { deviceSignerKeyStorage: env.device() },
            } as Any)
        );

        expect(env.fake.callsTo("createWallet")).toHaveLength(1);
        expect("error" in outcome && outcome.error).toBeInstanceOf(WalletCreationError);
    });

    it.each([
        ["a 503 on the retry", { type: "status", status: 503 } as const, "before" as const],
        ["a lost retry response", { type: "status", status: 503 } as const, "after" as const],
    ])("%s fails typed, and calling createWallet again returns the wallet", async (_label, fault, phase) => {
        const env = stressEnv(FIXED_SEED, { deviceSigners: { evm: false } });
        const recovery = env.key(EVM);
        const device = env.device();
        env.fake.faults.add({ route: "createWallet", skip: 1, times: 1, phase, fault });
        const args = { chain: EVM, recovery: recovery.config, options: { deviceSignerKeyStorage: device } } as Any;

        const first = await settle(env.sdk().createWallet(args));
        const second: Any = await drive(env.sdk().createWallet(args));

        expect("error" in first && first.error).toBeInstanceOf(ApiClientError);
        expect(env.fake.wallets.size).toBe(1);
        expect(second.address).toBe(onlyWallet(env)[0].address);
    });

    bug(
        "BUG: a new Solana wallet whose provider rejected the device signer reports needsRecovery() and has no signer",
        async () => {
            const env = stressEnv(FIXED_SEED);
            const recovery = env.key("solana");
            const wallet: Any = await drive(
                env.sdk().createWallet({
                    chain: "solana",
                    recovery: recovery.config,
                    options: { deviceSignerKeyStorage: env.device() },
                } as Any)
            );

            expect(env.fake.callsTo("createWallet").map((c) => c.status)).toEqual([400, 201]);
            expect({ needsRecovery: wallet.needsRecovery(), signer: wallet.signer?.locator() }).toEqual({
                needsRecovery: false,
                signer: recovery.locator,
            });
        }
    );
});
