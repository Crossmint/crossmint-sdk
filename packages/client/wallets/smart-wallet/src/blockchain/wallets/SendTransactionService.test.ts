import { SmartAccountClient } from "permissionless";
import { SmartAccount } from "permissionless/accounts";
import { EntryPoint } from "permissionless/types";
import {
    BaseError,
    Chain,
    ContractFunctionRevertedError,
    PublicClient,
    TransactionReceipt,
    Transport,
    zeroAddress,
} from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import {
    EVMSendTransactionConfirmationError,
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
    const mockPublicClient = mock<PublicClient>();
    const mockAccountClient = mock<SmartAccountClient<EntryPoint, Transport, Chain, SmartAccount<EntryPoint>>>();
    const sendTransactionService = new SendTransactionService(mockPublicClient);

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
        mockError.walk.mockReturnValue(mockRevertError);
        mockPublicClient.simulateContract.mockRejectedValue(mockError);
        await expect(
            sendTransactionService.sendTransaction(
                {
                    address: zeroAddress,
                    abi: [],
                    functionName: "mockFunction",
                    args: [],
                },
                mockAccountClient
            )
        ).rejects.toThrow(EVMSendTransactionExecutionRevertedError);
    });

    it("Throws EVMSendTransactionExecutionRevertedError when a transaction reverts on chain", async () => {
        const mockReceipt = mock<TransactionReceipt>();
        mockReceipt.status = "reverted";
        mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockReceipt);
        await expect(
            sendTransactionService.sendTransaction(
                {
                    address: zeroAddress,
                    abi: [],
                    functionName: "mockFunction",
                    args: [],
                },
                mockAccountClient
            )
        ).rejects.toThrow(EVMSendTransactionExecutionRevertedError);
    });

    it("Throws EVMSendTransactionConfirmationError when a transaction confirmation fails", async () => {
        const mockError = makeMockError(BaseError.prototype);
        mockPublicClient.waitForTransactionReceipt.mockRejectedValue(mockError);
        await expect(
            sendTransactionService.sendTransaction(
                {
                    address: zeroAddress,
                    abi: [],
                    functionName: "mockFunction",
                    args: [],
                },
                mockAccountClient,
                { awaitConfirmation: true }
            )
        ).rejects.toThrow(EVMSendTransactionConfirmationError);
    });

    it("Throws EVMSendTransactionError when a transaction fails to send", async () => {
        const mockError = makeMockError(BaseError.prototype);
        mockAccountClient.writeContract.mockRejectedValue(mockError);
        await expect(
            sendTransactionService.sendTransaction(
                {
                    address: zeroAddress,
                    abi: [],
                    functionName: "mockFunction",
                    args: [],
                },
                mockAccountClient
            )
        ).rejects.toThrow(EVMSendTransactionError);
    });

    it("Simulates before sending a transaction", async () => {
        const mockReceipt = mock<TransactionReceipt>();
        mockPublicClient.waitForTransactionReceipt.mockResolvedValueOnce(mockReceipt);
        const callOrder: string[] = [];
        mockPublicClient.simulateContract.mockImplementation(() => callOrder.push("simulateContract"));
        mockAccountClient.writeContract.mockImplementation(() => callOrder.push("sendTransaction"));
        await expect(
            sendTransactionService.sendTransaction(
                {
                    address: zeroAddress,
                    abi: [],
                    functionName: "mockFunction",
                    args: [],
                },
                mockAccountClient
            )
        ).resolves.toBeDefined();
        expect(callOrder).toEqual(["simulateContract", "sendTransaction"]);
    });

    it("Only waits for confirmation if awaitConfirmation is true", async () => {
        mockAccountClient.writeContract.mockResolvedValue("mockHash");
        const sendTransactionService = new SendTransactionService(mockPublicClient, {
            awaitConfirmation: false,
            confirmations: 1,
            transactionConfirmationTimeout: 10_000,
        });
        await expect(
            sendTransactionService.sendTransaction(
                {
                    address: zeroAddress,
                    abi: [],
                    functionName: "mockFunction",
                    args: [],
                },
                mockAccountClient
            )
        ).resolves.toBeDefined();
        expect(mockPublicClient.waitForTransactionReceipt).not.toHaveBeenCalled();
    });
});
