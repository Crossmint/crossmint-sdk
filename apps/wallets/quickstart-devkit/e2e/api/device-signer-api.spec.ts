import { test, expect } from "@playwright/test";
import type { APIRequestContext, APIRequest } from "@playwright/test";
import {
    AUTH_CONFIG,
    DEVICE_SIGNER_CHAINS,
    TEST_RECIPIENT_WALLET_ADDRESSES,
    validateAPITestConfig,
} from "../config/constants";
import {
    API_BASE,
    generateDeviceKey,
    generateAdminAccount,
    generateSolanaAddress,
    generateStellarAddress,
    signWithDevice,
    createWallet,
    registerSigner,
    fundWallet,
    createTransfer,
    approveTransaction,
    pollTransaction,
    fetchLastSignerLocator,
    addDeviceSigner,
    apiPost,
    apiGet,
} from "./helpers/device-signer";

validateAPITestConfig();

const API_KEY = AUTH_CONFIG.crossmintApiKey;
const EVM = DEVICE_SIGNER_CHAINS.evm;
const SOL = DEVICE_SIGNER_CHAINS.solana;
const STELLAR = DEVICE_SIGNER_CHAINS.stellar;

async function makeApiContext(playwrightRequest: APIRequest): Promise<APIRequestContext> {
    return playwrightRequest.newContext({
        baseURL: API_BASE,
        extraHTTPHeaders: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json",
        },
    });
}

async function expectErrorResponse(res: Awaited<ReturnType<APIRequestContext["post"]>>, status: number): Promise<void> {
    expect(res.status()).toBe(status);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.message ?? body.error).toBeTruthy();
}

