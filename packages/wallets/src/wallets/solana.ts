import bs58 from "bs58";
import { isValidSolanaAddress } from "@crossmint/common-sdk-base";
import type { Chain, SolanaChain } from "../chains/chains";
import type { PreparedTransaction, SolanaTransactionInput, Transaction } from "./types";
import { Wallet } from "./wallet";
import { TransactionNotCreatedError } from "../utils/errors";
import { SolanaExternalWalletSigner } from "@/signers/solana-external-wallet";
import type { CreateTransactionSuccessResponse } from "@/api";

export class SolanaWallet extends Wallet<SolanaChain> {
    constructor(wallet: Wallet<SolanaChain>) {
        super(
            {
                chain: wallet.chain,
                address: wallet.address,
                owner: wallet.owner,
                signer: wallet.signer,
            },
            Wallet.getApiClient(wallet)
        );
    }

    static from(wallet: Wallet<Chain>) {
        if (!isValidSolanaAddress(wallet.address)) {
            throw new Error("Wallet is not a Solana wallet");
        }

        return new SolanaWallet(wallet as Wallet<SolanaChain>);
    }

    public async sendTransaction({ transaction, additionalSigners }: SolanaTransactionInput): Promise<Transaction> {
        const preparedTransaction = await this.prepareTransaction({ transaction });
        const _additionalSigners = additionalSigners?.map(
            (signer) =>
                new SolanaExternalWalletSigner({
                    type: "external-wallet",
                    address: signer.publicKey.toString(),
                    onSignTransaction: (transaction) => {
                        transaction.sign([signer]);
                        return Promise.resolve(transaction);
                    },
                })
        );

        return await this.approveAndWait(preparedTransaction.txId, _additionalSigners);
    }

    public async prepareTransaction({ transaction }: SolanaTransactionInput): Promise<PreparedTransaction> {
        const createdTransaction = await this.createTransaction({ transaction });
        return {
            txId: createdTransaction.id,
        };
    }

    private async createTransaction({
        transaction,
    }: SolanaTransactionInput): Promise<CreateTransactionSuccessResponse> {
        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: { transaction: bs58.encode(transaction.serialize()) },
        });

        if (transactionCreationResponse.error) {
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }

        return transactionCreationResponse;
    }
}
