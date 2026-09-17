import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import type { ExternalWalletInternalSignerConfig } from "./types";
import type { SolanaChain } from "@/chains/chains";
import { TransactionFailedError } from "../utils/errors";
import { ExternalWalletSigner } from "./external-wallet-signer";

export class SolanaExternalWalletSigner extends ExternalWalletSigner<SolanaChain> {
    private onSign?: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
    private onSignBytes?: (payload: string) => Promise<string>;

    constructor(config: ExternalWalletInternalSignerConfig<SolanaChain>) {
        super(config);
        this.onSign = config.onSign;
        this.onSignBytes = config.onSignBytes;
    }

    async signMessage(message: string) {
        if (this.onSignBytes == null) {
            throw new Error(
                "[SolanaExternalWalletSigner] No onSignBytes callback provided. Pass an onSignBytes callback when configuring the external wallet signer."
            );
        }
        const signature = await this.onSignBytes(message);
        if (signature == null) {
            throw new TransactionFailedError("[SolanaExternalWalletSigner] onSignBytes returned no signature");
        }
        return { signature };
    }

    async signTransaction(transaction: string) {
        if (this.onSign == null) {
            throw new Error(
                "[SolanaExternalWalletSigner] No onSign callback provided. Pass an onSign callback when configuring the external wallet signer."
            );
        }
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
