import { CrossmintWallet } from "@crossmint/wallets-sdk";
import type {
    SolanaMPCWallet,
    SolanaSmartWallet,
} from "@crossmint/wallets-sdk";
import {
    Connection,
    Keypair,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";

// API keys should ideally be in environment variables
const SMART_WALLET_API_KEY =
    "sk_staging_33C7mSGPtxnG6dgdTpLAZgkG2uJpVDSzDody11TjtEBTFDKQwKn5QjCn7UKNPeB1iWhhkdCjyReeCJLcFtDH8SVPmtLtRP43AHzmzWNtTDtKEnPyRTRMPFZ2jxKdDQeVtXn4p3HbbKto8zeh6mEUushUm9pFJgZvXveknrFcRmPWd53g11YFqhm7u6516nHkMgaEV3YMnyibHkpjYu7XPA3";
const MPC_WALLET_API_KEY =
    "sk_staging_2B44Zyt81cLJFTq5xcyUsZwNEq94J8j9Tq2k2MkdVjRsUobYPJBjoGHCNtJrUqCEi17DL9ncFqtQqd9BQ3dcJeqFdi1ZLqN1MWuqAkeJwidsJcXZEJYKmeVDzzci6xxejLfFXVzWGeuRbGR2Y1EV6xnVidPaDRhQfHvNAaocGZkPp1uPPYvxyjxBzqfCMpPxjFRDo7CP8oFt37zF1UnzKYW";

export const connection = new Connection("https://api.devnet.solana.com");

export type WalletType = "smart" | "mpc" | "smart-non-custodial";
export type WalletTypeToWalletSDKType = {
    mpc: "solana-mpc-wallet";
    smart: "solana-smart-wallet";
    "smart-non-custodial": "solana-smart-wallet";
};
export const walletTypeToWalletSDKType: WalletTypeToWalletSDKType = {
    mpc: "solana-mpc-wallet",
    smart: "solana-smart-wallet",
    "smart-non-custodial": "solana-smart-wallet",
};
export type WalletTypeToWallet = {
    "solana-mpc-wallet": SolanaMPCWallet;
    "solana-smart-wallet": SolanaSmartWallet;
};
export type WalletTypeToOptions = {
    mpc: { linkedUser: string };
    smart: Record<string, never>;
    "smart-non-custodial": { adminSigner: Keypair };
};

export async function createWallet<T extends WalletType>(
    type: T
): Promise<SolanaMPCWallet | SolanaSmartWallet> {
    console.log(`Starting ${type} wallet creation...`);

    const apiKey =
        type === "smart" || type === "smart-non-custodial"
            ? SMART_WALLET_API_KEY
            : MPC_WALLET_API_KEY;

    const walletType = walletTypeToWalletSDKType[type];

    const crossmintInstance = { apiKey };
    const walletInstance = CrossmintWallet.from(crossmintInstance);

    let options = {};
    if (type === "mpc") {
        options = { linkedUser: "email:alberto@paella.dev" };
    } else if (type === "smart-non-custodial") {
        const kp = Keypair.generate();
        const adminSigner = {
            type: "solana-keypair",
            signer: kp,
            address: kp.publicKey.toBase58(),
        };
        options = { adminSigner };
    }

    const solanaWallet = await walletInstance.getOrCreateWallet<
        WalletTypeToWalletSDKType[T]
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    >(walletType, options as any);
    console.log(`Solana ${type} wallet created:`, solanaWallet);
    return solanaWallet;
}

export async function sendTransaction(
    wallet: SolanaSmartWallet | SolanaMPCWallet,
    message: string,
    delegatedSigner?: any
): Promise<string> {
    const walletAddress = await wallet.getAddress();
    console.log("walletAddress", walletAddress);
    console.log("delegatedSigner", delegatedSigner);

    const memoInstruction = new TransactionInstruction({
        keys: [
            {
                pubkey: new PublicKey(walletAddress),
                isSigner: true,
                isWritable: true,
            },
        ],
        data: Buffer.from(message, "utf-8"),
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
    });

    const newMessage = new TransactionMessage({
        payerKey: new PublicKey(walletAddress),
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: [memoInstruction],
    });

    const transaction = new VersionedTransaction(
        newMessage.compileToV0Message()
    );

    return wallet.sendTransaction({ transaction, delegatedSigner });
}

export async function addDelegatedSigner(wallet: SolanaSmartWallet) {
    const newSigner = Keypair.generate();
    return {
        response: await wallet.addDelegatedSigner(
            newSigner.publicKey.toBase58()
        ),
        signer: {
            type: "solana-keypair",
            signer: newSigner,
            address: newSigner.publicKey.toBase58(),
        },
    };
}
