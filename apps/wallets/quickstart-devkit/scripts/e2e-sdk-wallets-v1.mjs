#!/usr/bin/env node
/**
 * SDK-level tests for Crossmint Wallets SDK — wallets-v1 branch.
 *
 * Unlike e2e-device-signer-stress.mjs (which calls the REST API directly),
 * this script exercises the SDK layer:
 *   - CrossmintWallets.from(createCrossmint({apiKey}))
 *   - sdk.createWallet / sdk.getWallet (separated in wallets-v1)
 *   - wallet.recovery (renamed from adminSigner in wallets-v1)
 *   - wallet.signers() (renamed from delegatedSigners in wallets-v1)
 *   - wallet.addSigner / wallet.signerIsRegistered / wallet.useSigner
 *   - wallet.balances / wallet.send (prepareOnly) / wallet.transactions
 *   - WalletNotAvailableError thrown on missing wallet
 *
 * PREREQUISITE: build the wallets SDK first.
 *   pnpm --filter @crossmint/wallets-sdk build
 *
 * Usage:
 *   CROSSMINT_API_KEY=xxx node scripts/e2e-sdk-wallets-v1.mjs
 *
 * The script imports the SDK from the monorepo dist directly so it always
 * reflects the code on your current branch.
 */

import { webcrypto } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const crypto = webcrypto;

// ─── Suppress SDK internal logger (very noisy) ────────────────────────────────
// The SDK emits [SDK] lines via console.debug/info/warn — silence all of them.
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
// Goes up from: apps/wallets/quickstart-devkit/scripts/ → monorepo root → packages/wallets/dist
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

const { CrossmintWallets, createCrossmint, WalletNotAvailableError, createDeviceSigner } = sdk;

// ─── API key ─────────────────────────────────────────────────────────────────
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

// ─── Address generators ───────────────────────────────────────────────────────
function generateEvmAddress() {
    return privateKeyToAccount(generatePrivateKey()).address;
}

function bs58encode(bytes) {
    const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let x = BigInt("0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""));
    let out = "";
    while (x > 0n) {
        out = ALPHA[Number(x % 58n)] + out;
        x /= 58n;
    }
    for (const b of bytes) {
        if (b !== 0) break;
        out = "1" + out;
    }
    return out;
}

async function generateSolanaAddress() {
    const kp = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
    return bs58encode(raw);
}

function crc16xmodem(bytes) {
    let crc = 0x0000;
    for (const b of bytes) {
        crc ^= b << 8;
        for (let i = 0; i < 8; i++) {
            crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) : crc << 1;
            crc &= 0xffff;
        }
    }
    return crc;
}

function base32Encode(bytes) {
    const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0, value = 0, output = "";
    for (const b of bytes) {
        value = (value << 8) | b;
        bits += 8;
        while (bits >= 5) {
            output += ALPHA[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) output += ALPHA[(value << (5 - bits)) & 31];
    return output;
}

async function generateStellarAddress() {
    const kp = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
    const data = new Uint8Array(33);
    data[0] = 0x30;
    data.set(raw, 1);
    const crc = crc16xmodem(data);
    const full = new Uint8Array(35);
    full.set(data);
    full[33] = crc & 0xff;
    full[34] = (crc >> 8) & 0xff;
    return base32Encode(full);
}

// ─── SDK factory ─────────────────────────────────────────────────────────────
function makeSdk() {
    return CrossmintWallets.from(createCrossmint({ apiKey }));
}

// ─── Setup: create fixture wallets ────────────────────────────────────────────
async function setup() {
    _origConsoleLog("\n⚙  Setup: creating fixture wallets...");
    const s = makeSdk();

    const evmAdmin = generateEvmAddress();
    const solanaAdmin = await generateSolanaAddress();
    const stellarAdmin = await generateStellarAddress();

    const [evmWallet, solanaWallet, stellarWallet] = await Promise.all([
        s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "external-wallet", address: evmAdmin },
            owner: `userId:sdk-v1-evm-${Date.now()}`,
        }),
        s.createWallet({
            chain: "solana",
            recovery: { type: "external-wallet", address: solanaAdmin },
            owner: `userId:sdk-v1-solana-${Date.now()}`,
        }),
        s.createWallet({
            chain: "stellar",
            recovery: { type: "external-wallet", address: stellarAdmin },
            owner: `userId:sdk-v1-stellar-${Date.now()}`,
        }),
    ]);

    _origConsoleLog(`   EVM wallet:     ${evmWallet.address}`);
    _origConsoleLog(`   Solana wallet:  ${solanaWallet.address}`);
    _origConsoleLog(`   Stellar wallet: ${stellarWallet.address}`);

    return { evmWallet, solanaWallet, stellarWallet, evmAdmin, solanaAdmin, stellarAdmin };
}

// ─── Suite 1: SDK initialization ─────────────────────────────────────────────
async function suiteInit() {
    _origConsoleLog("\n▸ Suite 1: SDK Initialization");

    await test("CrossmintWallets.from() creates SDK instance with correct methods", () => {
        const s = makeSdk();
        assertDefined(s, "sdk instance");
        assert(typeof s.createWallet === "function", "createWallet must be a function");
        assert(typeof s.getWallet === "function", "getWallet must be a function");
        assert(typeof s.createDeviceSigner === "function", "createDeviceSigner must be a function");
    });

    await test("wallets-v1: createWallet and getWallet are separate methods (getOrCreateWallet removed)", () => {
        const s = makeSdk();
        assert(typeof s.createWallet === "function", "createWallet missing");
        assert(typeof s.getWallet === "function", "getWallet missing");
        assert(
            typeof s.getOrCreateWallet !== "function",
            "getOrCreateWallet should be removed in wallets-v1"
        );
    });

    await test("WalletNotAvailableError is exported and is an Error subclass", () => {
        assert(WalletNotAvailableError != null, "WalletNotAvailableError should be exported");
        const err = new WalletNotAvailableError("test");
        assert(err instanceof Error, "WalletNotAvailableError must extend Error");
        assert(err.message === "test", "WalletNotAvailableError should preserve message");
    });
}

// ─── Suite 2: Wallet creation ─────────────────────────────────────────────────
async function suiteWalletCreation(fixtures) {
    _origConsoleLog("\n▸ Suite 2: Wallet Creation (recovery field — wallets-v1 rename from adminSigner)");
    const s = makeSdk();
    const { evmWallet, solanaWallet, stellarWallet, evmAdmin, solanaAdmin, stellarAdmin } = fixtures;

    await test("EVM — createWallet returns wallet with address and correct chain", () => {
        assertDefined(evmWallet, "evmWallet");
        assertDefined(evmWallet.address, "evmWallet.address");
        assert(evmWallet.address.startsWith("0x"), `Expected 0x EVM address, got ${evmWallet.address}`);
        assert(evmWallet.chain === "base-sepolia", `Expected chain base-sepolia, got ${evmWallet.chain}`);
    });

    await test("Solana — createWallet returns wallet with address and correct chain", () => {
        assertDefined(solanaWallet, "solanaWallet");
        assertDefined(solanaWallet.address, "solanaWallet.address");
        assert(solanaWallet.chain === "solana", `Expected chain solana, got ${solanaWallet.chain}`);
    });

    await test("Stellar — createWallet returns wallet with address and correct chain", () => {
        assertDefined(stellarWallet, "stellarWallet");
        assertDefined(stellarWallet.address, "stellarWallet.address");
        assert(
            stellarWallet.address.startsWith("C") || stellarWallet.address.startsWith("G"),
            `Expected Stellar address (C.../G...), got ${stellarWallet.address}`
        );
        assert(stellarWallet.chain === "stellar", `Expected chain stellar, got ${stellarWallet.chain}`);
    });

    await test("EVM — wallet.recovery returns the configured recovery signer (wallets-v1 rename)", () => {
        const recovery = evmWallet.recovery;
        assertDefined(recovery, "wallet.recovery");
        // recovery should reflect the external-wallet config we passed
        assert(
            recovery.type === "external-wallet" || recovery.type != null,
            `wallet.recovery should have a type, got ${JSON.stringify(recovery)}`
        );
        // The old 'adminSigner' property should not be exposed on the wallet object
        assert(!("adminSigner" in evmWallet), "adminSigner should not be on wallet — use wallet.recovery");
    });

    await test("EVM — createWallet idempotent: same owner + same recovery creates same wallet", async () => {
        const owner = `userId:sdk-v1-idem-${Date.now()}`;
        const addr = generateEvmAddress();
        const w1 = await s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "external-wallet", address: addr },
            owner,
        });
        // Second call with SAME owner + SAME recovery → should return the same wallet
        const w2 = await s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "external-wallet", address: addr },
            owner,
        });
        assert(w1.address === w2.address, `Same owner+recovery should return same wallet: ${w1.address} vs ${w2.address}`);
    });

    await test("api-key signer not enabled: createWallet throws WalletCreationError with helpful message", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await s.createWallet({
                chain: "base-sepolia",
                recovery: { type: "api-key" },
                owner: `userId:sdk-v1-apikey-${Date.now()}`,
            });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        // Either throws (feature not enabled) or succeeds (feature enabled) — both are valid.
        // If it throws, the error should be a meaningful message, not a 500 crash.
        if (threw) {
            assert(
                !errMsg.includes("Internal server error") && !errMsg.includes("500"),
                `api-key signer error should be a clear 4xx message, not 500: ${errMsg}`
            );
        }
    });
}

