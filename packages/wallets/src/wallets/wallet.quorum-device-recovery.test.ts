import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../api";
import type { Chain } from "../chains/chains";
import { walletsLogger } from "../logger";
import type { QuorumMember, SignerConfigForChain } from "../signers/types";
import { RecoveryMethodRequiredError, SignerLimitExceededError } from "../utils/errors";
import { createDeviceSigner } from "@/utils/device-signers";
import { Wallet } from "./wallet";
import {
    createAwaitingRequest,
    createMockApiClient,
    createQuorumApiEntry,
    createQuorumApiEntryWith,
    createQuorumPendingApproval,
    settle,
    signatureOver,
    type MockedApiClient,
} from "./__tests__/test-helpers";

vi.mock("@/utils/device-signers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/utils/device-signers")>();
    return { ...actual, createDeviceSigner: vi.fn() };
});

const NEW_DEVICE = "device:newKey";
const OLD_DEVICE = "device:oldKey";

// How each chain reports a signer change: Stellar as one transaction, EVM per chain.
const CHAINS = [
    {
        chain: "stellar" as const,
        address: "CWALLETSTELLARQUORUM",
        alice: "GALICEMEMBER",
        request: (id: string, status: string, pending: object[] = []) => ({
            transaction: { id, status, approvals: { pending, submitted: [] } },
        }),
    },
    {
        chain: "base-sepolia" as const,
        address: "0x1234567890123456789012345678901234567890",
        alice: "0x6666666666666666666666666666666666666666",
        request: (id: string, status: string, pending: object[] = []) => ({
            chains: { "base-sepolia": { id, status, onChain: {}, approvals: { pending, submitted: [] } } },
        }),
    },
];

const deviceKeyStorage = () => ({
    generateKey: vi.fn().mockResolvedValue("newKey"),
    getKey: vi.fn().mockResolvedValue(null),
    hasKey: vi.fn().mockResolvedValue(false),
    mapAddressToKey: vi.fn().mockResolvedValue(undefined),
    deleteKey: vi.fn().mockResolvedValue(undefined),
    signMessage: vi.fn().mockResolvedValue({ r: "0x1", s: "0x2" }),
    getDeviceName: vi.fn().mockReturnValue("Test Device"),
    saveSignerLocator: vi.fn().mockResolvedValue(undefined),
    getSavedSignerLocator: vi.fn().mockResolvedValue(null),
});

