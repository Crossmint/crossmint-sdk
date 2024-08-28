import type { SmartAccountClient } from "permissionless";
import type { EntryPoint } from "permissionless/_types/types";
import type { SmartAccount } from "permissionless/accounts";
import {
    type Abi,
    type Address,
    BaseError,
    type Chain,
    ContractFunctionRevertedError,
    type Hex,
    type PublicClient,
    type TransactionReceipt,
    type Transport,
} from "viem";

import { CrossmintSDKError, WalletErrorCode } from "@crossmint/client-sdk-base";

export type TransactionServiceTransactionRequest = {
    address: Address;
    abi: Abi;
    functionName: string;
    args: any;
    value?: bigint;
};

export type SendTransactionFailureStage = "simulation" | "send" | "confirmation" | "execution";

/**
 * Error thrown when a transaction fails to send.
 * @param viemError The error thrown by the viem client. See https://viem.sh/docs/glossary/errors.html
 */
export class EVMSendTransactionError extends CrossmintSDKError {
    constructor(
        message: string,
        public readonly viemError: BaseError,
        public readonly stage: SendTransactionFailureStage,
        code = WalletErrorCode.SEND_TRANSACTION_FAILED
    ) {
        super(message, code);
    }
}

/**
 * Error thrown when a transaction fails due to a contract execution error.
 * @param viemError The error thrown by the viem client. See https://viem.sh/docs/glossary/errors.html
 * @param data The name and arguments of the revert error from the provided ABI
 * @param reason The revert error if it is a string and not an ABI error
 * @example
 * try {
 *   await wallet.executeContract({
 *     address: contractAddress,
 *     abi,
 *     functionName: "mintNFT",
 *     args: [recipientAddress],
 *   });
 * } catch (e) {
 *   if (e instanceof SendTransactionExecutionRevertedError) {
 *     alert(`Transaction reverted: ${e.revertError.message}`);
 *   }
 *   throw e;
 * }
 */
export class EVMSendTransactionExecutionRevertedError extends EVMSendTransactionError {
    constructor(
        message: string,
        public readonly viemError: BaseError,
        revertError: ContractFunctionRevertedError,
        public readonly txId: string | undefined,
        public readonly stage: SendTransactionFailureStage,
        public readonly data = revertError.data,
        public readonly reason = revertError.reason
    ) {
        super(message, viemError, stage, WalletErrorCode.SEND_TRANSACTION_EXECUTION_REVERTED);
    }
}

export interface SendTransactionOptions {
    /**
     * The number of confirmations to wait for before yielding the transaction hash.
     */
    confirmations: number;
    /**
     * The timeout in milliseconds to wait for a transaction to confirm before throwing an error.
     */
    transactionConfirmationTimeout: number;
}

export class SendTransactionService {
    constructor(
        private publicClient: PublicClient,
        private defaultSendTransactionOptions: SendTransactionOptions = {
            confirmations: 2,
            transactionConfirmationTimeout: 30_000,
        }
    ) {}

    async sendTransaction(
        request: TransactionServiceTransactionRequest,
        client: SmartAccountClient<EntryPoint, Transport, Chain, SmartAccount<EntryPoint>>,
        config: Partial<SendTransactionOptions> = {}
    ): Promise<Hex> {
        const { confirmations, transactionConfirmationTimeout } = this.getConfig(config);

        await this.simulateCall(request, undefined, "simulation");

        let hash;
        try {
            hash = await client.writeContract({
                ...request,
                account: client.account,
                chain: client.chain,
            });
        } catch (e) {
            if (e instanceof BaseError) {
                throw new EVMSendTransactionError(e.message, e, "send");
            }
            throw e;
        }

        try {
            const receipt = await this.publicClient.waitForTransactionReceipt({
                hash,
                confirmations,
                timeout: transactionConfirmationTimeout,
            });
            return await this.handleReceipt(receipt, request);
        } catch (e) {
            if (e instanceof BaseError) {
                throw new EVMSendTransactionError(e.message, e, "confirmation");
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
            await this.simulateCall(request, receipt.transactionHash, "execution");
            // Otherwise, throw a generic error (this should practically never happen)
            throw new EVMSendTransactionExecutionRevertedError(
                "Transaction reverted but unable to detect the reason",
                new ContractFunctionRevertedError({ abi: request.abi as Abi, functionName: request.functionName }),
                new ContractFunctionRevertedError({ abi: request.abi as Abi, functionName: request.functionName }),
                receipt.transactionHash,
                "execution"
            );
        }
        return receipt.transactionHash;
    }

    private async simulateCall(
        request: TransactionServiceTransactionRequest,
        passthroughTxId: string | undefined,
        stage: SendTransactionFailureStage
    ) {
        try {
            await this.publicClient.simulateContract({
                ...request,
                account: request.address,
                chain: this.publicClient.chain,
            });
        } catch (e) {
            if (e instanceof BaseError) {
                const revertError = e.walk((err) => err instanceof ContractFunctionRevertedError);
                if (revertError instanceof ContractFunctionRevertedError) {
                    throw new EVMSendTransactionExecutionRevertedError(
                        revertError.message,
                        e,
                        revertError,
                        passthroughTxId,
                        stage
                    );
                }
                throw new EVMSendTransactionError(e.message, e, stage);
            }
            throw e;
        }
    }
}
