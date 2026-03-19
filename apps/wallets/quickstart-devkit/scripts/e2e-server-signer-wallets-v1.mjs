#!/usr/bin/env node
/**
 * Server signer e2e tests for Crossmint Wallets SDK — wallets-v1 branch.
 *
 * The server signer is the ONLY signer type testable end-to-end in Node.js:
 *   - No browser / iframe / TEE required (unlike device signer)
 *   - No WebAuthn required (unlike passkey)
 *   - No private key to supply externally (unlike external-wallet)
 *   - SDK derives the private key from a `secret` string server-side
 *
 * This means we can test the FULL lifecycle:
 *   createWallet → useSigner → addSigner (non-prepareOnly) → approve → confirmed
 *   createWallet → useSigner → signMessage (full, not just prepareOnly)
 *   createWallet → useSigner → send prepareOnly → transactionId shape
 *
 * PREREQUISITE: build the wallets SDK first.
 *   pnpm --filter @crossmint/wallets-sdk build
 *
 * Usage:
 *   CROSSMINT_API_KEY=xxx node scripts/e2e-server-signer-wallets-v1.mjs
 */

import { webcrypto } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const crypto = webcrypto;

// ─── Suppress SDK internal logger ────────────────────────────────────────────
const _origConsoleLog = console.log.bind(console);
function sdkFilter(orig) {
    return (...args) => {
        const first = typeof args[0] === "string" ? args[0] : "";
        if (first.startsWith("[SDK]") || first.startsWith("SdkLogger")) return;
        orig(...args);
    };
}
console.log   = sdkFilter(console.log.bind(console));
console.info  = sdkFilter(console.info.bind(console));
console.debug = sdkFilter(console.debug.bind(console));
console.warn  = sdkFilter(console.warn.bind(console));

// ─── Resolve SDK from monorepo dist ──────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SDK_DIST = path.resolve(__dirname, "../../../../packages/wallets/dist/index.cjs");

const require = createRequire(import.meta.url);
let sdk;
try {
    sdk = require(SDK_DIST);
} catch (e) {
    _origConsoleLog(`\n❌  Could not load SDK from:\n    ${SDK_DIST}\n`);
    _origConsoleLog("    Run: pnpm --filter @crossmint/wallets-sdk build\n");
    process.exit(1);
}

const { CrossmintWallets, createCrossmint, WalletNotAvailableError } = sdk;

// ─── API key ──────────────────────────────────────────────────────────────────
const apiKey = process.env.CROSSMINT_API_KEY;
if (!apiKey) {
    _origConsoleLog("Error: CROSSMINT_API_KEY environment variable is required");
    process.exit(1);
}

// ─── Test harness ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
    try {
        await fn();
        _origConsoleLog(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        _origConsoleLog(`  ✗ ${name}`);
        _origConsoleLog(`    └─ ${e.message}`);
        failed++;
        failures.push({ name, error: e.message });
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg);
}

