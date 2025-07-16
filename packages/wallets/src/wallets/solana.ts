import bs58 from "bs58";
import { isValidSolanaAddress } from "@crossmint/common-sdk-base";
import type { Chain, SolanaChain } from "../chains/chains";
import type { SolanaTransactionInput, Transaction, TransactionInputOptions } from "./types";
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
                options: Wallet.getOptions(wallet),
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

    public async sendTransaction<T extends TransactionInputOptions | undefined = undefined>(
        params: SolanaTransactionInput & { options?: T }
    ): Promise<Transaction<T extends { experimental_prepareOnly: true } ? true : false>> {
        const createdTransaction = await this.createTransaction(params);

        if (params.options?.experimental_prepareOnly) {
            return {
                hash: undefined,
                explorerLink: undefined,
                transactionId: createdTransaction.id,
            } as Transaction<T extends { experimental_prepareOnly: true } ? true : false>;
        }

        const _additionalSigners = params.additionalSigners?.map(
            (signer) =>
                new SolanaExternalWalletSigner({
                    type: "external-wallet",
                    address: signer.publicKey.toString(),
                    locator: `external-wallet:${signer.publicKey.toString()}`,
                    onSignTransaction: (transaction) => {
                        transaction.sign([signer]);
                        return Promise.resolve(transaction);
                    },
                })
        );

        return await this.approveAndWait(createdTransaction.id, _additionalSigners);
    }

    private async createTransaction({
        transaction,
        options,
    }: SolanaTransactionInput): Promise<CreateTransactionSuccessResponse> {
        const signer = options?.experimental_signerLocator ?? this.signer.locator();
        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: {
                transaction: bs58.encode(transaction.serialize()),
                signer,
            },
        });

        if ("error" in transactionCreationResponse) {
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }

        return transactionCreationResponse;
    }
}
