#!/usr/bin/env node
/**
 * Dedicated device signer tests for Crossmint Wallets SDK — wallets-v1 branch.
 *
 * Tests everything related to device signers:
 *   - createDeviceSigner: descriptor shape, validation, key uniqueness
 *   - addSigner with device descriptor: EVM (signatureId) and Solana (transactionId)
 *   - approve: error paths (invalid IDs, unauthorised signer, missing signer)
 *   - signers()/signerIsRegistered after addSigner prepareOnly
 *   - createWallet with device signer in signers array
 *   - getWallet + device signer state
 *   - Full lifecycle notes: documented where external signing is required
 *
 * PREREQUISITE: build the wallets SDK first.
 *   pnpm --filter @crossmint/wallets-sdk build
 *
 * Usage:
 *   CROSSMINT_API_KEY=xxx node scripts/e2e-device-signer-wallets-v1.mjs
 */

import { webcrypto } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const crypto = webcrypto;

// ─── Suppress SDK internal logger (very noisy) ────────────────────────────────
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

function isUUID(s) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
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

// ─── SDK factory ─────────────────────────────────────────────────────────────
function makeSdk() {
    return CrossmintWallets.from(createCrossmint({ apiKey }));
}

// ─── Mock P-256 DeviceSignerKeyStorage ────────────────────────────────────────
// Implements the DeviceSignerKeyStorage abstract class contract.
// Uses WebCrypto P-256 (ECDSA) key generation and signing.
function createMockDeviceKeyStorage() {
    const keys = new Map();       // base64PubKey → CryptoKey (private)
    const addressMap = new Map(); // walletAddress → base64PubKey

    return {
        async generateKey({ address } = {}) {
            const kp = await crypto.subtle.generateKey(
                { name: "ECDSA", namedCurve: "P-256" },
                true,
                ["sign", "verify"]
            );
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
            const msgBytes = Buffer.from(message.replace(/^0x/, ""), "hex");
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
        // Expose internals for test assertions
        _keys: keys,
        _addressMap: addressMap,
    };
}

// ─── Setup: create fixture wallets ────────────────────────────────────────────
async function setup() {
    _origConsoleLog("\n⚙  Setup: creating fixture wallets...");
    const s = makeSdk();

    const evmAdmin = generateEvmAddress();
    const solanaAdmin = await generateSolanaAddress();

    const [evmWallet, solanaWallet] = await Promise.all([
        s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "external-wallet", address: evmAdmin },
            owner: `userId:sdk-device-evm-${Date.now()}`,
        }),
        s.createWallet({
            chain: "solana",
            recovery: { type: "external-wallet", address: solanaAdmin },
            owner: `userId:sdk-device-solana-${Date.now()}`,
        }),
    ]);

    _origConsoleLog(`   EVM wallet:    ${evmWallet.address}`);
    _origConsoleLog(`   Solana wallet: ${solanaWallet.address}`);

    return { evmWallet, solanaWallet, evmAdmin, solanaAdmin };
}

