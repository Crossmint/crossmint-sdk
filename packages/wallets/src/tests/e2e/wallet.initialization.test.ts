import { beforeEach, describe, expect, it, vi } from "vitest";
import { Wallet } from "../../wallets/wallet";
import type { ApiClient } from "../../api";
import { walletsLogger } from "../../logger";
import { createMockApiClient, type MockedApiClient } from "../../wallets/__tests__/test-helpers";

const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";

describe("Wallet integration — initDefaultSigner auto-assembly ladder", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
    });

    it("auto-assembles the recovery signer as admin (status active, no getSigner) when there are zero delegated signers", async () => {
        const wallet = new Wallet(
            { chain: "base-sepolia", address: EVM_ADDRESS, recovery: { type: "api-key" } as any },
            mockApiClient as unknown as ApiClient
        );

        await wallet.waitForInit();

        expect(wallet.signer?.type).toBe("api-key");
        expect(wallet.signer?.locator()).toBe("api-key");
        // Admin signers get status "active" hardcoded — the getSigner API call is skipped
        expect(wallet.signer?.status).toBe("active");
        expect(mockApiClient.getSigner).not.toHaveBeenCalled();
    });

    it("auto-assembles the single delegated signer with status fetched via getSigner", async () => {
        mockApiClient.getSigner.mockResolvedValue({
            type: "email",
            email: "user@example.com",
            address: "0xSignerAddress00000000000000000000000000",
            locator: "email:user@example.com",
            chains: { "base-sepolia": { status: "success" } },
        } as any);

        const wallet = new Wallet(
            {
                chain: "base-sepolia",
                address: EVM_ADDRESS,
                recovery: { type: "api-key" } as any,
                signers: [{ type: "email", email: "user@example.com" }] as any,
            },
            mockApiClient as unknown as ApiClient
        );

        await wallet.waitForInit();

        expect(wallet.signer?.type).toBe("email");
        // Delegated (non-admin) signer: status comes from the API, not hardcoded "active"
        expect(wallet.signer?.status).toBe("success");
        expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:evm:smart", "email:user@example.com");
    });

    it("leaves the signer undefined when the wallet has more than one delegated signer", async () => {
        const wallet = new Wallet(
            {
                chain: "base-sepolia",
                address: EVM_ADDRESS,
                recovery: { type: "api-key" } as any,
                signers: [
                    { type: "email", email: "a@example.com" },
                    { type: "phone", phone: "+15551234567" },
                ] as any,
            },
            mockApiClient as unknown as ApiClient
        );

        await wallet.waitForInit();

        // User must call useSigner(); no auto-assembly (and no recovery fallback) happens
        expect(wallet.signer).toBeUndefined();
        expect(mockApiClient.getSigner).not.toHaveBeenCalled();
    });

    it("leaves the signer undefined and resolves waitForInit (no throw) when ladder auto-assembly fails", async () => {
        // A malformed success response makes assembly throw; initDefaultSigner must swallow it —
        // a rejection here would poison every later preAuthIfNeeded().
        mockApiClient.getSigner.mockResolvedValue({ type: "mystery-unknown-type" } as any);

        const wallet = new Wallet(
            {
                chain: "base-sepolia",
                address: EVM_ADDRESS,
                recovery: { type: "api-key" } as any,
                signers: [{ type: "email", email: "user@example.com" }] as any,
            },
            mockApiClient as unknown as ApiClient
        );

        await expect(wallet.waitForInit()).resolves.toBeUndefined();

        expect(wallet.signer).toBeUndefined();
        expect(walletsLogger.warn).toHaveBeenCalledWith(
            "wallet.initDefaultSigner.autoAssemblyFailed",
            expect.objectContaining({ recoveryType: "api-key", signerCount: 1, error: expect.any(Error) })
        );
    });
});
