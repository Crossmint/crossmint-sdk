import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import type { ExternalWalletInternalSignerConfig } from "./types";
import type { SolanaChain } from "@/chains/chains";
import { TransactionFailedError } from "../utils/errors";
import { ExternalWalletSigner } from "./external-wallet-signer";

export class SolanaExternalWalletSigner extends ExternalWalletSigner<SolanaChain> {
    private onSign: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;

    constructor(config: ExternalWalletInternalSignerConfig<SolanaChain>) {
        super(config);
        this.onSign = config.onSign;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for solana external wallet signer"));
    }

    async signTransaction(transaction: string) {
        const transactionBytes = base58.decode(transaction);
        const deserializedTransaction = VersionedTransaction.deserialize(transactionBytes);
        const signedTxn = await this.onSign(deserializedTransaction);
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