// ─── Suite 1: createDeviceSigner — descriptor shape ──────────────────────────
async function suiteCreateDeviceSigner() {
    _origConsoleLog("\n▸ Suite 1: createDeviceSigner — Descriptor Shape & Validation");
    const s = makeSdk();

    await test("createDeviceSigner(undefined) throws — storage is required", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await s.createDeviceSigner(undefined);
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "createDeviceSigner(undefined) should throw");
        assert(
            errMsg.length > 0,
            "Error should have a descriptive message"
        );
    });

    await test("createDeviceSigner(storage) returns descriptor with type='device'", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        assertDefined(desc, "descriptor");
        assert(desc.type === "device", `Expected type='device', got '${desc.type}'`);
    });

    await test("createDeviceSigner(storage) — descriptor has publicKey.x and publicKey.y", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        assertDefined(desc.publicKey, "publicKey");
        assertDefined(desc.publicKey.x, "publicKey.x");
        assertDefined(desc.publicKey.y, "publicKey.y");
    });

    await test("createDeviceSigner(storage) — publicKey.x and publicKey.y are 0x-prefixed hex (32 bytes each)", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const hexPattern = /^0x[0-9a-fA-F]{64}$/;
        assert(hexPattern.test(desc.publicKey.x), `publicKey.x not valid hex: ${desc.publicKey.x}`);
        assert(hexPattern.test(desc.publicKey.y), `publicKey.y not valid hex: ${desc.publicKey.y}`);
    });

    await test("createDeviceSigner(storage) — locator has 'device:' prefix", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        assertDefined(desc.locator, "locator");
        assert(desc.locator.startsWith("device:"), `Locator should start with 'device:', got: ${desc.locator}`);
    });

    await test("createDeviceSigner(storage) — locator base64 part decodes to 65-byte P-256 uncompressed point", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const base64Part = desc.locator.replace(/^device:/, "");
        const raw = Buffer.from(base64Part, "base64");
        assert(raw.length === 65, `Expected 65 bytes (P-256 uncompressed), got ${raw.length}`);
        assert(raw[0] === 0x04, `First byte should be 0x04 (uncompressed point), got ${raw[0]}`);
    });

    await test("createDeviceSigner — two calls produce DIFFERENT keys (no key reuse)", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc1 = await s.createDeviceSigner(storage);
        const desc2 = await s.createDeviceSigner(storage);
        assert(desc1.locator !== desc2.locator, "Two createDeviceSigner calls should produce different locators");
        assert(
            desc1.publicKey.x !== desc2.publicKey.x || desc1.publicKey.y !== desc2.publicKey.y,
            "Two calls should produce different public keys"
        );
    });

    await test("createDeviceSigner — key is stored in the provided storage", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const base64Part = desc.locator.replace(/^device:/, "");
        const hasKey = await storage.hasKey(base64Part);
        assert(hasKey, "Storage should have the generated key after createDeviceSigner");
    });
}

// ─── Suite 2: addSigner with device descriptor — EVM ─────────────────────────
async function suiteAddSignerEvm(fixtures) {
    _origConsoleLog("\n▸ Suite 2: addSigner with Device Signer — EVM");
    const s = makeSdk();
    const { evmWallet } = fixtures;

    await test("EVM addSigner(deviceDesc, prepareOnly) — returns signatureId (EIP-712 signature request)", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const result = await evmWallet.addSigner(desc, { prepareOnly: true });
        assertDefined(result, "addSigner result");
        assertDefined(result.signatureId, "signatureId");
        assert(isUUID(result.signatureId), `Expected UUID signatureId, got: ${result.signatureId}`);
    });

    await test("EVM addSigner(deviceDesc, prepareOnly) — does NOT return transactionId", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const result = await evmWallet.addSigner(desc, { prepareOnly: true });
        assert(
            result.transactionId == null,
            `EVM addSigner should return signatureId not transactionId, got: ${JSON.stringify(result)}`
        );
    });

    await test("EVM addSigner(deviceDesc, prepareOnly) — device signer appears in signers() after call", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const beforeSigners = await evmWallet.signers();
        const beforeCount = beforeSigners.length;

        await evmWallet.addSigner(desc, { prepareOnly: true });

        const afterSigners = await evmWallet.signers();
        assert(
            afterSigners.length > beforeCount,
            `signers() count should increase after addSigner prepareOnly (before: ${beforeCount}, after: ${afterSigners.length})`
        );
    });

    await test("EVM addSigner(deviceDesc, prepareOnly) — signerIsRegistered returns true for device locator", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        await evmWallet.addSigner(desc, { prepareOnly: true });
        const registered = await evmWallet.signerIsRegistered(desc.locator);
        assert(registered, `signerIsRegistered should return true for device locator: ${desc.locator}`);
    });

    await test("EVM addSigner(deviceDesc, prepareOnly) — device signer in signers() has 'device:' locator prefix", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        await evmWallet.addSigner(desc, { prepareOnly: true });
        const signers = await evmWallet.signers();
        const deviceSigners = signers.filter(s => s.signer?.startsWith("device:"));
        assert(deviceSigners.length > 0, `Expected at least one 'device:' signer in signers(), got: ${JSON.stringify(signers)}`);
    });

    await test("EVM addSigner — signatureId does NOT appear in transactions() (EVM uses EIP-712 signatures, not on-chain txs)", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const result = await evmWallet.addSigner(desc, { prepareOnly: true });
        // The signatureId is a pending EIP-712 request — confirm it has UUID format
        assert(isUUID(result.signatureId), `signatureId should be a UUID: ${result.signatureId}`);
        // EVM signatureId does NOT appear in transactions() (only in signatures/approvals)
        const res = await evmWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];
        const txIds = txList.map(t => t.id);
        assert(
            !txIds.includes(result.signatureId),
            `EVM signatureId should NOT appear in transactions() — it is a signature request, not a transaction`
        );
    });
}

