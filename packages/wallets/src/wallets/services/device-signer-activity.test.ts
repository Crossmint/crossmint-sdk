import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../../api";
import { fetchDeviceSignerActivity } from "./device-signer-activity";

const WALLET_LOCATOR = "me:evm:smart";

function approvedBy(locator: string, submittedAt: string) {
    return { approvals: { submitted: [{ signer: { locator }, submittedAt }] } };
}

function makeApiClient(overrides: Record<string, unknown> = {}) {
    return {
        getWallet: vi.fn().mockResolvedValue({ config: { delegatedSigners: [] } }),
        getTransactions: vi.fn().mockResolvedValue({ transactions: [] }),
        getSignatures: vi.fn().mockResolvedValue({ signatures: [] }),
        ...overrides,
    };
}

async function fetchActivity(apiClient: ReturnType<typeof makeApiClient>) {
    return await fetchDeviceSignerActivity(apiClient as unknown as ApiClient, WALLET_LOCATOR);
}

describe("fetchDeviceSignerActivity", () => {
    it("keeps the latest of each device signer's registration and approval times", async () => {
        const apiClient = makeApiClient({
            getWallet: vi.fn().mockResolvedValue({
                config: {
                    delegatedSigners: [
                        { locator: "device:evmKey", chains: { "base-sepolia": { createdAt: "2026-07-01T00:00:00Z" } } },
                        { locator: "device:solanaKey", transaction: { createdAt: "2026-07-02T00:00:00Z" } },
                        {
                            locator: "device:unusedKey",
                            chains: { "base-sepolia": { createdAt: "2026-07-03T00:00:00Z" } },
                        },
                    ],
                },
            }),
            getTransactions: vi.fn().mockResolvedValue({
                transactions: [
                    approvedBy("device:evmKey", "2026-09-01T00:00:00Z"),
                    approvedBy("device:evmKey", "2026-08-01T00:00:00Z"),
                    approvedBy("email:user@example.com", "2026-10-01T00:00:00Z"),
                ],
            }),
            getSignatures: vi.fn().mockResolvedValue({
                signatures: [approvedBy("device:solanaKey", "2026-10-01T00:00:00Z")],
            }),
        });

        const activity = await fetchActivity(apiClient);

        expect(Object.fromEntries(activity)).toEqual({
            "device:evmKey": Date.parse("2026-09-01T00:00:00Z"),
            "device:solanaKey": Date.parse("2026-10-01T00:00:00Z"),
            "device:unusedKey": Date.parse("2026-07-03T00:00:00Z"),
        });
    });

    it("reads the next page only while pages are full", async () => {
        const fullPage = Array.from({ length: 50 }, () => approvedBy("device:key", "2026-08-01T00:00:00Z"));
        const getTransactions = vi
            .fn()
            .mockResolvedValueOnce({ transactions: fullPage })
            .mockResolvedValueOnce({ transactions: [approvedBy("device:key", "2026-07-01T00:00:00Z")] });
        const apiClient = makeApiClient({ getTransactions });

        await fetchActivity(apiClient);

        expect(getTransactions).toHaveBeenCalledTimes(2);
        expect(getTransactions).toHaveBeenLastCalledWith(WALLET_LOCATOR, { page: 2, perPage: 50 });
    });

    it("keeps the activity it has when a list cannot be read", async () => {
        const apiClient = makeApiClient({
            getTransactions: vi.fn().mockResolvedValue({
                transactions: [approvedBy("device:key", "2026-08-01T00:00:00Z")],
            }),
            getSignatures: vi.fn().mockResolvedValue({ error: true, message: "not supported" }),
        });

        const activity = await fetchActivity(apiClient);

        expect(activity.get("device:key")).toBe(Date.parse("2026-08-01T00:00:00Z"));
    });
});
