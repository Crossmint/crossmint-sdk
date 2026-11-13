import { describe, expect, it, vi } from "vitest";
import { Wallet } from "../wallet";
import { createDeviceSigner } from "../../utils/device-signers/createDeviceSigner";
import { SandboxDeviceSignerKeyStorage } from "../../testing/device-signer-sandbox";
import { createMockApiClient, createMockSigner } from "./test-helpers";
import type { ApiClient } from "../../api";

const WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";
const MESSAGE = `0x${"cd".repeat(32)}`;

function makeDeviceWallet(storage: SandboxDeviceSignerKeyStorage) {
    return new Wallet(
        {
            chain: "base-sepolia",
            address: WALLET_ADDRESS,
            recovery: { type: "api-key" },
            options: { deviceSignerKeyStorage: storage },
        },
        createMockApiClient() as unknown as ApiClient
    );
}

describe("device signer sandbox — SDK integration (no network, no real frame)", () => {
    it("creates a wallet, resolves a registered device signer, and signs", async () => {
        const storage = new SandboxDeviceSignerKeyStorage("sk_test");
        await storage.generateKey({ address: WALLET_ADDRESS });
        const wallet = makeDeviceWallet(storage);

        const descriptor = await createDeviceSigner(storage, WALLET_ADDRESS);
        await wallet.useSigner(descriptor);

        expect(wallet.signer?.type).toBe("device");

        const result = await wallet.signer!.signMessage(MESSAGE);
        expect(result.signature.r).toMatch(/^0x[0-9a-f]{64}$/);
        expect(result.signature.s).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it("surfaces the storage's error when the key is absent at signing time", async () => {
        const storage = new SandboxDeviceSignerKeyStorage("sk_test");
        await storage.generateKey({ address: WALLET_ADDRESS });
        const wallet = makeDeviceWallet(storage);
        const descriptor = await createDeviceSigner(storage, WALLET_ADDRESS);
        await wallet.useSigner(descriptor);

        storage.setFailure("key-absent");

        await expect(wallet.signer!.signMessage(MESSAGE)).rejects.toThrow(/No key mapped/);
    });

    it("surfaces the storage's error when the key is present but unusable", async () => {
        const storage = new SandboxDeviceSignerKeyStorage("sk_test");
        await storage.generateKey({ address: WALLET_ADDRESS });
        const wallet = makeDeviceWallet(storage);
        const descriptor = await createDeviceSigner(storage, WALLET_ADDRESS);
        await wallet.useSigner(descriptor);

        storage.setFailure("key-unusable");

        await expect(wallet.signer!.signMessage(MESSAGE)).rejects.toThrow(/SIGNING_FAILED/);
    });

    it("surfaces the storage's error when it is unreadable at resolution time", async () => {
        const storage = new SandboxDeviceSignerKeyStorage("sk_test");
        await storage.generateKey({ address: WALLET_ADDRESS });
        const descriptor = await createDeviceSigner(storage, WALLET_ADDRESS);

        storage.setFailure("storage-unreadable");
        const wallet = makeDeviceWallet(storage);

        await expect(wallet.useSigner(descriptor)).rejects.toThrow(/unavailable/);
    });

    it("registers a brand-new device signer through the real registration call", async () => {
        const storage = new SandboxDeviceSignerKeyStorage("sk_test");
        const descriptor = await createDeviceSigner(storage);

        const registerSigner = vi.fn(async () => ({
            type: "device" as const,
            locator: descriptor.locator,
            publicKey: descriptor.publicKey,
            name: descriptor.name,
            chains: {},
        }));
        const wallet = new Wallet(
            {
                chain: "base-sepolia",
                address: WALLET_ADDRESS,
                recovery: { type: "api-key" },
                options: { deviceSignerKeyStorage: storage },
            },
            createMockApiClient({ registerSigner }) as unknown as ApiClient
        );

        const result = await wallet.addSigner(descriptor);

        expect(registerSigner).toHaveBeenCalledWith(
            wallet.walletLocator,
            expect.objectContaining({
                signer: expect.objectContaining({ type: "device", publicKey: descriptor.publicKey }),
            })
        );
        expect(result).toMatchObject({ type: "device", status: "success" });
    });

    it("rejects adding a signer with SIGNER_LIMIT_EXCEEDED once the wallet is at its cap", async () => {
        const storage = new SandboxDeviceSignerKeyStorage("sk_test");
        await storage.generateKey({ address: WALLET_ADDRESS });

        const mockApiClient = createMockApiClient({
            registerSigner: async () => ({
                error: true,
                code: "SIGNER_LIMIT_EXCEEDED",
                message: "A wallet supports at most 8 combined admin and delegated signers, got 9.",
            }),
        });
        const wallet = new Wallet(
            {
                chain: "base-sepolia",
                address: WALLET_ADDRESS,
                recovery: { type: "api-key" },
                options: { deviceSignerKeyStorage: storage },
            },
            mockApiClient as unknown as ApiClient
        );
        const descriptor = await createDeviceSigner(storage, WALLET_ADDRESS);
        await wallet.useSigner(descriptor);

        const newSigner = createMockSigner("external-wallet", "base-sepolia");

        await expect(wallet.addSigner(newSigner)).rejects.toThrow(/supports at most \d+ combined/);
    });
});
