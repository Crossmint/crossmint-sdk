import { beforeAll, describe, expect, it } from "vitest";
import type { WalletLocator, WalletsApiClient } from "@crossmint/wallets-sdk";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createIntegrationApiClient } from "../shared/client";
import { externalWalletSigner, pendingMessage, type TestSigner } from "../shared/signer";
import { TEST_ADDRESSES } from "../wallets/constants";
import { fundWalletAndWait } from "../wallets/test-utils";
import { expectArray, expectContract, expectErrorShape } from "./contract-assertions";
import { solanaExternalWalletSigner } from "./solana-signer";

type Locator = WalletLocator;
const EVM_CHAIN = "base-sepolia";
const SOLANA_CHAIN = "solana";
const TOKEN = "usdxm";

// Every test drives a call that succeeds on preview and pins the fields the SDK reads from the response.
// A rejection is a failure here, except in the one test whose contract is the rejection itself.
describe("Heartbeat — wallets API contract (Real HTTP)", () => {
    let apiClient: WalletsApiClient;
    let evmAdmin: TestSigner;
    let evmWallet: Locator;
    let evmCreation: unknown;
    let solanaAdmin: ReturnType<typeof solanaExternalWalletSigner>;
    let solanaWallet: Locator;

    beforeAll(async () => {
        apiClient = createIntegrationApiClient();
        evmAdmin = externalWalletSigner();
        evmCreation = await apiClient.createWallet({
            chainType: "evm",
            type: "smart",
            owner: `userId:heartbeat-${Date.now()}`,
            config: { adminSigner: evmAdmin.signer },
        } as Parameters<typeof apiClient.createWallet>[0]);
        evmWallet = expectContract<{ address: string }>(evmCreation, { address: "string" }).address as Locator;

        solanaAdmin = solanaExternalWalletSigner();
        const solana = await apiClient.createWallet({
            chainType: "solana",
            type: "smart",
            owner: `userId:heartbeat-solana-${Date.now()}`,
            config: { adminSigner: solanaAdmin.signer },
        } as Parameters<typeof apiClient.createWallet>[0]);
        solanaWallet = expectContract<{ address: string }>(solana, { address: "string" }).address as Locator;
    });

    async function createdTransaction() {
        const created = await apiClient.createTransaction(evmWallet, {
            params: { calls: [{ to: evmWallet, value: "0", data: "0x" }], chain: EVM_CHAIN },
        } as Parameters<typeof apiClient.createTransaction>[1]);
        return expectContract<{ id: string; approvals: unknown }>(created, {
            id: "string",
            status: "string",
            chainType: "string",
        });
    }

    async function createdSignature() {
        const created = await apiClient.createSignature(evmWallet, {
            type: "message",
            params: { message: "heartbeat", chain: EVM_CHAIN },
        } as Parameters<typeof apiClient.createSignature>[1]);
        return expectContract<{ id: string; approvals: unknown }>(created, {
            id: "string",
            status: "string",
            type: "string",
        });
    }

    async function registeredSigner() {
        const address = privateKeyToAccount(generatePrivateKey()).address;
        const result = await apiClient.registerSigner(evmWallet, {
            signer: { type: "external-wallet", address },
            chain: EVM_CHAIN,
        } as Parameters<typeof apiClient.registerSigner>[1]);
        return expectContract<{ locator: string }>(result, { locator: "string", type: "string" });
    }

    it("createWallet", () => {
        expectContract(evmCreation, { address: "string", chainType: "string", type: "string", config: "object" });
    });

    it("getWallet", async () => {
        expectContract(await apiClient.getWallet(evmWallet), {
            address: "string",
            chainType: "string",
            type: "string",
            config: "object",
        });
    });

    it("getWallet (not found) returns a coded error", async () => {
        const result = await apiClient.getWallet(TEST_ADDRESSES.EVM_NON_EXISTENT as Locator);
        expectErrorShape(result);
        expect((result as { code?: string }).code).toBe("WALLET_NOT_FOUND");
    });

    it("createTransaction", async () => {
        await createdTransaction();
    });

    it("getTransaction", async () => {
        const { id } = await createdTransaction();
        expectContract(await apiClient.getTransaction(evmWallet, id), {
            id: "string",
            status: "string",
            chainType: "string",
        });
    });

    it("approveTransaction", async () => {
        const created = await createdTransaction();
        const approval = await evmAdmin.approval(pendingMessage(created));
        expectContract(await apiClient.approveTransaction(evmWallet, created.id, { approvals: [approval] }), {
            id: "string",
            status: "string",
        });
    });

    it("getTransactions", async () => {
        const result = expectContract<{ transactions: unknown }>(await apiClient.getTransactions(evmWallet), {
            transactions: "object",
        });
        expectArray(result.transactions, "transactions");
    });

    it("createSignature", async () => {
        await createdSignature();
    });

    it("getSignature", async () => {
        const { id } = await createdSignature();
        expectContract(await apiClient.getSignature(evmWallet, id), { id: "string", status: "string", type: "string" });
    });

    it("approveSignature", async () => {
        const created = await createdSignature();
        const approval = await evmAdmin.approval(pendingMessage(created));
        expectContract(await apiClient.approveSignature(evmWallet, created.id, { approvals: [approval] }), {
            id: "string",
            status: "string",
        });
    });

    it("fundWallet", async () => {
        const result = await apiClient.fundWallet(evmWallet, {
            amount: 1,
            token: TOKEN,
            chain: EVM_CHAIN,
        } as Parameters<typeof apiClient.fundWallet>[1]);
        // Funding is on-chain: the endpoint answers {txId}, not the balance array the OpenAPI spec claims.
        expectContract(result, { txId: "string" });
    });

    it("getBalance", async () => {
        await fundWalletAndWait(apiClient, evmWallet, 1, TOKEN, EVM_CHAIN);
        const balances = expectArray<{ symbol: string; amount: string }>(
            await apiClient.getBalance(evmWallet, {
                chains: [EVM_CHAIN] as Parameters<typeof apiClient.getBalance>[1]["chains"],
                tokens: [TOKEN],
            }),
            "balances"
        );
        const entry = balances.find((balance) => balance.symbol === TOKEN);
        expectContract(entry, { symbol: "string", amount: "string" });
    });

    it("send", async () => {
        await fundWalletAndWait(apiClient, evmWallet, 1, TOKEN, EVM_CHAIN);
        const recipient = privateKeyToAccount(generatePrivateKey()).address;
        expectContract(await apiClient.send(evmWallet, `${EVM_CHAIN}:${TOKEN}`, { recipient, amount: "0.01" }), {
            id: "string",
            status: "string",
        });
    });

    it("getTransfers", async () => {
        const result = expectContract<{ data: unknown }>(
            await apiClient.getTransfers(evmWallet, {
                chain: EVM_CHAIN as Parameters<typeof apiClient.getTransfers>[1]["chain"],
            }),
            { data: "object" }
        );
        expectArray(result.data, "transfers");
    });

    it("registerSigner", async () => {
        await registeredSigner();
    });

    it("getSigner", async () => {
        const { locator } = await registeredSigner();
        expectContract(await apiClient.getSigner(evmWallet, locator), { locator: "string", type: "string" });
    });

    it("removeSigner", async () => {
        const { locator } = await registeredSigner();
        const result = await apiClient.removeSigner(evmWallet, locator, {
            chain: EVM_CHAIN,
        } as Parameters<typeof apiClient.removeSigner>[2]);
        expectContract(result, { id: "string", status: "string" });
    });

    // Recovery methods can change only on Solana and Stellar today; EVM rejects every mutation.
    it("registerRecoveryMethod", async () => {
        const result = await apiClient.registerRecoveryMethod(solanaWallet, {
            recoveryMethods: [solanaExternalWalletSigner().signer],
            approver: solanaAdmin.locator,
            chain: SOLANA_CHAIN,
        } as Parameters<typeof apiClient.registerRecoveryMethod>[1]);
        const body = expectContract<{ recoveryMethods: unknown }>(result, { recoveryMethods: "object" });
        const [added] = expectArray<{ type: string; status: string }>(body.recoveryMethods, "recoveryMethods");
        expectContract(added, { type: "string", status: "string" });
    });

    it("removeRecoveryMethod", async () => {
        const second = solanaExternalWalletSigner();
        const registered = await apiClient.registerRecoveryMethod(solanaWallet, {
            recoveryMethods: [second.signer],
            approver: solanaAdmin.locator,
            chain: SOLANA_CHAIN,
        } as Parameters<typeof apiClient.registerRecoveryMethod>[1]);
        expectContract(registered, { recoveryMethods: "object" });

        const result = await apiClient.removeRecoveryMethod(solanaWallet, second.locator, {
            approver: solanaAdmin.locator,
            chain: SOLANA_CHAIN,
        } as Parameters<typeof apiClient.removeRecoveryMethod>[2]);
        expectContract(result, { id: "string", status: "string" });
    });

    // getNfts is typed `Promise<unknown>`, so the contract is only "a JSON object that is not the error envelope".
    it("getNfts", async () => {
        expectContract(await apiClient.getNfts({ address: evmWallet, chain: EVM_CHAIN, page: 1, perPage: 1 }), {});
    });
});
