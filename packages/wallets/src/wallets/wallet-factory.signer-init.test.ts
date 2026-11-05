import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { WalletFactory } from "./wallet-factory";
import { walletsLogger } from "../logger";
import type { ApiClient, GetWalletSuccessResponse } from "../api";

// getWallet awaits signer initialization. These tests pin down what that initialization costs in requests:
// the wallet response already carries each delegated signer's per-chain status, so loading a wallet whose
// device key is on this device needs no request beyond GET wallet.

const WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";
// a valid uncompressed P-256 public key: 0x04 + 32-byte x + 32-byte y
const DEVICE_KEY = Buffer.concat([Buffer.from([0x04]), Buffer.alloc(32, 1), Buffer.alloc(32, 2)]).toString("base64");
const DEVICE_LOCATOR = `device:${DEVICE_KEY}`;

function walletResponse(deviceChains: Record<string, { status: string; id?: string }>) {
    return {
        chainType: "evm",
        type: "smart",
        address: WALLET_ADDRESS,
        owner: "email:user@example.com",
        config: {
            adminSigner: { type: "email", email: "user@example.com", locator: "email:user@example.com" },
            delegatedSigners: [{ type: "device", locator: DEVICE_LOCATOR, chains: deviceChains }],
        },
        createdAt: Date.now(),
    } as unknown as GetWalletSuccessResponse;
}

function keyStorage(where: "mapped" | "unmapped") {
    return {
        preload: vi.fn(),
        getKey: vi.fn().mockResolvedValue(where === "mapped" ? DEVICE_KEY : null),
        hasKey: vi.fn().mockImplementation(async (key: string) => key === DEVICE_KEY),
        mapAddressToKey: vi.fn().mockResolvedValue(undefined),
        saveSignerLocator: vi.fn().mockResolvedValue(undefined),
        generateKey: vi.fn(),
        signMessage: vi.fn(),
        deleteKey: vi.fn(),
        getDeviceName: vi.fn().mockReturnValue("Test Device"),
    };
}

describe("WalletFactory.getWallet - signer initialization requests", () => {
    let apiClient: {
        isServerSide: boolean;
        projectId: string;
        environment: APIKeyEnvironmentPrefix;
        getWallet: MockedFunction<ApiClient["getWallet"]>;
        getSigner: MockedFunction<ApiClient["getSigner"]>;
    };
    let factory: WalletFactory;

    beforeEach(() => {
        vi.resetAllMocks();
        walletsLogger.debug = vi.fn();
        apiClient = {
            isServerSide: false,
            projectId: "test-project",
            environment: APIKeyEnvironmentPrefix.STAGING,
            getWallet: vi.fn(),
            getSigner: vi.fn(),
        };
        factory = new WalletFactory(apiClient as unknown as ApiClient);
    });

    it.each(["mapped", "unmapped"] as const)(
        "uses this device's signer with its status from the wallet response, in one request (key %s)",
        async (where) => {
            apiClient.getWallet.mockResolvedValue(walletResponse({ "base-sepolia": { status: "success" } }));
            const storage = keyStorage(where);

            const wallet = await factory.getWallet({
                chain: "base-sepolia",
                options: { deviceSignerKeyStorage: storage as never },
            });

            expect(apiClient.getWallet).toHaveBeenCalledTimes(1);
            expect(apiClient.getSigner).not.toHaveBeenCalled();
            expect(wallet.signer?.locator()).toBe(DEVICE_LOCATOR);
            expect(wallet.signer?.status).toBe("success");
            expect(wallet.needsRecovery()).toBe(false);
            if (where === "unmapped") {
                expect(storage.mapAddressToKey).toHaveBeenCalledWith(WALLET_ADDRESS, DEVICE_KEY);
            }
        }
    );

    it("needs recovery when the response shows this device's signer still awaiting approval", async () => {
        apiClient.getWallet.mockResolvedValue(
            walletResponse({ "base-sepolia": { status: "awaiting-approval", id: "sig-1" } })
        );

        const wallet = await factory.getWallet({
            chain: "base-sepolia",
            options: { deviceSignerKeyStorage: keyStorage("mapped") as never },
        });

        expect(apiClient.getSigner).not.toHaveBeenCalled();
        expect(wallet.signer?.status).toBe("awaiting-approval");
        expect(wallet.needsRecovery()).toBe(true);
    });

    it("ignores a device signer approved only on another chain, like signers() does", async () => {
        apiClient.getWallet.mockResolvedValue(walletResponse({ base: { status: "success" } }));

        const wallet = await factory.getWallet({
            chain: "base-sepolia",
            options: { deviceSignerKeyStorage: keyStorage("unmapped") as never },
        });

        expect(apiClient.getWallet).toHaveBeenCalledTimes(1);
        expect(wallet.signer).toBeUndefined();
        expect(wallet.needsRecovery()).toBe(true);
    });

    it("starts loading the key storage before the wallet request returns", async () => {
        const storage = keyStorage("mapped");
        apiClient.getWallet.mockImplementation(async () => {
            expect(storage.preload).toHaveBeenCalledTimes(1);
            return walletResponse({ "base-sepolia": { status: "success" } });
        });

        await factory.getWallet({ chain: "base-sepolia", options: { deviceSignerKeyStorage: storage as never } });

        expect(storage.preload).toHaveBeenCalledTimes(1);
    });
});
