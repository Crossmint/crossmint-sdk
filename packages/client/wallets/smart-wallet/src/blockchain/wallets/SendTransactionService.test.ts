import type { SmartAccountClient } from "permissionless";
import type { SmartAccount } from "permissionless/accounts";
import type { EntryPoint } from "permissionless/types";
import {
    type Address,
    BaseError,
    type Chain,
    ContractFunctionRevertedError,
    type PublicClient,
    type SimulateContractReturnType,
    type TransactionReceipt,
    type Transport,
    zeroAddress,
} from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import {
    EVMSendTransactionError,
    EVMSendTransactionExecutionRevertedError,
    SendTransactionService,
} from "./SendTransactionService";

function makeMockError<E extends Error, F extends object>(error: E, fields?: F): E & F {
    const mockError = Object.create(error);
    Object.assign(mockError, fields);
    return mockError;
}

describe("SendTransactionService", () => {
    const walletAddress: Address = "0xE898BBd704CCE799e9593a9ADe2c1cA0351Ab660";
    const mockSmartAccount = mock<SmartAccount<EntryPoint>>({ address: walletAddress });
    const mockPublicClient = mock<PublicClient>();
    const mockAccountClient = mock<SmartAccountClient<EntryPoint, Transport, Chain, SmartAccount<EntryPoint>>>({
        account: mockSmartAccount,
    });
    const sendTransactionService = new SendTransactionService({ public: mockPublicClient, wallet: mockAccountClient });

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("Throws EVMSendTransactionExecutionRevertedError when a transaction simulation fails", async () => {
        const mockError = makeMockError(BaseError.prototype, { walk: vi.fn() });
        const mockRevertError = new ContractFunctionRevertedError({
            abi: [],
            functionName: "mockFunction",
            message: "mockMessage",
        });
        mockRevertError.reason = "mockReason";
        const mockRevertData = mock<ContractFunctionRevertedError["data"]>();
        mockRevertError.data = mockRevertData;
        mockError.walk.mockReturnValue(mockRevertError);
        mockPublicClient.simulateContract.mockRejectedValue(mockError);
        let rejected = false;
        try {
            await sendTransactionService.sendTransaction({
                address: zeroAddress,
                abi: [],
                functionName: "mockFunction",
                args: [],
            });
        } catch (e) {
            rejected = true;
            expect(e).toBeInstanceOf(EVMSendTransactionExecutionRevertedError);
            expect((e as EVMSendTransactionExecutionRevertedError).stage).toBe("simulation");
            expect((e as EVMSendTransactionExecutionRevertedError).reason).toBe("mockReason");
            expect((e as EVMSendTransactionExecutionRevertedError).data == mockRevertData).toBe(true);
        }
        expect(rejected).toBe(true);
    });

    it("Throws EVMSendTransactionExecutionRevertedError when a transaction reverts on chain", async () => {
        const mockReceipt = mock<TransactionReceipt>();
        mockReceipt.status = "reverted";
        mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockReceipt);
        let rejected = false;
        try {
            await sendTransactionService.sendTransaction({
                address: zeroAddress,
                abi: [],
                functionName: "mockFunction",
                args: [],
            });
        } catch (e) {
            rejected = true;
            expect(e).toBeInstanceOf(EVMSendTransactionExecutionRevertedError);
            expect((e as EVMSendTransactionExecutionRevertedError).stage).toBe("execution");
        }
        expect(rejected).toBe(true);
    });

    it("Throws a confirmation error when a transaction confirmation fails", async () => {
        const mockError = makeMockError(BaseError.prototype);
        mockPublicClient.waitForTransactionReceipt.mockRejectedValue(mockError);
        let rejected = false;
        try {
            await sendTransactionService.sendTransaction({
                address: zeroAddress,
                abi: [],
                functionName: "mockFunction",
                args: [],
            });
        } catch (e) {
            rejected = true;
            expect(e).toBeInstanceOf(EVMSendTransactionError);
            expect((e as EVMSendTransactionError).stage).toBe("confirmation");
        }
        expect(rejected).toBe(true);
    });

    it("Throws EVMSendTransactionError when a transaction fails to send", async () => {
        const mockError = makeMockError(BaseError.prototype);
        mockAccountClient.writeContract.mockRejectedValue(mockError);
        let rejected = false;
        try {
            await sendTransactionService.sendTransaction({
                address: zeroAddress,
                abi: [],
                functionName: "mockFunction",
                args: [],
            });
        } catch (e) {
            rejected = true;
            expect(e).toBeInstanceOf(EVMSendTransactionError);
            expect((e as EVMSendTransactionError).stage).toBe("send");
        }
        expect(rejected).toBe(true);
    });

    it("Simulates before sending a transaction", async () => {
        const mockReceipt = mock<TransactionReceipt>();
        mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockReceipt);
        const callOrder: string[] = [];
        mockPublicClient.simulateContract.mockImplementation(async () => {
            callOrder.push("simulateContract");
            return mock<SimulateContractReturnType>();
        });
        mockAccountClient.writeContract.mockImplementation(async () => {
            callOrder.push("sendTransaction");
            return "0xmockTxHash";
        });
        await expect(
            sendTransactionService.sendTransaction({
                address: zeroAddress,
                abi: [],
                functionName: "mockFunction",
                args: [],
            })
        ).resolves.toBeDefined();
        expect(callOrder).toEqual(["simulateContract", "sendTransaction"]);

        expect(mockPublicClient.simulateContract).toHaveBeenCalledWith(
            expect.objectContaining({
                account: walletAddress,
            })
        );
    });
});
