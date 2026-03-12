import { PublicKey, type VersionedTransaction, type TransactionInstruction } from "@solana/web3.js";
import { exact } from "@faremeter/payment-solana";
import { wrap as wrapFetch } from "@faremeter/fetch";
import type { SolanaWallet } from "../wallets/solana";

interface FaremeterWallet {
    network: string;
    publicKey: PublicKey;
    buildTransaction?: (
        instructions: TransactionInstruction[],
        recentBlockHash: string
    ) => Promise<VersionedTransaction>;
    updateTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
    sendTransaction?: (tx: VersionedTransaction) => Promise<string>;
}

function toFaremeterWallet(wallet: SolanaWallet, network: string): FaremeterWallet {
    return {
        network,
        publicKey: new PublicKey(wallet.address),
        sendTransaction: async (tx: VersionedTransaction) => {
            const result = await wallet.sendTransaction({ transaction: tx });
            return result.hash;
        },
    };
}

export async function payX402(
    wallet: SolanaWallet,
    url: string,
    network: string,
    mint: string,
    options?: { method?: "GET" | "POST"; headers?: Record<string, string> }
) {
    const mintPubkey = new PublicKey(mint);
    const faremeterWallet = toFaremeterWallet(wallet, network);

    const handler = exact.createPaymentHandler(faremeterWallet, mintPubkey, undefined, {
        token: { allowOwnerOffCurve: true },
        settlementRentDestination: wallet.address,
        features: { enableSettlementAccounts: true },
    });

    const fetchWithPayer = wrapFetch(fetch, {
        handlers: [handler],
    });

    const response = await fetchWithPayer(url, {
        method: options?.method ?? "GET",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });
    if (!response.ok) {
        throw new Error(`x402 payment failed with status ${response.status}`);
    }
    const responseBody = await response.json();
    return responseBody;
}
