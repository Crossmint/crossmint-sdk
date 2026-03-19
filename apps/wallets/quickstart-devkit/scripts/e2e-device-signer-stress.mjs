#!/usr/bin/env node
/**
 * Stress & edge-case tests for Crossmint Wallet APIs.
 *
 * Covers: auth, wallet CRUD, signer registration, transfers,
 * approvals, idempotency, URL param validation, deep body field
 * validation — for EVM, Solana, and Stellar chains.
 *
 * See e2e-device-signer.mjs for the happy-path flows.
 *
 * Usage:
 *   CROSSMINT_API_KEY=xxx node scripts/e2e-device-signer-stress.mjs
 */

import { webcrypto } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const crypto = webcrypto;

// ─── Constants ───────────────────────────────────────────────────────────────

const API_BASE = "https://staging.crossmint.com/api/2025-06-09";
const FUND_BASE = "https://staging.crossmint.com/api/v1-alpha2";
const FAKE_ID = "00000000-0000-0000-0000-000000000001";

// Set during setup()
let FAKE_DEVICE_LOCATOR = "";

// ─── Crypto helpers ───────────────────────────────────────────────────────────

async function generateDeviceKey() {
    const { publicKey, privateKey } = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
    );
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", publicKey));
    const toDecimal = (b) =>
        BigInt(
            "0x" +
                Array.from(b)
                    .map((n) => n.toString(16).padStart(2, "0"))
                    .join("")
        ).toString(10);
    return {
        privateKey,
        publicKey: { x: toDecimal(raw.slice(1, 33)), y: toDecimal(raw.slice(33, 65)) },
    };
}

function generateAdminAccount() {
    return privateKeyToAccount(generatePrivateKey());
}

// ─── Base58 encoder (Solana addresses / signatures) ─────────────────────────

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
    // Must generate a real Ed25519 keypair — random bytes often land off the ed25519 curve,
    // which the Solana API treats as PDA/program addresses and rejects as admin signers.
    const kp = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
    const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
    return bs58encode(rawPub);
}

// ─── Stellar StrKey encoder (G... addresses) ─────────────────────────────────

// CRC16-XModem (used by Stellar StrKey)
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

