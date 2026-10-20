import { beforeAll, describe, it } from "vitest";
import type { WalletLocator, WalletsApiClient } from "@crossmint/wallets-sdk";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { createIntegrationApiClient } from "../shared/client";
import { externalWalletSigner, pendingMessage, type TestSigner } from "../shared/signer";
import { TEST_ADDRESSES } from "../wallets/constants";
import { approveTransaction, fundWalletAndWait } from "../wallets/test-utils";
import { expectArray, expectContract, expectErrorShape } from "./contract-assertions";
import { solanaExternalWalletSigner } from "./solana-signer";

type Locator = WalletLocator;
const EVM_CHAIN = "base-sepolia";
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

    // The SDK branches on the error envelope alone ("error" in response), never on a code.
    it("getWallet (not found) returns the error envelope", async () => {
        expectErrorShape(await apiClient.getWallet(TEST_ADDRESSES.EVM_NON_EXISTENT as Locator));
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
        // Wallet.transfers() always sends chain and status; the API also requires tokens, which the SDK types as optional.
        const result = expectContract<{ data: unknown }>(
            await apiClient.getTransfers(evmWallet, {
                chain: EVM_CHAIN as Parameters<typeof apiClient.getTransfers>[1]["chain"],
                tokens: TOKEN,
                status: "successful",
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
    // The SDK sends one method (not a list) and no chain, and reads the transaction id to approve; that is what is pinned.
    it("registerRecoveryMethod", async () => {
        const result = await apiClient.registerRecoveryMethod(solanaWallet, {
            recoveryMethods: solanaExternalWalletSigner().signer,
            approver: solanaAdmin.locator,
        } as Parameters<typeof apiClient.registerRecoveryMethod>[1]);
        const body = expectContract<{ tx: unknown }>(result, { tx: "object" });
        expectContract(body.tx, { id: "string" });
    });

    // A method is removable only once installed, so this one approves its registration first, as the SDK does.
    it("removeRecoveryMethod", async () => {
        const second = solanaExternalWalletSigner();
        const registered = await apiClient.registerRecoveryMethod(solanaWallet, {
            recoveryMethods: second.signer,
            approver: solanaAdmin.locator,
        } as Parameters<typeof apiClient.registerRecoveryMethod>[1]);
        const { tx } = expectContract<{ tx: { id: string } }>(registered, { tx: "object" });
        const installed = await approveTransaction(
            apiClient,
            solanaWallet,
            tx.id,
            solanaAdmin as unknown as TestSigner
        );
        expect(installed.status).toBe("success");

        const result = await apiClient.removeRecoveryMethod(solanaWallet, second.locator, {
            approver: solanaAdmin.locator,
        } as Parameters<typeof apiClient.removeRecoveryMethod>[2]);
        expectContract(result, { id: "string" });
    }, 120_000);

    // The client requests /api/2025-06-09/wallets/{chain:address}/nfts, a route the API does not serve
    // ("Cannot GET ..."). Marked `fails` so the day the route exists this test turns red and gets unmarked.
    it.fails("getNfts (known broken: the SDK calls a route the API does not serve)", async () => {
        expectContract(await apiClient.getNfts({ address: evmWallet, chain: EVM_CHAIN, page: 1, perPage: 1 }), {});
    });
});