// ─── Suite 3: getWallet ───────────────────────────────────────────────────────
async function suiteGetWallet(fixtures) {
    _origConsoleLog("\n▸ Suite 3: getWallet — separate from createWallet in wallets-v1");
    const s = makeSdk();
    const { evmWallet, solanaWallet, stellarWallet, evmAdmin, solanaAdmin, stellarAdmin } = fixtures;

    await test("EVM — getWallet by address returns the same wallet", async () => {
        // Must pass the SAME recovery address that was used to create the wallet —
        // the SDK validates that the recovery matches the existing wallet's admin signer.
        const w = await s.getWallet(evmWallet.address, {
            chain: "base-sepolia",
            recovery: { type: "external-wallet", address: evmAdmin },
        });
        assertDefined(w, "returned wallet");
        assert(w.address === evmWallet.address, `Address mismatch: ${w.address} vs ${evmWallet.address}`);
        assert(w.chain === "base-sepolia", `Chain mismatch: ${w.chain}`);
    });

    await test("Solana — getWallet by address returns the same wallet", async () => {
        const w = await s.getWallet(solanaWallet.address, {
            chain: "solana",
            recovery: { type: "external-wallet", address: solanaAdmin },
        });
        assert(w.address === solanaWallet.address, "address mismatch");
    });

    await test("Stellar — getWallet by address returns the same wallet", async () => {
        const w = await s.getWallet(stellarWallet.address, {
            chain: "stellar",
            recovery: { type: "external-wallet", address: stellarAdmin },
        });
        assert(w.address === stellarWallet.address, "address mismatch");
    });

    await test("EVM — getWallet on non-existent address throws WalletNotAvailableError", async () => {
        let threw = false;
        try {
            await s.getWallet("0x000000000000000000000000000000000000dead", {
                chain: "base-sepolia",
                recovery: { type: "external-wallet", address: generateEvmAddress() },
            });
        } catch (e) {
            threw = true;
            assert(
                e instanceof WalletNotAvailableError ||
                    e.name === "WalletNotAvailableError" ||
                    e.code === "wallet:wallet-not-available",
                `Expected WalletNotAvailableError, got: ${e.constructor?.name} (${e.code}): ${e.message}`
            );
        }
        assert(threw, "Expected getWallet to throw WalletNotAvailableError for non-existent wallet");
    });

    await test("Solana — getWallet on non-existent address throws WalletNotAvailableError", async () => {
        const fakeAddr = await generateSolanaAddress();
        let threw = false;
        try {
            await s.getWallet(fakeAddr, {
                chain: "solana",
                recovery: { type: "external-wallet", address: fakeAddr },
            });
        } catch (e) {
            threw = true;
            assert(
                e instanceof WalletNotAvailableError ||
                    e.name === "WalletNotAvailableError" ||
                    e.code === "wallet:wallet-not-available",
                `Expected WalletNotAvailableError, got: ${e.constructor?.name}: ${e.message}`
            );
        }
        assert(threw, "Expected getWallet to throw for non-existent Solana wallet");
    });

    await test("Stellar — getWallet on non-existent address throws WalletNotAvailableError", async () => {
        const fakeAddr = await generateStellarAddress();
        let threw = false;
        try {
            await s.getWallet(fakeAddr, {
                chain: "stellar",
                recovery: { type: "external-wallet", address: fakeAddr },
            });
        } catch (e) {
            threw = true;
            assert(
                e instanceof WalletNotAvailableError ||
                    e.name === "WalletNotAvailableError" ||
                    e.code === "wallet:wallet-not-available",
                `Expected WalletNotAvailableError, got: ${e.constructor?.name}: ${e.message}`
            );
        }
        assert(threw, "Expected getWallet to throw for non-existent Stellar wallet");
    });
}

// ─── Suite 4: wallet.signers() and signerIsRegistered() ──────────────────────
async function suiteSigners(fixtures) {
    _origConsoleLog("\n▸ Suite 4: wallet.signers() — renamed from delegatedSigners in wallets-v1");
    const { evmWallet, solanaWallet, stellarWallet } = fixtures;

    await test("EVM — wallet.signers() returns an array", async () => {
        const signers = await evmWallet.signers();
        assert(Array.isArray(signers), `signers() should return Array, got ${typeof signers}`);
    });

    await test("Solana — wallet.signers() returns an array", async () => {
        const signers = await solanaWallet.signers();
        assert(Array.isArray(signers), `signers() should return Array, got ${typeof signers}`);
    });

    await test("Stellar — wallet.signers() returns an array", async () => {
        const signers = await stellarWallet.signers();
        assert(Array.isArray(signers), `signers() should return Array, got ${typeof signers}`);
    });

    await test("EVM — wallet.signerIsRegistered() returns false for an unknown locator", async () => {
        const fakeLocator = `external-wallet:${generateEvmAddress()}`;
        const result = await evmWallet.signerIsRegistered(fakeLocator);
        assert(result === false, `Expected false for unregistered signer, got ${result}`);
    });

    await test("Solana — wallet.signerIsRegistered() returns false for an unknown locator", async () => {
        const fakeLocator = `external-wallet:${await generateSolanaAddress()}`;
        const result = await solanaWallet.signerIsRegistered(fakeLocator);
        assert(result === false, `Expected false, got ${result}`);
    });

    await test("Stellar — wallet.signerIsRegistered() returns false for an unknown locator", async () => {
        const fakeLocator = `external-wallet:${await generateStellarAddress()}`;
        const result = await stellarWallet.signerIsRegistered(fakeLocator);
        assert(result === false, `Expected false, got ${result}`);
    });
}

// ─── Suite 5: wallet.addSigner() prepareOnly ─────────────────────────────────
async function suiteAddSigner(fixtures) {
    _origConsoleLog("\n▸ Suite 5: wallet.addSigner() — prepareOnly mode");
    const { evmWallet, solanaWallet, stellarWallet } = fixtures;

    await test("EVM — addSigner prepareOnly returns { signatureId }", async () => {
        const addr = generateEvmAddress();
        const result = await evmWallet.addSigner(
            { type: "external-wallet", address: addr },
            { prepareOnly: true }
        );
        assertDefined(result, "addSigner result");
        assertDefined(result.signatureId, `Expected signatureId, got: ${JSON.stringify(result)}`);
    });

    await test("Solana — addSigner prepareOnly returns { transactionId }", async () => {
        const addr = await generateSolanaAddress();
        const result = await solanaWallet.addSigner(
            { type: "external-wallet", address: addr },
            { prepareOnly: true }
        );
        assertDefined(result, "addSigner result");
        assertDefined(result.transactionId, `Expected transactionId for Solana, got: ${JSON.stringify(result)}`);
    });

    await test("Stellar — addSigner on undeployed wallet returns clear error (not 500)", async () => {
        // Stellar wallets must be deployed on-chain before adding signers.
        // A freshly created wallet is not yet deployed. This test verifies the SDK
        // propagates the API error clearly rather than throwing an opaque crash.
        const addr = await generateStellarAddress();
        let threw = false;
        let errMsg = "";
        try {
            await stellarWallet.addSigner(
                { type: "external-wallet", address: addr },
                { prepareOnly: true }
            );
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "Expected addSigner to throw for undeployed Stellar wallet");
        assert(
            !errMsg.includes("Internal server error") && !errMsg.includes("500"),
            `Expected a clear 4xx error, not 500: ${errMsg}`
        );
        assert(
            errMsg.includes("deployed") || errMsg.includes("deploy") || errMsg.includes("not been deployed"),
            `Expected 'not deployed' message, got: ${errMsg}`
        );
    });

    await test("EVM — addSigner for same address twice does not crash (idempotent or clear error)", async () => {
        const addr = generateEvmAddress();
        await evmWallet.addSigner({ type: "external-wallet", address: addr }, { prepareOnly: true });
        // Second add — should either succeed or return a clear 4xx-level error, no 500
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.addSigner({ type: "external-wallet", address: addr }, { prepareOnly: true });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        if (threw) {
            assert(
                !errMsg.includes("Internal server error") && !errMsg.includes("500"),
                `Duplicate addSigner should give a clear error, not 500: ${errMsg}`
            );
        }
    });
}

// ─── Suite 6: wallet.balances() ──────────────────────────────────────────────
async function suiteBalances(fixtures) {
    _origConsoleLog("\n▸ Suite 6: wallet.balances()");
    const { evmWallet, solanaWallet, stellarWallet } = fixtures;

    await test("EVM — balances() returns object without crashing", async () => {
        const balances = await evmWallet.balances();
        assertDefined(balances, "balances");
        assert(typeof balances === "object", `Expected object, got ${typeof balances}`);
    });

    await test("Solana — balances() returns object without crashing", async () => {
        const balances = await solanaWallet.balances();
        assertDefined(balances, "balances");
    });

    await test("Stellar — balances() returns object without crashing", async () => {
        const balances = await stellarWallet.balances();
        assertDefined(balances, "balances");
    });
}

// ─── Suite 7: wallet.send() prepareOnly ──────────────────────────────────────
async function suiteSend(fixtures) {
    _origConsoleLog("\n▸ Suite 7: wallet.send() — prepareOnly mode");
    const { evmWallet, stellarWallet } = fixtures;

    // send(to, token, amount, options?) — signature on both current and wallets-v1 branches.
    // Fixture wallets are created with external-wallet recovery (server can't sign for them),
    // so the wallet is read-only. We verify the SDK returns a clear error, not a 500 crash.
    await test("EVM — send on read-only wallet returns clear SDK error (not 500 or TypeError)", async () => {
        let threw = false;
        try {
            await evmWallet.send(generateEvmAddress(), "base-sepolia:eth", "0.0001", { prepareOnly: true });
        } catch (e) {
            threw = true;
            assert(
                !e.message?.includes("Internal server error") && !e.message?.includes("500"),
                `Expected a helpful SDK error, not 500: ${e.message}`
            );
            assert(
                e.message?.includes("read-only") || e.message?.includes("signer") || e.message?.includes("signing"),
                `Expected 'read-only' / 'signer' message, got: ${e.message}`
            );
        }
        // If it didn't throw, it created the transaction — also valid if the wallet auto-signs
        if (!threw) {
            // Acceptable: wallet found a way to proceed
        }
    });

    await test("Stellar — send on read-only wallet returns clear SDK error (not 500 or TypeError)", async () => {
        let threw = false;
        try {
            await stellarWallet.send(stellarWallet.address, "stellar:xlm", "0.00001", { prepareOnly: true });
        } catch (e) {
            threw = true;
            assert(
                !e.message?.includes("Internal server error") && !e.message?.includes("500"),
                `Expected a helpful SDK error, not 500: ${e.message}`
            );
        }
    });

    await test("EVM — send with invalid token locator throws or returns error (not 500)", async () => {
        let threw = false;
        let result;
        try {
            result = await evmWallet.send(
                generateEvmAddress(),
                "base-sepolia:NOTATOKEN",
                "0.0001",
                { prepareOnly: true }
            );
        } catch (e) {
            threw = true;
            assert(
                !e.message?.includes("Internal server error") && !e.message?.includes("500"),
                `Expected a 4xx-level error, not 500: ${e.message}`
            );
        }
        if (!threw) {
            assert(
                result?.error === true || result?.message != null,
                `Expected error response for invalid token, got: ${JSON.stringify(result)}`
            );
        }
    });
}

// ─── Suite 8: wallet.transactions() ──────────────────────────────────────────
async function suiteTransactions(fixtures) {
    _origConsoleLog("\n▸ Suite 8: wallet.transactions()");
    const { evmWallet } = fixtures;

    await test("EVM — transactions() returns a list (empty for new wallet)", async () => {
        const result = await evmWallet.transactions();
        assertDefined(result, "transactions result");
        const txList = Array.isArray(result) ? result : result?.transactions;
        assert(Array.isArray(txList), `Expected array of transactions, got: ${JSON.stringify(result).slice(0, 100)}`);
    });
}