// Base32 (RFC 4648, no padding)
function base32Encode(bytes) {
    const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0,
        value = 0,
        output = "";
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

// Encode a 32-byte Ed25519 public key as a Stellar G... address (56 chars)
function stellarPublicKey(bytes32) {
    // StrKey: [version=0x30 (1 byte)] + [key (32 bytes)] + [CRC16 little-endian (2 bytes)]
    const data = new Uint8Array(33);
    data[0] = 0x30; // G account version byte
    data.set(bytes32, 1);
    const crc = crc16xmodem(data);
    const full = new Uint8Array(35);
    full.set(data);
    full[33] = crc & 0xff;
    full[34] = (crc >> 8) & 0xff;
    return base32Encode(full); // always 56 uppercase chars
}

async function generateStellarAddress() {
    const kp = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
    const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
    return stellarPublicKey(rawPub);
}

// ─── Base64 helper (Stellar signatures) ──────────────────────────────────────

function b64encode(bytes) {
    return Buffer.from(bytes).toString("base64");
}

// ─── Chain Configs ────────────────────────────────────────────────────────────
//
// Each config drives all chain-specific behavior across all suites.
// buildInvalidSignerBodies(key) returns test cases for Suite 4 body validation.
// buildInvalidSigs(v) returns test cases for Suites 5 & 7 signature format validation.

const EVM_CFG = {
    name: "EVM",
    chainType: "evm",
    token: "base-sepolia:usdxm",
    deadWallet: "0x000000000000000000000000000000000000dead",
    generateAdminAddress: () => generateAdminAccount().address,
    // URL param bad address patterns
    addrTooShort: "0xdeadbeef",
    addrWrongFmt: "plaintext-addr",
    addrBadChars: "0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
    // Transfer recipients
    recipientBadFmt: "not-an-address",
    recipientTooShort: "0xDEAD",
    // Transfer tokens
    tokenNoChain: ":usdxm",
    tokenNoToken: "base-sepolia:",
    tokenBadName: "base-sepolia:NOTATOKEN",
    // Signer field in POST /transfers is required
    transferSignerOptional: false,
    // Signer registration
    generateKey: generateDeviceKey,
    buildHappySigner: (key) => ({
        signer: { type: "device", publicKey: key.publicKey },
        chain: "base-sepolia",
    }),
    buildInvalidSignerBodies: (key) => [
        { name: "missing signer.type", body: { signer: { publicKey: key.publicKey }, chain: "base-sepolia" } },
        { name: "invalid signer type 'hardware-key'", body: { signer: { type: "hardware-key", publicKey: key.publicKey }, chain: "base-sepolia" } },
        { name: "signer = null", body: { signer: null, chain: "base-sepolia" } },
        { name: "signer = {} (empty object)", body: { signer: {}, chain: "base-sepolia" } },
        { name: "missing chain", body: { signer: { type: "device", publicKey: key.publicKey } } },
        { name: "chain = null", body: { signer: { type: "device", publicKey: key.publicKey }, chain: null } },
        { name: "invalid chain 'mainnet'", body: { signer: { type: "device", publicKey: key.publicKey }, chain: "mainnet" } },
        { name: "missing signer.publicKey", body: { signer: { type: "device" }, chain: "base-sepolia" } },
        { name: "signer.publicKey = {} (empty object)", body: { signer: { type: "device", publicKey: {} }, chain: "base-sepolia" } },
        { name: "missing publicKey.x", body: { signer: { type: "device", publicKey: { y: key.publicKey.y } }, chain: "base-sepolia" } },
        { name: "missing publicKey.y", body: { signer: { type: "device", publicKey: { x: key.publicKey.x } }, chain: "base-sepolia" } },
        { name: "publicKey.x = null", body: { signer: { type: "device", publicKey: { x: null, y: key.publicKey.y } }, chain: "base-sepolia" } },
        { name: "publicKey.y = null", body: { signer: { type: "device", publicKey: { x: key.publicKey.x, y: null } }, chain: "base-sepolia" } },
        { name: "publicKey.x = '' (empty string)", body: { signer: { type: "device", publicKey: { x: "", y: key.publicKey.y } }, chain: "base-sepolia" } },
        { name: "publicKey.x non-numeric string", body: { signer: { type: "device", publicKey: { x: "not-a-number", y: key.publicKey.y } }, chain: "base-sepolia" } },
        { name: "publicKey.x negative number", body: { signer: { type: "device", publicKey: { x: "-1", y: key.publicKey.y } }, chain: "base-sepolia" } },
        { name: "publicKey.x > P-256 prime", body: { signer: { type: "device", publicKey: { x: "1" + "0".repeat(78), y: key.publicKey.y } }, chain: "base-sepolia" } },
    ],
    // Approval — device signer uses {r, s} hex objects
    fakeSigner: null, // set in setup
    validApprovalSig: { r: "0x" + "aa".repeat(32), s: "0x" + "bb".repeat(32) },
    buildInvalidSigs: (v) => [
        { name: "sig = {} (empty object)", sig: {} },
        { name: "sig.r missing (only s)", sig: { s: v.s } },
        { name: "sig.s missing (only r)", sig: { r: v.r } },
        { name: "sig.r = null", sig: { r: null, s: v.s } },
        { name: "sig.r = '' (empty string)", sig: { r: "", s: v.s } },
        { name: "sig.r without 0x prefix", sig: { r: "aa".repeat(32), s: v.s } },
        { name: "sig.r wrong length (63 hex chars)", sig: { r: "0x" + "aa".repeat(31) + "a", s: v.s } },
        { name: "sig r/s too short (1 byte each)", sig: { r: "0x01", s: "0x01" } },
        { name: "sig as string not object", sig: "0x" + "aa".repeat(65) },
    ],
};

const SOLANA_CFG = {
    name: "Solana",
    chainType: "solana",
    token: "solana:sol",
    deadWallet: "11111111111111111111111111111111", // System Program — never a user wallet
    generateAdminAddress: generateSolanaAddress,
    // URL param bad address patterns
    addrTooShort: "abc",
    addrWrongFmt: "0x000000000000000000000000000000000000dead", // EVM format
    addrBadChars: "not!an@address#$",
    // Transfer recipients
    recipientBadFmt: "not!a@solana#addr",
    recipientTooShort: "ab",
    // Transfer tokens
    tokenNoChain: ":sol",
    tokenNoToken: "solana:",
    tokenBadName: "solana:NOTATOKEN",
    // Signer field in POST /transfers — Solana returns 422 (simulation) instead of 400 if missing
    transferSignerOptional: false,
    // Signer registration
    generateKey: async () => ({ address: await generateSolanaAddress() }),
    buildHappySigner: (key) => ({
        signer: { type: "external-wallet", address: key.address },
        chain: "solana",
    }),
    buildInvalidSignerBodies: (key) => [
        { name: "missing signer.type", body: { signer: { address: key.address }, chain: "solana" } },
        { name: "invalid signer type 'hardware-key'", body: { signer: { type: "hardware-key", address: key.address }, chain: "solana" } },
        { name: "signer = null", body: { signer: null, chain: "solana" } },
        { name: "signer = {} (empty object)", body: { signer: {}, chain: "solana" } },
        { name: "missing chain", body: { signer: { type: "external-wallet", address: key.address } } },
        { name: "chain = null", body: { signer: { type: "external-wallet", address: key.address }, chain: null } },
        { name: "invalid chain 'mainnet'", body: { signer: { type: "external-wallet", address: key.address }, chain: "mainnet" } },
        { name: "missing signer.address", body: { signer: { type: "external-wallet" }, chain: "solana" } },
        { name: "signer.address = null", body: { signer: { type: "external-wallet", address: null }, chain: "solana" } },
        { name: "signer.address = '' (empty string)", body: { signer: { type: "external-wallet", address: "" }, chain: "solana" } },
        { name: "signer.address in EVM format (wrong for Solana)", body: { signer: { type: "external-wallet", address: "0x000000000000000000000000000000000000dead" }, chain: "solana" } },
        { name: "signer.address too short", body: { signer: { type: "external-wallet", address: "abc" }, chain: "solana" } },
    ],
    // Approval — Solana uses a base58-encoded Ed25519 signature string
    fakeSigner: null, // set in setup: `external-wallet:${deadWallet}`
    validApprovalSig: null, // set in setup: random 64-byte base58 string
    buildInvalidSigs: (_v) => [
        { name: "sig = null", sig: null },
        { name: "sig = '' (empty string)", sig: "" },
        { name: "sig = {} (object, not string)", sig: {} },
        { name: "sig = {r,s} object (EVM format, wrong for Solana)", sig: { r: "0x" + "aa".repeat(32), s: "0x" + "bb".repeat(32) } },
        { name: "sig = hex string (not base58)", sig: "0x" + "aa".repeat(32) },
        { name: "sig too short ('abc')", sig: "abc" },
    ],
};

const STELLAR_CFG = {
    name: "Stellar",
    chainType: "stellar",
    token: "stellar:xlm",
    // GAAA...WHF = all-zeros Stellar account (well-known burn address, never a Crossmint wallet)
    deadWallet: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    generateAdminAddress: generateStellarAddress,
    // URL param bad address patterns
    addrTooShort: "GABC",
    addrWrongFmt: "0x000000000000000000000000000000000000dead", // EVM format
    addrBadChars: "gaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaawhf", // lowercase invalid
    // Transfer recipients
    recipientBadFmt: "not-a-stellar-address",
    recipientTooShort: "GABC",
    // Transfer tokens
    tokenNoChain: ":xlm",
    tokenNoToken: "stellar:",
    tokenBadName: "stellar:NOTATOKEN",
    // Signer field in POST /transfers is OPTIONAL for Stellar (uses admin signer by default)
    transferSignerOptional: true,
    // Signer registration — Stellar uses a locator string, not an object
    // Format: { signer: "external-wallet:GA7QYNF7..." }  (NO chain field)
    generateKey: async () => ({ address: await generateStellarAddress() }),
    buildHappySigner: (key) => ({
        signer: `external-wallet:${key.address}`,
    }),
    buildInvalidSignerBodies: (key) => [
        { name: "signer = null", body: { signer: null } },
        { name: "signer = '' (empty string)", body: { signer: "" } },
        { name: "signer = {} (object, not string)", body: { signer: {} } },
        { name: "signer = 123 (number, not string)", body: { signer: 123 } },
        { name: "signer with invalid type 'hardware-key'", body: { signer: `hardware-key:${key.address}` } },
        { name: "signer with unsupported delegated type 'api-key'", body: { signer: `api-key:${key.address}` } },
        { name: "signer with invalid Stellar address", body: { signer: "external-wallet:not-a-stellar-address" } },
        { name: "signer with too-short Stellar address", body: { signer: "external-wallet:GABC" } },
        { name: "signer with EVM-format address (wrong for Stellar)", body: { signer: "external-wallet:0x000000000000000000000000000000000000dead" } },
    ],
    // Approval — Stellar uses base64-encoded 64-byte Ed25519 signature strings
    fakeSigner: null, // set in setup: `external-wallet:${deadWallet}`
    validApprovalSig: null, // set in setup: random 64-byte base64 string
    buildInvalidSigs: (_v) => [
        { name: "sig = null", sig: null },
        { name: "sig = '' (empty string)", sig: "" },
        { name: "sig = {} (object, not string)", sig: {} },
        { name: "sig = {r,s} object (EVM format, wrong for Stellar)", sig: { r: "0x" + "aa".repeat(32), s: "0x" + "bb".repeat(32) } },
        { name: "sig = hex string (not base64)", sig: "0x" + "aa".repeat(32) },
        { name: "sig too short ('abc')", sig: "abc" },
        { name: "sig = wrong-length base64 (32 bytes instead of 64)", sig: b64encode(new Uint8Array(32)) },
    ],
};

// ─── Test framework ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        failed++;
        failures.push({ name, error: err.message });
        console.log(`  ✗ ${name}`);
        console.log(`    └─ ${err.message.slice(0, 160)}`);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg ?? "Assertion failed");
}

