import { createPrivateKey, sign as nodeSign, webcrypto } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import { Keypair as StellarKeypair } from "@stellar/stellar-sdk";
import type { APIRequestContext } from "@playwright/test";

const crypto: Crypto = webcrypto as any;

export const API_BASE = "https://staging.crossmint.com/api/2025-06-09";
export const FUND_BASE = "https://staging.crossmint.com/api/v1-alpha2";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;

export interface DeviceKey {
    privateKey: CryptoKey;
    publicKey: { x: string; y: string };
    locator: string;
    credentialId: string;
}

export interface DeviceSignature {
    r: string;
    s: string;
}

function bytesToDecimal(b: Uint8Array): string {
    return BigInt(
        "0x" +
            Array.from(b)
                .map((n) => n.toString(16).padStart(2, "0"))
                .join("")
    ).toString(10);
}

export async function generateDeviceKey(): Promise<DeviceKey> {
    const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
        "sign",
        "verify",
    ]);

    const rawBuf = await crypto.subtle.exportKey("raw", publicKey);
    const raw = new Uint8Array(rawBuf);
    const xBytes = raw.slice(1, 33);
    const yBytes = raw.slice(33, 65);

    const xDecimal = bytesToDecimal(xBytes);
    const yDecimal = bytesToDecimal(yBytes);

    const locator = `device:${Buffer.from(raw).toString("base64")}`;

    const yBig = BigInt(yDecimal);
    const prefix = yBig % BigInt(2) === BigInt(0) ? 0x02 : 0x03;
    const xHex = BigInt(xDecimal).toString(16).padStart(64, "0");
    const credentialId = prefix.toString(16).padStart(2, "0") + xHex;

    return { privateKey, publicKey: { x: xDecimal, y: yDecimal }, locator, credentialId };
}

function parseDERSig(der: Uint8Array): { r: Uint8Array; s: Uint8Array } {
    let pos = 0;
    if (der[pos++] !== 0x30) throw new Error("DER: expected SEQUENCE");
    let totalLen = der[pos++]!;
    if (totalLen & 0x80) {
        const nBytes = totalLen & 0x7f;
        totalLen = 0;
        for (let i = 0; i < nBytes; i++) totalLen = (totalLen << 8) | der[pos++]!;
    }
    if (der[pos++] !== 0x02) throw new Error("DER: expected INTEGER (r)");
    const rLen = der[pos++]!;
    let r = der.slice(pos, pos + rLen);
    pos += rLen;
    if (der[pos++] !== 0x02) throw new Error("DER: expected INTEGER (s)");
    const sLen = der[pos++]!;
    let s = der.slice(pos, pos + sLen);
    while (r.length > 1 && r[0] === 0) r = r.slice(1);
    while (s.length > 1 && s[0] === 0) s = s.slice(1);
    return { r, s };
}

function uint8ToHex32(b: Uint8Array): string {
    return (
        "0x" +
        Array.from(b)
            .map((n) => n.toString(16).padStart(2, "0"))
            .join("")
            .padStart(64, "0")
    );
}

export async function signWithDevice(privateKey: CryptoKey, message: string): Promise<DeviceSignature> {
    const messageBuf = message.startsWith("0x") ? Buffer.from(message.slice(2), "hex") : Buffer.from(message, "base64");
    const messageBytes = new Uint8Array(messageBuf);

    const pkcs8DerBuf = await crypto.subtle.exportKey("pkcs8", privateKey);
    const pkcs8DerBytes = new Uint8Array(pkcs8DerBuf);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeKey = createPrivateKey({ key: pkcs8DerBytes as any, format: "der", type: "pkcs8" });

    // null hash = treat messageBytes as pre-computed digest, no additional SHA-256
    const derSigBuf = nodeSign(null, messageBytes, nodeKey);
    const derSig = new Uint8Array(derSigBuf);

    const { r, s } = parseDERSig(derSig);
    return { r: uint8ToHex32(r), s: uint8ToHex32(s) };
}