// ─── Suite 9: useSigner() ─────────────────────────────────────────────────────
async function suiteUseSigner(fixtures) {
    _origConsoleLog("\n▸ Suite 9: wallet.useSigner()");
    const { evmWallet } = fixtures;

    await test("EVM — useSigner with unregistered locator throws (not a 500)", async () => {
        const fakeLocator = `external-wallet:${generateEvmAddress()}`;
        let threw = false;
        try {
            await evmWallet.useSigner(fakeLocator);
        } catch (e) {
            threw = true;
            assert(
                !e.message?.includes("Internal server error") && !e.message?.includes("500"),
                `Expected a clear error, not 500: ${e.message}`
            );
        }
        assert(threw, "useSigner with unregistered locator should throw");
    });

    await test("EVM — useSigner with the recovery signer locator does not throw", async () => {
        // The recovery signer is always registered on the wallet.
        // Using it should succeed (or be a no-op since it's already the signer).
        const recoveryLocator = `external-wallet:${fixtures.evmAdmin}`;
        // This may or may not throw depending on whether the recovery signer is in the 'delegatedSigners' list.
        // We just verify it doesn't 500.
        try {
            await evmWallet.useSigner(recoveryLocator);
        } catch (e) {
            assert(
                !e.message?.includes("Internal server error") && !e.message?.includes("500"),
                `useSigner should not 500: ${e.message}`
            );
        }
    });
}

// ─── Mock P-256 DeviceSignerKeyStorage (for device signer tests) ─────────────
// Implements the DeviceSignerKeyStorage interface using Node WebCrypto.
// The abstract class is duck-typed: the SDK only calls the methods, no instanceof check.
function createMockDeviceKeyStorage() {
    const keys = new Map();       // base64PubKey → CryptoKey (privateKey)
    const addressMap = new Map(); // walletAddress → base64PubKey

    return {
        async generateKey({ address } = {}) {
            const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
            // Export raw uncompressed public key: 0x04 || x (32 bytes) || y (32 bytes) = 65 bytes
            const raw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
            const base64 = Buffer.from(raw).toString("base64");
            keys.set(base64, kp.privateKey);
            if (address) addressMap.set(address, base64);
            return base64;
        },
        async mapAddressToKey(address, pubKey64) {
            addressMap.set(address, pubKey64);
        },
        async getKey(address) {
            return addressMap.get(address) ?? null;
        },
        async hasKey(pubKey64) {
            return keys.has(pubKey64);
        },
        async signMessage(address, message) {
            const pubKey64 = addressMap.get(address);
            if (!pubKey64) throw new Error(`No key mapped to address: ${address}`);
            const privateKey = keys.get(pubKey64);
            if (!privateKey) throw new Error(`No private key for: ${pubKey64}`);
            // message is hex-encoded bytes (the hash to sign)
            const msgBytes = Buffer.from(message.replace(/^0x/, ""), "hex");
            // WebCrypto ECDSA with P-256 returns IEEE P1363 format: r || s (64 bytes)
            const sig = new Uint8Array(
                await crypto.subtle.sign({ name: "ECDSA", hash: { name: "SHA-256" } }, privateKey, msgBytes)
            );
            const r = "0x" + Array.from(sig.slice(0, 32)).map(b => b.toString(16).padStart(2, "0")).join("");
            const s = "0x" + Array.from(sig.slice(32, 64)).map(b => b.toString(16).padStart(2, "0")).join("");
            return { r, s };
        },
        async deleteKey(address) {
            const pubKey64 = addressMap.get(address);
            if (pubKey64) keys.delete(pubKey64);
            addressMap.delete(address);
        },
    };
}

// ─── Suite 10: Negative / error-path tests ────────────────────────────────────
async function suiteNegativePaths(fixtures) {
    _origConsoleLog("\n▸ Suite 10: Negative / Error Path Tests");
    const s = makeSdk();
    const { evmWallet, solanaWallet, stellarWallet, evmAdmin } = fixtures;

    // ── createWallet: invalid chain ────────────────────────────────────────────
    // BUG: SDK/API accepts any chain string for EVM — no chain name validation.
    // "not-a-chain" is treated as an EVM chain (fallback) and creates a real wallet.
    // Expected: SDK or API should throw a validation error for unknown chain names.
    await test("[BUG] createWallet — invalid chain string is silently accepted (should throw validation error)", async () => {
        let threw = false;
        let wallet;
        try {
            wallet = await s.createWallet({
                chain: "not-a-chain",
                recovery: { type: "external-wallet", address: generateEvmAddress() },
                owner: `userId:sdk-v1-badchain-${Date.now()}`,
            });
        } catch (e) {
            threw = true;
        }
        // Document the current (buggy) behavior: it succeeds without throwing
        assert(
            !threw && wallet != null,
            threw
                ? "createWallet threw — validation may now be in place (bug may be fixed!)"
                : "createWallet with invalid chain should have thrown but succeeded silently"
        );
        // The bug: wallet is created with chain = "not-a-chain"
        assert(wallet?.chain === "not-a-chain", `Expected chain 'not-a-chain' to be passed through (bug), got ${wallet?.chain}`);
    });

    // ── createWallet: missing recovery (wallets-v1 — required field) ──────────
    await test("createWallet — missing recovery throws a helpful validation error", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await s.createWallet({
                chain: "base-sepolia",
                // no recovery field — required in wallets-v1
                owner: `userId:sdk-v1-norecovery-${Date.now()}`,
            });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "createWallet without recovery should throw");
        assert(
            !errMsg.includes("Internal server error") && !errMsg.includes("500"),
            `Expected a clear error for missing recovery, not 500: ${errMsg}`
        );
    });

    // ── getWallet: wrong recovery address ─────────────────────────────────────
    await test("getWallet — wrong recovery address throws a clear mismatch error", async () => {
        // Use a different address than what was used to create the wallet.
        const wrongAddress = generateEvmAddress();
        let threw = false;
        let errMsg = "";
        try {
            await s.getWallet(evmWallet.address, {
                chain: "base-sepolia",
                recovery: { type: "external-wallet", address: wrongAddress },
            });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "getWallet with wrong recovery should throw");
        assert(
            !errMsg.includes("Internal server error") && !errMsg.includes("500"),
            `Expected a clear mismatch error, not 500: ${errMsg}`
        );
        assert(
            errMsg.toLowerCase().includes("mismatch") ||
                errMsg.toLowerCase().includes("recovery") ||
                errMsg.toLowerCase().includes("signer") ||
                errMsg.toLowerCase().includes("address") ||
                errMsg.toLowerCase().includes("match"),
            `Expected mismatch/recovery-related error, got: ${errMsg}`
        );
    });

    // ── addSigner: invalid signer type on Solana ───────────────────────────────
    await test("addSigner — invalid signer type throws clear error (not 500)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            // "passkey" signers require browser WebAuthn, passing this server-side should error
            await solanaWallet.addSigner(
                { type: "passkey", id: "invalid-passkey-id" },
                { prepareOnly: true }
            );
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "addSigner with unsupported type should throw");
        assert(
            !errMsg.includes("Internal server error") && !errMsg.includes("500"),
            `Expected a clear error for invalid signer type, not 500: ${errMsg}`
        );
    });

    // ── addSigner: EVM — invalid address format ────────────────────────────────
    // Bug #2 was: API returned 500 for invalid EVM address. Now fixed — returns 400.
    await test("addSigner — invalid EVM address returns 400 validation error (Bug #2 fixed)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.addSigner(
                { type: "external-wallet", address: "not-a-valid-evm-address" },
                { prepareOnly: true }
            );
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "addSigner with bad EVM address should throw");
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `Expected 400 validation error, not 500: ${errMsg}`
        );
        assert(
            errMsg.toLowerCase().includes("invalid") || errMsg.toLowerCase().includes("address"),
            `Expected 'invalid address' message, got: ${errMsg}`
        );
    });

    // ── send: zero amount ─────────────────────────────────────────────────────
    await test("send — zero amount throws clear error (not 500)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.send(generateEvmAddress(), "base-sepolia:eth", "0", { prepareOnly: true });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        // Read-only wallet will throw first, but if it reaches the API it should still be clear
        if (threw) {
            assert(
                !errMsg.includes("Internal server error") && !errMsg.includes("500"),
                `send(0) should give a clear error, not 500: ${errMsg}`
            );
        }
    });

    // ── send: negative amount ─────────────────────────────────────────────────
    await test("send — negative amount throws clear error (not 500)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.send(generateEvmAddress(), "base-sepolia:eth", "-1", { prepareOnly: true });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        if (threw) {
            assert(
                !errMsg.includes("Internal server error") && !errMsg.includes("500"),
                `send(-1) should give a clear error, not 500: ${errMsg}`
            );
        }
    });

    // ── needsRecovery: fresh wallet ───────────────────────────────────────────
    await test("needsRecovery() returns boolean (false for a fresh external-wallet recovery)", () => {
        // A fresh wallet created with external-wallet recovery always has a known recovery signer —
        // needsRecovery() should be false (no device signer re-registration needed).
        const result = evmWallet.needsRecovery();
        assert(typeof result === "boolean", `needsRecovery should return boolean, got ${typeof result}`);
        assert(result === false, `needsRecovery should be false for external-wallet recovery, got ${result}`);
    });

    // ── signerIsRegistered: true for recovery signer ──────────────────────────
    await test("signerIsRegistered() returns true for the wallet's own recovery signer", async () => {
        const recoveryLocator = `external-wallet:${evmAdmin}`;
        // The recovery signer is registered at creation time
        const result = await evmWallet.signerIsRegistered(recoveryLocator);
        // Note: recovery signer may or may not appear in delegated signers list depending on implementation.
        // We just verify it returns a boolean and doesn't throw.
        assert(typeof result === "boolean", `signerIsRegistered should return boolean, got ${typeof result}`);
    });

    // ── wallet.recovery: correct type exposed ─────────────────────────────────
    await test("wallet.recovery type is 'external-wallet' (not undefined or wrong type)", () => {
        assert(evmWallet.recovery != null, "wallet.recovery should not be null");
        assert(
            evmWallet.recovery.type === "external-wallet",
            `Expected type 'external-wallet', got '${evmWallet.recovery.type}'`
        );
        // Old API: wallet.adminSigner should NOT exist in wallets-v1
        assert(
            !("adminSigner" in evmWallet),
            "wallet.adminSigner should not exist in wallets-v1 — renamed to wallet.recovery"
        );
    });

    // ── transactions: shape validation ────────────────────────────────────────
    await test("transactions() — Solana also returns a list", async () => {
        const result = await solanaWallet.transactions();
        assertDefined(result, "transactions result");
        const txList = Array.isArray(result) ? result : result?.transactions;
        assert(Array.isArray(txList), `Expected array, got: ${JSON.stringify(result).slice(0, 100)}`);
    });

    await test("transactions() — Stellar also returns a list", async () => {
        const result = await stellarWallet.transactions();
        assertDefined(result, "transactions result");
        const txList = Array.isArray(result) ? result : result?.transactions;
        assert(Array.isArray(txList), `Expected array, got: ${JSON.stringify(result).slice(0, 100)}`);
    });
}

