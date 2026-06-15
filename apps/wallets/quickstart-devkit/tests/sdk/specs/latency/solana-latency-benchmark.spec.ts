import { test, expect } from "@playwright/test";
import { CrossmintWallets, createCrossmint, SolanaWallet } from "@crossmint/wallets-sdk";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";
import {
    AUTH_CONFIG,
    TEST_RECIPIENT_WALLET_ADDRESSES,
    validateAPITestConfig,
} from "../../../shared/constants/globalConstants";

const API_KEY = AUTH_CONFIG.crossmintApiKey;
const BASE_URL = process.env.CROSSMINT_BASE_URL || "https://preview.crossmint.com";
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

function makeSdk() {
    return CrossmintWallets.from(
        createCrossmint({
            apiKey: API_KEY,
            overrideBaseUrl: BASE_URL,
        })
    );
}

function makeSolanaRecovery() {
    const keypair = Keypair.generate();
    return {
        type: "external-wallet" as const,
        address: keypair.publicKey.toBase58(),
        onSign: async (transaction: VersionedTransaction) => {
            transaction.sign([keypair]);
            return transaction;
        },
    };
}

type PhaseTimings = {
    phase: string;
    durationMs: number;
};

function logTimingTable(testName: string, timings: PhaseTimings[]) {
    const totalMs = timings.reduce((sum, t) => sum + t.durationMs, 0);
    console.log(`\n${"=".repeat(70)}`);
    console.log(`LATENCY BENCHMARK: ${testName}`);
    console.log(`${"=".repeat(70)}`);
    console.log(`${"Phase".padEnd(50)} ${"Duration".padStart(10)}`);
    console.log(`${"-".repeat(50)} ${"-".repeat(10)}`);
    for (const t of timings) {
        console.log(`${t.phase.padEnd(50)} ${`${t.durationMs.toFixed(0)}ms`.padStart(10)}`);
    }
    console.log(`${"-".repeat(50)} ${"-".repeat(10)}`);
    console.log(`${"TOTAL".padEnd(50)} ${`${totalMs.toFixed(0)}ms`.padStart(10)}`);
    console.log(`${"=".repeat(70)}\n`);
}

async function buildZeroTransferTransaction(
    fromAddress: string,
    toAddress: string,
    connection: Connection
): Promise<VersionedTransaction> {
    const from = new PublicKey(fromAddress);
    const to = new PublicKey(toAddress);

    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const instruction = SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: to,
        lamports: 0,
    });

    const messageV0 = new TransactionMessage({
        payerKey: from,
        recentBlockhash: blockhash,
        instructions: [instruction],
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
}

test.describe("Solana Latency Benchmark", { tag: "@latency" }, () => {
    let sdk: CrossmintWallets;
    let connection: Connection;

    test.beforeAll(() => {
        validateAPITestConfig();
        console.log(`\nTarget environment: ${BASE_URL}`);
        console.log(`Solana RPC: ${SOLANA_RPC_URL}`);
    });

    test.beforeEach(() => {
        sdk = makeSdk();
        connection = new Connection(SOLANA_RPC_URL, "confirmed");
    });

    test(`end-to-end: sendTransaction() — full SDK latency`, async () => {
        const timings: PhaseTimings[] = [];

        const t1 = performance.now();
        const wallet = await sdk.createWallet({
            chain: "solana",
            recovery: makeSolanaRecovery(),
            owner: `userId:latency-solana-e2e-${Date.now()}`,
        });
        timings.push({ phase: "createWallet()", durationMs: performance.now() - t1 });

        expect(wallet.address).toBeTruthy();

        const solanaWallet = SolanaWallet.from(wallet);

        const t2 = performance.now();
        const transaction = await buildZeroTransferTransaction(
            wallet.address,
            TEST_RECIPIENT_WALLET_ADDRESSES.solana,
            connection
        );
        timings.push({ phase: "buildTransaction() [client-side]", durationMs: performance.now() - t2 });

        const t3 = performance.now();
        const tx = await solanaWallet.sendTransaction({ transaction });
        timings.push({
            phase: "sendTransaction() [create+sign+approve+confirm]",
            durationMs: performance.now() - t3,
        });

        expect(tx.hash).toBeTruthy();
        expect(tx.transactionId).toBeTruthy();

        logTimingTable("Solana — sendTransaction() end-to-end", timings);
    });

    test(`phased: prepareOnly + approve — create vs approve+confirm`, async () => {
        const timings: PhaseTimings[] = [];

        const wallet = await sdk.createWallet({
            chain: "solana",
            recovery: makeSolanaRecovery(),
            owner: `userId:latency-solana-phased-${Date.now()}`,
        });

        expect(wallet.address).toBeTruthy();

        const solanaWallet = SolanaWallet.from(wallet);

        const transaction = await buildZeroTransferTransaction(
            wallet.address,
            TEST_RECIPIENT_WALLET_ADDRESSES.solana,
            connection
        );

        // Phase 1: Create transaction only (server-side assembleTransaction + prepare)
        const t1 = performance.now();
        const preparedTx = await solanaWallet.sendTransaction({
            transaction,
            options: { prepareOnly: true },
        });
        timings.push({
            phase: "Phase 1: sendTransaction(prepareOnly) [create-tx]",
            durationMs: performance.now() - t1,
        });

        const txId = preparedTx.transactionId;
        expect(txId).toBeTruthy();

        // Phase 2+3: Approve (sign) → Execute → Confirm
        const t2 = performance.now();
        const result = await wallet.approve({ transactionId: txId as string });
        timings.push({
            phase: "Phase 2+3: approve() [sign+submit+confirm]",
            durationMs: performance.now() - t2,
        });

        expect(result.hash).toBeTruthy();

        logTimingTable("Solana — phased breakdown", timings);
    });
});
