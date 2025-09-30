import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import type { ExternalWalletInternalSignerConfig, Signer } from "./types";
import { TransactionFailedError } from "../utils/errors";
import type { SolanaChain } from "@/chains/chains";

export class SolanaExternalWalletSigner implements Signer {
    type = "external-wallet" as const;
    private _address: string;
    onSignTransaction?: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;

    constructor(private config: ExternalWalletInternalSignerConfig<SolanaChain>) {
        if (config.address == null) {
            throw new Error("Please provide an address for the External Wallet Signer");
        }
        this._address = config.address;
        this.onSignTransaction = config.onSignTransaction;
    }

    address() {
        return this._address;
    }

    locator() {
        return this.config.locator;
    }

    async sign(payload: string) {
        return await Promise.reject(new Error("sign method not implemented for solana external wallet signer"));
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for solana external wallet signer"));
    }

    async signTransaction(transaction: string) {
        if (this.onSignTransaction == null) {
            return await Promise.reject(
                new Error("onSignTransaction method is required to sign transactions with a Solana external wallet")
            );
        }
        const transactionBytes = base58.decode(transaction);
        const deserializedTransaction = VersionedTransaction.deserialize(transactionBytes);
        // Sign the transaction (we can't use signMessage on transactions, so we need to sign the transaction directly)
        const signedTxn = await this.onSignTransaction(deserializedTransaction);
        // Get the signature from the signed transaction
        const externalWalletPublicKey = new PublicKey(this._address);
        const signerIndex = signedTxn.message.staticAccountKeys.findIndex((key) => key.equals(externalWalletPublicKey));
        if (signerIndex === -1) {
            throw new TransactionFailedError("Wallet public key not found in transaction signers");
        }
        const validSignature = signedTxn.signatures[signerIndex];
        if (validSignature == null) {
            throw new TransactionFailedError("No valid signature found in the transaction");
        }
        const signatureBytes = new Uint8Array(Object.values(validSignature));
        return { signature: base58.encode(signatureBytes) };
    }
}
