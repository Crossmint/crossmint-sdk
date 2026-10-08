import { beforeEach, describe, expect, it, vi } from "vitest";
import { Wallet } from "../../wallets/wallet";
import type { ApiClient } from "../../api";
import { NonCustodialSigner } from "../../signers/non-custodial";
import { createMockApiClient, type MockedApiClient } from "../../wallets/__tests__/test-helpers";

vi.mock("@/utils/device-signers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/utils/device-signers")>();
    return {
        ...actual,
        createDeviceSigner: vi.fn().mockResolvedValue({
            type: "device",
            publicKey: { x: "0x01", y: "0x02" },
            locator: "device:mockNewKey",
            name: "Test Device",
        }),
    };
});

const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";

const createMockDeviceKeyStorage = () => ({
    generateKey: vi.fn().mockResolvedValue("mockPublicKeyBase64"),
    getKey: vi.fn().mockResolvedValue(null),
    hasKey: vi.fn().mockResolvedValue(false),
    mapAddressToKey: vi.fn().mockResolvedValue(undefined),
    deleteKey: vi.fn().mockResolvedValue(undefined),
    signMessage: vi.fn().mockResolvedValue({ r: "0x1", s: "0x2" }),
    getDeviceName: vi.fn().mockReturnValue("Test Device"),
    apiKey: "test-api-key",
});

describe("Wallet integration — preAuthIfNeeded (pre-operation recover + auth)", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
    });

    it("shares a single recover() invocation across concurrent operations, then re-enters on a later operation", async () => {
        const mockStorage = createMockDeviceKeyStorage();
        const wallet = new Wallet(
            {
                chain: "base-sepolia",
                address: EVM_ADDRESS,
                recovery: { type: "api-key" } as any,
                options: { deviceSignerKeyStorage: mockStorage as any },
            },
            mockApiClient as unknown as ApiClient
        );
        vi.spyOn(wallet, "signers").mockResolvedValue([] as any);
        await wallet.waitForInit();
        expect(wallet.needsRecovery()).toBe(true);

        const recoverSpy = vi.spyOn(wallet, "recover");

        // addSigner's upfront getSignerState check — signer not yet registered
        mockApiClient.getSigner.mockResolvedValueOnce({ error: { message: "not found" } } as any);
        // assembleFullSigner after registration — signer approved
        mockApiClient.getSigner.mockResolvedValue({
            type: "device",
            locator: "device:mockNewKey",
            publicKey: { x: "1", y: "2" },
            chains: { "base-sepolia": { status: "success" } },
        } as any);
        mockApiClient.registerSigner.mockResolvedValue({
            type: "device",
            locator: "device:mockNewKey",
            publicKey: { x: "0x01", y: "0x02" },
            chains: { "base-sepolia": { status: "success" } },
        } as any);
        mockApiClient.send.mockResolvedValue({ id: "tx-prep-1" } as any);

        const [tx1, tx2] = await Promise.all([
            wallet.send(EVM_ADDRESS, "usdc", "1.0", { prepareOnly: true }),
            wallet.send(EVM_ADDRESS, "usdc", "1.0", { prepareOnly: true }),
        ]);

        // Exactly ONE recover() (and one device-key registration) for both concurrent operations
        expect(recoverSpy).toHaveBeenCalledTimes(1);
        expect(mockApiClient.registerSigner).toHaveBeenCalledTimes(1);
        expect(tx1.transactionId).toBe("tx-prep-1");
        expect(tx2.transactionId).toBe("tx-prep-1");
        expect(wallet.signer?.type).toBe("device");

        // #recovering is reset in finally — a later operation re-enters recover(), but the cached
        // approval fast-path prevents a second registration
        await wallet.send(EVM_ADDRESS, "usdc", "1.0", { prepareOnly: true });
        expect(recoverSpy).toHaveBeenCalledTimes(2);
        expect(mockApiClient.registerSigner).toHaveBeenCalledTimes(1);
    });

    it("calls ensureAuthenticated on a NonCustodialSigner before the operation", async () => {
        const ensureAuthSpy = vi
            .spyOn(NonCustodialSigner.prototype, "ensureAuthenticated")
            .mockResolvedValue(undefined);
        try {
            // Email recovery + zero delegated signers → ladder assembles an EVMNonCustodialSigner as admin.
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "email", email: "rec@example.com" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            await wallet.waitForInit();
            expect(wallet.signer).toBeInstanceOf(NonCustodialSigner);

            mockApiClient.send.mockResolvedValue({ id: "tx-prep-ncs" } as any);

            await wallet.send(EVM_ADDRESS, "usdc", "1.0", { prepareOnly: true });

            expect(ensureAuthSpy).toHaveBeenCalledTimes(1);
            expect(ensureAuthSpy.mock.invocationCallOrder[0]).toBeLessThan(
                mockApiClient.send.mock.invocationCallOrder[0]
            );
        } finally {
            ensureAuthSpy.mockRestore();
        }
    });
});
