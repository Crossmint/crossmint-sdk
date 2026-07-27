import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletFactory } from "./wallet-factory";
import { QuorumSignerNotSupportedError } from "../utils/errors";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";

const quorumWallet = {
    chainType: "solana" as const,
    type: "smart" as const,
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    owner: "test-owner",
    config: {
        adminSigner: {
            type: "quorum",
            threshold: 1,
            locator: "quorum:9f2c0000",
            signers: [
                { type: "external-wallet", address: "MemberWallet111", locator: "external-wallet:MemberWallet111" },
                { type: "email", email: "alice@gmail.com", locator: "email:alice@gmail.com" },
            ],
        },
    },
    createdAt: Date.now(),
} as unknown as GetWalletSuccessResponse;

const singleAdminWallet = {
    chainType: "solana" as const,
    type: "smart" as const,
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    owner: "test-owner",
    config: {
        adminSigner: {
            type: "external-wallet" as const,
            address: "AdminSignerAddress123",
            locator: "external-wallet:AdminSignerAddress123",
        },
    },
    createdAt: Date.now(),
} as GetWalletSuccessResponse;

describe("Wallet - quorum recovery signing guards", () => {
    let mockApiClient: {
        isServerSide: boolean;
        crossmint: { projectId: string };
        projectId: string;
        environment: string;
        getWallet: ReturnType<typeof vi.fn>;
        createWallet: ReturnType<typeof vi.fn>;
    };
    let walletFactory: WalletFactory;

    beforeEach(() => {
        mockApiClient = {
            isServerSide: false,
            crossmint: { projectId: "test-project" },
            projectId: "test-project",
            environment: APIKeyEnvironmentPrefix.STAGING,
            getWallet: vi.fn().mockResolvedValue(quorumWallet),
            createWallet: vi.fn().mockResolvedValue(quorumWallet),
        };
        walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
    });

    describe("useSigner with a quorum member", () => {
        it("explains that quorum signing is unsupported instead of claiming the member is unregistered", async () => {
            const wallet = await walletFactory.getWallet({ chain: "solana" });

            const attempt = wallet.useSigner({ type: "email", email: "alice@gmail.com" });
            await expect(attempt).rejects.toThrow(QuorumSignerNotSupportedError);
            await expect(wallet.useSigner({ type: "email", email: "alice@gmail.com" })).rejects.toThrow(
                "signing with a quorum member is not yet supported by this SDK version"
            );
        });

        it("keeps the unregistered-signer error for wallets with a single admin signer", async () => {
            mockApiClient.getWallet.mockResolvedValue(singleAdminWallet);
            const wallet = await walletFactory.getWallet({ chain: "solana" });

            await expect(wallet.useSigner({ type: "email", email: "not-a-signer@example.com" })).rejects.toThrow(
                'Signer "email:not-a-signer@example.com" is not registered in this wallet.'
            );
        });
    });
});