// ─── Suite 3: addSigner with device descriptor — Solana ───────────────────────
async function suiteAddSignerSolana(fixtures) {
    _origConsoleLog("\n▸ Suite 3: addSigner with Device Signer — Solana");
    const s = makeSdk();
    const { solanaWallet } = fixtures;

    await test("Solana addSigner(deviceDesc, prepareOnly) — returns transactionId (on-chain tx)", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const result = await solanaWallet.addSigner(desc, { prepareOnly: true });
        assertDefined(result, "addSigner result");
        assertDefined(result.transactionId, "transactionId");
        assert(isUUID(result.transactionId), `Expected UUID transactionId, got: ${result.transactionId}`);
    });

    await test("Solana addSigner(deviceDesc, prepareOnly) — does NOT return signatureId", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const result = await solanaWallet.addSigner(desc, { prepareOnly: true });
        assert(
            result.signatureId == null,
            `Solana addSigner should return transactionId not signatureId, got: ${JSON.stringify(result)}`
        );
    });

    await test("Solana addSigner(deviceDesc, prepareOnly) — transactionId appears in transactions()", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const result = await solanaWallet.addSigner(desc, { prepareOnly: true });

        const res = await solanaWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];
        const txIds = txList.map(t => t.id);
        assert(
            txIds.includes(result.transactionId),
            `Solana transactionId ${result.transactionId} should appear in transactions()`
        );
    });

    await test("Solana addSigner(deviceDesc, prepareOnly) — transaction has status 'awaiting-approval'", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const result = await solanaWallet.addSigner(desc, { prepareOnly: true });

        const res = await solanaWallet.transactions();
        const txList = Array.isArray(res) ? res : res?.transactions ?? [];
        const tx = txList.find(t => t.id === result.transactionId);
        assertDefined(tx, "transaction entry");
        assert(
            tx.status === "awaiting-approval",
            `Expected status 'awaiting-approval', got '${tx.status}'`
        );
    });

    await test("Solana addSigner(deviceDesc, prepareOnly) — device signer appears in signers()", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const beforeCount = (await solanaWallet.signers()).length;
        await solanaWallet.addSigner(desc, { prepareOnly: true });
        const afterSigners = await solanaWallet.signers();
        assert(
            afterSigners.length > beforeCount,
            `signers() should grow after addSigner prepareOnly (before: ${beforeCount}, after: ${afterSigners.length})`
        );
    });
}