test.describe("Device Signer — EVM (base-sepolia)", () => {
    test.describe("Happy Path", () => {
        test("device signer included at wallet creation can sign and confirm a transfer", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const device = await generateDeviceKey();

            const wallet = await createWallet(api, {
                chainType: EVM.chainType,
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "0x05a29d789231c290de91cc62e6dbf220894a7a6c",
                    },
                    delegatedSigners: [
                        {
                            signer: { type: "device", publicKey: device.publicKey },
                            chain: EVM.chainId,
                        },
                    ],
                },
                owner: `userId:e2e-flow1-${Date.now()}`,
            });

            expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(wallet.type).toBe("smart");
            expect(wallet.chainType).toBe(EVM.chainType);

            const signerLocator = await fetchLastSignerLocator(api, wallet.address as string);
            expect(signerLocator).toMatch(/^device:/);

            await fundWallet(api, wallet.address as string, EVM.chainId);

            const { txId, message, approvalSignerLocator } = await createTransfer(
                api,
                wallet.address as string,
                signerLocator,
                EVM.token,
                TEST_RECIPIENT_WALLET_ADDRESSES.evm
            );
            expect(txId).toMatch(/^[0-9a-f-]{36}$/);
            expect(message).toBeTruthy();

            const sig = await signWithDevice(device.privateKey, message);
            expect(sig.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
            expect(sig.s).toMatch(/^0x[a-fA-F0-9]{64}$/);

            const approvalRes = await approveTransaction(api, wallet.address as string, txId, [
                { signer: approvalSignerLocator, signature: sig },
            ]);
            expect(approvalRes.ok()).toBe(true);

            const final = await pollTransaction(api, wallet.address as string, txId);
            expect(final.status).toBe("success");
            expect((final.onChain as Record<string, unknown>)?.txId).toBeTruthy();
        });

        test("device signer added after wallet creation can sign and confirm a transfer", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const admin = generateAdminAccount();
            const device = await generateDeviceKey();

            const wallet = await createWallet(api, {
                chainType: EVM.chainType,
                type: "smart",
                config: {
                    adminSigner: { type: "external-wallet", address: admin.address },
                },
                owner: `userId:e2e-flow2-${Date.now()}`,
            });

            expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(wallet.type).toBe("smart");

            const signerLocator = await addDeviceSigner(api, wallet.address as string, device, admin, EVM.chainId);
            expect(signerLocator).toMatch(/^device:/);

            const walletAfter = await apiGet(api, `wallets/${wallet.address}`);
            const delegated = (walletAfter.config as Record<string, unknown>)?.delegatedSigners as Array<
                Record<string, unknown>
            >;
            expect(delegated.some((s) => s.locator === signerLocator)).toBe(true);

            await fundWallet(api, wallet.address as string, EVM.chainId);

            const { txId, message, approvalSignerLocator } = await createTransfer(
                api,
                wallet.address as string,
                signerLocator,
                EVM.token,
                TEST_RECIPIENT_WALLET_ADDRESSES.evm
            );
            expect(txId).toMatch(/^[0-9a-f-]{36}$/);

            const sig = await signWithDevice(device.privateKey, message);
            expect(sig.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
            expect(sig.s).toMatch(/^0x[a-fA-F0-9]{64}$/);

            const approvalRes = await approveTransaction(api, wallet.address as string, txId, [
                { signer: approvalSignerLocator, signature: sig },
            ]);
            expect(approvalRes.ok()).toBe(true);

            const final = await pollTransaction(api, wallet.address as string, txId);
            expect(final.status).toBe("success");
            expect((final.onChain as Record<string, unknown>)?.txId).toBeTruthy();
        });
    });

    test.describe("Negative — Signer Registration", () => {
        async function createTestWallet(api: APIRequestContext): Promise<string> {
            const wallet = await createWallet(api, {
                chainType: EVM.chainType,
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "0x05a29d789231c290de91cc62e6dbf220894a7a6c",
                    },
                },
                owner: `userId:e2e-neg-${Date.now()}`,
            });
            return wallet.address as string;
        }

        test("device signer registration with empty publicKey.x is rejected", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const walletAddress = await createTestWallet(api);
            const res = await registerSigner(api, walletAddress, {
                signer: { type: "device", publicKey: { x: "", y: "12345" } },
                chain: EVM.chainId,
            });
            await expectErrorResponse(res, 400);
        });

        test("device signer registration with non-numeric publicKey.x is rejected", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const walletAddress = await createTestWallet(api);
            const res = await registerSigner(api, walletAddress, {
                signer: { type: "device", publicKey: { x: "not-a-number", y: "12345" } },
                chain: EVM.chainId,
            });
            await expectErrorResponse(res, 400);
        });

        test("device signer registration with negative publicKey.x is rejected", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const walletAddress = await createTestWallet(api);
            const res = await registerSigner(api, walletAddress, {
                signer: { type: "device", publicKey: { x: "-1", y: "12345" } },
                chain: EVM.chainId,
            });
            await expectErrorResponse(res, 400);
        });

        test("device signer registration on a non-existent wallet returns not found", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const device = await generateDeviceKey();
            const res = await registerSigner(api, "0x0000000000000000000000000000000000000001", {
                signer: { type: "device", publicKey: device.publicKey },
                chain: EVM.chainId,
            });
            await expectErrorResponse(res, 404);
        });

        test("device signer registration without a signer type is rejected", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const walletAddress = await createTestWallet(api);
            const device = await generateDeviceKey();
            const res = await registerSigner(api, walletAddress, {
                signer: { publicKey: device.publicKey },
                chain: EVM.chainId,
            });
            await expectErrorResponse(res, 400);
        });
    });
});