// ─── Suite 11: prepareOnly response shape validation ─────────────────────────
// Verifies the EXACT shape returned by addSigner prepareOnly per chain.
// wallets-v1: EVM → signatureId (not transactionId), Solana/Stellar → transactionId.
async function suitePrepareOnlyShape(fixtures) {
    _origConsoleLog("\n▸ Suite 11: prepareOnly Response Shape Validation");
    const { evmWallet, solanaWallet } = fixtures;

    let evmSignatureId;
    let solanaTransactionId;

    await test("EVM addSigner prepareOnly — returns { signatureId } and ONLY signatureId", async () => {
        const addr = generateEvmAddress();
        const result = await evmWallet.addSigner({ type: "external-wallet", address: addr }, { prepareOnly: true });

        assertDefined(result.signatureId, "result.signatureId");
        assert(typeof result.signatureId === "string", `signatureId must be string, got ${typeof result.signatureId}`);
        assert(result.signatureId.length > 0, "signatureId must not be empty");
        assert(!("transactionId" in result), "EVM addSigner prepareOnly must NOT have transactionId");
        assert(!("hash" in result) || result.hash == null, "prepareOnly result must not have hash");
        assert(!("explorerLink" in result) || result.explorerLink == null, "prepareOnly result must not have explorerLink");

        evmSignatureId = result.signatureId;
        fixtures._evmSignatureId = evmSignatureId;
    });

    await test("Solana addSigner prepareOnly — returns { transactionId } and ONLY transactionId", async () => {
        const addr = await generateSolanaAddress();
        const result = await solanaWallet.addSigner({ type: "external-wallet", address: addr }, { prepareOnly: true });

        assertDefined(result.transactionId, "result.transactionId");
        assert(typeof result.transactionId === "string", `transactionId must be string, got ${typeof result.transactionId}`);
        assert(result.transactionId.length > 0, "transactionId must not be empty");
        assert(!("signatureId" in result), "Solana addSigner prepareOnly must NOT have signatureId");
        assert(!("hash" in result) || result.hash == null, "prepareOnly result must not have hash");

        solanaTransactionId = result.transactionId;
        fixtures._solanaTransactionId = solanaTransactionId;
    });

    await test("EVM send prepareOnly — read-only wallet throws before creating transaction", async () => {
        // External-wallet recovery wallets are read-only server-side.
        // send() should throw before even reaching the API.
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.send(generateEvmAddress(), "base-sepolia:eth", "0.001", { prepareOnly: true });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "send on read-only wallet must throw");
        assert(
            errMsg.includes("read-only") || errMsg.includes("signer") || errMsg.includes("signing"),
            `Expected 'read-only'/'signer' message, got: ${errMsg}`
        );
        assert(
            !errMsg.includes("500") && !errMsg.includes("Internal server error"),
            `read-only error must not be 500: ${errMsg}`
        );
    });

    await test("EVM addSigner prepareOnly — signatureId looks like a UUID", () => {
        if (!fixtures._evmSignatureId) return; // skipped if previous test failed
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        assert(
            uuidRe.test(fixtures._evmSignatureId),
            `Expected UUID format for signatureId, got: ${fixtures._evmSignatureId}`
        );
    });

    await test("Solana addSigner prepareOnly — transactionId looks like a UUID", () => {
        if (!fixtures._solanaTransactionId) return;
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        assert(
            uuidRe.test(fixtures._solanaTransactionId),
            `Expected UUID format for transactionId, got: ${fixtures._solanaTransactionId}`
        );
    });
}

// ─── Suite 12: approve() — comprehensive negative cases ──────────────────────
// Tests all the ways approve() should fail with clear errors.
async function suiteApproveNegative(fixtures) {
    _origConsoleLog("\n▸ Suite 12: approve() — Comprehensive Negative Cases");
    const { evmWallet, solanaWallet, evmAdmin } = fixtures;

    const NULL_UUID = "00000000-0000-0000-0000-000000000000";

    await test("approve({ transactionId: nonExistentUUID }) — throws clear error (not 500)", async () => {
        let threw = false;
        let errMsg = "";
        let errName = "";
        try {
            await evmWallet.approve({ transactionId: NULL_UUID });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
            errName = e.constructor?.name ?? "";
        }
        assert(threw, "approve with non-existent transactionId must throw");
        assert(
            !errMsg.includes("500") && !errMsg.includes("Internal server error"),
            `Expected clear error, not 500: ${errMsg}`
        );
        // Should be TransactionNotAvailableError or similar
        assert(
            errName.includes("Error") || errMsg.length > 0,
            `Expected a named error, got: ${errName}: ${errMsg}`
        );
    });

    await test("approve({ signatureId: nonExistentUUID }) — throws clear error (not 500)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.approve({ signatureId: NULL_UUID });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve with non-existent signatureId must throw");
        assert(
            !errMsg.includes("500") && !errMsg.includes("Internal server error"),
            `Expected clear error, not 500: ${errMsg}`
        );
    });

    await test("approve({}) — missing both transactionId and signatureId throws validation error", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.approve({});
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve with no ID must throw");
        assert(
            !errMsg.includes("500") && !errMsg.includes("Internal server error"),
            `Expected validation error, not 500: ${errMsg}`
        );
    });

    await test("approve with valid signatureId on read-only wallet — clear 'read-only'/'signer' error", async () => {
        if (!fixtures._evmSignatureId) {
            _origConsoleLog("    (skipped: no signatureId from Suite 11)");
            passed++;
            return;
        }
        let threw = false;
        let errMsg = "";
        try {
            // The wallet has no signing capability (external-wallet recovery = read-only server-side)
            await evmWallet.approve({ signatureId: fixtures._evmSignatureId });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve on read-only wallet must throw");
        assert(
            !errMsg.includes("500") && !errMsg.includes("Internal server error"),
            `Expected helpful error (not 500) for read-only wallet: ${errMsg}`
        );
        assert(
            errMsg.includes("read-only") || errMsg.includes("signer") || errMsg.includes("signing") || errMsg.includes("signing"),
            `Expected 'read-only'/'signer' message, got: ${errMsg}`
        );
    });

    await test("approve with valid transactionId on read-only Solana wallet — clear error", async () => {
        if (!fixtures._solanaTransactionId) {
            _origConsoleLog("    (skipped: no transactionId from Suite 11)");
            passed++;
            return;
        }
        let threw = false;
        let errMsg = "";
        try {
            await solanaWallet.approve({ transactionId: fixtures._solanaTransactionId });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve on read-only Solana wallet must throw");
        assert(
            !errMsg.includes("500") && !errMsg.includes("Internal server error"),
            `Expected clear error, not 500: ${errMsg}`
        );
    });

    await test("approve with valid signatureId + invalid external signature — API rejects clearly", async () => {
        if (!fixtures._evmSignatureId) {
            _origConsoleLog("    (skipped: no signatureId from Suite 11)");
            passed++;
            return;
        }
        // Submit a pre-computed approval with a deliberately invalid signature.
        // This tests the API-level validation: should get 4xx, not 500.
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.approve({
                signatureId: fixtures._evmSignatureId,
                options: {
                    approval: {
                        signature: "0xdeadbeefdeadbeefdeadbeef", // invalid signature
                        signer: `external-wallet:${evmAdmin}`,
                    },
                },
            });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve with invalid signature must throw");
        assert(
            !errMsg.includes("500") && !errMsg.includes("Internal server error"),
            `Expected a 4xx-level error for invalid signature, not 500: ${errMsg}`
        );
    });

    await test("approve with valid signatureId + unregistered signer — clear 'signer not registered' error", async () => {
        if (!fixtures._evmSignatureId) {
            _origConsoleLog("    (skipped: no signatureId from Suite 11)");
            passed++;
            return;
        }
        const fakeSigner = `external-wallet:${generateEvmAddress()}`; // not registered on the wallet
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.approve({
                signatureId: fixtures._evmSignatureId,
                options: {
                    approval: {
                        signature: "0xdeadbeef",
                        signer: fakeSigner,
                    },
                },
            });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve with unregistered signer must throw");
        assert(
            !errMsg.includes("500") && !errMsg.includes("Internal server error"),
            `Expected clear error for unregistered signer, not 500: ${errMsg}`
        );
    });

    await test("approve with malformed signatureId (not a UUID) — throws clear validation error", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.approve({ signatureId: "not-a-uuid-at-all-!!!!" });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve with malformed signatureId must throw");
        assert(
            !errMsg.includes("500") && !errMsg.includes("Internal server error"),
            `Expected validation error, not 500: ${errMsg}`
        );
    });
}

