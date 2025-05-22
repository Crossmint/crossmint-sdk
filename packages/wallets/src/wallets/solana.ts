import { SolanaChain } from "../chains/chains";
import { SolanaTransactionInput } from "./types";
import { Wallet } from "./wallet";
import bs58 from "bs58";
import { TransactionNotCreatedError } from "../utils/errors";

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

    static from(wallet: Wallet<SolanaChain>) {
        return new SolanaWallet(wallet);
    }

    // TODO: Add additional signers
    public async sendTransaction({
        versionedTransaction,
    }: SolanaTransactionInput): Promise<string> {
        const transactionParams = {
            transaction: bs58.encode(versionedTransaction.serialize()),
            signer: this.signer.legacyLocator(),
        };

        const transactionCreationResponse =
            await this.apiClient.createTransaction(this.walletLocator, {
                params: transactionParams,
            });

        if (transactionCreationResponse.error) {
            throw new TransactionNotCreatedError(
                JSON.stringify(transactionCreationResponse)
            );
        }

        const hash = await this.approveAndWait(
            transactionCreationResponse.id
        );

        return hash;
    }
}