// ─── Suite 4: approve — error paths ──────────────────────────────────────────
async function suiteApproveErrors(fixtures) {
    _origConsoleLog("\n▸ Suite 4: approve() — Error Path Tests");
    const s = makeSdk();
    const { evmWallet, solanaWallet } = fixtures;
    const NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000000000";

    await test("approve({ transactionId: nonExistentUUID }) — throws clear error (not 500)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.approve({ transactionId: NON_EXISTENT_UUID });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve with non-existent transactionId should throw");
        assert(errMsg.length > 0, "Error should have a descriptive message");
        // Should NOT be an internal server error — the API should return 404 or 400
        assert(
            !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
            `Got unexpected 500 error: ${errMsg}`
        );
    });

    await test("approve({ signatureId: nonExistentUUID }) — throws clear error (not 500)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.approve({ signatureId: NON_EXISTENT_UUID });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve with non-existent signatureId should throw");
        assert(errMsg.length > 0, "Error should have a descriptive message");
    });

    await test("approve({}) — throws validation error (no transactionId or signatureId)", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.approve({});
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve({}) should throw a validation error");
        assert(errMsg.length > 0, "Error should have a descriptive message");
    });

    await test("approve with real signatureId but unregistered device signer — throws clear error", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const addResult = await evmWallet.addSigner(desc, { prepareOnly: true });

        // Use an entirely different (unregistered) device descriptor for the approval
        const otherStorage = createMockDeviceKeyStorage();
        const otherDesc = await s.createDeviceSigner(otherStorage);

        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.approve({
                signatureId: addResult.signatureId,
                options: {
                    approval: {
                        type: "device",
                        signature: { r: "0x" + "a".repeat(64), s: "0x" + "b".repeat(64) },
                        signer: otherDesc.locator,
                    },
                },
            });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve with unregistered signer should throw");
        assert(errMsg.length > 0, "Error message should be descriptive");
    });

    await test("approve with malformed signatureId — throws clear validation error", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.approve({ signatureId: "not-a-uuid" });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve with malformed signatureId should throw");
        assert(errMsg.length > 0, "Error message should be descriptive");
    });

    await test("approve with malformed transactionId — throws clear validation error", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await evmWallet.approve({ transactionId: "not-a-uuid" });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "approve with malformed transactionId should throw");
        assert(errMsg.length > 0, "Error message should be descriptive");
    });

    await test("Solana approve with non-existent transactionId — throws clear error", async () => {
        let threw = false;
        let errMsg = "";
        try {
            await solanaWallet.approve({ transactionId: NON_EXISTENT_UUID });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(threw, "Solana approve with non-existent transactionId should throw");
        assert(errMsg.length > 0, "Error should have a descriptive message");
    });
}

// ─── Suite 5: createWallet with device signer in signers array ────────────────
async function suiteCreateWalletWithDeviceSigner() {
    _origConsoleLog("\n▸ Suite 5: createWallet with device signer in signers[] array");
    const s = makeSdk();

    // BUG: createWallet({ signers: [deviceDesc] }) throws "Wallet signer configuration mismatch
    // at 'publicKey.x'". The API stores device signer publicKey.x as a decimal string, but
    // createDeviceSigner() returns publicKey.x as a 0x-prefixed hex string. The SDK internally
    // calls addSigner() after creating the wallet and the idempotency check fails because
    // the decimal format stored doesn't match the hex format sent.
    // Expected: publicKey.x format should be consistent (both decimal or both hex).

    await test("[BUG] EVM createWallet with device signer in signers[] — throws publicKey.x format mismatch", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const evmAdmin = generateEvmAddress();

        let threw = false;
        let errMsg = "";
        try {
            await s.createWallet({
                chain: "base-sepolia",
                recovery: { type: "external-wallet", address: evmAdmin },
                signers: [desc],
                owner: `userId:sdk-device-withsigner-${Date.now()}`,
            });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        // Document the current (buggy) behavior: throws format mismatch
        assert(
            threw && errMsg.includes("publicKey.x"),
            threw
                ? `Expected publicKey.x format mismatch error, got: ${errMsg} (bug may have changed)`
                : "createWallet with device signer in signers[] should have thrown but succeeded (bug may be fixed!)"
        );
    });

    await test("[BUG] Solana createWallet with device signer in signers[] — throws publicKey.x format mismatch", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const solanaAdmin = await generateSolanaAddress();

        let threw = false;
        let errMsg = "";
        try {
            await s.createWallet({
                chain: "solana",
                recovery: { type: "external-wallet", address: solanaAdmin },
                signers: [desc],
                owner: `userId:sdk-device-sol-withsigner-${Date.now()}`,
            });
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        assert(
            threw && errMsg.includes("publicKey.x"),
            threw
                ? `Expected publicKey.x format mismatch error, got: ${errMsg} (bug may have changed)`
                : "createWallet with device signer in signers[] should have thrown but succeeded (bug may be fixed!)"
        );
    });

    await test("Workaround: createWallet first, then addSigner(deviceDesc) — device signer registers successfully", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        const evmAdmin = generateEvmAddress();

        // Step 1: create wallet WITHOUT device signer in signers[]
        const wallet = await s.createWallet({
            chain: "base-sepolia",
            recovery: { type: "external-wallet", address: evmAdmin },
            owner: `userId:sdk-device-workaround-${Date.now()}`,
        });
        assertDefined(wallet, "wallet");

        // Step 2: addSigner separately — this works correctly
        const result = await wallet.addSigner(desc, { prepareOnly: true });
        assertDefined(result.signatureId, "signatureId from addSigner");
        assert(isUUID(result.signatureId), `Expected UUID signatureId: ${result.signatureId}`);

        // Device signer is now registered in API
        const registered = await wallet.signerIsRegistered(desc.locator);
        assert(registered, `Device signer should be registered after separate addSigner call`);
    });
}