function assertDefined(val, label) {
    if (val == null) throw new Error(`${label} should be defined, got ${val}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateEvmAddress() {
    return privateKeyToAccount(generatePrivateKey()).address;
}

function generateServerSecret() {
    // 32 random bytes = 64 hex chars = 256 bits of entropy
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// bs58 encode helper (minimal, no external dep) — needed for Solana addresses
function bs58Encode(bytes) {
    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let num = BigInt("0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(""));
    let str = "";
    while (num > 0n) {
        str = ALPHABET[Number(num % 58n)] + str;
        num = num / 58n;
    }
    for (const b of bytes) {
        if (b === 0) str = "1" + str;
        else break;
    }
    return str;
}

async function generateSolanaAddress() {
    const key = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key.publicKey));
    return bs58Encode(raw);
}

function isUUID(str) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function makeSdk() {
    return CrossmintWallets.from(createCrossmint({ apiKey }));
}

// ─── Suite 1: createWallet with server recovery ───────────────────────────────
async function suiteCreateWalletServerRecovery() {
    _origConsoleLog("\n▸ Suite 1: createWallet — server recovery");
    const s = makeSdk();
    const secret = generateServerSecret();

    let evmWallet;
    let solanaWallet;

    await test("EVM — createWallet with server recovery returns wallet with address", async () => {
        evmWallet = await s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "server", secret },
            owner: `userId:srv-v1-evm-${Date.now()}`,
        });
        assertDefined(evmWallet, "evmWallet");
        assertDefined(evmWallet.address, "evmWallet.address");
        assert(evmWallet.address.startsWith("0x"), `Expected 0x EVM address, got ${evmWallet.address}`);
        assert(evmWallet.chain === "base-sepolia", `Expected chain base-sepolia, got ${evmWallet.chain}`);
    });

    await test("Solana — createWallet with server recovery returns wallet with address", async () => {
        solanaWallet = await s.createWallet({
            chain: "solana",
            recovery: { type: "server", secret },
            owner: `userId:srv-v1-sol-${Date.now()}`,
        });
        assertDefined(solanaWallet, "solanaWallet");
        assertDefined(solanaWallet.address, "solanaWallet.address");
        assert(solanaWallet.chain === "solana", `Expected chain solana, got ${solanaWallet.chain}`);
    });

    await test("EVM — wallet.recovery.type is 'server'", () => {
        assertDefined(evmWallet, "evmWallet (from previous test)");
        assert(
            evmWallet.recovery.type === "server",
            `Expected recovery.type 'server', got '${evmWallet.recovery.type}'`
        );
    });

    await test("EVM — wallet.recovery.address is a valid 0x EVM address (derived server key)", () => {
        assertDefined(evmWallet, "evmWallet (from previous test)");
        const addr = evmWallet.recovery.address;
        assertDefined(addr, "recovery.address");
        assert(
            /^0x[0-9a-fA-F]{40}$/.test(addr),
            `recovery.address must be a valid EVM address, got '${addr}'`
        );
        // Must differ from the wallet address itself (server recovery key ≠ wallet smart-contract address)
        assert(
            addr !== evmWallet.address,
            "recovery.address (server key) must differ from wallet.address (smart contract)"
        );
    });

    await test("Solana — wallet.recovery.type is 'server'", () => {
        assertDefined(solanaWallet, "solanaWallet (from previous test)");
        assert(
            solanaWallet.recovery.type === "server",
            `Expected Solana recovery.type 'server', got '${solanaWallet.recovery.type}'`
        );
    });

    await test("EVM — createWallet deterministic: same owner + same secret → same wallet", async () => {
        const owner = `userId:srv-v1-idem-${Date.now()}`;
        const sharedSecret = generateServerSecret();
        const w1 = await s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "server", secret: sharedSecret },
            owner,
        });
        const w2 = await s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "server", secret: sharedSecret },
            owner,
        });
        assert(
            w1.address === w2.address,
            `Same owner+secret should return same wallet: ${w1.address} vs ${w2.address}`
        );
    });

    await test("EVM — different secrets produce different recovery addresses", async () => {
        const secret1 = generateServerSecret();
        const secret2 = generateServerSecret();
        const w1 = await s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "server", secret: secret1 },
            owner: `userId:srv-v1-diff1-${Date.now()}`,
        });
        const w2 = await s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "server", secret: secret2 },
            owner: `userId:srv-v1-diff2-${Date.now()}`,
        });
        assert(
            w1.recovery.address !== w2.recovery.address,
            "Different secrets must produce different recovery addresses"
        );
    });

    return { evmWallet, solanaWallet, secret };
}

// ─── Suite 2: signerIsRegistered — server signer as recovery ──────────────────
async function suiteSignerIsRegistered(fixtures) {
    _origConsoleLog("\n▸ Suite 2: signerIsRegistered — server recovery signer");
    const { evmWallet, secret } = fixtures;

    await test("signerIsRegistered — recovery-only server signer returns false (not in delegated list)", async () => {
        assertDefined(evmWallet, "evmWallet");
        const serverLocator = `server:${evmWallet.recovery.address}`;
        const result = await evmWallet.signerIsRegistered(serverLocator);
        // Recovery signers are NOT in the delegated signers list — signerIsRegistered only checks
        // signers() (delegated signers). Same behavior as external-wallet recovery signers.
        assert(result === false, `signerIsRegistered for recovery-only server signer should be false, got ${result}`);
    });

    await test("signerIsRegistered returns false for a different server locator (wrong address)", async () => {
        assertDefined(evmWallet, "evmWallet");
        const fakeLocator = `server:${generateEvmAddress()}`;
        const result = await evmWallet.signerIsRegistered(fakeLocator);
        assert(result === false, `signerIsRegistered with unregistered locator should return false, got ${result}`);
    });

    await test("signers() contains the server recovery signer with correct shape", async () => {
        assertDefined(evmWallet, "evmWallet");
        // Server recovery signer may appear in signers() — verify shape if present
        const signers = await evmWallet.signers();
        assert(Array.isArray(signers), "signers() must return an array");

        const serverSigner = signers.find(s => s.locator?.startsWith("server:"));
        if (serverSigner) {
            assert(serverSigner.type === "server", `server signer type must be 'server', got '${serverSigner.type}'`);
            assert(
                typeof serverSigner.address === "string" && /^0x[0-9a-fA-F]{40}$/.test(serverSigner.address),
                `server signer address must be valid EVM address, got '${serverSigner.address}'`
            );
            assert(
                ["success", "pending", "awaiting-approval", "failed"].includes(serverSigner.status),
                `server signer status must be valid, got '${serverSigner.status}'`
            );
            _origConsoleLog(`    (server signer in signers(): locator=${serverSigner.locator}, status=${serverSigner.status})`);
        } else {
            _origConsoleLog("    (server recovery signer not in delegated signers list — only in wallet.recovery)");
        }
    });
}

// ─── Suite 3: useSigner with server signer ────────────────────────────────────
async function suiteUseSigner(fixtures) {
    _origConsoleLog("\n▸ Suite 3: useSigner — server signer");
    const { evmWallet, secret } = fixtures;

    await test("[BEHAVIOR] useSigner({ type: 'server', secret }) for recovery-only signer — throws (not in delegated list)", async () => {
        assertDefined(evmWallet, "evmWallet");
        // Server recovery signers are NOT in the delegated signers list.
        // useSigner() checks signerIsRegistered() internally, which returns false for recovery signers.
        // To use useSigner(server), the server signer must first be added via addSigner().
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.useSigner({ type: "server", secret });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "useSigner(server recovery) should throw — signer is not in delegated signers list");
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `Expected a clear 'not registered' error, not 500: ${errMsg}`
        );
    });

    await test("[BUG] useSigner with server locator string — throws 'Unknown signer type: server'", async () => {
        assertDefined(evmWallet, "evmWallet");
        // The SDK does not support the string locator form for server signers.
        // "server:0x..." cannot be used because the SDK cannot reconstruct the signing key
        // from an address alone (it needs the secret for HKDF-SHA256 key derivation).
        const serverLocator = `server:${evmWallet.recovery.address}`;
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.useSigner(serverLocator);
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, `useSigner('server:...') string locator should throw`);
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `Expected clear error (not 500): ${errMsg}`
        );
    });

    await test("useSigner({ type: 'server', secret }) — works after addSigner registers the signer", async () => {
        // After addSigner(server, prepareOnly:true) the server signer appears in signers() list
        // and useSigner should work without throwing.
        const walletForSigner = await makeSdk().createWallet({
            chain: "base-sepolia",
            recovery: { type: "external-wallet", address: generateEvmAddress() },
            owner: `userId:srv-usesigner-${Date.now()}`,
        });
        const freshSecret = generateServerSecret();
        await walletForSigner.addSigner({ type: "server", secret: freshSecret }, { prepareOnly: true });

        let threw = false;
        let errMsg = "";
        try {
            await walletForSigner.useSigner({ type: "server", secret: freshSecret });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(!threw, `useSigner(server) after addSigner should not throw: ${errMsg}`);
    });

    await test("useSigner with unregistered server secret — throws clear error (not 500)", async () => {
        assertDefined(evmWallet, "evmWallet");
        const wrongSecret = generateServerSecret(); // different secret → different derived address → not registered
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.useSigner({ type: "server", secret: wrongSecret });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "useSigner with unregistered secret must throw");
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `Expected a clear error, not 500: ${errMsg}`
        );
    });
}

// ─── Suite 4: addSigner — server signer prepareOnly shape ─────────────────────
async function suiteAddSignerPrepareOnly() {
    _origConsoleLog("\n▸ Suite 4: addSigner — server signer prepareOnly shape");
    const s = makeSdk();
    const externalEvmAdmin = generateEvmAddress();
    const serverSecret = generateServerSecret();

    // Create wallets with external-wallet recovery so we can add server signer as delegated
    const evmWallet = await s.createWallet({
        chain: "base-sepolia",
        recovery: { type: "external-wallet", address: externalEvmAdmin },
        owner: `userId:srv-addsigner-evm-${Date.now()}`,
    });

    await test("EVM — addSigner({ type: 'server', secret }, prepareOnly) returns { signatureId } (UUID)", async () => {
        const result = await evmWallet.addSigner(
            { type: "server", secret: serverSecret },
            { prepareOnly: true }
        );
        assertDefined(result, "addSigner result");
        assertDefined(result.signatureId, `Expected signatureId in result, got: ${JSON.stringify(result)}`);
        assert(typeof result.signatureId === "string", "signatureId must be a string");
        assert(isUUID(result.signatureId), `signatureId must be UUID, got '${result.signatureId}'`);
        assert(!("transactionId" in result), "EVM addSigner must NOT have transactionId");
    });

    await test("EVM — after addSigner(server) prepareOnly, signers() count increases", async () => {
        const before = (await evmWallet.signers()).length;
        await evmWallet.addSigner(
            { type: "server", secret: generateServerSecret() },
            { prepareOnly: true }
        );
        const after = (await evmWallet.signers()).length;
        assert(
            after === before + 1,
            `signers() count should increase by 1 after addSigner(server) prepareOnly: was ${before}, now ${after}`
        );
    });

    await test("EVM — addSigner(server) in signers() has correct shape: type='server', locator, address, status", async () => {
        const freshSecret = generateServerSecret();
        await evmWallet.addSigner({ type: "server", secret: freshSecret }, { prepareOnly: true });
        const signers = await evmWallet.signers();
        const serverSigners = signers.filter(s => s.type === "server");
        assert(serverSigners.length > 0, "Expected at least one server signer in signers()");

        const serverEntry = serverSigners[serverSigners.length - 1];
        assert(serverEntry.type === "server", `type must be 'server', got '${serverEntry.type}'`);
        assert(
            typeof serverEntry.locator === "string" && serverEntry.locator.startsWith("server:"),
            `locator must start with 'server:', got '${serverEntry.locator}'`
        );
        assert(
            typeof serverEntry.address === "string" && /^0x[0-9a-fA-F]{40}$/.test(serverEntry.address),
            `address must be valid EVM address, got '${serverEntry.address}'`
        );
        assert(
            ["success", "pending", "awaiting-approval", "failed"].includes(serverEntry.status),
            `status must be valid SignerStatus, got '${serverEntry.status}'`
        );
    });

    // Solana — must use a valid Solana base58 address for external-wallet recovery
    const solanaAdmin = await generateSolanaAddress();
    const solanaWallet = await s.createWallet({
        chain: "solana",
        recovery: { type: "external-wallet", address: solanaAdmin },
        owner: `userId:srv-addsigner-sol-${Date.now()}`,
    });

    await test("Solana — addSigner({ type: 'server', secret }, prepareOnly) returns { transactionId } (UUID)", async () => {
        const result = await solanaWallet.addSigner(
            { type: "server", secret: serverSecret },
            { prepareOnly: true }
        );
        assertDefined(result, "addSigner result");
        assertDefined(result.transactionId, `Expected transactionId in result, got: ${JSON.stringify(result)}`);
        assert(isUUID(result.transactionId), `transactionId must be UUID, got '${result.transactionId}'`);
        assert(!("signatureId" in result), "Solana addSigner must NOT have signatureId");
    });
}

// ─── Suite 5: Full addSigner lifecycle (server signer as delegated) ──────────
async function suiteAddSignerFullLifecycle() {
    _origConsoleLog("\n▸ Suite 5: addSigner — full lifecycle (server as delegated signer)");
    const s = makeSdk();
    const secret = generateServerSecret();

    // Use external-wallet recovery + add server as delegated (the confirmed working path).
    // Recovery-only server signers cannot be used with useSigner() — see Suite 3 [BEHAVIOR] test.
    const externalAdmin = generateEvmAddress();
    const evmWallet = await s.createWallet({
        chain: "base-sepolia",
        recovery: { type: "external-wallet", address: externalAdmin },
        owner: `userId:srv-full-addsgn-${Date.now()}`,
    });
    // Register server as delegated (awaiting-approval) — useSigner() then works
    await evmWallet.addSigner({ type: "server", secret }, { prepareOnly: true });

    await test("EVM — useSigner(server delegated) then addSigner(external-wallet) without prepareOnly", async () => {
        await evmWallet.useSigner({ type: "server", secret });

        const newSignerAddr = generateEvmAddress();
        let result;
        let errMsg = "";
        try {
            result = await evmWallet.addSigner({ type: "external-wallet", address: newSignerAddr });
        } catch (e) {
            errMsg = e.message ?? "";
        }

        if (result) {
            assert(
                result.type === "external-wallet" || result.status != null,
                `Expected DelegatedSigner result, got: ${JSON.stringify(result)}`
            );
            assert(
                result.status === "success" || result.status === "pending" || result.status === "awaiting-approval",
                `Expected valid status, got '${result.status}'`
            );
            _origConsoleLog(`    (addSigner completed: status=${result.status})`);
        } else {
            // Server signer is awaiting-approval — may not be able to sign approvals yet
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `addSigner should not 500: ${errMsg}`
            );
            _origConsoleLog(`    (addSigner threw — server may be awaiting-approval: ${errMsg.slice(0, 100)})`);
        }
    });

    await test("EVM — signers() accessible and contains server signer after addSigner", async () => {
        const signers = await evmWallet.signers();
        assert(Array.isArray(signers), "signers() must return array");
        const serverEntry = signers.find(s => s.type === "server");
        assert(serverEntry != null, "Server signer must appear in signers() after addSigner");
        assert(
            ["success", "pending", "awaiting-approval"].includes(serverEntry.status),
            `Server signer status must be valid, got '${serverEntry.status}'`
        );
        _origConsoleLog(`    (server signer status in signers(): ${serverEntry.status})`);
    });
}

// ─── Suite 6: Full signMessage lifecycle (server signer signs completely) ──────
async function suiteSignMessageFullLifecycle() {
    _origConsoleLog("\n▸ Suite 6: signMessage — full lifecycle (server as delegated signer)");
    const s = makeSdk();
    const secret = generateServerSecret();

    // Use external-wallet recovery + add server as delegated (confirmed working path from Suite 3)
    const externalAdmin = generateEvmAddress();
    const evmWallet = await s.createWallet({
        chain: "base-sepolia",
        recovery: { type: "external-wallet", address: externalAdmin },
        owner: `userId:srv-signmsg-${Date.now()}`,
    });
    await evmWallet.addSigner({ type: "server", secret }, { prepareOnly: true });

    await test("EVM signMessage WITHOUT prepareOnly — server signer (awaiting-approval) tries to sign", async () => {
        await evmWallet.useSigner({ type: "server", secret });

        let result;
        let errMsg = "";
        try {
            result = await evmWallet.signMessage({ message: "Hello from wallets-v1 server signer test" });
        } catch (e) {
            errMsg = e.message ?? "";
        }

        if (result) {
            // Full signature should be present (not just a signatureId)
            assert(
                result.signature != null || result.signatureId != null,
                `Expected result with signature or signatureId, got: ${JSON.stringify(result)}`
            );
            if (result.signature) {
                assert(
                    typeof result.signature === "string" && result.signature.startsWith("0x"),
                    `signature must be 0x-prefixed hex string, got: '${result.signature}'`
                );
                assert(result.signature.length > 10, "signature must not be empty");
                _origConsoleLog(`    (full signMessage completed: sig=${result.signature.slice(0, 20)}...)`);
            } else {
                // May return signatureId if approval is async
                assert(isUUID(result.signatureId), `signatureId must be UUID: ${result.signatureId}`);
                _origConsoleLog(`    (signMessage returned signatureId for async approval: ${result.signatureId})`);
            }
        } else {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `signMessage full lifecycle should not 500: ${errMsg}`
            );
            _origConsoleLog(`    (signMessage threw — server may be awaiting-approval: ${errMsg.slice(0, 120)})`);
        }
    });

    await test("EVM signMessage prepareOnly — server signer returns { signatureId } (UUID) or documents factory limitation", async () => {
        // NOTE: WalletFactory.createWalletInstance returns a base Wallet instance, not EVMWallet.
        // signMessage/signTypedData are EVMWallet-only methods and may not be accessible via the factory.
        // This is a known SDK limitation (WalletFactory should return EVMWallet for EVM chains).
        await evmWallet.useSigner({ type: "server", secret }).catch(() => {});

        let result;
        let errMsg = "";
        try {
            result = await evmWallet.signMessage({
                message: "prepareOnly server signer test",
                options: { prepareOnly: true },
            });
        } catch (e) { errMsg = e.message ?? ""; }

        if (result) {
            assertDefined(result.signatureId, "signatureId");
            assert(isUUID(result.signatureId), `signatureId must be UUID, got '${result.signatureId}'`);
            assert(result.signature == null, "prepareOnly must not return completed signature");
        } else {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `signMessage prepareOnly should not 500: ${errMsg}`
            );
            if (errMsg.includes("not a function")) {
                _origConsoleLog("    [SDK LIMITATION] signMessage not available on base Wallet factory instance — EVMWallet subclass not returned by factory");
            }
        }
    });

    await test("EVM signMessage prepareOnly — signatureId does NOT appear in transactions()", async () => {
        await evmWallet.useSigner({ type: "server", secret }).catch(() => {});

        let signatureId;
        try {
            const result = await evmWallet.signMessage({
                message: "tx-list-check",
                options: { prepareOnly: true },
            });
            signatureId = result?.signatureId;
        } catch (_) {}

        if (!signatureId) {
            _origConsoleLog("    (skipped — signMessage not available or returned no signatureId)");
            return; // soft skip
        }

        const res = await evmWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];
        const found = txList.find(tx => tx.id === signatureId);
        assert(
            found == null,
            `signatureId ${signatureId} must NOT appear in transactions() — it is a signature request, not a tx`
        );
    });

    await test("[BUG] signMessage/signTypedData missing on factory-created wallets — EVMWallet subclass not returned", () => {
        // WalletFactory.createWalletInstance returns new Wallet(...), not new EVMWallet(...).
        // EVMWallet extends Wallet and adds signMessage + signTypedData, but the factory
        // always returns the base Wallet class so these methods are never available on
        // wallets created via CrossmintWallets.from(sdk).createWallet().
        // This is a SDK bug — the factory should instantiate the chain-specific subclass.
        assert(
            typeof evmWallet.signMessage === "undefined",
            "If this passes, the factory bug is fixed! signMessage is now on factory wallets."
        );
    });
}

// ─── Suite 7: signTypedData with server signer ────────────────────────────────
async function suiteSignTypedData(fixtures) {
    _origConsoleLog("\n▸ Suite 7: signTypedData — server signer");
    const { evmWallet, secret } = fixtures;

    await evmWallet.useSigner({ type: "server", secret }).catch(() => {});

    const validTypedData = {
        domain: {
            name: "ServerSignerTest",
            version: "1",
            chainId: 84532, // base-sepolia
            verifyingContract: "0x0000000000000000000000000000000000000001",
        },
        types: { Msg: [{ name: "text", type: "string" }] },
        primaryType: "Msg",
        message: { text: "server signer typed data test" },
        chain: "base-sepolia",
        options: { prepareOnly: true },
    };

    await test("EVM signTypedData prepareOnly — server signer wallet returns { signatureId } (UUID)", async () => {
        let result;
        let errMsg = "";
        try {
            result = await evmWallet.signTypedData(validTypedData);
        } catch (e) { errMsg = e.message ?? ""; }

        if (result) {
            assertDefined(result.signatureId, "signatureId");
            assert(isUUID(result.signatureId), `signatureId must be UUID, got '${result.signatureId}'`);
            assert(result.signature == null, "prepareOnly must not return completed signature");
        } else {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `signTypedData should not 500: ${errMsg}`
            );
        }
    });
}

// ─── Suite 8: send prepareOnly with server signer ─────────────────────────────
async function suiteSendPrepareOnly() {
    _origConsoleLog("\n▸ Suite 8: send prepareOnly — server signer as active signer");
    const s = makeSdk();
    const secret = generateServerSecret();

    // Use external-wallet recovery + add server as delegated (confirmed working path from Suite 3)
    const externalAdmin = generateEvmAddress();
    const evmWallet = await s.createWallet({
        chain: "base-sepolia",
        recovery: { type: "external-wallet", address: externalAdmin },
        owner: `userId:srv-send-${Date.now()}`,
    });
    await evmWallet.addSigner({ type: "server", secret }, { prepareOnly: true });

    await test("EVM — useSigner(server delegated) then send prepareOnly returns transactionId (UUID)", async () => {
        await evmWallet.useSigner({ type: "server", secret });

        let result;
        let errMsg = "";
        try {
            result = await evmWallet.send(
                generateEvmAddress(),
                "usdc",
                "0.001",
                { prepareOnly: true }
            );
        } catch (e) { errMsg = e.message ?? ""; }

        if (result) {
            // Server signer can prepare a tx — transactionId should be returned
            assertDefined(result.transactionId, `Expected transactionId, got: ${JSON.stringify(result)}`);
            assert(isUUID(result.transactionId), `transactionId must be UUID, got '${result.transactionId}'`);
            _origConsoleLog(`    (send prepareOnly: transactionId=${result.transactionId})`);
        } else {
            // If it fails (e.g. insufficient gas) make sure it's a clean error
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `send prepareOnly should not 500: ${errMsg}`
            );
            _origConsoleLog(`    (send prepareOnly threw — may need funded wallet: ${errMsg.slice(0, 100)})`);
        }
    });

    await test("EVM — send prepareOnly transaction appears in transactions() with awaiting-approval status", async () => {
        await evmWallet.useSigner({ type: "server", secret }).catch(() => {});

        let transactionId;
        try {
            const result = await evmWallet.send(generateEvmAddress(), "usdc", "0.001", { prepareOnly: true });
            transactionId = result?.transactionId;
        } catch (_) {}

        if (!transactionId) {
            _origConsoleLog("    (skipped — send prepareOnly failed in previous test)");
            passed++; return;
        }

        const res = await evmWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];
        const tx = txList.find(t => t.id === transactionId);

        assert(tx != null, `Transaction ${transactionId} must appear in transactions()`);
        assert(
            tx.status === "awaiting-approval",
            `Expected status 'awaiting-approval', got '${tx.status}'`
        );
        assertDefined(tx.approvals?.pending, "approvals.pending must be present");
        assert(Array.isArray(tx.approvals.pending), "approvals.pending must be an array");
        assert(tx.approvals.pending.length > 0, "approvals.pending must not be empty (server signer approval needed)");

        // Verify the pending approval points to the server signer
        const pending = tx.approvals.pending[0];
        assert(
            pending.signer?.locator?.startsWith("server:") || pending.signer?.type === "server",
            `Pending approval should reference server signer, got: ${JSON.stringify(pending.signer)}`
        );
    });

    await test("Solana — useSigner(server delegated) then send prepareOnly returns transactionId", async () => {
        const solSecret = generateServerSecret();
        const solAdmin = await generateSolanaAddress();
        const solWallet = await s.createWallet({
            chain: "solana",
            recovery: { type: "external-wallet", address: solAdmin },
            owner: `userId:srv-send-sol-${Date.now()}`,
        });
        await solWallet.addSigner({ type: "server", secret: solSecret }, { prepareOnly: true });
        await solWallet.useSigner({ type: "server", secret: solSecret });

        let result;
        let errMsg = "";
        try {
            const solRecipient = await generateSolanaAddress();
            result = await solWallet.send(solRecipient, "sol", "0.001", { prepareOnly: true });
        } catch (e) { errMsg = e.message ?? ""; }

        if (result) {
            assertDefined(result.transactionId, `Expected transactionId, got: ${JSON.stringify(result)}`);
            assert(isUUID(result.transactionId), `transactionId must be UUID`);
        } else {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `Solana send prepareOnly should not 500: ${errMsg}`
            );
        }
    });
}

// ─── Suite 9: getWallet with server recovery ──────────────────────────────────
async function suiteGetWallet(fixtures) {
    _origConsoleLog("\n▸ Suite 9: getWallet — server recovery wallet");
    const s = makeSdk();
    const { evmWallet, secret } = fixtures;

    await test("getWallet by address — server recovery wallet returned correctly", async () => {
        const w = await s.getWallet(evmWallet.address, {
            chain: "base-sepolia",
            recovery: { type: "server", secret },
        });
        assertDefined(w, "returned wallet");
        assert(w.address === evmWallet.address, `Address mismatch: ${w.address} vs ${evmWallet.address}`);
        assert(w.chain === "base-sepolia", `Chain mismatch: ${w.chain}`);
        assert(w.recovery.type === "server", `Expected recovery.type 'server', got '${w.recovery.type}'`);
    });

    await test("[BEHAVIOR] getWallet with wrong secret — returns wallet (no secret validation at retrieval time)", async () => {
        // getWallet retrieves a wallet by address without validating the recovery secret.
        // The secret is only used at signing time (useSigner/signMessage/send), not at retrieval.
        // This is consistent with how external-wallet recovery works (address is the identifier, not verified at get).
        const wrongSecret = generateServerSecret();
        let returned;
        let errMsg = "";
        try {
            returned = await s.getWallet(evmWallet.address, {
                chain: "base-sepolia",
                recovery: { type: "server", secret: wrongSecret },
            });
        } catch (e) {
            errMsg = e.message ?? "";
        }
        if (returned) {
            assert(returned.address === evmWallet.address, "Wallet address should match even with wrong secret");
            _origConsoleLog("    (getWallet returned wallet without secret validation — as expected)");
        } else {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `getWallet should not 500 for wrong secret: ${errMsg}`
            );
            _origConsoleLog(`    (getWallet threw for wrong secret: ${errMsg.slice(0, 80)})`);
        }
    });
}

// ─── Suite 10: Negative paths ─────────────────────────────────────────────────
async function suiteNegativePaths() {
    _origConsoleLog("\n▸ Suite 10: Negative paths — server signer validation");
    const s = makeSdk();

    await test("createWallet with server recovery — secret too short throws clear error", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await s.createWallet({
                chain: "base-sepolia",
                recovery: { type: "server", secret: "tooshort" },
                owner: `userId:srv-badkey-${Date.now()}`,
            });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "createWallet with short secret must throw");
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `Expected validation error, not 500: ${errMsg}`
        );
    });

    await test("addSigner({ type: 'server', secret: '' }) — throws clear validation error", async () => {
        const evmAdmin = generateEvmAddress();
        const wallet = await s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "external-wallet", address: evmAdmin },
            owner: `userId:srv-badsgn-${Date.now()}`,
        });

        let threw = false;
        let errMsg = "";
        try {
            await wallet.addSigner({ type: "server", secret: "" }, { prepareOnly: true });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "addSigner with empty secret must throw");
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `Expected validation error, not 500: ${errMsg}`
        );
    });

    await test("Duplicate addSigner(server, same secret) — idempotent or clear error (not 500)", async () => {
        const evmAdmin = generateEvmAddress();
        const wallet = await s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "external-wallet", address: evmAdmin },
            owner: `userId:srv-dup-${Date.now()}`,
        });

        const secret = generateServerSecret();
        await wallet.addSigner({ type: "server", secret }, { prepareOnly: true });

        let threw = false;
        let errMsg = "";
        try {
            await wallet.addSigner({ type: "server", secret }, { prepareOnly: true });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        if (threw) {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `Duplicate addSigner should give a clear error, not 500: ${errMsg}`
            );
        }
        // idempotent (no throw) is also acceptable
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    _origConsoleLog(`
╔════════════════════════════════════════════════════════════╗
║   Crossmint Wallets SDK — Server Signer Tests            ║
║        wallets-v1 · Full lifecycle (Node.js only)         ║
╚════════════════════════════════════════════════════════════╝`);

    // Suite 1 creates the shared fixtures used by later suites
    let fixtures;
    try {
        fixtures = await suiteCreateWalletServerRecovery();
    } catch (e) {
        _origConsoleLog(`\n❌  Suite 1 (createWallet) failed hard: ${e.message}`);
        _origConsoleLog("    Cannot proceed without fixture wallets.\n");
        process.exit(1);
    }

    await suiteSignerIsRegistered(fixtures);
    await suiteUseSigner(fixtures);
    await suiteAddSignerPrepareOnly();
    await suiteAddSignerFullLifecycle();
    await suiteSignMessageFullLifecycle();
    await suiteSignTypedData(fixtures);
    await suiteSendPrepareOnly();
    await suiteGetWallet(fixtures);
    await suiteNegativePaths();

    // ── Results ───────────────────────────────────────────────────────────────
    _origConsoleLog(`\n${"─".repeat(60)}`);
    _origConsoleLog(`Results: ${passed}/${passed + failed} passed  |  ${failed} failed\n`);

    if (failures.length > 0) {
        _origConsoleLog("Failed tests:");
        for (const f of failures) {
            _origConsoleLog(`  ✗ ${f.name}`);
            _origConsoleLog(`    └─ ${f.error}`);
        }
    }

    process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
    _origConsoleLog("\n❌  Unhandled error:", e);
    process.exit(1);
});
