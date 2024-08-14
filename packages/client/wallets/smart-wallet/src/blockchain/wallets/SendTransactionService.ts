import { SmartAccountClient } from "permissionless";
import { EntryPoint } from "permissionless/_types/types";
import { SmartAccount } from "permissionless/accounts";
import {
    Abi,
    Address,
    BaseError,
    Chain,
    ContractFunctionRevertedError,
    PublicClient,
    TransactionReceipt,
    Transport,
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

export interface SendTransactionOptions {
    confirmations: number;
    transactionConfirmationTimeout: number;
    awaitConfirmation?: boolean;
}

export class SendTransactionService {
    constructor(
        private publicClient: PublicClient,
        private defaultSendTransactionOptions: SendTransactionOptions = {
            confirmations: 2,
            transactionConfirmationTimeout: 30_000,
            awaitConfirmation: true,
        }
    ) {}

    async sendTransaction(
        request: TransactionServiceTransactionRequest,
        client: SmartAccountClient<EntryPoint, Transport, Chain, SmartAccount<EntryPoint>>,
        config: Partial<SendTransactionOptions> = {}
    ) {
        const { confirmations, transactionConfirmationTimeout, awaitConfirmation } = this.getConfig(config);
        try {
            await this.simulateCall(request, undefined);
            const hash = await client.writeContract({
                ...request,
                account: client.account,
                chain: client.chain,
            });
            if (awaitConfirmation) {
                const receipt = await this.publicClient.waitForTransactionReceipt({
                    hash,
                    confirmations,
                    timeout: transactionConfirmationTimeout,
                });
                return await this.handleReceipt(receipt, request);
            } else {
                return hash;
            }
        } catch (e) {
            if (e instanceof BaseError) {
                throw new SendTransactionError(e.message, e);
            }
            throw e;
        }
    }

    private getConfig(config: Partial<SendTransactionOptions>): SendTransactionOptions {
        return {
            ...this.defaultSendTransactionOptions,
            ...config,
        };
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
