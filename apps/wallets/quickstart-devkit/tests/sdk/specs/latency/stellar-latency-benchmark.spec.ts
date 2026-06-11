import { test, expect } from "@playwright/test";
import { CrossmintWallets, createCrossmint, StellarWallet } from "@crossmint/wallets-sdk";
import { Keypair } from "@stellar/stellar-sdk";
import {
    AUTH_CONFIG,
    TEST_RECIPIENT_WALLET_ADDRESSES,
    validateAPITestConfig,
} from "../../../shared/constants/globalConstants";

const API_KEY = AUTH_CONFIG.crossmintApiKey;
const BASE_URL = process.env.CROSSMINT_BASE_URL || "https://preview.crossmint.com";

function makeSdk() {
    return CrossmintWallets.from(
        createCrossmint({
            apiKey: API_KEY,
            overrideBaseUrl: BASE_URL,
        })
    );
}

function makeStellarRecovery() {
    const keypair = Keypair.random();
    return {
        type: "external-wallet" as const,
        address: keypair.publicKey(),
        onSign: async (payload: string) => {
            const signature = keypair.sign(Buffer.from(payload, "base64"));
            return Buffer.from(signature).toString("base64");
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

// XLM SAC (Stellar Asset Contract) on testnet — the native token wrapper.
const STELLAR_XLM_SAC_TESTNET = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

test.describe("Stellar Latency Benchmark", { tag: "@latency" }, () => {
    let sdk: CrossmintWallets;

    test.beforeAll(() => {
        validateAPITestConfig();
        console.log(`\nTarget environment: ${BASE_URL}`);
    });

    test.beforeEach(() => {
        sdk = makeSdk();
    });

    test(`end-to-end: sendTransaction() — full SDK latency`, async () => {
        const timings: PhaseTimings[] = [];

        const t1 = performance.now();
        const wallet = await sdk.createWallet({
            chain: "stellar",
            recovery: makeStellarRecovery(),
            owner: `userId:latency-stellar-e2e-${Date.now()}`,
        });
        timings.push({ phase: "createWallet()", durationMs: performance.now() - t1 });

        expect(wallet.address).toMatch(/^[GC][A-Z2-7]{55}$/);

        const stellarWallet = StellarWallet.from(wallet);

        const t2 = performance.now();
        const tx = await stellarWallet.sendTransaction({
            contractId: STELLAR_XLM_SAC_TESTNET,
            method: "transfer",
            args: {
                from: wallet.address,
                to: TEST_RECIPIENT_WALLET_ADDRESSES.stellar,
                amount: "0",
            },
        });
        timings.push({
            phase: "sendTransaction() [create+sign+approve+confirm]",
            durationMs: performance.now() - t2,
        });

        expect(tx.hash).toBeTruthy();
        expect(tx.transactionId).toBeTruthy();

        logTimingTable("Stellar — sendTransaction() end-to-end", timings);
    });

    test(`phased: prepareOnly + approve — create vs approve+confirm`, async () => {
        const timings: PhaseTimings[] = [];

        const wallet = await sdk.createWallet({
            chain: "stellar",
            recovery: makeStellarRecovery(),
            owner: `userId:latency-stellar-phased-${Date.now()}`,
        });

        expect(wallet.address).toMatch(/^[GC][A-Z2-7]{55}$/);

        const stellarWallet = StellarWallet.from(wallet);

        // Phase 1: Create transaction only (server-side assembleTransaction + simulate)
        const t1 = performance.now();
        const preparedTx = await stellarWallet.sendTransaction({
            contractId: STELLAR_XLM_SAC_TESTNET,
            method: "transfer",
            args: {
                from: wallet.address,
                to: TEST_RECIPIENT_WALLET_ADDRESSES.stellar,
                amount: "0",
            },
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

        logTimingTable("Stellar — phased breakdown", timings);
    });
});