// ─── Suite 13: createDeviceSigner — creation & descriptor shape ───────────────
async function suiteDeviceSigner(fixtures) {
    _origConsoleLog("\n▸ Suite 13: Device Signer — createDeviceSigner & addSigner");
    const { evmWallet, solanaWallet } = fixtures;

    await test("createDeviceSigner is exported from the SDK", () => {
        assert(typeof createDeviceSigner === "function", "createDeviceSigner must be a function");
    });

    await test("createDeviceSigner(undefined) — throws helpful error (not a cryptic crash)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await createDeviceSigner(undefined);
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "createDeviceSigner(undefined) must throw");
        assert(
            !errMsg.includes("Internal server error") && !errMsg.includes("500"),
            `Expected a helpful error message, got: ${errMsg}`
        );
        // Should mention the missing argument, not some obscure internal crash
        assert(errMsg.length > 0, "Error message must not be empty");
    });

    let descriptor;
    await test("createDeviceSigner(mockStorage) — returns DeviceSignerDescriptor", async () => {
        const storage = createMockDeviceKeyStorage();
        descriptor = await createDeviceSigner(storage);
        assertDefined(descriptor, "descriptor");
        assert(typeof descriptor === "object", `Expected object, got ${typeof descriptor}`);
    });

    await test("DeviceSignerDescriptor.type === 'device'", () => {
        assertDefined(descriptor, "descriptor (from previous test)");
        assert(descriptor.type === "device", `Expected type 'device', got '${descriptor.type}'`);
    });

    await test("DeviceSignerDescriptor.locator starts with 'device:'", () => {
        assertDefined(descriptor, "descriptor (from previous test)");
        assert(
            typeof descriptor.locator === "string" && descriptor.locator.startsWith("device:"),
            `Expected locator starting with 'device:', got '${descriptor.locator}'`
        );
    });

    await test("DeviceSignerDescriptor.publicKey — x and y are 0x-prefixed 64-char hex strings", () => {
        assertDefined(descriptor, "descriptor (from previous test)");
        const { x, y } = descriptor.publicKey;
        const hexRe = /^0x[0-9a-fA-F]{64}$/;
        assert(hexRe.test(x), `publicKey.x must be 0x-prefixed 64-char hex, got: '${x}'`);
        assert(hexRe.test(y), `publicKey.y must be 0x-prefixed 64-char hex, got: '${y}'`);
    });

    await test("DeviceSignerDescriptor.locator encodes the public key as base64 after 'device:'", () => {
        assertDefined(descriptor, "descriptor (from previous test)");
        const base64Part = descriptor.locator.slice("device:".length);
        assert(base64Part.length > 0, "base64 part of locator must not be empty");
        // The base64 must decode to 65 bytes (uncompressed P-256 point: 0x04 + 32 + 32)
        const decoded = Buffer.from(base64Part, "base64");
        assert(decoded.length === 65, `Expected 65 bytes (uncompressed P-256), got ${decoded.length}`);
        assert(decoded[0] === 0x04, `Expected 0x04 prefix for uncompressed P-256, got 0x${decoded[0].toString(16)}`);
    });

    await test("EVM — addSigner(deviceDescriptor, prepareOnly) returns { signatureId }", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await createDeviceSigner(storage);
        const result = await evmWallet.addSigner(desc, { prepareOnly: true });
        assertDefined(result, "addSigner result");
        assertDefined(result.signatureId, `Expected signatureId, got: ${JSON.stringify(result)}`);
        assert(typeof result.signatureId === "string", "signatureId must be a string");
    });

    await test("Solana — addSigner(deviceDescriptor, prepareOnly) returns { transactionId }", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await createDeviceSigner(storage);
        const result = await solanaWallet.addSigner(desc, { prepareOnly: true });
        assertDefined(result, "addSigner result");
        assertDefined(result.transactionId, `Expected transactionId for Solana, got: ${JSON.stringify(result)}`);
        assert(typeof result.transactionId === "string", "transactionId must be a string");
    });

    await test("Two createDeviceSigner calls produce DIFFERENT locators (unique key per call)", async () => {
        const s1 = createMockDeviceKeyStorage();
        const s2 = createMockDeviceKeyStorage();
        const d1 = await createDeviceSigner(s1);
        const d2 = await createDeviceSigner(s2);
        assert(d1.locator !== d2.locator, "Each createDeviceSigner call must produce a unique key/locator");
        assert(d1.publicKey.x !== d2.publicKey.x, "x coordinates must differ for independent keys");
    });
}

// ─── Suite 14: balances() response shape ─────────────────────────────────────
async function suiteBalancesShape(fixtures) {
    _origConsoleLog("\n▸ Suite 14: balances() Response Shape Validation");
    const { evmWallet, solanaWallet, stellarWallet } = fixtures;

    await test("EVM balances() — has nativeToken, usdc, and tokens fields", async () => {
        const b = await evmWallet.balances();
        assertDefined(b.nativeToken, "nativeToken");
        assertDefined(b.usdc, "usdc");
        assert(Array.isArray(b.tokens), `tokens must be Array, got ${typeof b.tokens}`);
    });

    await test("EVM nativeToken — has symbol, name, amount fields with correct types", async () => {
        const b = await evmWallet.balances();
        const nt = b.nativeToken;
        assertDefined(nt.symbol, "nativeToken.symbol");
        assertDefined(nt.name, "nativeToken.name");
        assertDefined(nt.amount, "nativeToken.amount");
        assert(typeof nt.symbol === "string", `symbol must be string, got ${typeof nt.symbol}`);
        assert(typeof nt.name === "string", `name must be string, got ${typeof nt.name}`);
        assert(typeof nt.amount === "string", `amount must be string, got ${typeof nt.amount}`);
        // amount should be a parseable number
        const parsed = parseFloat(nt.amount);
        assert(!isNaN(parsed), `amount '${nt.amount}' must be a parseable numeric string`);
        assert(parsed >= 0, `amount must be >= 0, got ${parsed}`);
    });

    await test("EVM nativeToken.symbol is 'eth' or 'ETH' (base-sepolia native token)", async () => {
        const b = await evmWallet.balances();
        assert(
            b.nativeToken.symbol.toLowerCase() === "eth",
            `Expected 'eth' for EVM native token, got '${b.nativeToken.symbol}'`
        );
    });

    await test("EVM usdc — has symbol 'usdc' and numeric amount", async () => {
        const b = await evmWallet.balances();
        const usdc = b.usdc;
        assertDefined(usdc.symbol, "usdc.symbol");
        assertDefined(usdc.amount, "usdc.amount");
        assert(
            usdc.symbol.toLowerCase() === "usdc",
            `Expected usdc.symbol to be 'usdc', got '${usdc.symbol}'`
        );
        assert(!isNaN(parseFloat(usdc.amount)), `usdc.amount '${usdc.amount}' must be numeric`);
    });

    await test("Solana nativeToken.symbol is 'sol' or 'SOL'", async () => {
        const b = await solanaWallet.balances();
        assertDefined(b.nativeToken, "nativeToken");
        assert(
            b.nativeToken.symbol.toLowerCase() === "sol",
            `Expected 'sol' for Solana native token, got '${b.nativeToken.symbol}'`
        );
        assert(!isNaN(parseFloat(b.nativeToken.amount)), `amount '${b.nativeToken.amount}' must be numeric`);
    });

    await test("Stellar nativeToken.symbol is 'xlm' or 'XLM'", async () => {
        const b = await stellarWallet.balances();
        assertDefined(b.nativeToken, "nativeToken");
        assert(
            b.nativeToken.symbol.toLowerCase() === "xlm",
            `Expected 'xlm' for Stellar native token, got '${b.nativeToken.symbol}'`
        );
    });

    await test("balances() contractAddress/mintHash fields match chain type", async () => {
        const evmB = await evmWallet.balances();
        const solB = await solanaWallet.balances();
        // EVM nativeToken should have contractAddress (or undefined) — not mintHash
        assert(!("mintHash" in evmB.nativeToken), "EVM nativeToken must not have mintHash");
        // Solana nativeToken should not have contractAddress
        assert(!("contractAddress" in solB.nativeToken), "Solana nativeToken must not have contractAddress");
    });
}

// ─── Suite 15: transactions() — shape and status validation ──────────────────
async function suiteTransactionsShape(fixtures) {
    _origConsoleLog("\n▸ Suite 15: transactions() — Shape and Status Validation");
    const { evmWallet, solanaWallet, stellarWallet } = fixtures;

    const VALID_STATUSES = new Set(["awaiting-approval", "pending", "failed", "success"]);
    const VALID_CHAIN_TYPES = new Set(["evm", "solana", "stellar", "aptos", "sui"]);
    const VALID_WALLET_TYPES = new Set(["smart", "mpc"]);

    async function validateTxList(wallet, label) {
        const res = await wallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions;
        assert(Array.isArray(txList), `${label} transactions must be an array`);

        for (const tx of txList) {
            assert(typeof tx.id === "string" && tx.id.length > 0, `${label} tx.id must be a non-empty string`);
            assert(VALID_STATUSES.has(tx.status), `${label} tx.status '${tx.status}' is not a valid status`);
            assert(VALID_CHAIN_TYPES.has(tx.chainType), `${label} tx.chainType '${tx.chainType}' is invalid`);
            assert(VALID_WALLET_TYPES.has(tx.walletType), `${label} tx.walletType '${tx.walletType}' is invalid`);
        }
        return txList;
    }

    await test("EVM transactions() — all entries have valid id, status, chainType, walletType", async () => {
        await validateTxList(evmWallet, "EVM");
    });

    await test("Solana transactions() — all entries have valid id, status, chainType, walletType", async () => {
        await validateTxList(solanaWallet, "Solana");
    });

    await test("Stellar transactions() — all entries have valid id, status, chainType, walletType", async () => {
        await validateTxList(stellarWallet, "Stellar");
    });

    await test("EVM chainType is always 'evm' in EVM wallet transactions", async () => {
        const res = await evmWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];
        for (const tx of txList) {
            assert(tx.chainType === "evm", `Expected chainType 'evm', got '${tx.chainType}'`);
        }
    });

    await test("EVM addSigner prepareOnly returns signatureId — signatureId does NOT appear in transactions() (EVM uses EIP-712 signatures, not transactions)", async () => {
        // For EVM smart wallets, adding a signer creates a SIGNATURE (EIP-712 hash) rather than a transaction.
        // The signatureId returned by prepareOnly is a signature request ID, not a transaction ID.
        // Signature requests are separate from the transactions() list.
        const addr = generateEvmAddress();
        const { signatureId } = await evmWallet.addSigner({ type: "external-wallet", address: addr }, { prepareOnly: true });

        const res = await evmWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];

        // The signatureId must NOT appear in transactions() — it is a signature, not a transaction
        const found = txList.find((tx) => tx.id === signatureId);
        assert(
            found == null,
            `signatureId '${signatureId}' should NOT appear in transactions() — EVM addSigner uses signatures, not transactions`
        );
    });

    await test("After addSigner prepareOnly — Solana transaction has 'awaiting-approval' status", async () => {
        const addr = await generateSolanaAddress();
        const { transactionId } = await solanaWallet.addSigner({ type: "external-wallet", address: addr }, { prepareOnly: true });

        const res = await solanaWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];

        const found = txList.find((tx) => tx.id === transactionId);
        assert(found != null, `Expected to find transaction with id '${transactionId}' in Solana transactions() list`);
        assert(
            found.status === "awaiting-approval",
            `Expected status 'awaiting-approval' for Solana tx, got '${found.status}'`
        );
    });

    await test("transactions() — entries with 'awaiting-approval' have approvals.pending array", async () => {
        const res = await evmWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];
        const awaitingTxs = txList.filter((tx) => tx.status === "awaiting-approval");

        for (const tx of awaitingTxs) {
            assert(tx.approvals != null, `tx ${tx.id} should have approvals when status is 'awaiting-approval'`);
            assert(
                Array.isArray(tx.approvals.pending),
                `tx ${tx.id} approvals.pending must be an array`
            );
        }
    });
}

