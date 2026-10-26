import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import type { Chain } from "../chains/chains";
import type { RecoverySignerConfigForChain, SignerConfigForChain } from "../signers/types";
import { Wallet } from "./wallet";
import {
    createMockApiClient,
    createMockWallet,
    createQuorumApiEntry,
    type MockedApiClient,
} from "./__tests__/test-helpers";

const SOLANA_ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const STELLAR_ADDRESS = "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY";
const EXTERNAL_WALLET_ADDRESS = "ExternalWalletRecoveryAddress123";

function walletWithDelegatedQuorum(
    chain: Chain,
    address: string,
    quorum: ReturnType<typeof createQuorumApiEntry>
): GetWalletSuccessResponse {
    return {
        chainType: chain === "solana" || chain === "stellar" ? chain : "evm",
        type: "smart",
        address,
        config: {
            adminSigner: { type: "api-key", address, locator: "api-key" },
            delegatedSigners: [quorum],
        },
        createdAt: Date.now(),
    } as unknown as GetWalletSuccessResponse;
}

describe("Wallet - quorum entries", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
    });

    describe("signers()", () => {
        describe.each([
            {
                name: "a Stellar quorum whose install awaits approval",
                chain: "stellar",
                statusFields: { transaction: { id: "tx-1", status: "awaiting-approval" } },
                status: "awaiting-approval",
            },
            {
                name: "a Stellar quorum whose install succeeded",
                chain: "stellar",
                statusFields: { transaction: { id: "tx-1", status: "success" } },
                status: "success",
            },
            {
                name: "an EVM quorum whose install awaits approval on this chain",
                chain: "base-sepolia",
                statusFields: { chains: { "base-sepolia": { id: "tx-1", status: "awaiting-approval" } } },
                status: "awaiting-approval",
            },
            {
                name: "an EVM quorum installed on this chain",
                chain: "base-sepolia",
                statusFields: { chains: { "base-sepolia": { id: "tx-1", status: "success" } } },
                status: "success",
            },
            {
                name: "an EVM quorum installed with the wallet",
                chain: "base-sepolia",
                statusFields: { chains: {} },
                status: "success",
            },
        ] as const)("when the wallet has $name", ({ chain, statusFields, status }) => {
            it(`lists the quorum with status ${status}`, async () => {
                const wallet = await createMockWallet(chain, mockApiClient);
                vi.mocked(wallet.signers).mockRestore();
                const quorum = createQuorumApiEntry();
                mockApiClient.getWallet.mockResolvedValue(walletWithDelegatedQuorum(chain, wallet.address, quorum));
                mockApiClient.getSigner.mockResolvedValue({ ...quorum, ...statusFields } as never);

                const signers = await wallet.signers();

                expect(signers).toEqual([{ ...quorum, status }]);
            });
        });

        describe("when an EVM quorum is installed only on another chain", () => {
            it("leaves it out", async () => {
                const wallet = await createMockWallet("base-sepolia", mockApiClient);
                vi.mocked(wallet.signers).mockRestore();
                const quorum = createQuorumApiEntry();
                mockApiClient.getWallet.mockResolvedValue(
                    walletWithDelegatedQuorum("base-sepolia", wallet.address, quorum)
                );
                mockApiClient.getSigner.mockResolvedValue({
                    ...quorum,
                    chains: { "polygon-amoy": { id: "tx-1", status: "success" } },
                } as never);

                await expect(wallet.signers()).resolves.toEqual([]);
            });
        });
    });

    describe("when the only delegated signer is a quorum", () => {
        it("loads without a default signer", async () => {
            const wallet = new Wallet(
                {
                    chain: "stellar",
                    address: STELLAR_ADDRESS,
                    recovery: { type: "api-key" } as RecoverySignerConfigForChain<"stellar">,
                    signers: [createQuorumApiEntry()] as unknown as SignerConfigForChain<"stellar">[],
                },
                mockApiClient as unknown as ApiClient
            );

            await expect(wallet.waitForInit()).resolves.toBeUndefined();
            expect(wallet.signer).toBeUndefined();
        });
    });

    describe("useRecoveryMethod() with a config that is not a recovery method", () => {
        it("names the quorum by its locator in the error", async () => {
            const quorum = createQuorumApiEntry();
            const wallet = new Wallet(
                {
                    chain: "solana",
                    address: SOLANA_ADDRESS,
                    recovery: [
                        quorum,
                        { type: "external-wallet", address: EXTERNAL_WALLET_ADDRESS },
                    ] as unknown as RecoverySignerConfigForChain<"solana">[],
                },
                mockApiClient as unknown as ApiClient
            );
            await wallet.waitForInit();

            await expect(wallet.useRecoveryMethod({ type: "email", email: "outsider@example.com" })).rejects.toThrow(
                quorum.locator
            );
        });
    });
});