// ─── Suite 6: getWallet with device signers ───────────────────────────────────
async function suiteGetWalletDeviceSigner(fixtures) {
    _origConsoleLog("\n▸ Suite 6: getWallet + device signer state");
    // Note: on server-side (sk_ API key), getWallet requires (walletLocator, { chain }) signature.
    const s = makeSdk();
    const { evmWallet } = fixtures;

    await test("getWallet(address, { chain }) returns the same wallet", async () => {
        const retrieved = await s.getWallet(evmWallet.address, { chain: "base-sepolia" });
        assertDefined(retrieved, "retrieved wallet");
        assert(
            retrieved.address === evmWallet.address,
            `Expected address ${evmWallet.address}, got ${retrieved.address}`
        );
    });

    await test("getWallet — device signers added via addSigner are visible after fresh getWallet", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        await evmWallet.addSigner(desc, { prepareOnly: true });

        // Re-fetch the wallet fresh using server-side signature
        const freshWallet = await s.getWallet(evmWallet.address, { chain: "base-sepolia" });
        const signers = await freshWallet.signers();
        const deviceSigners = signers.filter(sig => sig.signer?.startsWith("device:"));
        assert(
            deviceSigners.length > 0,
            `Expected device signers after addSigner, got: ${JSON.stringify(signers)}`
        );
    });

    await test("getWallet — non-existent address throws WalletNotAvailableError", async () => {
        let threw = false;
        let err = null;
        try {
            await s.getWallet("0x" + "0".repeat(40), { chain: "base-sepolia" });
        } catch (e) {
            threw = true;
            err = e;
        }
        assert(threw, "getWallet for non-existent address should throw");
        assert(
            err instanceof WalletNotAvailableError,
            `Expected WalletNotAvailableError, got: ${err?.constructor?.name}: ${err?.message}`
        );
    });

    await test("getWallet — wallet.recovery has correct external-wallet type", async () => {
        const retrieved = await s.getWallet(evmWallet.address, { chain: "base-sepolia" });
        assertDefined(retrieved.recovery, "wallet.recovery");
        assert(
            retrieved.recovery.type === "external-wallet",
            `Expected recovery.type='external-wallet', got '${retrieved.recovery?.type}'`
        );
    });
}