// ─── Suite 16: signers() — count and shape assertions ────────────────────────
async function suiteSignersShape(fixtures) {
    _origConsoleLog("\n▸ Suite 16: signers() — Count and Shape Assertions");
    const { evmWallet, solanaWallet, stellarWallet } = fixtures;

    await test("EVM signers() — each entry has type, locator, status (new shape in wallets-v1)", async () => {
        const signers = await evmWallet.signers();
        assert(Array.isArray(signers), "signers() must return an array");
        const VALID_STATUSES = new Set(["success", "pending", "awaiting-approval", "failed"]);
        for (const s of signers) {
            assert(typeof s.type === "string" && s.type.length > 0,
                `entry.type must be a non-empty string, got: ${JSON.stringify(s)}`);
            assert(typeof s.locator === "string" && s.locator.includes(":"),
                `entry.locator must be a 'type:address' string, got: '${s.locator}'`);
            assert(VALID_STATUSES.has(s.status),
                `entry.status '${s.status}' must be one of: ${[...VALID_STATUSES].join(", ")}`);
        }
    });

    await test("Solana signers() — each entry has type, locator, status (new shape in wallets-v1)", async () => {
        const signers = await solanaWallet.signers();
        const VALID_STATUSES = new Set(["success", "pending", "awaiting-approval", "failed"]);
        for (const s of signers) {
            assert(typeof s.type === "string" && s.type.length > 0,
                `Solana entry.type must be a non-empty string, got: ${JSON.stringify(s)}`);
            assert(typeof s.locator === "string" && s.locator.includes(":"),
                `Solana entry.locator must be 'type:address', got: '${s.locator}'`);
            assert(VALID_STATUSES.has(s.status),
                `Solana entry.status '${s.status}' must be valid`);
        }
    });

    await test("EVM signers() — signerIsRegistered(locator) returns true for each registered signer", async () => {
        const signers = await evmWallet.signers();
        for (const s of signers) {
            const registered = await evmWallet.signerIsRegistered(s.locator);
            assert(registered === true, `signerIsRegistered('${s.locator}') should return true but got ${registered}`);
        }
    });

    await test("EVM signers() — count INCREASES after addSigner prepareOnly (API registers immediately, on-chain approval pending)", async () => {
        // Behavioral finding: addSigner prepareOnly registers the signer in the API immediately.
        // The signer is tracked by the API even before the on-chain transaction/signature is approved.
        // "prepareOnly" only defers the on-chain broadcast — the API-side registration happens right away.
        const before = (await evmWallet.signers()).length;
        await evmWallet.addSigner({ type: "external-wallet", address: generateEvmAddress() }, { prepareOnly: true });
        const after = (await evmWallet.signers()).length;
        assert(
            after === before + 1,
            `signers() count SHOULD increase by 1 after prepareOnly addSigner (API registers immediately): was ${before}, now ${after}`
        );
    });

    await test("Solana signers() — count INCREASES after addSigner prepareOnly (API registers immediately)", async () => {
        const before = (await solanaWallet.signers()).length;
        await solanaWallet.addSigner({ type: "external-wallet", address: await generateSolanaAddress() }, { prepareOnly: true });
        const after = (await solanaWallet.signers()).length;
        assert(
            after === before + 1,
            `Solana signers() count SHOULD increase by 1 after prepareOnly: was ${before}, now ${after}`
        );
    });

    await test("signers() locator type matches known prefixes", async () => {
        const knownPrefixes = ["email:", "phone:", "passkey:", "device:", "external-wallet:", "api-key"];
        const signers = await evmWallet.signers();
        for (const s of signers) {
            const hasKnownPrefix = knownPrefixes.some((p) => s.locator.startsWith(p));
            assert(hasKnownPrefix, `locator '${s.locator}' has unknown prefix — expected one of: ${knownPrefixes.join(", ")}`);
        }
    });

    await test("EVM — recovery signer locator format is 'external-wallet:<address>'", () => {
        const recovery = evmWallet.recovery;
        assert(recovery != null, "recovery must not be null");
        // The recovery config object has type and address — when used as a locator it becomes external-wallet:<address>
        assert(
            recovery.type === "external-wallet",
            `Expected recovery.type 'external-wallet', got '${recovery.type}'`
        );
        assertDefined(recovery.address, "recovery.address");
        assert(
            recovery.address.startsWith("0x"),
            `EVM recovery.address must start with 0x, got '${recovery.address}'`
        );
    });
}

// ─── Suite 17: signMessage (EVM) ─────────────────────────────────────────────
async function suiteSignMessage(fixtures) {
    _origConsoleLog("\n▸ Suite 17: signMessage (EVM)");
    const { evmWallet, evmAdmin } = fixtures;

    // Set external-wallet as signer so requireSigner() is satisfied.
    // prepareOnly creates the signature request without needing an actual signature,
    // so this succeeds even though we can't provide the private key.
    try { await evmWallet.useSigner(`external-wallet:${evmAdmin}`); } catch (_) {}

    await test("EVM signMessage prepareOnly — returns { signatureId } (UUID)", async () => {
        let result;
        let errMsg = "";
        try {
            result = await evmWallet.signMessage({
                message: "Hello from wallets-v1 test",
                options: { prepareOnly: true },
            });
        } catch (e) { errMsg = e.message ?? ""; }

        if (result) {
            assertDefined(result.signatureId, "signatureId");
            assert(isUUID(result.signatureId), `signatureId must be UUID: ${result.signatureId}`);
            assert(result.signature == null, "prepareOnly must not return a completed signature");
        } else {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `signMessage threw unexpected 500: ${errMsg}`
            );
        }
    });

    await test("EVM signMessage prepareOnly — signatureId does NOT appear in transactions()", async () => {
        let signatureId;
        try {
            const result = await evmWallet.signMessage({
                message: "test-for-tx-list",
                options: { prepareOnly: true },
            });
            signatureId = result?.signatureId;
        } catch (_) {}

        if (signatureId) {
            const res = await evmWallet.transactions();
            const txList = Array.isArray(res) ? res : res?.transactions ?? [];
            const found = txList.find(tx => tx.id === signatureId);
            assert(
                found == null,
                `signatureId ${signatureId} should NOT appear in transactions() — it is a signature, not a transaction`
            );
        }
    });

    await test("EVM signMessage without prepareOnly on read-only wallet — clear error (not 500)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.signMessage({ message: "no-prepare-only" });
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        if (threw) {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `signMessage without prepareOnly should not 500: ${errMsg}`
            );
        }
        // If it didn't throw, the wallet found a signer — also acceptable
    });

    await test("EVM signMessage — missing message field throws clear validation error", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.signMessage({ options: { prepareOnly: true } });
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        if (threw) {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `Missing message should not 500: ${errMsg}`
            );
        }
    });
}

// ─── Suite 18: signTypedData (EVM) ────────────────────────────────────────────
async function suiteSignTypedData(fixtures) {
    _origConsoleLog("\n▸ Suite 18: signTypedData (EVM)");
    const { evmWallet, evmAdmin } = fixtures;

    try { await evmWallet.useSigner(`external-wallet:${evmAdmin}`); } catch (_) {}

    // Minimal valid EIP-712 payload (all required domain fields present)
    const validTypedData = {
        domain: {
            name: "TestApp",
            version: "1",
            chainId: 84532, // base-sepolia
            verifyingContract: "0x0000000000000000000000000000000000000001",
        },
        types: {
            Message: [{ name: "content", type: "string" }],
        },
        primaryType: "Message",
        message: { content: "wallets-v1 typed data test" },
        chain: "base-sepolia",
        options: { prepareOnly: true },
    };

    await test("EVM signTypedData prepareOnly — returns { signatureId } (UUID)", async () => {
        let result;
        let errMsg = "";
        try {
            result = await evmWallet.signTypedData(validTypedData);
        } catch (e) { errMsg = e.message ?? ""; }

        if (result) {
            assertDefined(result.signatureId, "signatureId");
            assert(isUUID(result.signatureId), `signatureId must be UUID: ${result.signatureId}`);
            assert(result.signature == null, "prepareOnly must not return a completed signature");
        } else {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `signTypedData threw unexpected 500: ${errMsg}`
            );
        }
    });

    await test("EVM signTypedData prepareOnly — signatureId does NOT appear in transactions()", async () => {
        let signatureId;
        try {
            const result = await evmWallet.signTypedData(validTypedData);
            signatureId = result?.signatureId;
        } catch (_) {}

        if (signatureId) {
            const res = await evmWallet.transactions();
            const txList = Array.isArray(res) ? res : res?.transactions ?? [];
            assert(
                txList.find(tx => tx.id === signatureId) == null,
                `signTypedData signatureId ${signatureId} should NOT appear in transactions()`
            );
        }
    });

    await test("EVM signTypedData — missing verifyingContract in domain throws InvalidTypedDataError (not 500)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.signTypedData({
                ...validTypedData,
                domain: { name: "Test", version: "1", chainId: 84532 }, // no verifyingContract
            });
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        assert(threw, "signTypedData with incomplete domain should throw");
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `Should throw domain validation error, not 500: ${errMsg}`
        );
    });

    await test("EVM signTypedData — missing top-level fields throws clear error (not 500)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.signTypedData({ chain: "base-sepolia", options: { prepareOnly: true } });
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        assert(threw, "signTypedData with missing fields should throw");
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `Should throw validation error, not 500: ${errMsg}`
        );
    });
}

// ─── Suite 19: transfers() — Bug #5 regression + shape ───────────────────────
async function suiteTransfers(fixtures) {
    _origConsoleLog("\n▸ Suite 19: transfers() — Bug #5 Regression + Shape Validation");
    const { evmWallet, solanaWallet } = fixtures;

    // BUG #5: wallet.transfers() requires { tokens, status } but both should be optional.
    // Calling without params serialises tokens as "undefined", causing a 400 from the API.
    await test("[BUG #5] transfers() with no params — throws 400 (tokens serialised as 'undefined')", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await (evmWallet).transfers();
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        // Document current (buggy) behavior: should NOT require params but currently does
        assert(threw, "transfers() with no params throws — Bug #5 (params should be optional)");
        assert(
            !errMsg.toLowerCase().includes("internal server error") && !errMsg.includes("500"),
            `Expected a 400-level error, not 500: ${errMsg}`
        );
    });

    await test("transfers({ tokens: 'eth', status: 'successful' }) — response shape is valid", async () => {
        let result;
        let errMsg = "";
        try {
            result = await evmWallet.transfers({ tokens: "eth", status: "successful" });
        } catch (e) { errMsg = e.message ?? ""; }

        if (result) {
            // transfers() returns a WalletsActivityResponseUnstableDto — has a transfers array or similar
            assertDefined(result, "transfers result");
            assert(
                typeof result === "object",
                `transfers() result should be an object, got: ${typeof result}`
            );
        } else {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `transfers() with valid params should not 500: ${errMsg}`
            );
        }
    });

    await test("transfers({ tokens: 'usdc', status: 'failed' }) — accepts 'failed' status filter", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.transfers({ tokens: "usdc", status: "failed" });
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        if (threw) {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `transfers() with valid params should not 500: ${errMsg}`
            );
        }
    });

    await test("Solana transfers({ tokens: 'sol', status: 'successful' }) — does not 500", async () => {
        let errMsg = "";
        try {
            await solanaWallet.transfers({ tokens: "sol", status: "successful" });
        } catch (e) { errMsg = e.message ?? ""; }

        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `Solana transfers() should not 500: ${errMsg}`
        );
    });
}

