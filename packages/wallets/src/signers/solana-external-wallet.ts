import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import type { ExternalWalletInternalSignerConfig } from "./types";
import type { SolanaChain } from "@/chains/chains";
import { TransactionFailedError } from "../utils/errors";
import { ExternalWalletSigner } from "./external-wallet-signer";
import { extractMessageBytes, messageVersion } from "./solana-transaction-format";

const VERSION_1 = 1;

export class SolanaExternalWalletSigner extends ExternalWalletSigner<SolanaChain> {
    private onSign?: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
    private onSignBytes?: (payload: string) => Promise<string>;

    constructor(config: ExternalWalletInternalSignerConfig<SolanaChain>) {
        super(config);
        this.onSign = config.onSign;
        this.onSignBytes = config.onSignBytes;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for solana external wallet signer"));
    }

    async signTransaction(transaction: string) {
        const transactionBytes = base58.decode(transaction);
        const messageBytes = extractMessageBytes(transactionBytes);

        // web3.js cannot serialize a version-1 message, so it can neither sign one nor hand one to an adapter.
        if (messageVersion(messageBytes) === VERSION_1) {
            return await this.signRawMessage(messageBytes);
        }
        return await this.signThroughWalletAdapter(transactionBytes);
    }

    private async signRawMessage(messageBytes: Uint8Array) {
        if (this.onSignBytes == null) {
            throw new Error(
                "[SolanaExternalWalletSigner] This is a version-1 transaction, which @solana/web3.js cannot serialize for the onSign callback. Pass an onSignBytes callback that signs the supplied payload with the external wallet key."
            );
        }
        const signature = await this.onSignBytes(base58.encode(messageBytes));
        if (signature == null) {
            throw new TransactionFailedError("[SolanaExternalWalletSigner] onSignBytes returned no signature");
        }
        return { signature };
    }

    private async signThroughWalletAdapter(transactionBytes: Uint8Array) {
        if (this.onSign == null) {
            throw new Error(
                "[SolanaExternalWalletSigner] No onSign callback provided. Pass an onSign callback when configuring the external wallet signer."
            );
        }
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
