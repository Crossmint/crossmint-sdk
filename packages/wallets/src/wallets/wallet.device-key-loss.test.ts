import { beforeEach, describe, expect, it, vi } from "vitest";
import { Wallet } from "./wallet";
import type { ApiClient } from "../api";
import { createMockApiClient, type MockedApiClient } from "./__tests__/test-helpers";

const WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";
const LOST_SIGNER_LOCATOR = "device:LOSTKEY";

type StorageOverrides = {
    getKey?: ReturnType<typeof vi.fn>;
    hasKey?: ReturnType<typeof vi.fn>;
    mapAddressToKey?: ReturnType<typeof vi.fn>;
};

function makeStorage(overrides: StorageOverrides = {}) {
    return {
        generateKey: vi.fn().mockResolvedValue("freshPublicKeyBase64"),
        getKey: overrides.getKey ?? vi.fn().mockResolvedValue(null),
        hasKey: overrides.hasKey ?? vi.fn().mockResolvedValue(false),
        mapAddressToKey: overrides.mapAddressToKey ?? vi.fn().mockResolvedValue(undefined),
        deleteKey: vi.fn().mockResolvedValue(undefined),
        signMessage: vi.fn(),
        getDeviceName: vi.fn().mockReturnValue("Test Device"),
    };
}

describe("Wallet - device signer key loss (WAL-10734)", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
    });

    function buildWallet(storage: ReturnType<typeof makeStorage>): Wallet<"base-sepolia"> {
        const wallet = new Wallet(
            {
                chain: "base-sepolia",
                address: WALLET_ADDRESS,
                recovery: { type: "api-key" } as never,
                options: { deviceSignerKeyStorage: storage as never },
            },
            mockApiClient as unknown as ApiClient
        );
        vi.spyOn(wallet, "signers").mockResolvedValue([
            { type: "device", address: WALLET_ADDRESS, locator: LOST_SIGNER_LOCATOR, status: "success" } as never,
        ]);
        return wallet;
    }

    it("honest hasKey (false) routes to recovery without attempting a mapping", async () => {
        const storage = makeStorage({ hasKey: vi.fn().mockResolvedValue(false) });
        const wallet = buildWallet(storage);

        await wallet.waitForInit();

        expect(storage.mapAddressToKey).not.toHaveBeenCalled();
        expect(wallet.needsRecovery()).toBe(true);
        expect(wallet.signer).toBeUndefined();
    });

    it("does not bind the dead device signer and flags recovery when the key is gone but hasKey lies", async () => {
        const mapAddressToKey = vi.fn().mockRejectedValue(new Error("mapAddressToKey failed: storageError(-25300)"));
        const storage = makeStorage({ hasKey: vi.fn().mockResolvedValue(true), mapAddressToKey });
        const wallet = buildWallet(storage);

        await expect(wallet.waitForInit()).resolves.toBeUndefined();

        expect(mapAddressToKey).toHaveBeenCalledWith(WALLET_ADDRESS, "LOSTKEY");
        expect(wallet.signer).toBeUndefined();
        expect(wallet.needsRecovery()).toBe(true);
    });
});