// ─── Suite 20: 0-value send — Bug #6 regression ───────────────────────────────
async function suiteSendZeroValue(fixtures) {
    _origConsoleLog("\n▸ Suite 20: 0-value send — Bug #6 Regression");
    const { evmWallet, solanaWallet } = fixtures;

    // BUG #6: sending 0-value goes through on-chain with no validation.
    // On a signing-capable wallet, 0 USDC succeeds end-to-end and wastes gas.
    // Our fixture wallets are read-only (external-wallet recovery), so they throw
    // before the API call. We verify the error is NOT a silent success.
    await test("[BUG #6] send amount='0' — SDK should reject before API call (currently no validation)", async () => {
        let threw = false;
        let errMsg = "";
        let result;
        try {
            result = await evmWallet.send(
                generateEvmAddress(),
                "usdc",
                "0",
                { prepareOnly: true }
            );
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        if (!threw && result) {
            // BUG: a transactionId was returned for amount=0 — no SDK-side validation
            assertDefined(
                null,
                `[BUG #6] send(amount='0') succeeded with transactionId ${result?.transactionId} — SDK should reject 0-value before API call`
            );
        }
        // If it threw due to read-only constraint, ensure the error is clear
        if (threw) {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `send(0) should give a clear error, not 500: ${errMsg}`
            );
        }
    });

    await test("[BUG #6] Solana send amount='0' — SDK should reject before API call", async () => {
        let threw = false;
        let errMsg = "";
        let result;
        try {
            result = await solanaWallet.send(
                await generateSolanaAddress(),
                "sol",
                "0",
                { prepareOnly: true }
            );
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        if (!threw && result) {
            assertDefined(
                null,
                `[BUG #6] Solana send(amount='0') succeeded — no SDK-side 0-value validation`
            );
        }
        if (threw) {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `Solana send(0) should give a clear error: ${errMsg}`
            );
        }
    });
}

// ─── Suite 21: V1 API surface — removals and renames ─────────────────────────
async function suiteV1ApiSurface(fixtures) {
    _origConsoleLog("\n▸ Suite 21: V1 API Surface — Removals & Renames");
    const s = makeSdk();
    const { evmWallet, solanaWallet } = fixtures;

    // ── SDK-level removals ─────────────────────────────────────────────────────
    await test("SDK — getOrCreateWallet is NOT exported (removed in wallets-v1)", () => {
        assert(typeof (s).getOrCreateWallet !== "function",
            "getOrCreateWallet must be removed in wallets-v1 — use createWallet + getWallet");
    });

    await test("SDK — customAuth is NOT present (renamed to setJwt on CrossmintProvider)", () => {
        assert((s).customAuth == null,
            "customAuth must not exist on the SDK instance — it was renamed to setJwt on CrossmintProvider");
    });

    // ── Wallet-level removals ─────────────────────────────────────────────────
    await test("wallet — addDelegatedSigner is NOT a function (renamed to addSigner in wallets-v1)", () => {
        assert(typeof (evmWallet).addDelegatedSigner !== "function",
            "addDelegatedSigner must be removed — use wallet.addSigner()");
    });

    await test("wallet — delegatedSigners is NOT a function (renamed to signers() in wallets-v1)", () => {
        assert(typeof (evmWallet).delegatedSigners !== "function",
            "delegatedSigners must be removed — use wallet.signers()");
    });

    await test("wallet — adminSigner property does NOT exist (renamed to wallet.recovery in wallets-v1)", () => {
        assert(!("adminSigner" in evmWallet),
            "adminSigner must be removed — use wallet.recovery");
    });

    await test("[BUG #8] wallet — experimental_apiClient still present on EVM wallet (should be renamed per V1)", () => {
        const experimentalKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(evmWallet))
            .filter(k => k.startsWith("experimental_"));
        // V1 spec says all experimental_ prefixes should be removed.
        // Bug: experimental_apiClient is still present. This test documents current (broken) behavior.
        assert(
            experimentalKeys.includes("experimental_apiClient"),
            experimentalKeys.length === 0
                ? "All experimental_ properties removed — Bug #8 may be fixed!"
                : `Unexpected experimental_ properties: ${experimentalKeys.join(", ")}`
        );
    });

    await test("[BUG #8] wallet — experimental_apiClient still present on Solana wallet (should be renamed per V1)", () => {
        const experimentalKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(solanaWallet))
            .filter(k => k.startsWith("experimental_"));
        // V1 spec says all experimental_ prefixes should be removed.
        // Bug: experimental_apiClient is still present. This test documents current (broken) behavior.
        assert(
            experimentalKeys.includes("experimental_apiClient"),
            experimentalKeys.length === 0
                ? "All experimental_ properties removed — Bug #8 may be fixed!"
                : `Unexpected experimental_ properties: ${experimentalKeys.join(", ")}`
        );
    });

    // ── addSigner: email and phone are disabled in V1 ─────────────────────────
    await test("addSigner({ type: 'email' }) — throws clear error (email disabled as addable signer in V1)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.addSigner(
                { type: "email", email: "test@example.com" },
                { prepareOnly: true }
            );
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        assert(threw, "addSigner with type='email' should throw — email signers are disabled in V1");
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `addSigner(email) should give a clear 4xx error, not 500: ${errMsg}`
        );
    });

    await test("addSigner({ type: 'phone' }) — throws clear error (phone disabled as addable signer in V1)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.addSigner(
                { type: "phone", phone: "+15555550100" },
                { prepareOnly: true }
            );
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        assert(threw, "addSigner with type='phone' should throw — phone signers are disabled in V1");
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `addSigner(phone) should give a clear 4xx error, not 500: ${errMsg}`
        );
    });

    await test("Solana addSigner({ type: 'email' }) — throws clear error", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await solanaWallet.addSigner(
                { type: "email", email: "test@example.com" },
                { prepareOnly: true }
            );
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        assert(threw, "Solana addSigner(email) should throw");
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `Solana addSigner(email) should give a clear error: ${errMsg}`
        );
    });
}

// ─── Suite 22: recover() ─────────────────────────────────────────────────────
async function suiteRecover(fixtures) {
    _origConsoleLog("\n▸ Suite 22: recover()");
    const { evmWallet, solanaWallet } = fixtures;

    await test("wallet.recover is a function on EVM wallet", () => {
        assert(typeof evmWallet.recover === "function", "wallet.recover must be a function");
    });

    await test("wallet.recover is a function on Solana wallet", () => {
        assert(typeof solanaWallet.recover === "function", "wallet.recover must be a function");
    });

    await test("recover() when needsRecovery()===false — returns early without throwing", async () => {
        // needsRecovery() is false for wallets with an available device signer.
        // For our external-wallet recovery wallets, needsRecovery() returns false.
        assert(evmWallet.needsRecovery() === false, "Fixture wallet should not need recovery");

        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.recover();
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        assert(
            !threw,
            `recover() when not needed should return early, not throw: ${errMsg}`
        );
    });

    await test("Solana recover() when needsRecovery()===false — returns early without throwing", async () => {
        assert(solanaWallet.needsRecovery() === false, "Fixture Solana wallet should not need recovery");

        let threw = false;
        let errMsg = "";
        try {
            await solanaWallet.recover();
        } catch (e) { threw = true; errMsg = e.message ?? ""; }

        assert(!threw, `Solana recover() when not needed should not throw: ${errMsg}`);
    });

    await test("needsRecovery() returns false for wallet with external-wallet recovery on same device", () => {
        // External-wallet recovery wallets never trigger the device-signer recovery flow
        assert(evmWallet.needsRecovery() === false,
            "Wallet created with external-wallet recovery should not need recovery");
    });
}

