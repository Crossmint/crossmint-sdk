import { type VersionedTransaction, Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";

export type SolanaAddress = string;

export type SolanaKeypairSignerInput = {
    type: "solana-keypair";
    address: SolanaAddress;
    signer: Keypair;
};

export type SolanaExternalSignerInput = {
    type: "solana-keypair";
    address: SolanaAddress;
    signer: {
        signMessage: (message: Uint8Array) => Promise<Uint8Array>;
        signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
    };
};

export type SolanaNonCustodialSignerInput = SolanaKeypairSignerInput | SolanaExternalSignerInput;

export type SolanaCustodialSignerInput = {
    type: "solana-fireblocks-custodial";
};

export type SolanaSignerInput = SolanaNonCustodialSignerInput | SolanaCustodialSignerInput;

export type SolanaNonCustodialSigner = {
    type: "solana-keypair";
    address: SolanaAddress;
    signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
};
export type SolanaCustodialSigner = {
    type: "solana-fireblocks-custodial";
    address?: SolanaAddress;
};

export type SolanaSigner = SolanaNonCustodialSigner | SolanaCustodialSigner;

export const parseSolanaNonCustodialSignerInput = (
    signerInput: SolanaNonCustodialSignerInput
): SolanaNonCustodialSigner => {
    const { signer } = signerInput;
    if (signer instanceof Keypair) {
        return {
            type: "solana-keypair",
            address: signer.publicKey.toBase58(),
            // biome-ignore lint/suspicious/useAwait: <explanation>
            signTransaction: async (transaction: VersionedTransaction) => {
                transaction.sign([signer]);
                return transaction;
            },
            // biome-ignore lint/suspicious/useAwait: <explanation>
            signMessage: async (message: Uint8Array) => {
                const signature = nacl.sign.detached(message, signer.secretKey);
                return new Uint8Array(signature);
            },
        };
    }
    return {
        type: "solana-keypair",
        address: signerInput.address,
        signTransaction: signer.signTransaction,
        signMessage: signer.signMessage,
    };
};

export const isCustodialSigner = (signer: SolanaSigner): signer is SolanaCustodialSigner => {
    return signer.type === "solana-fireblocks-custodial";
};
export const isNonCustodialSigner = (signer: SolanaSigner): signer is SolanaNonCustodialSigner => {
    return !isCustodialSigner(signer);
};

export const parseSolanaSignerInput = (signerInput: SolanaSignerInput): SolanaSigner => {
    if (signerInput.type === "solana-fireblocks-custodial") {
        return {
            type: "solana-fireblocks-custodial",
        };
    }
    return parseSolanaNonCustodialSignerInput(signerInput);
};