// ─── Suite 7: signerIsRegistered — comprehensive ──────────────────────────────
async function suiteSignerIsRegistered(fixtures) {
    _origConsoleLog("\n▸ Suite 7: signerIsRegistered — comprehensive checks");
    const s = makeSdk();
    const { evmWallet } = fixtures;

    await test("signerIsRegistered returns true for all locators in signers()", async () => {
        // Use actual locators from signers() instead of manually constructing them
        // (the locator format includes chain info, e.g. external-wallet:base-sepolia:0x...)
        const signers = await evmWallet.signers();
        assert(signers.length > 0, "Expected at least one signer (recovery)");
        for (const s of signers) {
            const isRegistered = await evmWallet.signerIsRegistered(s.signer);
            assert(isRegistered, `signerIsRegistered should return true for listed signer: ${s.signer}`);
        }
    });

    await test("signerIsRegistered returns false for unknown address", async () => {
        const unknownLocator = `external-wallet:${generateEvmAddress()}`;
        const isRegistered = await evmWallet.signerIsRegistered(unknownLocator);
        assert(!isRegistered, `Unknown signer should not be registered: ${unknownLocator}`);
    });

    await test("signerIsRegistered returns true for newly added device signer", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        await evmWallet.addSigner(desc, { prepareOnly: true });
        const isRegistered = await evmWallet.signerIsRegistered(desc.locator);
        assert(isRegistered, `Newly added device signer should be registered: ${desc.locator}`);
    });

    await test("signerIsRegistered returns false for device signer that was never added", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        // Do NOT addSigner — just check
        const isRegistered = await evmWallet.signerIsRegistered(desc.locator);
        assert(!isRegistered, `Device signer never added should not be registered: ${desc.locator}`);
    });

    await test("wallet.recovery is NOT in signers() list — recovery is separate from delegated signers", async () => {
        // The recovery signer is accessible via wallet.recovery but is NOT returned in signers().
        // signers() only returns delegated signers that were added via addSigner().
        // This is by design: recovery is a special high-trust signer managed separately.
        const signers = await evmWallet.signers();
        const { recovery } = evmWallet;
        assertDefined(recovery, "wallet.recovery");
        assert(recovery.type === "external-wallet", `Expected recovery.type='external-wallet', got '${recovery.type}'`);
        // Recovery signer should NOT appear in delegated signers list
        const recoveryInSigners = signers.some(sig => sig.signer?.includes(recovery.address));
        assert(
            !recoveryInSigners,
            `Recovery signer address should NOT appear in signers() (it is separate from delegated signers), found it in: ${JSON.stringify(signers)}`
        );
    });
}

// ─── Suite 8: needsRecovery with device signers ───────────────────────────────
async function suiteNeedsRecovery(fixtures) {
    _origConsoleLog("\n▸ Suite 8: needsRecovery — device signer context");
    const s = makeSdk();
    const { evmWallet } = fixtures;

    await test("needsRecovery returns boolean", async () => {
        const result = await evmWallet.needsRecovery();
        assert(
            typeof result === "boolean",
            `needsRecovery should return boolean, got: ${typeof result}`
        );
    });

    await test("wallet with external-wallet recovery does not need recovery", async () => {
        // A wallet that just has external-wallet recovery should not need recovery
        const result = await evmWallet.needsRecovery();
        assert(result === false, `Wallet with external-wallet recovery should not need recovery, got: ${result}`);
    });

    await test("needsRecovery still works after adding device signers", async () => {
        const storage = createMockDeviceKeyStorage();
        const desc = await s.createDeviceSigner(storage);
        await evmWallet.addSigner(desc, { prepareOnly: true });
        // Should still return a valid boolean
        const result = await evmWallet.needsRecovery();
        assert(typeof result === "boolean", `needsRecovery should still return boolean after adding device signer`);
    });
}