export function generateAdminAccount() {
    const privateKey = generatePrivateKey();
    return privateKeyToAccount(privateKey);
}

export function generateSolanaAddress(): string {
    return SolanaKeypair.generate().publicKey.toBase58();
}

export function generateStellarAddress(): string {
    return StellarKeypair.random().publicKey();
}

type PlaywrightResponse = Awaited<ReturnType<APIRequestContext["post"]>>;

export async function apiPost(
    request: APIRequestContext,
    path: string,
    body: Record<string, unknown>,
    baseUrl = API_BASE
): Promise<PlaywrightResponse> {
    return request.post(`${baseUrl}/${path}`, { data: body });
}

export async function apiGet(
    request: APIRequestContext,
    path: string,
    baseUrl = API_BASE
): Promise<Record<string, unknown>> {
    const res = await request.get(`${baseUrl}/${path}`);
    if (!res.ok()) {
        const text = await res.text();
        throw new Error(`GET ${path} → ${res.status()} ${text}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
}

export async function createWallet(
    request: APIRequestContext,
    params: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const res = await apiPost(request, "wallets", params);
    if (!res.ok()) {
        const text = await res.text();
        throw new Error(`createWallet → ${res.status()} ${text}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
}

export async function registerSigner(
    request: APIRequestContext,
    walletAddress: string,
    signerBody: Record<string, unknown>
): Promise<PlaywrightResponse> {
    return apiPost(request, `wallets/${walletAddress}/signers`, signerBody);
}

export async function fundWallet(
    request: APIRequestContext,
    address: string,
    chain: string,
    amount = 1,
    token = "usdxm"
): Promise<void> {
    const res = await apiPost(request, `wallets/${address}/balances`, { amount, token, chain }, FUND_BASE);
    if (!res.ok()) {
        const text = await res.text();
        throw new Error(`fundWallet → ${res.status()} ${text}`);
    }
    await new Promise((r) => setTimeout(r, 5_000));
}

export async function createTransfer(
    request: APIRequestContext,
    walletAddress: string,
    signerLocator: string,
    token: string,
    to: string,
    amount = "0.0001"
): Promise<{ txId: string; message: string; approvalSignerLocator: string }> {
    const res = await apiPost(request, `wallets/${walletAddress}/tokens/${token}/transfers`, {
        recipient: to,
        signer: signerLocator,
        amount,
    });
    if (!res.ok()) {
        const text = await res.text();
        throw new Error(`createTransfer → ${res.status()} ${text}`);
    }
    const tx = (await res.json()) as Record<string, unknown>;

    const txId = tx?.id as string;
    if (!txId) throw new Error(`No transaction ID in response: ${JSON.stringify(tx)}`);

    const txApprovals = tx?.approvals as Record<string, unknown> | undefined;
    let pending = txApprovals?.pending as Array<Record<string, unknown>> | undefined;
    if (!pending?.length) {
        const full = await apiGet(request, `wallets/${walletAddress}/transactions/${txId}`);
        const fullApprovals = full?.approvals as Record<string, unknown> | undefined;
        pending = fullApprovals?.pending as Array<Record<string, unknown>> | undefined;
    }

    if (!pending?.length) throw new Error(`No pending approvals for transaction: ${JSON.stringify(tx)}`);

    const approval = pending[0]!;
    const message = approval.message as string;
    if (!message) throw new Error(`No message in pending approval: ${JSON.stringify(approval)}`);

    const approvalSigner = approval.signer as Record<string, unknown> | undefined;
    const approvalSignerLocator = (approvalSigner?.locator as string) ?? signerLocator;
    return { txId, message, approvalSignerLocator };
}

export async function approveTransaction(
    request: APIRequestContext,
    walletAddress: string,
    txId: string,
    approvals: Array<{ signer: string; signature: unknown }>
): Promise<PlaywrightResponse> {
    return apiPost(request, `wallets/${walletAddress}/transactions/${txId}/approvals`, { approvals });
}

async function pollUntil(
    request: APIRequestContext,
    path: string,
    target: string,
    timeoutMs: number
): Promise<Record<string, unknown>> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const result = await apiGet(request, path);
        const status = result?.status as string;
        if (status === "failed") throw new Error(`${path} failed: ${JSON.stringify(result)}`);
        if (status === target) return result;
    }
    throw new Error(`${path} timed out after ${timeoutMs}ms`);
}