function assertStatus(r, allowed) {
    const codes = Array.isArray(allowed) ? allowed : [allowed];
    if (!codes.includes(r.status)) {
        const body = JSON.stringify(r.body)?.slice(0, 200) ?? "";
        throw new Error(`Expected HTTP ${codes.join(" or ")}, got ${r.status}. Body: ${body}`);
    }
}

function assertClientError(r, allowed = null) {
    if (allowed !== null) {
        assertStatus(r, allowed);
    } else {
        if (r.status < 400 || r.status >= 500) {
            const body = JSON.stringify(r.body)?.slice(0, 200) ?? "";
            throw new Error(`Expected 4xx error, got ${r.status}. Body: ${body}`);
        }
    }
}

function assertNoServerError(r) {
    assert(
        r.status < 500,
        `Got unexpected 5xx: ${r.status}. Body: ${JSON.stringify(r.body)?.slice(0, 200)}`
    );
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function apiRaw(method, path, body, apiKey, base = API_BASE, extraHeaders = {}) {
    const url = `${base}/${path}`;
    const res = await fetch(url, {
        method,
        headers: Object.assign(
            { "Content-Type": "application/json" },
            apiKey != null ? { "x-api-key": String(apiKey) } : {},
            extraHeaders
        ),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, body: json };
}

async function api(method, path, body, apiKey, base = API_BASE) {
    const r = await apiRaw(method, path, body, apiKey, base);
    if (!r.ok) {
        throw new Error(`${method} ${path} → ${r.status}: ${JSON.stringify(r.body)?.slice(0, 300)}`);
    }
    return r.body;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setup(apiKey) {
    console.log("\n⚙  Setup: creating EVM fixture wallet + fake device locator...");

    // Build a valid-format but unregistered device locator for EVM tests
    const unregisteredKey = await generateDeviceKey();
    const rawPub = new Uint8Array(65);
    rawPub[0] = 0x04;
    const xHex = BigInt(unregisteredKey.publicKey.x).toString(16).padStart(64, "0");
    const yHex = BigInt(unregisteredKey.publicKey.y).toString(16).padStart(64, "0");
    for (let i = 0; i < 32; i++) rawPub[1 + i] = parseInt(xHex.slice(i * 2, i * 2 + 2), 16);
    for (let i = 0; i < 32; i++) rawPub[33 + i] = parseInt(yHex.slice(i * 2, i * 2 + 2), 16);
    FAKE_DEVICE_LOCATOR = "device:" + Buffer.from(rawPub).toString("base64");

    EVM_CFG.fakeSigner = FAKE_DEVICE_LOCATOR;

    const evmAdmin = generateAdminAccount();
    const evmWallet = await api(
        "POST",
        "wallets",
        {
            chainType: "evm",
            type: "smart",
            config: { adminSigner: { type: "external-wallet", address: evmAdmin.address } },
            owner: `userId:stress-evm-${Date.now()}`,
        },
        apiKey
    );
    console.log(`   EVM wallet:    ${evmWallet.address}`);

    // Solana setup
    console.log("\n⚙  Setup: creating Solana fixture wallet...");
    SOLANA_CFG.fakeSigner = `external-wallet:${SOLANA_CFG.deadWallet}`;
    SOLANA_CFG.validApprovalSig = bs58encode(crypto.getRandomValues(new Uint8Array(64)));

    const solanaAdmin = await generateSolanaAddress();
    const solanaWallet = await api(
        "POST",
        "wallets",
        {
            chainType: "solana",
            type: "smart",
            config: { adminSigner: { type: "external-wallet", address: solanaAdmin } },
            owner: `userId:stress-solana-${Date.now()}`,
        },
        apiKey
    );
    console.log(`   Solana wallet: ${solanaWallet.address}`);

    // Stellar setup
    console.log("\n⚙  Setup: creating Stellar fixture wallet...");
    STELLAR_CFG.fakeSigner = `external-wallet:${STELLAR_CFG.deadWallet}`;
    STELLAR_CFG.validApprovalSig = b64encode(crypto.getRandomValues(new Uint8Array(64)));

    const stellarAdmin = await generateStellarAddress();
    const stellarWallet = await api(
        "POST",
        "wallets",
        {
            chainType: "stellar",
            type: "smart",
            config: { adminSigner: { type: "external-wallet", address: stellarAdmin } },
            owner: `userId:stress-stellar-${Date.now()}`,
        },
        apiKey
    );
    console.log(`   Stellar wallet: ${stellarWallet.address}\n`);

    return {
        evmWalletAddress: evmWallet.address,
        solanaWalletAddress: solanaWallet.address,
        stellarWalletAddress: stellarWallet.address,
    };
}

// ─── Suite 1: Authentication (shared) ────────────────────────────────────────

async function suiteAuth(apiKey) {
    console.log("\n▸ Suite 1: Authentication");
    const target = `wallets/${EVM_CFG.deadWallet}`;

    await test("no API key → 401/403", async () => {
        const r = await apiRaw("GET", target, undefined, null);
        assertClientError(r, [401, 403]);
    });

    await test("invalid API key value → 401/403", async () => {
        const r = await apiRaw("GET", target, undefined, "sk_staging_invalid_key_value_xyz");
        assertClientError(r, [401, 403]);
    });

    await test("empty string API key → 401/403", async () => {
        const r = await apiRaw("GET", target, undefined, "");
        assertClientError(r, [401, 403]);
    });

    await test("all-zeros API key (64 chars) → 401/403", async () => {
        const r = await apiRaw("GET", target, undefined, "0".repeat(64));
        assertClientError(r, [401, 403]);
    });

    await test("API key with spaces → 401/403", async () => {
        const r = await apiRaw("GET", target, undefined, "sk staging invalid key");
        assertClientError(r, [401, 403]);
    });
}

// ─── Suite 2: Wallet Creation Validation ──────────────────────────────────────

async function suiteWalletCreate(cfg, apiKey) {
    console.log(`\n▸ Suite 2 [${cfg.name}]: Wallet Creation Validation`);
    const adminAddr = await cfg.generateAdminAddress();
    const goodConfig = { adminSigner: { type: "external-wallet", address: adminAddr } };
    const owner = () => `userId:t-${cfg.name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await test(`${cfg.name} — missing chainType → 400`, async () => {
        const r = await apiRaw("POST", "wallets", { type: "smart", config: goodConfig, owner: owner() }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — chainType = null → 400`, async () => {
        const r = await apiRaw("POST", "wallets", { chainType: null, type: "smart", config: goodConfig, owner: owner() }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — invalid chainType 'blockchain' → 400`, async () => {
        const r = await apiRaw("POST", "wallets", { chainType: "blockchain", type: "smart", config: goodConfig, owner: owner() }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — missing wallet type → 400`, async () => {
        const r = await apiRaw("POST", "wallets", { chainType: cfg.chainType, config: goodConfig, owner: owner() }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — invalid wallet type 'hardware' → 400`, async () => {
        const r = await apiRaw("POST", "wallets", { chainType: cfg.chainType, type: "hardware", config: goodConfig, owner: owner() }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — owner = null → 400`, async () => {
        const r = await apiRaw("POST", "wallets", { chainType: cfg.chainType, type: "smart", config: goodConfig, owner: null }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — config = null → 400`, async () => {
        const r = await apiRaw("POST", "wallets", { chainType: cfg.chainType, type: "smart", config: null, owner: owner() }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — config = {} (no adminSigner) → 400`, async () => {
        const r = await apiRaw("POST", "wallets", { chainType: cfg.chainType, type: "smart", config: {}, owner: owner() }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — config.adminSigner = null → 400`, async () => {
        const r = await apiRaw("POST", "wallets", { chainType: cfg.chainType, type: "smart", config: { adminSigner: null }, owner: owner() }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — config.adminSigner = {} (no type or address) → 400`, async () => {
        const r = await apiRaw("POST", "wallets", { chainType: cfg.chainType, type: "smart", config: { adminSigner: {} }, owner: owner() }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — invalid adminSigner type 'magic-link' → 400`, async () => {
        const r = await apiRaw("POST", "wallets", {
            chainType: cfg.chainType, type: "smart",
            config: { adminSigner: { type: "magic-link", address: adminAddr } }, owner: owner(),
        }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — adminSigner.address = null → 400`, async () => {
        const r = await apiRaw("POST", "wallets", {
            chainType: cfg.chainType, type: "smart",
            config: { adminSigner: { type: "external-wallet", address: null } }, owner: owner(),
        }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — adminSigner.address = '' (empty string) → 400`, async () => {
        const r = await apiRaw("POST", "wallets", {
            chainType: cfg.chainType, type: "smart",
            config: { adminSigner: { type: "external-wallet", address: "" } }, owner: owner(),
        }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — adminSigner.address wrong format → 400`, async () => {
        const r = await apiRaw("POST", "wallets", {
            chainType: cfg.chainType, type: "smart",
            config: { adminSigner: { type: "external-wallet", address: cfg.addrWrongFmt } }, owner: owner(),
        }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — adminSigner.address too short → 400`, async () => {
        const r = await apiRaw("POST", "wallets", {
            chainType: cfg.chainType, type: "smart",
            config: { adminSigner: { type: "external-wallet", address: cfg.addrTooShort } }, owner: owner(),
        }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — owner string 500+ chars → no 5xx`, async () => {
        const r = await apiRaw("POST", "wallets", {
            chainType: cfg.chainType, type: "smart", config: goodConfig,
            owner: `userId:${"x".repeat(500)}`,
        }, apiKey);
        assertNoServerError(r);
    });
}

// ─── Suite 3: Wallet Retrieval ────────────────────────────────────────────────

async function suiteWalletGet(cfg, apiKey) {
    console.log(`\n▸ Suite 3 [${cfg.name}]: Wallet Retrieval`);

    await test(`${cfg.name} — non-existent wallet (valid format) → 404`, async () => {
        const r = await apiRaw("GET", `wallets/${cfg.deadWallet}`, undefined, apiKey);
        assertClientError(r, 404);
    });

    await test(`${cfg.name} — address too short → 400 or 404`, async () => {
        const r = await apiRaw("GET", `wallets/${cfg.addrTooShort}`, undefined, apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — address wrong format → 400 or 404`, async () => {
        const r = await apiRaw("GET", `wallets/${cfg.addrWrongFmt}`, undefined, apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — address with bad chars → 400 or 404`, async () => {
        const r = await apiRaw("GET", `wallets/${cfg.addrBadChars}`, undefined, apiKey);
        assertClientError(r, [400, 404]);
    });
}

// ─── Suite 4: Signer Registration ────────────────────────────────────────────
//
// Body validation is fully parameterized via cfg.buildInvalidSignerBodies(key).
// EVM uses { signer: { type, publicKey }, chain } format.
// Solana uses { signer: { type, address }, chain } format.
// Stellar uses { signer: "type:address" } locator-string format (no chain field).

async function suiteSignerRegistration(cfg, walletAddress, apiKey) {
    console.log(`\n▸ Suite 4 [${cfg.name}]: Signer Registration`);
    const path = `wallets/${walletAddress}/signers`;
    const validKey = await cfg.generateKey();

    // ── URL parameter validation ─────────────────────────────────────────────
    await test(`${cfg.name} — wallet addr too short in POST /signers path → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.addrTooShort}/signers`, cfg.buildHappySigner(validKey), apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — wallet addr wrong format in POST /signers path → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.addrWrongFmt}/signers`, cfg.buildHappySigner(validKey), apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — wallet addr bad chars in POST /signers path → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.addrBadChars}/signers`, cfg.buildHappySigner(validKey), apiKey);
        assertClientError(r, [400, 404]);
    });

    // ── Body field validation (chain-specific) ────────────────────────────────
    for (const { name, body } of cfg.buildInvalidSignerBodies(validKey)) {
        await test(`${cfg.name} — ${name} → 400`, async () => {
            const r = await apiRaw("POST", path, body, apiKey);
            assertNoServerError(r);
            assertClientError(r, 400);
        });
    }

    // ── Resource existence ───────────────────────────────────────────────────
    await test(`${cfg.name} — signer registration on non-existent wallet → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.deadWallet}/signers`, cfg.buildHappySigner(validKey), apiKey);
        // EVM: 404 (wallet not found); Solana/Stellar: 400 (chain/format validation before existence check)
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — duplicate signer add → no 5xx (idempotent or clear error)`, async () => {
        const dupKey = await cfg.generateKey();
        const signerPayload = cfg.buildHappySigner(dupKey);

        const r1 = await apiRaw("POST", path, signerPayload, apiKey);
        assertNoServerError(r1);
        // EVM: first add succeeds; Solana staging: 400 (chain not supported); Stellar: 400 (wallet not deployed)
        assert(r1.ok || (r1.status >= 400 && r1.status < 500), `Unexpected status on first add: ${r1.status}`);

        const r2 = await apiRaw("POST", path, signerPayload, apiKey);
        assertNoServerError(r2);
        assert(
            r2.ok || (r2.status >= 400 && r2.status < 500),
            `Unexpected status on duplicate add: ${r2.status}`
        );
    });
}

// ─── Suite 5: Signature Approval Edge Cases ───────────────────────────────────

async function suiteSignatureApprovals(cfg, walletAddress, apiKey) {
    console.log(`\n▸ Suite 5 [${cfg.name}]: Signature Approval Edge Cases`);
    const sigPath = `wallets/${walletAddress}/signatures/${FAKE_ID}`;
    const approvalsPath = `${sigPath}/approvals`;

    await test(`${cfg.name} — signature ID not a UUID → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${walletAddress}/signatures/not-a-uuid/approvals`,
            { approvals: [{ signer: cfg.fakeSigner, signature: cfg.validApprovalSig }] }, apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — wallet addr too short in sig approvals path → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.addrTooShort}/signatures/${FAKE_ID}/approvals`,
            { approvals: [{ signer: cfg.fakeSigner, signature: cfg.validApprovalSig }] }, apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — wallet addr wrong format in sig approvals path → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.addrWrongFmt}/signatures/${FAKE_ID}/approvals`,
            { approvals: [{ signer: cfg.fakeSigner, signature: cfg.validApprovalSig }] }, apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — GET non-existent signature → 404`, async () => {
        const r = await apiRaw("GET", sigPath, undefined, apiKey);
        assertClientError(r, 404);
    });

    await test(`${cfg.name} — POST approvals to non-existent signature (valid body) → 404`, async () => {
        const r = await apiRaw("POST", approvalsPath,
            { approvals: [{ signer: cfg.fakeSigner, signature: cfg.validApprovalSig }] }, apiKey);
        assertClientError(r, 404);
    });

    await test(`${cfg.name} — POST approvals with null body → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, null, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — POST approvals = null → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, { approvals: null }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — POST approvals with empty array → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, { approvals: [] }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — POST approvals[0] = null → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, { approvals: [null] }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — POST approvals missing 'signer' field → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, { approvals: [{ signature: cfg.validApprovalSig }] }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — POST approvals missing 'signature' field → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, { approvals: [{ signer: cfg.fakeSigner }] }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    for (const { name, sig } of cfg.buildInvalidSigs(cfg.validApprovalSig)) {
        await test(`${cfg.name} — POST approvals — ${name} → 400 or 404`, async () => {
            const r = await apiRaw("POST", approvalsPath, { approvals: [{ signer: cfg.fakeSigner, signature: sig }] }, apiKey);
            assertNoServerError(r);
            assertClientError(r, [400, 404]);
        });
    }

    await test(`${cfg.name} — POST approvals with wrong signer type in locator → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, { approvals: [{ signer: "faketype:somevalue", signature: cfg.validApprovalSig }] }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });
}

// ─── Suite 6: Transfer Edge Cases ─────────────────────────────────────────────

async function suiteTransfers(cfg, walletAddress, apiKey) {
    console.log(`\n▸ Suite 6 [${cfg.name}]: Transfer Edge Cases`);
    const path = `wallets/${walletAddress}/tokens/${cfg.token}/transfers`;
    const signer = cfg.fakeSigner;
    const recipient = cfg.deadWallet;

    await test(`${cfg.name} — wallet addr too short in POST /transfers path → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.addrTooShort}/tokens/${cfg.token}/transfers`,
            { recipient, signer, amount: "0.0001" }, apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — wallet addr wrong format in POST /transfers path → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.addrWrongFmt}/tokens/${cfg.token}/transfers`,
            { recipient, signer, amount: "0.0001" }, apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — wallet addr bad chars in POST /transfers path → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.addrBadChars}/tokens/${cfg.token}/transfers`,
            { recipient, signer, amount: "0.0001" }, apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — token locator no chain prefix → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${walletAddress}/tokens/${cfg.tokenNoChain}/transfers`,
            { recipient, signer, amount: "0.0001" }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — token locator only chain (no token name) → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${walletAddress}/tokens/${cfg.tokenNoToken}/transfers`,
            { recipient, signer, amount: "0.0001" }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — invalid token in path → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${walletAddress}/tokens/${cfg.tokenBadName}/transfers`,
            { recipient, signer, amount: "0.0001" }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — zero amount → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient, signer, amount: "0" }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — negative amount → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient, signer, amount: "-1" }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — non-numeric amount → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient, signer, amount: "lots" }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — amount = null → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient, signer, amount: null }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — missing amount → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient, signer }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — missing recipient → 400`, async () => {
        const r = await apiRaw("POST", path, { signer, amount: "0.0001" }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — recipient = null → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient: null, signer, amount: "0.0001" }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — recipient = '' (empty string) → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient: "", signer, amount: "0.0001" }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — invalid recipient format → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient: cfg.recipientBadFmt, signer, amount: "0.0001" }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — recipient address too short → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient: cfg.recipientTooShort, signer, amount: "0.0001" }, apiKey);
        assertClientError(r, 400);
    });

    // Missing signer: EVM → 400, Solana → 400 or 422 (simulation), Stellar → no 5xx (signer optional)
    await test(`${cfg.name} — missing signer → ${cfg.transferSignerOptional ? "no 5xx" : "400 or 422"}`, async () => {
        const r = await apiRaw("POST", path, { recipient, amount: "0.0001" }, apiKey);
        assertNoServerError(r);
        if (!cfg.transferSignerOptional) {
            assertClientError(r, [400, 422]);
        }
    });

    await test(`${cfg.name} — signer = null → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient, signer: null, amount: "0.0001" }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — signer = '' (empty string) → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient, signer: "", amount: "0.0001" }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — signer with completely invalid format → 400`, async () => {
        const r = await apiRaw("POST", path, { recipient, signer: "completely-invalid", amount: "0.0001" }, apiKey);
        assertClientError(r, 400);
    });

    await test(`${cfg.name} — transfer on non-existent wallet → 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.deadWallet}/tokens/${cfg.token}/transfers`,
            { recipient, signer, amount: "0.0001" }, apiKey);
        assertClientError(r, 404);
    });
}

// ─── Suite 7: Transaction Approval Edge Cases ──────────────────────────────────

async function suiteTxApprovals(cfg, walletAddress, apiKey) {
    console.log(`\n▸ Suite 7 [${cfg.name}]: Transaction Approval Edge Cases`);
    const txPath = `wallets/${walletAddress}/transactions/${FAKE_ID}`;
    const approvalsPath = `${txPath}/approvals`;

    await test(`${cfg.name} — transaction ID not a UUID → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${walletAddress}/transactions/not-a-uuid/approvals`,
            { approvals: [{ signer: cfg.fakeSigner, signature: cfg.validApprovalSig }] }, apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — wallet addr too short in POST /tx/approvals path → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.addrTooShort}/transactions/${FAKE_ID}/approvals`,
            { approvals: [{ signer: cfg.fakeSigner, signature: cfg.validApprovalSig }] }, apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — wallet addr wrong format in POST /tx/approvals path → 400 or 404`, async () => {
        const r = await apiRaw("POST", `wallets/${cfg.addrWrongFmt}/transactions/${FAKE_ID}/approvals`,
            { approvals: [{ signer: cfg.fakeSigner, signature: cfg.validApprovalSig }] }, apiKey);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — GET non-existent transaction → 404`, async () => {
        const r = await apiRaw("GET", txPath, undefined, apiKey);
        assertClientError(r, 404);
    });

    await test(`${cfg.name} — POST approval to non-existent transaction (valid body) → 404`, async () => {
        const r = await apiRaw("POST", approvalsPath,
            { approvals: [{ signer: cfg.fakeSigner, signature: cfg.validApprovalSig }] }, apiKey);
        assertClientError(r, 404);
    });

    await test(`${cfg.name} — POST approval with null body → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, null, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — POST approvals = null → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, { approvals: null }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — POST approval with empty approvals array → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, { approvals: [] }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — POST approvals[0] = null → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, { approvals: [null] }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    await test(`${cfg.name} — POST approval with missing signer field → 400 or 404`, async () => {
        const r = await apiRaw("POST", approvalsPath, { approvals: [{ signature: cfg.validApprovalSig }] }, apiKey);
        assertNoServerError(r);
        assertClientError(r, [400, 404]);
    });

    for (const { name, sig } of cfg.buildInvalidSigs(cfg.validApprovalSig)) {
        await test(`${cfg.name} — POST tx approval — ${name} → 400 or 404`, async () => {
            const r = await apiRaw("POST", approvalsPath, { approvals: [{ signer: cfg.fakeSigner, signature: sig }] }, apiKey);
            assertNoServerError(r);
            assertClientError(r, [400, 404]);
        });
    }
}

// ─── Suite 8: Idempotency (shared) ────────────────────────────────────────────

async function suiteIdempotency(apiKey) {
    console.log("\n▸ Suite 8: Idempotency");

    await test("EVM — create wallet with same owner twice → consistent, no 5xx", async () => {
        const owner = `userId:idem-${Date.now()}`;
        const admin = generateAdminAccount();
        const payload = {
            chainType: "evm", type: "smart",
            config: { adminSigner: { type: "external-wallet", address: admin.address } }, owner,
        };

        const r1 = await apiRaw("POST", "wallets", payload, apiKey);
        assert(r1.ok, `First create failed: ${r1.status}: ${JSON.stringify(r1.body)?.slice(0, 200)}`);

        const r2 = await apiRaw("POST", "wallets", payload, apiKey);
        assertNoServerError(r2);

        if (r2.ok) {
            assert(r1.body?.address === r2.body?.address,
                `Idempotent create returned different addresses: ${r1.body?.address} vs ${r2.body?.address}`);
        } else {
            assertClientError(r2, [400, 409]);
        }
    });

    await test("EVM — add same device signer twice → no 5xx (idempotent or clear error)", async () => {
        const freshAdmin = generateAdminAccount();
        const walletRes = await api("POST", "wallets", {
            chainType: "evm", type: "smart",
            config: { adminSigner: { type: "external-wallet", address: freshAdmin.address } },
            owner: `userId:idem-dup-${Date.now()}`,
        }, apiKey);

        const dupKey = await generateDeviceKey();
        const signerPayload = { signer: { type: "device", publicKey: dupKey.publicKey }, chain: "base-sepolia" };

        const r1 = await apiRaw("POST", `wallets/${walletRes.address}/signers`, signerPayload, apiKey);
        assertNoServerError(r1);
        assert(r1.ok, `First signer add failed: ${r1.status}: ${JSON.stringify(r1.body)?.slice(0, 200)}`);

        const r2 = await apiRaw("POST", `wallets/${walletRes.address}/signers`, signerPayload, apiKey);
        assertNoServerError(r2);
        assert(r2.ok || (r2.status >= 400 && r2.status < 500), `Unexpected status on duplicate signer add: ${r2.status}`);
    });

    await test("EVM — fund wallet multiple times → no 5xx", async () => {
        const admin = generateAdminAccount();
        const walletRes = await api("POST", "wallets", {
            chainType: "evm", type: "smart",
            config: { adminSigner: { type: "external-wallet", address: admin.address } },
            owner: `userId:idem-fund-${Date.now()}`,
        }, apiKey);

        const fundBody = { amount: 1, token: "usdxm", chain: "base-sepolia" };
        const r1 = await apiRaw("POST", `wallets/${walletRes.address}/balances`, fundBody, apiKey, FUND_BASE);
        assertNoServerError(r1);

        const r2 = await apiRaw("POST", `wallets/${walletRes.address}/balances`, fundBody, apiKey, FUND_BASE);
        assertNoServerError(r2);
    });
}

// ─── Suite 9: x-idempotency-key Header (shared) ───────────────────────────────

async function suiteIdempotencyKey(evmWalletAddress, apiKey) {
    console.log("\n▸ Suite 9: x-idempotency-key Header");
    const idemKey = () => `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await test("POST /wallets — x-idempotency-key rejected when owner is present → 400", async () => {
        const admin = generateAdminAccount();
        const r = await apiRaw("POST", "wallets", {
            chainType: "evm", type: "smart",
            config: { adminSigner: { type: "external-wallet", address: admin.address } },
            owner: `userId:idemkey-${Date.now()}`,
        }, apiKey, API_BASE, { "x-idempotency-key": idemKey() });
        assertClientError(r, 400);
        assert(
            r.body?.message?.includes("idempotency") || r.body?.message?.includes("owner"),
            `Expected conflict error message, got: ${JSON.stringify(r.body?.message)}`
        );
    });

    await test("POST /wallets — x-idempotency-key with empty value → no 5xx", async () => {
        const admin = generateAdminAccount();
        const r = await apiRaw("POST", "wallets", {
            chainType: "evm", type: "smart",
            config: { adminSigner: { type: "external-wallet", address: admin.address } },
            owner: `userId:idemkey-empty-${Date.now()}`,
        }, apiKey, API_BASE, { "x-idempotency-key": "" });
        assertNoServerError(r);
    });

    await test("POST /wallets — x-idempotency-key with 500 char value → no 5xx", async () => {
        const admin = generateAdminAccount();
        const r = await apiRaw("POST", "wallets", {
            chainType: "evm", type: "smart",
            config: { adminSigner: { type: "external-wallet", address: admin.address } },
            owner: `userId:idemkey-long-${Date.now()}`,
        }, apiKey, API_BASE, { "x-idempotency-key": "x".repeat(500) });
        assertNoServerError(r);
    });

    await test("POST /wallets — x-idempotency-key with special chars → no 5xx", async () => {
        const admin = generateAdminAccount();
        const r = await apiRaw("POST", "wallets", {
            chainType: "evm", type: "smart",
            config: { adminSigner: { type: "external-wallet", address: admin.address } },
            owner: `userId:idemkey-special-${Date.now()}`,
        }, apiKey, API_BASE, { "x-idempotency-key": "key/with:special@chars!and#symbols$()" });
        assertNoServerError(r);
    });

    await test("POST /signers — same x-idempotency-key twice → no 5xx", async () => {
        const key = idemKey();
        const dupKey = await generateDeviceKey();
        const signerPayload = { signer: { type: "device", publicKey: dupKey.publicKey }, chain: "base-sepolia" };

        const r1 = await apiRaw("POST", `wallets/${evmWalletAddress}/signers`, signerPayload, apiKey, API_BASE, { "x-idempotency-key": key });
        assertNoServerError(r1);
        assert(r1.ok, `First signer add failed: ${r1.status}: ${JSON.stringify(r1.body)?.slice(0, 200)}`);

        const r2 = await apiRaw("POST", `wallets/${evmWalletAddress}/signers`, signerPayload, apiKey, API_BASE, { "x-idempotency-key": key });
        assertNoServerError(r2);
    });

    await test("POST /transfers — x-idempotency-key on non-existent wallet → still 404", async () => {
        const r = await apiRaw("POST", `wallets/${EVM_CFG.deadWallet}/tokens/${EVM_CFG.token}/transfers`,
            { recipient: EVM_CFG.deadWallet, signer: FAKE_DEVICE_LOCATOR, amount: "0.0001" },
            apiKey, API_BASE, { "x-idempotency-key": idemKey() });
        assertClientError(r, 404);
    });

    await test("POST /tx/approvals — x-idempotency-key on non-existent tx → still 404", async () => {
        const r = await apiRaw("POST", `wallets/${evmWalletAddress}/transactions/${FAKE_ID}/approvals`,
            { approvals: [{ signer: FAKE_DEVICE_LOCATOR, signature: { r: "0x" + "aa".repeat(32), s: "0x" + "bb".repeat(32) } }] },
            apiKey, API_BASE, { "x-idempotency-key": idemKey() });
        assertClientError(r, 404);
    });

    await test("POST /sig/approvals — x-idempotency-key on non-existent sig → still 404", async () => {
        const r = await apiRaw("POST", `wallets/${evmWalletAddress}/signatures/${FAKE_ID}/approvals`,
            { approvals: [{ signer: FAKE_DEVICE_LOCATOR, signature: { r: "0x" + "aa".repeat(32), s: "0x" + "bb".repeat(32) } }] },
            apiKey, API_BASE, { "x-idempotency-key": idemKey() });
        assertClientError(r, 404);
    });

    await test("POST /wallets — different payload, same x-idempotency-key → no 5xx", async () => {
        const key = idemKey();
        const admin1 = generateAdminAccount();
        const admin2 = generateAdminAccount();

        const r1 = await apiRaw("POST", "wallets", {
            chainType: "evm", type: "smart",
            config: { adminSigner: { type: "external-wallet", address: admin1.address } },
            owner: `userId:idemkey-diff1-${Date.now()}`,
        }, apiKey, API_BASE, { "x-idempotency-key": key });
        assertNoServerError(r1);

        const r2 = await apiRaw("POST", "wallets", {
            chainType: "evm", type: "smart",
            config: { adminSigner: { type: "external-wallet", address: admin2.address } },
            owner: `userId:idemkey-diff2-${Date.now()}`,
        }, apiKey, API_BASE, { "x-idempotency-key": key });
        assertNoServerError(r2);
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const apiKey = process.env.CROSSMINT_API_KEY;
if (!apiKey) {
    console.error("Error: CROSSMINT_API_KEY environment variable is required");
    process.exit(1);
}

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║   Crossmint Wallet API — Stress & Edge Case Tests        ║");
console.log("║              EVM + Solana + Stellar                       ║");
console.log("╚════════════════════════════════════════════════════════════╝");

try {
    const { evmWalletAddress, solanaWalletAddress, stellarWalletAddress } = await setup(apiKey);

    await suiteAuth(apiKey);

    // ── EVM suites ────────────────────────────────────────────────────────────
    await suiteWalletCreate(EVM_CFG, apiKey);
    await suiteWalletGet(EVM_CFG, apiKey);
    await suiteSignerRegistration(EVM_CFG, evmWalletAddress, apiKey);
    await suiteSignatureApprovals(EVM_CFG, evmWalletAddress, apiKey);
    await suiteTransfers(EVM_CFG, evmWalletAddress, apiKey);
    await suiteTxApprovals(EVM_CFG, evmWalletAddress, apiKey);

    // ── Solana suites ─────────────────────────────────────────────────────────
    await suiteWalletCreate(SOLANA_CFG, apiKey);
    await suiteWalletGet(SOLANA_CFG, apiKey);
    await suiteSignerRegistration(SOLANA_CFG, solanaWalletAddress, apiKey);
    await suiteSignatureApprovals(SOLANA_CFG, solanaWalletAddress, apiKey);
    await suiteTransfers(SOLANA_CFG, solanaWalletAddress, apiKey);
    await suiteTxApprovals(SOLANA_CFG, solanaWalletAddress, apiKey);

    // ── Stellar suites ────────────────────────────────────────────────────────
    await suiteWalletCreate(STELLAR_CFG, apiKey);
    await suiteWalletGet(STELLAR_CFG, apiKey);
    await suiteSignerRegistration(STELLAR_CFG, stellarWalletAddress, apiKey);
    await suiteSignatureApprovals(STELLAR_CFG, stellarWalletAddress, apiKey);
    await suiteTransfers(STELLAR_CFG, stellarWalletAddress, apiKey);
    await suiteTxApprovals(STELLAR_CFG, stellarWalletAddress, apiKey);

    // ── Shared suites (run once) ───────────────────────────────────────────────
    await suiteIdempotency(apiKey);
    await suiteIdempotencyKey(evmWalletAddress, apiKey);
} catch (err) {
    console.error(`\n❌ Setup or unexpected error: ${err.message}`);
    if (err.stack) console.error(err.stack);
    process.exit(1);
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log("\n" + "─".repeat(62));
console.log(`Results: ${passed}/${total} passed  |  ${failed} failed`);

if (failures.length > 0) {
    console.log("\nFailed tests:");
    for (const f of failures) {
        console.log(`  ✗ ${f.name}`);
        console.log(`    └─ ${f.error.slice(0, 200)}`);
    }
}

process.exit(failed > 0 ? 1 : 0);