// ─── Suite 9: Full transaction lifecycle notes (documented limitation) ────────
async function suiteTransactionLifecycleNotes(fixtures) {
    _origConsoleLog("\n▸ Suite 9: Transaction / Approval Lifecycle — Documented Limits");
    const { evmWallet, solanaWallet } = fixtures;

    await test("NOTE: device signer approval requires recovery signer to countersign (external-wallet recovery = read-only)", () => {
        // This is a documentation test — it always passes.
        // The full approve() flow for adding a device signer to an EVM wallet:
        //   1. addSigner(deviceDesc) → signatureId (EIP-712 "add signer" request)
        //   2. The recovery signer (external-wallet) must sign the EIP-712 message
        //   3. approve({ signatureId, options: { approval: { type: "external-wallet", signature, signer } } })
        // Since our test wallets use external-wallet recovery and we don't hold
        // the private key for the recovery address, we cannot complete step 2/3 in automation.
        //
        // BUG NOTED: Transaction status stuck at "pending" after device signer approval.
        // After a device signer signs and the tx lands on-chain, the API indexer
        // does not update status from "pending" to "success". This means
        // wallet.approve() would hit the 60-second TransactionConfirmationTimeoutError.
        // Reproduce: addSigner(device) with a fully signing-capable wallet,
        // call approve(), observe status never becomes "success".
        assert(true, "This test always passes — it documents the limitation");
    });

    await test("EVM: send(token, amount, { prepareOnly: true }) — requires a balance (or check error shape)", async () => {
        // EVM wallet likely has 0 balance in test — but the API should return a clear error or a transactionId
        let result;
        let errMsg = "";
        let threw = false;
        try {
            result = await evmWallet.send(
                { symbol: "eth" },
                { amount: "0.0001", to: generateEvmAddress() },
                { prepareOnly: true }
            );
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        if (threw) {
            // Error should be descriptive (insufficient balance, not a 500)
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `Got unexpected 500 error: ${errMsg}`
            );
        } else {
            // If it succeeds, result should have a transactionId
            assertDefined(result?.transactionId, "transactionId");
        }
    });

    await test("Solana: send(token, amount, { prepareOnly: true }) — requires a balance (or check error shape)", async () => {
        let result;
        let errMsg = "";
        let threw = false;
        try {
            result = await solanaWallet.send(
                { symbol: "sol" },
                { amount: "0.001", to: await generateSolanaAddress() },
                { prepareOnly: true }
            );
        } catch (e) {
            threw = true;
            errMsg = e.message ?? "";
        }
        if (threw) {
            assert(
                !errMsg.includes("500") && !errMsg.toLowerCase().includes("internal server error"),
                `Got unexpected 500 error: ${errMsg}`
            );
        } else {
            assertDefined(result?.transactionId, "transactionId");
        }
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    _origConsoleLog("\n══════════════════════════════════════════════════════════════");
    _origConsoleLog("  Device Signer SDK Tests — wallets-v1 branch");
    _origConsoleLog("══════════════════════════════════════════════════════════════");

    const fixtures = await setup();

    await suiteCreateDeviceSigner();
    await suiteAddSignerEvm(fixtures);
    await suiteAddSignerSolana(fixtures);
    await suiteApproveErrors(fixtures);
    await suiteCreateWalletWithDeviceSigner();
    await suiteGetWalletDeviceSigner(fixtures);
    await suiteSignerIsRegistered(fixtures);
    await suiteNeedsRecovery(fixtures);
    await suiteTransactionLifecycleNotes(fixtures);

    _origConsoleLog("\n══════════════════════════════════════════════════════════════");
    _origConsoleLog(`  Results: ${passed} passed, ${failed} failed`);
    _origConsoleLog("══════════════════════════════════════════════════════════════\n");

    if (failures.length > 0) {
        _origConsoleLog("Failed tests:");
        failures.forEach(({ name, error }) => {
            _origConsoleLog(`  ✗ ${name}`);
            _origConsoleLog(`    └─ ${error}`);
        });
        _origConsoleLog("");
        process.exit(1);
    }
}

main().catch((e) => {
    _origConsoleLog("\n❌  Unexpected error:", e.message);
    _origConsoleLog(e.stack);
    process.exit(1);
});
