import { test, expect } from "@playwright/test";
import { CrossmintWallets, createCrossmint, EVMWallet } from "@crossmint/wallets-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { AUTH_CONFIG, TEST_RECIPIENT_WALLET_ADDRESSES, validateAPITestConfig } from "../../../shared/constants/globalConstants";
import { MockDeviceSignerKeyStorage } from "../../helpers/mock-device-storage";

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

function makeEvmRecovery() {
    const admin = privateKeyToAccount(generatePrivateKey());
    return {
        type: "external-wallet" as const,
        address: admin.address,
        onSign: async (payload: string) => admin.signMessage({ message: { raw: payload as `0x${string}` } }),
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

// Zero-value call to the recipient address — gas is sponsored via paymaster,
// so the wallet doesn't need any token balance.
const ZERO_VALUE_TX_PARAMS = {
    to: TEST_RECIPIENT_WALLET_ADDRESSES.evm,
    value: BigInt(0),
    data: "0x" as `0x${string}`,
};

test.describe("EVM Latency Benchmark — Device Signer", { tag: "@latency" }, () => {
    test.beforeAll(() => {
        validateAPITestConfig();
        console.log(`\nTarget environment: ${BASE_URL}`);
    });

    for (const { chain, bundlerPath } of [
        { chain: "base-sepolia" as const, bundlerPath: "UltraRelay" },
        { chain: "polygon-amoy" as const, bundlerPath: "Pimlico (Traditional)" },
    ]) {
        test.describe(`${chain} (${bundlerPath})`, () => {
            let sdk: CrossmintWallets;
            let storage: MockDeviceSignerKeyStorage;

            test.beforeEach(() => {
                sdk = makeSdk();
                storage = new MockDeviceSignerKeyStorage(API_KEY);
            });

            test(`end-to-end: sendTransaction() — full SDK latency`, async () => {
                const timings: PhaseTimings[] = [];

                const t0 = performance.now();
                const deviceDesc = await sdk.createDeviceSigner(storage);
                timings.push({ phase: "createDeviceSigner()", durationMs: performance.now() - t0 });

                const t1 = performance.now();
                const wallet = await sdk.createWallet({
                    chain,
                    recovery: makeEvmRecovery(),
                    signers: [deviceDesc],
                    options: { deviceSignerKeyStorage: storage },
                    owner: `userId:latency-e2e-${chain}-${Date.now()}`,
                });
                timings.push({ phase: "createWallet()", durationMs: performance.now() - t1 });

                expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);

                const evmWallet = EVMWallet.from(wallet);

                // Full flow: create tx → device sign → approve → broadcast → poll
                const t2 = performance.now();
                const tx = await evmWallet.sendTransaction(ZERO_VALUE_TX_PARAMS);
                const sendMs = performance.now() - t2;
                timings.push({
                    phase: "sendTransaction() [create+sign+approve+poll]",
                    durationMs: sendMs,
                });

                expect(tx.hash).toMatch(/^0x[a-fA-F0-9]+$/);
                expect(tx.transactionId).toBeTruthy();

                logTimingTable(`${chain} — sendTransaction() end-to-end`, timings);
            });

            test(`phased: prepareOnly + approve — create vs approve+confirm`, async () => {
                const timings: PhaseTimings[] = [];

                const deviceDesc = await sdk.createDeviceSigner(storage);
                const wallet = await sdk.createWallet({
                    chain,
                    recovery: makeEvmRecovery(),
                    signers: [deviceDesc],
                    options: { deviceSignerKeyStorage: storage },
                    owner: `userId:latency-phased-${chain}-${Date.now()}`,
                });

                expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);

                const evmWallet = EVMWallet.from(wallet);

                // Phase 1: Create transaction only (server-side assembleTransaction)
                const t1 = performance.now();
                const preparedTx = await evmWallet.sendTransaction({
                    ...ZERO_VALUE_TX_PARAMS,
                    options: { prepareOnly: true },
                });
                timings.push({
                    phase: "Phase 1: sendTransaction(prepareOnly) [create-tx]",
                    durationMs: performance.now() - t1,
                });

                expect(preparedTx.transactionId).toBeTruthy();

                // Phase 2+3+4: Approve (device sign + submit) → Execute → Confirm
                const t2 = performance.now();
                const result = await wallet.approve({ transactionId: preparedTx.transactionId! });
                timings.push({
                    phase: "Phase 2+3+4: approve() [sign+submit+confirm]",
                    durationMs: performance.now() - t2,
                });

                expect(result.hash).toMatch(/^0x[a-fA-F0-9]+$/);

                logTimingTable(`${chain} — phased breakdown`, timings);
            });
        });
    }
});
