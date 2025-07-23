import type { ExternalWalletInternalSignerConfig, Signer } from "./types";
import type { StellarChain } from "@/chains/chains";
import type { AssembledTransaction } from "@crossmint/stellar-sdk-wrapper";

export class StellarExternalWalletSigner implements Signer {
    type = "external-wallet" as const;
    address: string;
    onSignStellarTransaction?: (transaction: AssembledTransaction) => Promise<AssembledTransaction>; // TODO: Build issues

    constructor(private config: ExternalWalletInternalSignerConfig<StellarChain>) {
        console.log("im in stellar external wallet signer: constructor");
        if (config.address == null) {
            throw new Error("Please provide an address for the External Wallet Signer");
        }
        this.address = config.address;
        this.onSignStellarTransaction = config.onSignStellarTransaction;
    }

    locator() {
        return this.config.locator;
    }

    async signMessage() {
        console.log("im in stellar external wallet signer: signMessage");
        return await Promise.reject(new Error("signMessage method not implemented for stellar external wallet signer"));
    }

    async signTransaction(transaction: string) {
        console.log("im in stellar external wallet signer: signTransaction");
        if (this.onSignStellarTransaction == null) {
            return await Promise.reject(
                new Error(
                    "onSignStellarTransaction method is required to sign transactions with a Stellar external wallet"
                )
            );
        }
        // const transactionBytes = base58.decode(transaction);
        // const deserializedTransaction = VersionedTransaction.deserialize(transactionBytes);
        // // Sign the transaction (we can't use signMessage on transactions, so we need to sign the transaction directly)
        // const signedTxn = await this.onSignTransaction(deserializedTransaction);
        // // Get the signature from the signed transaction
        // const externalWalletPublicKey = new PublicKey(this.address);
        // const signerIndex = signedTxn.message.staticAccountKeys.findIndex((key) => key.equals(externalWalletPublicKey));
        // if (signerIndex === -1) {
        //     throw new TransactionFailedError("Wallet public key not found in transaction signers");
        // }
        // const validSignature = signedTxn.signatures[signerIndex];
        // if (validSignature == null) {
        //     throw new TransactionFailedError("No valid signature found in the transaction");
        // }
        // const signatureBytes = new Uint8Array(Object.values(validSignature));
        return { signature: "test" };
    }
}
