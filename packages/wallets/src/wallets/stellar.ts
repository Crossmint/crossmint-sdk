import { isValidStellarAddress } from "@crossmint/common-sdk-base";
import type { Chain, StellarChain } from "../chains/chains";
import type {
    ApproveOptions,
    PrepareOnly,
    StellarTransactionInput,
    Transaction,
    TransactionInputOptions,
} from "./types";
import { Wallet } from "./wallet";
import { TransactionNotCreatedError } from "../utils/errors";
import type { CreateTransactionSuccessResponse } from "@/api";

export class StellarWallet extends Wallet<StellarChain> {
    constructor(wallet: Wallet<StellarChain>) {
        super(
            {
                chain: wallet.chain,
                address: wallet.address,
                owner: wallet.owner,
                signer: wallet.signer,
                options: Wallet.getOptions(wallet),
                alias: wallet.alias,
            },
            Wallet.getApiClient(wallet)
        );
    }

    static from(wallet: Wallet<Chain>) {
        if (!isValidStellarAddress(wallet.address)) {
            throw new Error("Wallet is not a Stellar wallet");
        }

        return new StellarWallet(wallet as Wallet<StellarChain>);
    }

    public async sendTransaction<T extends TransactionInputOptions | undefined = undefined>(
        params: StellarTransactionInput & { options?: T }
    ): Promise<Transaction<T extends PrepareOnly<true> ? true : false>> {
        await this.preAuthIfNeeded();
        const createdTransaction = await this.createTransaction(params);

        if (params.options?.prepareOnly) {
            return {
                hash: undefined,
                explorerLink: undefined,
                transactionId: createdTransaction.id,
            } as Transaction<T extends PrepareOnly<true> ? true : false>;
        }

        const options: ApproveOptions = {};

        return await this.approveTransactionAndWait(createdTransaction.id, options);
    }

    private async createTransaction(params: StellarTransactionInput): Promise<CreateTransactionSuccessResponse> {
        const { contractId, options } = params;
        const signer = options?.signer ?? this.signer.locator();

        let transaction: any;

        if ("transaction" in params) {
            transaction = {
                type: "serialized-transaction",
                serializedTransaction: params.transaction,
                contractId,
            };
        } else {
            const { method, memo, args } = params;
            transaction = {
                type: "contract-call",
                contractId,
                method,
                memo: memo != null ? { type: "text", value: memo } : undefined,
                args,
            };
        }

        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                transaction,
                signer,
            },
        });

        if ("error" in transactionCreationResponse) {
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }

        return transactionCreationResponse;
    }
}
