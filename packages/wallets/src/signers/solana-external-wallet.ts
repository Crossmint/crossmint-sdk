import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { ExternalWalletSignerConfig, IExternalWalletSigner } from "./types";
import base58 from "bs58";
import { TransactionFailedError } from "@/utils/errors";

export class SolanaExternalWalletSigner implements IExternalWalletSigner {
    type = "external-wallet" as const;
    address: string;
    onSignTransaction?: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;

    constructor(config: ExternalWalletSignerConfig) {
        this.address = config.address;
        this.onSignTransaction = config.onSignTransaction;
    }

    locator() {
        return `solana-keypair:${this.address}`;
    }

    async signTransaction(transaction: string) {
        if (this.onSignTransaction != null) {
            const transactionBytes = base58.decode(transaction);
            const deserializedTransaction = VersionedTransaction.deserialize(transactionBytes);
            // Sign the transaction (we can't use signMessage on transactions, so we need to sign the transaction directly)
            const signedTxn = await this.onSignTransaction(deserializedTransaction);
            // Get the signature from the signed transaction
            const externalWalletPublicKey = new PublicKey(this.address);
            const signerIndex = signedTxn.message.staticAccountKeys.findIndex((key) =>
                key.equals(externalWalletPublicKey)
            );
            if (signerIndex === -1) {
                throw new TransactionFailedError("Wallet public key not found in transaction signers");
            }
            const validSignature = signedTxn.signatures[signerIndex];
            if (validSignature == null) {
                throw new TransactionFailedError("No valid signature found in the transaction");
            }
            const signatureBytes = new Uint8Array(Object.values(validSignature));
            return base58.encode(signatureBytes);
        }
        return "";
    }
}
