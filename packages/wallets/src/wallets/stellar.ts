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
        const createdTransaction = await this.createTransaction(params);

        if (params.options?.experimental_prepareOnly) {
            return {
                hash: undefined,
                explorerLink: undefined,
                transactionId: createdTransaction.id,
            } as Transaction<T extends PrepareOnly<true> ? true : false>;
        }

        const options: ApproveOptions = {};

        return await this.approveTransactionAndWait(createdTransaction.id, options);
    }

    private async createTransaction({
        contractId,
        method,
        memo,
        args,
        options,
    }: StellarTransactionInput): Promise<CreateTransactionSuccessResponse> {
        const signer = options?.experimental_signer ?? this.signer.locator();
        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                transaction: {
                    type: "contract-call",
                    contractId,
                    method,
                    memo,
                    args,
                },
                signer,
            },
        });

        if ("error" in transactionCreationResponse) {
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }

        return transactionCreationResponse;
    }
}
