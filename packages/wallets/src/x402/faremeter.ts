import { PublicKey, type VersionedTransaction, type TransactionInstruction } from "@solana/web3.js";
import { exact } from "@faremeter/payment-solana";
import type { SolanaWallet } from "../wallets/solana";
import { wrap as wrapFetch } from "@faremeter/fetch";

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

interface AcceptEntry {
    scheme: string;
    network: string;
    asset: string;
    extra?: {
        features?: { xSettlementAccountSupported?: boolean };
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export async function payX402(wallet: SolanaWallet, url: string): Promise<any> {
    const initialResponse = await fetch(url);

    if (initialResponse.status !== 402) {
        return;
    }

    const body = await initialResponse.json();
    const accepts: AcceptEntry[] = body.accepts ?? [];

    const settlementAccept = accepts.find((a) => a.extra?.features?.xSettlementAccountSupported === true);

    if (!settlementAccept) {
        throw new Error("x402 payment required but xSettlementAccountSupported is not available");
    }

    const network = settlementAccept.network;
    const mint = new PublicKey(settlementAccept.asset);
    const faremeterWallet = toFaremeterWallet(wallet, network);

    const handler = exact.createPaymentHandler(faremeterWallet, mint, undefined, {
        token: { allowOwnerOffCurve: true },
        settlementRentDestination: wallet.address,
        features: { enableSettlementAccounts: true },
    });

    const fetchWithPayer = wrapFetch(fetch, {
        handlers: [handler],
    });

    const response = await fetchWithPayer(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        throw new Error(`x402 payment failed with status ${response.status}`);
    }
    const responseBody = await response.json();
    console.log("response", responseBody);
    return responseBody;
}
