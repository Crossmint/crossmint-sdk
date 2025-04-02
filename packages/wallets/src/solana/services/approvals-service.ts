import bs58 from "bs58";
import { PublicKey, VersionedMessage, VersionedTransaction } from "@solana/web3.js";
import type { ApiClient, CreateTransactionSuccessResponse, SolanaWalletLocator } from "@/api";
import type { SolanaNonCustodialSigner } from "../types/signers";
import { PendingApprovalsError, InvalidSignerError, TransactionFailedError } from "../../utils/errors";

type PendingApproval = NonNullable<NonNullable<CreateTransactionSuccessResponse["approvals"]>["pending"]>[number];

export class SolanaApprovalsService {
    constructor(
        private readonly walletLocator: SolanaWalletLocator,
        private readonly apiClient: ApiClient
    ) {}

    public async approve(
        transactionId: string,
        pendingApprovals: Array<PendingApproval>,
        signers: Array<SolanaNonCustodialSigner>
    ) {
        const approvals = await Promise.all(
            pendingApprovals.map(async (approval) => {
                const signer = signers.find((s) => approval.signer.includes(s.address));
                if (signer == null) {
                    throw new InvalidSignerError(
                        `Signer ${approval.signer} is required for the transaction but was not found in the signer list`
                    );
                }
                // Convert the decoded transaction message from server back into a VersionedTransaction
                const messageBytes = bs58.decode(approval.message);
                const message = VersionedMessage.deserialize(messageBytes);
                const transaction = new VersionedTransaction(message);
                // Sign the transaction (we can't use signMessage on transactions, so we need to sign the transaction directly)
                const signedTxn = await signer.signTransaction(transaction);
                // Get the signature from the signed transaction
                const walletPublicKey = new PublicKey(signer.address);
                const signature = this.retrieveValidSignature(signedTxn, walletPublicKey);
                return {
                    signature,
                    signer: approval.signer,
                };
            })
        );
        const transaction = await this.apiClient.approveTransaction(this.walletLocator, transactionId, {
            approvals,
        });
        if (transaction.error) {
            throw new TransactionFailedError(JSON.stringify(transaction));
        }
        if (transaction.status === "awaiting-approval") {
            throw new PendingApprovalsError("Still has pending approvals, please submit all approvals");
        }
        return transaction;
    }

    private retrieveValidSignature(signedTxn: VersionedTransaction, signerPublicKey: PublicKey) {
        const signerIndex = signedTxn.message.staticAccountKeys.findIndex((key) => key.equals(signerPublicKey));
        if (signerIndex === -1) {
            throw new TransactionFailedError("Wallet public key not found in transaction signers");
        }
        const signature = signedTxn.signatures[signerIndex];
        if (signature == null) {
            throw new TransactionFailedError("No valid signature found in the transaction");
        }
        const signatureBytes = new Uint8Array(Object.values(signature));
        return bs58.encode(signatureBytes);
    }
}
