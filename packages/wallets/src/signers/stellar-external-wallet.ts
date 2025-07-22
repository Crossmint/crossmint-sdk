import base58 from "bs58";
import type { ExternalWalletInternalSignerConfig, Signer } from "./types";
import { TransactionFailedError } from "../utils/errors";
import type { StellarChain } from "@/chains/chains";

export class StellarExternalWalletSigner implements Signer {
    type = "external-wallet" as const;
    address: string;
    // onSignTransaction?: (transaction: AssembledTransaction) => Promise<AssembledTransaction>; // TODO: Build issues
    onSignStellarTransaction?: (transaction: string) => Promise<string>;

    constructor(private config: ExternalWalletInternalSignerConfig<StellarChain>) {
        console.log("im in stellar external wallet signer: constructor");
        if (config.address == null) {
            throw new Error("Please provide an address for the External Wallet Signer");
        }
        this.address = config.address;
        // this.onSignTransaction = config.onSignTransaction;
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
                new Error("onSignTransaction method is required to sign transactions with a Solana external wallet")
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