export async function pollTransaction(
    request: APIRequestContext,
    walletAddress: string,
    txId: string,
    target = "success",
    timeoutMs = POLL_TIMEOUT_MS
): Promise<Record<string, unknown>> {
    return pollUntil(request, `wallets/${walletAddress}/transactions/${txId}`, target, timeoutMs);
}

export async function fetchLastSignerLocator(request: APIRequestContext, walletAddress: string): Promise<string> {
    const wallet = await apiGet(request, `wallets/${walletAddress}`);
    const config = wallet?.config as Record<string, unknown> | undefined;
    const signers = config?.delegatedSigners as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(signers) || signers.length === 0) {
        throw new Error(`No delegated signers found in wallet: ${JSON.stringify(wallet)}`);
    }
    const locator = signers[signers.length - 1]?.locator as string;
    if (!locator) throw new Error(`Delegated signer has no locator: ${JSON.stringify(signers)}`);
    return locator;
}

async function pollSignature(request: APIRequestContext, walletAddress: string, signatureId: string): Promise<void> {
    await pollUntil(request, `wallets/${walletAddress}/signatures/${signatureId}`, "success", POLL_TIMEOUT_MS);
}

export async function addDeviceSigner(
    request: APIRequestContext,
    walletAddress: string,
    deviceKey: DeviceKey,
    adminAccount: ReturnType<typeof generateAdminAccount>,
    chain: string
): Promise<string> {
    const res = await apiPost(request, `wallets/${walletAddress}/signers`, {
        signer: { type: "device", publicKey: deviceKey.publicKey },
        chain,
    });
    if (!res.ok()) {
        const text = await res.text();
        throw new Error(`addDeviceSigner → ${res.status()} ${text}`);
    }
    const signerResp = (await res.json()) as Record<string, unknown>;

    const deviceLocator = (signerResp?.locator as string) ?? deviceKey.locator;
    const chains = signerResp?.chains as Record<string, unknown> | undefined;
    const chainData = chains?.[chain] as Record<string, unknown> | undefined;

    if (!chainData?.id) throw new Error(`No signature ID for chain ${chain}: ${JSON.stringify(signerResp)}`);

    const signatureId = chainData.id as string;
    const status = chainData.status as string;

    if (status === "success") return deviceLocator;
    if (status === "pending") {
        await pollSignature(request, walletAddress, signatureId);
        return deviceLocator;
    }

    const chainApprovals = chainData.approvals as Record<string, unknown> | undefined;
    let pendingList = chainApprovals?.pending as Array<Record<string, unknown>> | undefined;
    let pendingApproval = pendingList?.[0];

    if (!pendingApproval) {
        const sigReq = await apiGet(request, `wallets/${walletAddress}/signatures/${signatureId}`);
        const sigApprovals = sigReq?.approvals as Record<string, unknown> | undefined;
        pendingList = sigApprovals?.pending as Array<Record<string, unknown>> | undefined;
        pendingApproval = pendingList?.[0];
        if (!pendingApproval) throw new Error(`No pending approvals found: ${JSON.stringify(sigReq)}`);
    }

    const message = pendingApproval.message as string;
    const sig = await adminAccount.signMessage({ message: { raw: message as `0x${string}` } });
    const adminLocator = `external-wallet:${adminAccount.address}`;

    await apiPost(request, `wallets/${walletAddress}/signatures/${signatureId}/approvals`, {
        approvals: [{ signer: adminLocator, signature: sig }],
    });

    await pollSignature(request, walletAddress, signatureId);
    return deviceLocator;
}