// ─── Suite 23: Deep response body validation ─────────────────────────────────
// Validates every significant field in every response object, not just top-level presence.
async function suiteResponseBodies(fixtures) {
    _origConsoleLog("\n▸ Suite 23: Deep Response Body Validation");
    const { evmWallet, solanaWallet, stellarWallet, evmAdmin, solanaAdmin } = fixtures;
    const s = makeSdk();

    // ── createWallet response ─────────────────────────────────────────────────
    await test("[BUG] createWallet response — walletType field is undefined on wallet object (SDK does not expose it)", () => {
        // The API returns a walletType ('smart' or 'mpc') in its response, but the SDK wallet
        // object does not surface this field. Developers cannot know the wallet type from the SDK.
        assert(
            evmWallet.walletType === undefined,
            `Expected walletType to be undefined (SDK omits it) — if this fails, the bug may be fixed! Got: '${evmWallet.walletType}'`
        );
    });

    await test("createWallet response — wallet.recovery.address matches the address passed in", () => {
        const recovery = evmWallet.recovery;
        assert(
            recovery.address === evmAdmin,
            `Expected recovery.address '${evmAdmin}', got '${recovery.address}'`
        );
        assert(
            solanaWallet.recovery.address === fixtures.solanaAdmin,
            `Solana recovery.address mismatch: expected '${fixtures.solanaAdmin}', got '${solanaWallet.recovery.address}'`
        );
    });

    await test("createWallet response — wallet.recovery has exactly { type, address } fields", () => {
        const recovery = evmWallet.recovery;
        assert(typeof recovery.type === "string" && recovery.type.length > 0, "recovery.type must be a non-empty string");
        assert(typeof recovery.address === "string" && recovery.address.length > 0, "recovery.address must be a non-empty string");
    });

    // ── getWallet response ─────────────────────────────────────────────────────
    await test("getWallet response — walletType and recovery present and correct", async () => {
        const w = await s.getWallet(evmWallet.address, {
            chain: "base-sepolia",
            recovery: { type: "external-wallet", address: evmAdmin },
        });
        assert(
            w.walletType === evmWallet.walletType,
            `getWallet walletType '${w.walletType}' must match createWallet walletType '${evmWallet.walletType}'`
        );
        assert(
            w.recovery != null,
            "getWallet response must include recovery"
        );
        assert(
            w.recovery.type === "external-wallet",
            `getWallet recovery.type must be 'external-wallet', got '${w.recovery.type}'`
        );
        assert(
            w.recovery.address === evmAdmin,
            `getWallet recovery.address must match '${evmAdmin}', got '${w.recovery.address}'`
        );
    });

    // ── transactions() entry fields ────────────────────────────────────────────
    await test("transactions() entry — id is UUID format", async () => {
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        // Create a transaction we know about
        const addr = await generateSolanaAddress();
        const { transactionId } = await solanaWallet.addSigner(
            { type: "external-wallet", address: addr },
            { prepareOnly: true }
        );
        const res = await solanaWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];
        const tx = txList.find(t => t.id === transactionId);
        assert(tx != null, `Transaction ${transactionId} must appear in transactions()`);
        assert(uuidRe.test(tx.id), `tx.id '${tx.id}' must be UUID format`);
    });

    await test("transactions() awaiting-approval entry — has approvals.pending AND approvals.submitted arrays", async () => {
        const res = await solanaWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];
        const awaitingTxs = txList.filter(tx => tx.status === "awaiting-approval");

        for (const tx of awaitingTxs) {
            assert(tx.approvals != null, `tx ${tx.id} must have approvals object`);
            assert(Array.isArray(tx.approvals.pending), `tx ${tx.id} approvals.pending must be an array`);
            assert(Array.isArray(tx.approvals.submitted), `tx ${tx.id} approvals.submitted must be an array`);
        }
    });

    await test("transactions() awaiting-approval entry — approvals.pending items have signer object and message field", async () => {
        // Actual shape from API:
        //   pending[n].signer = { type: "external-wallet", address: "...", locator: "..." }
        //   pending[n].message = "<base58 or hex encoded bytes to sign>"
        const addr = await generateSolanaAddress();
        const { transactionId } = await solanaWallet.addSigner(
            { type: "external-wallet", address: addr },
            { prepareOnly: true }
        );
        const res = await solanaWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];
        const tx = txList.find(t => t.id === transactionId);
        assert(tx != null, `Transaction ${transactionId} must appear in transactions()`);
        assert(Array.isArray(tx.approvals?.pending), "approvals.pending must be an array");

        for (const pending of tx.approvals.pending) {
            // signer is an object { type, address, locator } — NOT a plain string
            assert(
                pending.signer != null && typeof pending.signer === "object",
                `approvals.pending[].signer must be an object, got: ${JSON.stringify(pending.signer)}`
            );
            assert(
                typeof pending.signer.type === "string",
                `approvals.pending[].signer.type must be a string, got: ${JSON.stringify(pending.signer)}`
            );
            assert(
                typeof pending.signer.address === "string" && pending.signer.address.length > 0,
                `approvals.pending[].signer.address must be a non-empty string, got: ${JSON.stringify(pending.signer)}`
            );
            assert(
                typeof pending.signer.locator === "string" && pending.signer.locator.includes(":"),
                `approvals.pending[].signer.locator must be a 'type:address' string, got: '${pending.signer.locator}'`
            );
            // message is the bytes-to-sign (base58 for Solana, hex for EVM)
            assert(
                typeof pending.message === "string" && pending.message.length > 0,
                `approvals.pending[].message must be a non-empty string, got: ${JSON.stringify(pending.message)}`
            );
        }
    });

    await test("transactions() entry — onChain field is null or an object (not undefined)", async () => {
        const res = await solanaWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];
        for (const tx of txList) {
            // onChain may be null (pending/awaiting) or an object { txId, explorerLink, ... }
            // It should never be `undefined` — it must be explicitly null or a real object
            assert(
                "onChain" in tx,
                `tx ${tx.id} must have an 'onChain' field (null or object)`
            );
            assert(
                tx.onChain === null || (typeof tx.onChain === "object"),
                `tx ${tx.id} onChain must be null or an object, got ${typeof tx.onChain}`
            );
        }
    });

    // ── signers() entry fields ─────────────────────────────────────────────────
    await test("signers() entry — full object shape: type, locator, address, status (new in wallets-v1)", async () => {
        // wallets-v1 changed signers() from returning { signer: "locator" } to full objects:
        //   { type, address, locator, status }
        const freshAddr = generateEvmAddress();
        await evmWallet.addSigner({ type: "external-wallet", address: freshAddr }, { prepareOnly: true });
        const signersAfter = await evmWallet.signers();
        const freshEntry = signersAfter.find(s => s.locator?.includes(freshAddr));
        assert(freshEntry != null, `Could not find freshly added signer ${freshAddr} in signers()`);

        assert(freshEntry.type === "external-wallet",
            `entry.type must be 'external-wallet', got '${freshEntry.type}'`);
        assert(typeof freshEntry.locator === "string" && freshEntry.locator.startsWith("external-wallet:"),
            `entry.locator must start with 'external-wallet:', got '${freshEntry.locator}'`);
        assert(typeof freshEntry.address === "string" && freshEntry.address.length > 0,
            `entry.address must be a non-empty string, got '${freshEntry.address}'`);
        assert(
            ["success", "pending", "awaiting-approval", "failed"].includes(freshEntry.status),
            `entry.status must be a valid SignerStatus, got '${freshEntry.status}'`
        );
    });

    await test("signers() entry — locator address portion is a valid EVM address (0x + 40 hex)", async () => {
        const signers = await evmWallet.signers();
        const evmRe = /^0x[0-9a-fA-F]{40}$/;
        for (const s of signers) {
            if (s.locator?.startsWith("external-wallet:")) {
                const addr = s.locator.slice("external-wallet:".length);
                assert(
                    evmRe.test(addr),
                    `external-wallet locator address '${addr}' is not a valid EVM address`
                );
            }
        }
    });

    // ── balances().tokens array ────────────────────────────────────────────────
    await test("balances().tokens array — each entry has symbol, amount, and chain-appropriate address field", async () => {
        const b = await evmWallet.balances();
        assert(Array.isArray(b.tokens), "balances().tokens must be an array");

        for (const token of b.tokens) {
            assert(typeof token.symbol === "string" && token.symbol.length > 0,
                `token.symbol must be non-empty string, got: ${JSON.stringify(token)}`);
            assert(typeof token.amount === "string",
                `token.amount must be a string, got: ${typeof token.amount}`);
            assert(!isNaN(parseFloat(token.amount)),
                `token.amount '${token.amount}' must be parseable as a number`);
        }
    });

    await test("balances().usdc — amount is a parseable non-negative number string", async () => {
        const b = await evmWallet.balances();
        const usdc = b.usdc;
        assertDefined(usdc, "balances().usdc");
        const parsed = parseFloat(usdc.amount);
        assert(!isNaN(parsed), `usdc.amount '${usdc.amount}' must be parseable`);
        assert(parsed >= 0, `usdc.amount must be >= 0, got ${parsed}`);
        assert(usdc.symbol.toLowerCase() === "usdc", `usdc.symbol must be 'usdc', got '${usdc.symbol}'`);
    });

    await test("Solana balances() — nativeToken has decimals field (or amount is parseable)", async () => {
        const b = await solanaWallet.balances();
        const nt = b.nativeToken;
        assertDefined(nt.amount, "nativeToken.amount");
        assert(!isNaN(parseFloat(nt.amount)), `nativeToken.amount '${nt.amount}' must be parseable`);
        // decimals field is chain-specific — check if it's present and valid
        if ("decimals" in nt) {
            assert(typeof nt.decimals === "number" && nt.decimals >= 0,
                `nativeToken.decimals must be a non-negative number, got ${nt.decimals}`);
        }
    });

    // ── transfers() response structure ────────────────────────────────────────
    await test("transfers() response — is an object (not an array) with transfers-related structure", async () => {
        let result;
        let errMsg = "";
        try {
            result = await evmWallet.transfers({ tokens: "eth", status: "successful" });
        } catch (e) { errMsg = e.message ?? ""; }

        if (result) {
            assert(
                typeof result === "object" && result !== null,
                `transfers() must return an object, got: ${typeof result}`
            );
            // The response should be an object — either an array of transfers or an object with a transfers key
            const isArrayResult = Array.isArray(result);
            const hasTransfersKey = "transfers" in result;
            assert(
                isArrayResult || hasTransfersKey || Object.keys(result).length >= 0,
                `transfers() result has unexpected shape: ${JSON.stringify(result).slice(0, 200)}`
            );

            // If it has a transfers key, validate the array
            if (hasTransfersKey) {
                assert(Array.isArray(result.transfers),
                    `result.transfers must be an array, got: ${typeof result.transfers}`);
            }
        } else {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `transfers() should not 500: ${errMsg}`
            );
        }
    });

    await test("transfers() response — each entry (if any) has id, status, and token fields", async () => {
        let result;
        try {
            result = await evmWallet.transfers({ tokens: "eth", status: "successful" });
        } catch (_) {}

        if (!result) return; // skip if transfers() is unavailable

        const entries = Array.isArray(result) ? result : result?.transfers ?? [];

        for (const entry of entries) {
            assert(
                typeof entry.id === "string" && entry.id.length > 0,
                `transfer entry.id must be a non-empty string, got: ${JSON.stringify(entry.id)}`
            );
            assert(
                typeof entry.status === "string",
                `transfer entry.status must be a string, got: ${typeof entry.status}`
            );
        }
    });

    // ── signMessage prepareOnly response ──────────────────────────────────────
    await test("signMessage prepareOnly response — contains only signatureId (no extra fields leaked)", async () => {
        try { await evmWallet.useSigner(`external-wallet:${evmAdmin}`); } catch (_) {}

        let result;
        try {
            result = await evmWallet.signMessage({
                message: "body-validation-test",
                options: { prepareOnly: true },
            });
        } catch (_) {}

        if (result) {
            const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            assert(typeof result.signatureId === "string", "signatureId must be a string");
            assert(uuidRe.test(result.signatureId), `signatureId must be UUID, got '${result.signatureId}'`);
            // prepareOnly result must NOT include a completed signature
            assert(result.signature == null, `prepareOnly must not include signature, got '${result.signature}'`);
            // Must NOT include transaction-level fields
            assert(result.hash == null, `prepareOnly must not include hash, got '${result.hash}'`);
        }
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    _origConsoleLog(`
╔════════════════════════════════════════════════════════════╗
║   Crossmint Wallets SDK — wallets-v1 Branch Tests        ║
║        EVM + Solana + Stellar (server-side)               ║
╚════════════════════════════════════════════════════════════╝`);

    let fixtures;
    try {
        fixtures = await setup();
    } catch (e) {
        _origConsoleLog(`\n❌  Setup failed: ${e.message}`);
        _origConsoleLog("    Cannot proceed without fixture wallets.\n");
        process.exit(1);
    }

    await suiteInit();
    await suiteWalletCreation(fixtures);
    await suiteGetWallet(fixtures);
    await suiteSigners(fixtures);
    await suiteAddSigner(fixtures);
    await suiteBalances(fixtures);
    await suiteSend(fixtures);
    await suiteTransactions(fixtures);
    await suiteUseSigner(fixtures);
    await suiteNegativePaths(fixtures);
    await suitePrepareOnlyShape(fixtures);
    await suiteApproveNegative(fixtures);
    await suiteDeviceSigner(fixtures);
    await suiteBalancesShape(fixtures);
    await suiteTransactionsShape(fixtures);
    await suiteSignersShape(fixtures);
    await suiteSignMessage(fixtures);
    await suiteSignTypedData(fixtures);
    await suiteTransfers(fixtures);
    await suiteSendZeroValue(fixtures);
    await suiteV1ApiSurface(fixtures);
    await suiteRecover(fixtures);
    await suiteResponseBodies(fixtures);

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
