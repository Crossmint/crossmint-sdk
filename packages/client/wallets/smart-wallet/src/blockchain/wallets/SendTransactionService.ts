import { SmartAccountClient } from "permissionless";
import { EntryPoint } from "permissionless/_types/types";
import { SmartAccount } from "permissionless/accounts";
import {
    Abi,
    Address,
    BaseError,
    Chain,
    ContractFunctionRevertedError,
    EstimateFeesPerGasReturnType,
    Hex,
    PublicClient,
    TransactionReceipt,
    Transport,
    WaitForTransactionReceiptTimeoutError,
} from "viem";

import { CrossmintSDKError, WalletErrorCode } from "@crossmint/client-sdk-base";

export type TransactionServiceTransactionRequest = {
    address: Address;
    abi: Abi;
    functionName: string;
    args: any;
    value?: bigint;
};

/**
 * @param resend Whether the transaction should be resent.
 */
export type TransactionServiceResendCallbackReturnType = {
    resend: boolean;
};

/**
 * Callback to determine if the transaction should be resent.
 * @param resendAttempts The number of resend attempts that have been made. Starts at 1.
 * @returns An object that determines if the transaction should be resent. See `TransactionServiceResendCallbackReturnType`.
 */
export type TransactionServiceResendCallback = (
    resendAttempts: number
) => Promise<TransactionServiceResendCallbackReturnType>;

/**
 * Error thrown when a transaction fails to send.
 * @param viemError The error thrown by the viem client.
 */
export class SendTransactionError extends CrossmintSDKError {
    constructor(message: string, public readonly viemError: BaseError, code = WalletErrorCode.SEND_TRANSACTION_FAILED) {
        super(message, code);
    }
}

/**
 * Error thrown when a transaction fails due to a contract execution error.
 * @param viemError The error thrown by the viem client.
 * @param revertError The revert error from viem containing the reason for the revert.
 */
export class SendTransactionExecutionRevertedError extends SendTransactionError {
    constructor(
        message: string,
        public readonly viemError: BaseError,
        public readonly revertError: ContractFunctionRevertedError,
        public txId: string | undefined
    ) {
        super(message, viemError, WalletErrorCode.SEND_TRANSACTION_EXECUTION_REVERTED);
    }
}

export class SendTransactionService {
    constructor(
        private publicClient: PublicClient,
        private gasIncreaseFactor = 1.2,
        private confirmations = 2,
        private transactionConfirmationTimeout = 15_000,
        private defaultResendCallback: TransactionServiceResendCallback = async (resendAttempts) => ({
            resend: resendAttempts <= 3,
        })
    ) {}

    async sendTransaction(
        request: TransactionServiceTransactionRequest,
        client: SmartAccountClient<EntryPoint, Transport, Chain, SmartAccount<EntryPoint>>,
        resendCallback = this.defaultResendCallback
    ) {
        for (let attempt = 0; attempt == 0 || (await resendCallback(attempt)).resend; attempt++) {
            const gas = this.modifyGas(attempt, await this.publicClient.estimateFeesPerGas());
            await this.simulateCall(request, undefined);
            let hash;
            try {
                hash = await client.writeContract({
                    ...request,
                    account: client.account,
                    chain: client.chain,
                    ...gas,
                });
            } catch (e) {
                if (e instanceof BaseError) {
                    throw new SendTransactionError(e.message, e);
                }
                throw e;
            }
            try {
                const receipt = await this.publicClient.waitForTransactionReceipt({
                    hash,
                    confirmations: this.confirmations,
                    timeout: this.transactionConfirmationTimeout,
                });
                return await this.handleReceipt(receipt, request);
            } catch (e) {
                if (e instanceof WaitForTransactionReceiptTimeoutError) {
                    continue;
                }
                throw e;
            }
        }
        // TODO discuss
        throw new Error("Retries exceeded");
    }

    private async handleReceipt(receipt: TransactionReceipt, request: TransactionServiceTransactionRequest) {
        if (receipt.status === "reverted") {
            // This should revert and throw the full reason
            await this.simulateCall(request, receipt.transactionHash);
            // Otherwise, throw a generic error (this should practically never happen)
            throw new SendTransactionExecutionRevertedError(
                "Transaction reverted but unable to detect the reason",
                new ContractFunctionRevertedError({ abi: request.abi as Abi, functionName: request.functionName }),
                new ContractFunctionRevertedError({ abi: request.abi as Abi, functionName: request.functionName }),
                receipt.transactionHash
            );
        }
        return receipt.transactionHash;
    }

    private modifyGas(attempt: number, gas: EstimateFeesPerGasReturnType) {
        if (gas.maxPriorityFeePerGas != null) {
            gas.maxFeePerGas *= BigInt(this.gasIncreaseFactor * (attempt + 1));
            gas.maxPriorityFeePerGas *= BigInt(this.gasIncreaseFactor * (attempt + 1));
        }
        if (gas.gasPrice != null) {
            gas.gasPrice *= BigInt(this.gasIncreaseFactor * (attempt + 1));
        }
        return gas;
    }

    private async simulateCall(request: TransactionServiceTransactionRequest, passthroughTxId: string | undefined) {
        try {
            await this.publicClient.simulateContract({
                ...request,
                account: request.address,
                chain: this.publicClient.chain,
            });
        } catch (err) {
            if (err instanceof BaseError) {
                const revertError = err.walk((err) => err instanceof ContractFunctionRevertedError);
                if (revertError instanceof ContractFunctionRevertedError) {
                    throw new SendTransactionExecutionRevertedError(
                        revertError.message,
                        err,
                        revertError,
                        passthroughTxId
                    );
                }
            }
            throw err;
        }
    }
}
