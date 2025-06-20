import bs58 from "bs58";
import type { Chain, SolanaChain } from "../chains/chains";
import type { SolanaTransactionInput, Transaction } from "./types";
import { Wallet } from "./wallet";
import { TransactionNotCreatedError } from "../utils/errors";
import { SolanaExternalWalletSigner } from "@/signers/solana-external-wallet";
import { isValidSolanaAddress } from "@crossmint/common-sdk-base";

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
        const transactionParams = {
            transaction: bs58.encode(transaction.serialize()),
        };

        const transactionCreationResponse = await this.apiClient.createTransaction(this.walletLocator, {
            params: transactionParams,
        });

        if (transactionCreationResponse.error) {
            throw new TransactionNotCreatedError(JSON.stringify(transactionCreationResponse));
        }

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

        return await this.approveAndWait(transactionCreationResponse.id, _additionalSigners);
    }
}