describe.each(CHAINS)("device recovery through a recovery quorum on $chain", ({ chain, address, alice, request }) => {
    let api: MockedApiClient;
    let storage: ReturnType<typeof deviceKeyStorage>;
    const aliceMember = {
        type: "external-wallet",
        address: alice,
        locator: `external-wallet:${alice}`,
    } as QuorumMember;
    const aliceKey = {
        type: "external-wallet",
        address: alice,
        onSign: vi.fn(async (payload: string) => signatureOver(payload)),
    } as unknown as SignerConfigForChain<Chain>;
    let quorum: ReturnType<typeof createQuorumApiEntryWith>;
    const deviceEntry = (locator: string, change: object) => ({
        type: "device",
        locator,
        publicKey: { x: "0x01", y: "0x02" },
        name: "Test Device",
        ...change,
    });
    const quorumEntry = () => createQuorumPendingApproval({ quorum, pending: [aliceMember] });

    // A new device with no key yet, on a wallet whose only recovery method is `quorum`; Alice is selected.
    async function recoveringWallet(listedSigners: object[] = []) {
        const wallet = new Wallet(
            { chain, address, recovery: [quorum], options: { deviceSignerKeyStorage: storage as never } },
            api as unknown as ApiClient
        );
        await wallet.waitForInit();
        vi.spyOn(wallet, "signers").mockResolvedValue(listedSigners as never);
        await wallet.useRecoveryMethod(aliceKey as never);
        return wallet;
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.mocked(createDeviceSigner).mockResolvedValue({
            type: "device",
            publicKey: { x: "0x01", y: "0x02" },
            locator: NEW_DEVICE,
            name: "Test Device",
        } as never);
        api = createMockApiClient();
        storage = deviceKeyStorage();
        quorum = createQuorumApiEntryWith([aliceMember]);
        api.getSigner.mockResolvedValue({ error: { message: "not found" } } as never);
        api.registerSigner.mockResolvedValue(
            deviceEntry(NEW_DEVICE, request("tx-add", "awaiting-approval", [quorumEntry()])) as never
        );
        api.removeSigner.mockResolvedValue({ id: "tx-remove", status: "awaiting-approval" } as never);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("recover() with a member of the recovery quorum selected", () => {
        it("registers the device signer with the quorum as approver and returns the request unsigned", async () => {
            const wallet = await recoveringWallet();

            const result = await wallet.recover();

            expect(result).toEqual({ transactionId: "tx-add" });
            expect(api.registerSigner.mock.calls[0][1].approver).toBe(quorum.locator);
            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(wallet.needsRecovery()).toBe(true);
        });

        it("keeps the device key and the old device signer while the members approve", async () => {
            storage.getSavedSignerLocator.mockResolvedValue(OLD_DEVICE);
            const wallet = await recoveringWallet([deviceEntry(OLD_DEVICE, { status: "success" })]);

            await wallet.recover();

            expect(storage.deleteKey).not.toHaveBeenCalled();
            expect(api.removeSigner).not.toHaveBeenCalled();
            expect(storage.saveSignerLocator).not.toHaveBeenCalledWith(address, NEW_DEVICE);
        });

        it("returns the same request on the next call, registering and signing nothing", async () => {
            const wallet = await recoveringWallet();
            await wallet.recover();
            api.getSigner.mockResolvedValue(
                deviceEntry(NEW_DEVICE, request("tx-add", "awaiting-approval", [quorumEntry()])) as never
            );

            const result = await wallet.recover();

            expect(result).toEqual({ transactionId: "tx-add" });
            expect(api.registerSigner).toHaveBeenCalledTimes(1);
            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(wallet.needsRecovery()).toBe(true);
        });

        it("registers again with the same key when the request failed before the members approved", async () => {
            const wallet = await recoveringWallet();
            await wallet.recover();
            api.getSigner.mockResolvedValue(deviceEntry(NEW_DEVICE, request("tx-add", "failed")) as never);
            api.registerSigner.mockResolvedValue(
                deviceEntry(NEW_DEVICE, request("tx-add-2", "awaiting-approval", [quorumEntry()])) as never
            );

            const result = await wallet.recover();

            expect(result).toEqual({ transactionId: "tx-add-2" });
            expect(api.registerSigner.mock.calls.map((call) => call[1].signer)).toEqual([
                expect.objectContaining({ publicKey: { x: "0x01", y: "0x02" } }),
                expect.objectContaining({ publicKey: { x: "0x01", y: "0x02" } }),
            ]);
        });

        it("throws SignerLimitExceededError at the signer limit without removing a device", async () => {
            const wallet = await recoveringWallet([deviceEntry(OLD_DEVICE, { status: "success" })]);
            storage.getSavedSignerLocator.mockResolvedValue(OLD_DEVICE);
            api.registerSigner.mockResolvedValue({
                error: true,
                code: "SIGNER_LIMIT_EXCEEDED",
                message: "Signer limit reached",
            } as never);

            await expect(wallet.recover()).rejects.toBeInstanceOf(SignerLimitExceededError);
            expect(api.removeSigner).not.toHaveBeenCalled();
        });
    });

    describe("recover() once the members approved the device signer", () => {
        it("activates the device and starts the old device's removal through the quorum, returning it", async () => {
            storage.getSavedSignerLocator.mockResolvedValue(OLD_DEVICE);
            const wallet = await recoveringWallet([deviceEntry(OLD_DEVICE, { status: "success" })]);
            await wallet.recover();
            api.getSigner.mockResolvedValue(deviceEntry(NEW_DEVICE, request("tx-add", "success")) as never);

            const result = await wallet.recover();

            expect(result).toEqual({ transactionId: "tx-remove" });
            expect(api.removeSigner.mock.calls[0][1]).toBe(OLD_DEVICE);
            expect(api.removeSigner.mock.calls[0][2]?.approver).toBe(quorum.locator);
            expect(wallet.needsRecovery()).toBe(false);
            expect(wallet.signer?.locator()).toBe(NEW_DEVICE);
            expect(storage.saveSignerLocator).toHaveBeenCalledWith(address, NEW_DEVICE);
        });

        it("logs the removal it starts, so automatic recovery leaves a trace", async () => {
            storage.getSavedSignerLocator.mockResolvedValue(OLD_DEVICE);
            const wallet = await recoveringWallet([deviceEntry(OLD_DEVICE, { status: "success" })]);
            await wallet.recover();
            api.getSigner.mockResolvedValue(deviceEntry(NEW_DEVICE, request("tx-add", "success")) as never);
            const info = vi.spyOn(walletsLogger, "info");

            await wallet.recover();

            expect(info).toHaveBeenCalledWith(
                "wallet.recover.staleSignerRemovalPending",
                expect.objectContaining({ signerLocator: OLD_DEVICE, transactionId: "tx-remove" })
            );
        });

        it("returns nothing on later calls", async () => {
            const wallet = await recoveringWallet();
            await wallet.recover();
            api.getSigner.mockResolvedValue(deviceEntry(NEW_DEVICE, request("tx-add", "success")) as never);
            await wallet.recover();

            await expect(wallet.recover()).resolves.toBeUndefined();
        });
    });

    describe("approve() on the recovering device with the member selected", () => {
        it("signs the member's entry of the device's own registration", async () => {
            const wallet = await recoveringWallet();
            await wallet.recover();
            const pending = quorumEntry();
            api.getSigner.mockResolvedValue(
                deviceEntry(NEW_DEVICE, request("tx-add", "awaiting-approval", [pending])) as never
            );
            api.getTransaction.mockResolvedValue(createAwaitingRequest("tx-add", [pending]) as never);
            api.approveTransaction.mockResolvedValue(createAwaitingRequest("tx-add", [pending]) as never);

            const { error } = await settle(wallet.approve({ transactionId: "tx-add" }));

            expect(error).toBeUndefined();
            expect(api.approveTransaction.mock.calls[0][2].approvals).toEqual([
                expect.objectContaining({ signer: aliceMember.locator }),
            ]);
        });
    });
});

describe("device recovery on a wallet whose recovery methods are all quorums, with nothing selected", () => {
    it("throws RecoveryMethodRequiredError before creating a device key", async () => {
        const api = createMockApiClient();
        const storage = deviceKeyStorage();
        const wallet = new Wallet(
            {
                chain: "stellar",
                address: "CWALLETSTELLARQUORUM",
                recovery: [createQuorumApiEntry()],
                options: { deviceSignerKeyStorage: storage as never },
            },
            api as unknown as ApiClient
        );
        await wallet.waitForInit();
        vi.spyOn(wallet, "signers").mockResolvedValue([]);

        await expect(wallet.recover()).rejects.toBeInstanceOf(RecoveryMethodRequiredError);
        expect(api.registerSigner).not.toHaveBeenCalled();
    });
});
