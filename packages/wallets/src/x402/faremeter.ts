import { PublicKey, type VersionedTransaction, type TransactionInstruction } from "@solana/web3.js";
import { exact } from "@faremeter/payment-solana";
import { wrap as wrapFetch } from "@faremeter/fetch";
import type { Wallet } from "../wallets/wallet";
import type { SolanaWallet } from "../wallets/solana";
import type { Chain } from "@/chains/chains";

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
    wallet: Wallet<Chain>,
    url: string,
    network: string,
    mint: string,
    options?: { method?: "GET" | "POST"; headers?: Record<string, string> }
) {
    const mintPubkey = new PublicKey(mint);
    // Dynamic import breaks the static cycle: wallet.ts → faremeter.ts → solana.ts → wallet.ts
    // @ts-expect-error - Error because we dont use 'module' field in tsconfig, which is expected because we use tsup to compile
    const { SolanaWallet } = await import("../wallets/solana");
    const solanaWallet = SolanaWallet.from(wallet);
    const faremeterWallet = toFaremeterWallet(solanaWallet, network);

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
    return responseBody.data;
}