test.describe("Device Signer — Solana", () => {
    test.describe("Happy Path", () => {
        test("Solana wallet is created with a valid base58 address and admin signer config", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const adminAddress = generateSolanaAddress();

            const wallet = await createWallet(api, {
                chainType: SOL.chainType,
                config: {
                    adminSigner: { type: "external-wallet", address: adminAddress },
                },
                owner: `userId:e2e-sol-${Date.now()}`,
            });

            expect(wallet.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
            expect(wallet.chainType).toBe(SOL.chainType);

            const adminSigner = (wallet.config as Record<string, unknown>)?.adminSigner as Record<string, unknown>;
            expect(adminSigner?.type).toBe("external-wallet");
            expect(adminSigner?.address).toBe(adminAddress);
        });

        test("device signer is registered on a Solana wallet", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const adminAddress = generateSolanaAddress();

            const wallet = await createWallet(api, {
                chainType: SOL.chainType,
                config: {
                    adminSigner: { type: "external-wallet", address: adminAddress },
                },
                owner: `userId:e2e-sol-signer-${Date.now()}`,
            });

            const device = await generateDeviceKey();
            const res = await registerSigner(api, wallet.address as string, {
                signer: { type: "device", publicKey: device.publicKey },
                chain: SOL.chainId,
            });

            expect(res.status()).toBe(201);
            const body = (await res.json()) as Record<string, unknown>;
            expect(body.type).toBe("device");
            expect(body.locator).toMatch(/^device:/);
            expect((body.publicKey as Record<string, unknown>)?.x).toBe(device.publicKey.x);
            expect((body.publicKey as Record<string, unknown>)?.y).toBe(device.publicKey.y);
            const tx = body.transaction as Record<string, unknown>;
            expect(tx?.id).toBeTruthy();
            expect(tx?.status).toBeTruthy();
        });
    });

    test.describe("Negative", () => {
        test("wallet creation with an invalid admin address is rejected", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const res = await apiPost(api, "wallets", {
                chainType: SOL.chainType,
                config: {
                    adminSigner: { type: "external-wallet", address: "not-a-valid-address-$$$" },
                },
                owner: `userId:e2e-sol-badaddr-${Date.now()}`,
            });
            await expectErrorResponse(res, 400);
        });
    });
});

test.describe("Device Signer — Stellar", () => {
    test.describe("Happy Path", () => {
        test("Stellar wallet is created with a valid G-address and admin signer config", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const adminAddress = generateStellarAddress();

            const wallet = await createWallet(api, {
                chainType: STELLAR.chainType,
                config: {
                    adminSigner: { type: "external-wallet", address: adminAddress },
                },
                owner: `userId:e2e-stellar-${Date.now()}`,
                linkedUser: `email:stellartest${Date.now()}@example.com`,
            });

            expect(wallet.address).toMatch(/^[GC][A-Z0-9]{55}$/);
            expect(wallet.chainType).toBe(STELLAR.chainType);

            const adminSigner = (wallet.config as Record<string, unknown>)?.adminSigner as Record<string, unknown>;
            expect(adminSigner?.type).toBe("external-wallet");
            expect(adminSigner?.address).toBe(adminAddress);
        });
    });

    test.describe("Negative", () => {
        test("device signer registration on a Stellar wallet is rejected", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const adminAddress = generateStellarAddress();

            const wallet = await createWallet(api, {
                chainType: STELLAR.chainType,
                config: {
                    adminSigner: { type: "external-wallet", address: adminAddress },
                },
                owner: `userId:e2e-stellar-neg-${Date.now()}`,
                linkedUser: `email:stellarneg${Date.now()}@example.com`,
            });

            const device = await generateDeviceKey();
            const res = await registerSigner(api, wallet.address as string, {
                signer: { type: "device", publicKey: device.publicKey },
                chain: STELLAR.chainId,
            });

            await expectErrorResponse(res, 400);
        });

        test("wallet creation with an invalid admin address is rejected", async ({ playwright }) => {
            const api = await makeApiContext(playwright.request);
            const res = await apiPost(api, "wallets", {
                chainType: STELLAR.chainType,
                config: {
                    adminSigner: { type: "external-wallet", address: "INVALID_STELLAR_ADDRESS_$$$$" },
                },
                owner: `userId:e2e-stellar-badaddr-${Date.now()}`,
                linkedUser: `email:stellarbadaddr${Date.now()}@example.com`,
            });
            await expectErrorResponse(res, 400);
        });
    });
});
