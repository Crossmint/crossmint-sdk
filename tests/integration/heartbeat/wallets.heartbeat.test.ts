import { beforeAll, describe, expect, it } from "vitest";
import type { WalletsApiClient, WalletLocator } from "@crossmint/wallets-sdk";
import { createIntegrationApiClient } from "../shared/client";
import { externalWalletSigner, pendingMessage, type TestSigner } from "../shared/signer";
import { TEST_ADDRESSES, TIMEOUT_MEDIUM } from "../wallets/constants";
import { expectErrorShape, expectSuccessOrErrorShape } from "./contract-assertions";

// Pins the response SHAPE of every wallets endpoint the SDK calls, not whether an
// operation succeeded on-chain (that belongs to the integration/sandbox tiers).
describe("Heartbeat — wallets API contract (Real HTTP)", () => {
    let apiClient: WalletsApiClient;
    let walletLocator: string;
    let adminSigner: TestSigner;

    beforeAll(async () => {
        apiClient = createIntegrationApiClient();
        // MPC wallets are not enabled on the preview project; approvals need a real signature.
        adminSigner = externalWalletSigner();
        const wallet = await apiClient.createWallet({
            chainType: "evm",
            type: "smart",
            owner: `userId:heartbeat-${Date.now()}`,
            config: { adminSigner: adminSigner.signer },
        } as Parameters<typeof apiClient.createWallet>[0]);
        if (!("address" in wallet)) {
            throw new Error(`Heartbeat setup could not create a wallet: ${JSON.stringify(wallet)}`);
        }
        walletLocator = wallet.address;
    }, TIMEOUT_MEDIUM);

    it("createWallet", async () => {
        const result = await apiClient.createWallet({
            chainType: "evm",
            type: "mpc",
            owner: `userId:heartbeat-createwallet-${Date.now()}`,
        } as Parameters<typeof apiClient.createWallet>[0]);
        expectSuccessOrErrorShape(result, { chainType: "string", type: "string" });
    });

    it("getWallet", async () => {
        const result = await apiClient.getWallet(walletLocator as Parameters<typeof apiClient.getWallet>[0]);
        expectSuccessOrErrorShape(result, { address: "string", chainType: "string", type: "string" });
    });

    it("getWallet (not found) returns a coded error", async () => {
        const result = await apiClient.getWallet(TEST_ADDRESSES.EVM_NON_EXISTENT as WalletLocator);
        expectErrorShape(result);
        expect((result as { code?: string }).code).toBe("WALLET_NOT_FOUND");
    });

    it("createTransaction", async () => {
        const result = await apiClient.createTransaction(
            walletLocator as Parameters<typeof apiClient.createTransaction>[0],
            {
                params: { calls: [{ to: walletLocator, value: "0", data: "0x" }], chain: "base-sepolia" },
            } as Parameters<typeof apiClient.createTransaction>[1]
        );
        expectSuccessOrErrorShape(result, { id: "string", status: "string", chainType: "string" });
    });

    it("getTransaction", async () => {
        const created = await apiClient.createTransaction(
            walletLocator as Parameters<typeof apiClient.createTransaction>[0],
            {
                params: { calls: [{ to: walletLocator, value: "0", data: "0x" }], chain: "base-sepolia" },
            } as Parameters<typeof apiClient.createTransaction>[1]
        );
        if (!("id" in created)) {
            throw new Error(`createTransaction failed, cannot verify getTransaction: ${JSON.stringify(created)}`);
        }
        const transactionId = created.id;

        const result = await apiClient.getTransaction(
            walletLocator as Parameters<typeof apiClient.getTransaction>[0],
            transactionId
        );
        expectSuccessOrErrorShape(result, { id: "string", status: "string", chainType: "string" });
    });

    it("approveTransaction", async () => {
        const created = await apiClient.createTransaction(
            walletLocator as Parameters<typeof apiClient.createTransaction>[0],
            {
                params: { calls: [{ to: walletLocator, value: "0", data: "0x" }], chain: "base-sepolia" },
            } as Parameters<typeof apiClient.createTransaction>[1]
        );
        if (!("id" in created) || !("approvals" in created)) {
            throw new Error(`createTransaction failed, cannot verify approveTransaction: ${JSON.stringify(created)}`);
        }
        const approval = await adminSigner.approval(pendingMessage(created));

        const result = await apiClient.approveTransaction(
            walletLocator as Parameters<typeof apiClient.approveTransaction>[0],
            created.id,
            { approvals: [approval] }
        );
        expectSuccessOrErrorShape(result, { id: "string", status: "string" });
    });

    it("getTransactions", async () => {
        const result = await apiClient.getTransactions(
            walletLocator as Parameters<typeof apiClient.getTransactions>[0]
        );
        expectSuccessOrErrorShape(result, { transactions: "object" });
    });

    it("createSignature", async () => {
        const result = await apiClient.createSignature(
            walletLocator as Parameters<typeof apiClient.createSignature>[0],
            { type: "message", params: { message: "heartbeat", chain: "base-sepolia" } } as Parameters<
                typeof apiClient.createSignature
            >[1]
        );
        expectSuccessOrErrorShape(result, { id: "string", status: "string", type: "string" });
    });

    it("getSignature", async () => {
        const created = await apiClient.createSignature(
            walletLocator as Parameters<typeof apiClient.createSignature>[0],
            { type: "message", params: { message: "heartbeat", chain: "base-sepolia" } } as Parameters<
                typeof apiClient.createSignature
            >[1]
        );
        if (!("id" in created)) {
            throw new Error(`createSignature failed, cannot verify getSignature: ${JSON.stringify(created)}`);
        }
        const signatureId = created.id;

        const result = await apiClient.getSignature(
            walletLocator as Parameters<typeof apiClient.getSignature>[0],
            signatureId
        );
        expectSuccessOrErrorShape(result, { id: "string", status: "string", type: "string" });
    });

    it("approveSignature", async () => {
        const created = await apiClient.createSignature(
            walletLocator as Parameters<typeof apiClient.createSignature>[0],
            { type: "message", params: { message: "heartbeat", chain: "base-sepolia" } } as Parameters<
                typeof apiClient.createSignature
            >[1]
        );
        if (!("id" in created) || !("approvals" in created)) {
            throw new Error(`createSignature failed, cannot verify approveSignature: ${JSON.stringify(created)}`);
        }
        const approval = await adminSigner.approval(pendingMessage(created));

        const result = await apiClient.approveSignature(
            walletLocator as Parameters<typeof apiClient.approveSignature>[0],
            created.id,
            { approvals: [approval] }
        );
        expectSuccessOrErrorShape(result, { id: "string", status: "string" });
    });

    it("getBalance", async () => {
        const result = await apiClient.getBalance(walletLocator as Parameters<typeof apiClient.getBalance>[0], {
            chains: ["base-sepolia"] as Parameters<typeof apiClient.getBalance>[1]["chains"],
            tokens: ["usdxm"],
        });
        // getBalance's success shape is a bare array, not an object with named fields.
        if (Array.isArray(result)) {
            return;
        }
        expectErrorShape(result);
    });

    it("fundWallet", async () => {
        const result = await apiClient.fundWallet(
            walletLocator as Parameters<typeof apiClient.fundWallet>[0],
            {
                amount: 1,
                token: "usdxm",
                chain: "base-sepolia",
            } as Parameters<typeof apiClient.fundWallet>[1]
        );
        // Funding is on-chain: success is {txId}, not the balance array the OpenAPI spec claims.
        expectSuccessOrErrorShape(result, { txId: "string" });
    });

    it("registerSigner", async () => {
        const result = await apiClient.registerSigner(
            walletLocator as Parameters<typeof apiClient.registerSigner>[0],
            {
                signer: { type: "external-wallet", address: "0x0000000000000000000000000000000000000000" },
                chain: "base-sepolia",
            } as Parameters<typeof apiClient.registerSigner>[1]
        );
        expectSuccessOrErrorShape(result, { locator: "string", type: "string" });
    });

    it("getSigner", async () => {
        const created = await apiClient.registerSigner(
            walletLocator as Parameters<typeof apiClient.registerSigner>[0],
            {
                signer: { type: "external-wallet", address: "0x0000000000000000000000000000000000000001" },
                chain: "base-sepolia",
            } as Parameters<typeof apiClient.registerSigner>[1]
        );
        if (!("locator" in created)) {
            throw new Error(`registerSigner failed, cannot verify getSigner: ${JSON.stringify(created)}`);
        }
        const signerLocator = created.locator;

        const result = await apiClient.getSigner(
            walletLocator as Parameters<typeof apiClient.getSigner>[0],
            signerLocator
        );
        expectSuccessOrErrorShape(result, { locator: "string", type: "string" });
    });

    it("removeSigner", async () => {
        const created = await apiClient.registerSigner(
            walletLocator as Parameters<typeof apiClient.registerSigner>[0],
            {
                signer: { type: "external-wallet", address: "0x0000000000000000000000000000000000000002" },
                chain: "base-sepolia",
            } as Parameters<typeof apiClient.registerSigner>[1]
        );
        if (!("locator" in created)) {
            throw new Error(`registerSigner failed, cannot verify removeSigner: ${JSON.stringify(created)}`);
        }
        const signerLocator = created.locator;

        const result = await apiClient.removeSigner(
            walletLocator as Parameters<typeof apiClient.removeSigner>[0],
            signerLocator,
            { chain: "base-sepolia" } as Parameters<typeof apiClient.removeSigner>[2]
        );
        expectSuccessOrErrorShape(result, { id: "string", status: "string" });
    });

    it("registerRecoveryMethod", async () => {
        const result = await apiClient.registerRecoveryMethod(
            walletLocator as Parameters<typeof apiClient.registerRecoveryMethod>[0],
            {
                recoveryMethods: [{ type: "external-wallet", address: "0x0000000000000000000000000000000000000003" }],
                approver: "external-wallet:0x0000000000000000000000000000000000000000",
                chain: "base-sepolia",
            } as Parameters<typeof apiClient.registerRecoveryMethod>[1]
        );
        expectSuccessOrErrorShape(result, { recoveryMethods: "object" });
    });

    it("removeRecoveryMethod", async () => {
        const result = await apiClient.removeRecoveryMethod(
            walletLocator as Parameters<typeof apiClient.removeRecoveryMethod>[0],
            "external-wallet:0x0000000000000000000000000000000000000003",
            {
                approver: "external-wallet:0x0000000000000000000000000000000000000000",
                chain: "base-sepolia",
            } as Parameters<typeof apiClient.removeRecoveryMethod>[2]
        );
        expectSuccessOrErrorShape(result, { id: "string", status: "string" });
    });

    it("send", async () => {
        const result = await apiClient.send(
            walletLocator as Parameters<typeof apiClient.send>[0],
            "base-sepolia:usdxm",
            { recipient: "0x0000000000000000000000000000000000000000", amount: "0.0001" }
        );
        expectSuccessOrErrorShape(result, { id: "string" });
    });

    it("getTransfers", async () => {
        const result = await apiClient.getTransfers(walletLocator as Parameters<typeof apiClient.getTransfers>[0], {
            chain: "base-sepolia" as Parameters<typeof apiClient.getTransfers>[1]["chain"],
            status: "successful",
        });
        expectSuccessOrErrorShape(result, { data: "object" });
    });

    // getNfts' SDK return type is `Promise<unknown>`, so this only confirms valid, non-error JSON.
    it("getNfts", async () => {
        const result = await apiClient.getNfts({
            address: walletLocator,
            chain: "base-sepolia",
            page: 1,
            perPage: 1,
        });
        if (typeof result !== "object" || result === null || (result as { error?: boolean }).error === true) {
            throw new Error(`getNfts did not return a JSON object: ${JSON.stringify(result)}`);
        }
    });
});
