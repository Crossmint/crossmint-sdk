import { test, expect } from "@playwright/test";
import { CrossmintWallets, createCrossmint } from "@crossmint/wallets-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import { Keypair as StellarKeypair } from "@stellar/stellar-sdk";
import { AUTH_CONFIG, TEST_RECIPIENT_WALLET_ADDRESSES, validateAPITestConfig } from "../../config/constants";
import { MockDeviceSignerKeyStorage } from "./helpers/mock-device-storage";

validateAPITestConfig();

const API_KEY = AUTH_CONFIG.crossmintApiKey;

function makeSdk() {
    return CrossmintWallets.from(createCrossmint({ apiKey: API_KEY }));
}

function generateSolanaAddress(): string {
    return SolanaKeypair.generate().publicKey.toBase58();
}

function generateStellarAddress(): string {
    return StellarKeypair.random().publicKey();
}

function makeEvmRecovery() {
    const admin = privateKeyToAccount(generatePrivateKey());
    return {
        type: "external-wallet" as const,
        address: admin.address,
        onSign: async (payload: string) =>
            admin.signMessage({ message: { raw: payload as `0x${string}` } }),
    };
}

test.describe("Device Signer — SDK", () => {
    test("createDeviceSigner returns a valid descriptor shape", async () => {
        const sdk = makeSdk();
        const storage = new MockDeviceSignerKeyStorage(API_KEY);
        const desc = await sdk.createDeviceSigner(storage);

        expect(desc.type).toBe("device");
        expect(desc.locator).toMatch(/^device:/);
        expect(desc.publicKey?.x).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(desc.publicKey?.y).toMatch(/^0x[a-fA-F0-9]{64}$/);
        expect(desc.name).toBe("E2E Test Device");
    });

    test.describe("EVM (base-sepolia)", () => {
        test("creates wallet with device signer at creation and confirms a transfer", async () => {
            const sdk = makeSdk();
            const storage = new MockDeviceSignerKeyStorage(API_KEY);
            const deviceDesc = await sdk.createDeviceSigner(storage);

            const wallet = await sdk.createWallet({
                chain: "base-sepolia",
                recovery: makeEvmRecovery(),
                signers: [deviceDesc],
                options: { deviceSignerKeyStorage: storage },
                owner: `userId:sdk-device-evm-${Date.now()}`,
            });

            expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(wallet.chain).toBe("base-sepolia");

            await wallet.stagingFund(1);

            const tx = await wallet.send(TEST_RECIPIENT_WALLET_ADDRESSES.evm, "usdxm", "0.0001");
            expect(tx.hash).toMatch(/^0x[a-fA-F0-9]+$/);
            expect(tx.transactionId).toBeTruthy();
        });

        test("addSigner full flow — device signer confirms a transfer after re-initialization", async () => {
            const sdk = makeSdk();
            const storage = new MockDeviceSignerKeyStorage(API_KEY);
            const deviceDesc = await sdk.createDeviceSigner(storage);

            // Create wallet without device signer — recovery signer only
            const wallet = await sdk.createWallet({
                chain: "base-sepolia",
                recovery: makeEvmRecovery(),
                owner: `userId:sdk-addSigner-full-evm-${Date.now()}`,
            });

            expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);

            const signer = await wallet.addSigner(deviceDesc);
            expect(signer.type).toBe("device");
            expect(signer.locator).toMatch(/^device:/);

            await wallet.stagingFund(1);

            // Re-fetch with storage so the device signer is initialized for signing
            const walletWithDevice = await sdk.getWallet(wallet.address, {
                chain: "base-sepolia",
                options: { deviceSignerKeyStorage: storage },
            });

            const tx = await walletWithDevice.send(TEST_RECIPIENT_WALLET_ADDRESSES.evm, "usdxm", "0.0001");
            expect(tx.hash).toMatch(/^0x[a-fA-F0-9]+$/);
            expect(tx.transactionId).toBeTruthy();
        });

        test("getWallet re-initializes device signer from storage and confirms a transfer", async () => {
            const sdk = makeSdk();
            const storage = new MockDeviceSignerKeyStorage(API_KEY);
            const deviceDesc = await sdk.createDeviceSigner(storage);

            const { address } = await sdk.createWallet({
                chain: "base-sepolia",
                recovery: makeEvmRecovery(),
                signers: [deviceDesc],
                options: { deviceSignerKeyStorage: storage },
                owner: `userId:sdk-getWallet-evm-${Date.now()}`,
            });

            // Re-fetch the same wallet with the same storage (simulates a new session)
            const retrievedWallet = await sdk.getWallet(address, {
                chain: "base-sepolia",
                options: { deviceSignerKeyStorage: storage },
            });

            expect(retrievedWallet.address).toBe(address);

            await retrievedWallet.stagingFund(1);

            const tx = await retrievedWallet.send(TEST_RECIPIENT_WALLET_ADDRESSES.evm, "usdxm", "0.0001");
            expect(tx.hash).toMatch(/^0x[a-fA-F0-9]+$/);
            expect(tx.transactionId).toBeTruthy();
        });

        test("addSigner with prepareOnly returns a signatureId", async () => {
            const sdk = makeSdk();
            const storage = new MockDeviceSignerKeyStorage(API_KEY);
            const deviceDesc = await sdk.createDeviceSigner(storage);

            const wallet = await sdk.createWallet({
                chain: "base-sepolia",
                recovery: makeEvmRecovery(),
                owner: `userId:sdk-addSigner-evm-${Date.now()}`,
            });

            expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);

            const result = await wallet.addSigner(deviceDesc, { prepareOnly: true });
            expect(result.type).toBe("device");
            expect(result.locator).toMatch(/^device:/);
            expect((result as { signatureId?: string }).signatureId).toBeTruthy();
        });
    });

    test.describe("Solana", () => {
        test("creates wallet and returns a valid address", async () => {
            const sdk = makeSdk();

            const wallet = await sdk.createWallet({
                chain: "solana",
                recovery: {
                    type: "external-wallet",
                    address: generateSolanaAddress(),
                    onSign: async (tx) => tx,
                },
                owner: `userId:sdk-wallet-sol-${Date.now()}`,
            });

            expect(wallet.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
            expect(wallet.chain).toBe("solana");
        });

        test("addSigner with prepareOnly returns a transactionId", async () => {
            const sdk = makeSdk();
            const storage = new MockDeviceSignerKeyStorage(API_KEY);
            const deviceDesc = await sdk.createDeviceSigner(storage);

            const wallet = await sdk.createWallet({
                chain: "solana",
                recovery: {
                    type: "external-wallet",
                    address: generateSolanaAddress(),
                    onSign: async (tx) => tx,
                },
                owner: `userId:sdk-addSigner-sol-${Date.now()}`,
            });

            expect(wallet.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

            const result = await wallet.addSigner(deviceDesc, { prepareOnly: true });
            expect(result.type).toBe("device");
            expect(result.locator).toMatch(/^device:/);
            expect((result as { transactionId?: string }).transactionId).toBeTruthy();
        });
    });

    test.describe("Error Cases", () => {
        test("send fails when device key is deleted from storage", async () => {
            const sdk = makeSdk();
            const storage = new MockDeviceSignerKeyStorage(API_KEY);
            const deviceDesc = await sdk.createDeviceSigner(storage);

            const wallet = await sdk.createWallet({
                chain: "base-sepolia",
                recovery: makeEvmRecovery(),
                signers: [deviceDesc],
                options: { deviceSignerKeyStorage: storage },
                owner: `userId:sdk-error-deleted-key-${Date.now()}`,
            });

            await wallet.stagingFund(1);

            // Revoke the device key (e.g. user deregisters this device)
            await storage.deleteKey(wallet.address);

            await expect(
                wallet.send(TEST_RECIPIENT_WALLET_ADDRESSES.evm, "usdxm", "0.0001")
            ).rejects.toThrow();
        });

        test("send fails when wallet is retrieved with a storage that has no key for this wallet", async () => {
            const sdk = makeSdk();
            const storage = new MockDeviceSignerKeyStorage(API_KEY);
            const deviceDesc = await sdk.createDeviceSigner(storage);

            const originalWallet = await sdk.createWallet({
                chain: "base-sepolia",
                recovery: makeEvmRecovery(),
                signers: [deviceDesc],
                options: { deviceSignerKeyStorage: storage },
                owner: `userId:sdk-error-wrong-device-${Date.now()}`,
            });

            await originalWallet.stagingFund(1);

            // Simulate accessing from a different device — empty storage, no key
            // getWallet does not accept a recovery onSign callback, so there is no fallback signer
            const emptyStorage = new MockDeviceSignerKeyStorage(API_KEY);
            const walletOnWrongDevice = await sdk.getWallet(originalWallet.address, {
                chain: "base-sepolia",
                options: { deviceSignerKeyStorage: emptyStorage },
            });

            await expect(
                walletOnWrongDevice.send(TEST_RECIPIENT_WALLET_ADDRESSES.evm, "usdxm", "0.0001")
            ).rejects.toThrow();
        });
    });

    test.describe("Stellar", () => {
        test("creates wallet and returns a valid address", async () => {
            const sdk = makeSdk();

            const wallet = await sdk.createWallet({
                chain: "stellar",
                recovery: {
                    type: "external-wallet",
                    address: generateStellarAddress(),
                    onSign: async (tx) => tx,
                },
                owner: `userId:sdk-wallet-stellar-${Date.now()}`,
            });

            expect(wallet.address).toMatch(/^[GC][A-Z2-7]{55}$/);
            expect(wallet.chain).toBe("stellar");
        });
    });
});
