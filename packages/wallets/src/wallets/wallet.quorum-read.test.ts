import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import type { Chain } from "../chains/chains";
import type { RecoverySignerConfigForChain, SignerConfigForChain } from "../signers/types";
import { QuorumSignerNotSupportedError } from "../utils/errors";
import { Wallet } from "./wallet";
import {
    createMockApiClient,
    createMockSigner,
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

    // A quorum is never the default signer and does not count as a delegated signer (Kotlin defaultSignerHolder).
    describe("default signer with delegated quorums", () => {
        const walletWithDelegated = (signers: unknown[]) =>
            new Wallet(
                {
                    chain: "stellar",
                    address: STELLAR_ADDRESS,
                    recovery: { type: "api-key" } as RecoverySignerConfigForChain<"stellar">,
                    signers: signers as SignerConfigForChain<"stellar">[],
                },
                mockApiClient as unknown as ApiClient
            );

        describe.each([
            ["the only delegated signer is a quorum", 1],
            ["every delegated signer is a quorum", 2],
        ])("when %s", (_name, quorumCount) => {
            it("assembles the recovery signer, as a wallet with no delegated signer does", async () => {
                const wallet = walletWithDelegated(Array.from({ length: quorumCount }, () => createQuorumApiEntry()));
                await wallet.waitForInit();

                expect(wallet.signer?.type).toBe("api-key");
            });
        });

        describe("when one delegated signer is not a quorum", () => {
            it("assembles that signer", async () => {
                const delegated = createMockSigner("external-wallet", "stellar") as unknown as { address: string };
                const wallet = walletWithDelegated([createQuorumApiEntry(), delegated]);
                await wallet.waitForInit();

                expect(wallet.signer?.locator()).toBe(`external-wallet:${delegated.address}`);
            });
        });
    });

    describe("recovery", () => {
        const walletWithRecovery = (recovery: unknown[]) =>
            new Wallet(
                {
                    chain: "solana",
                    address: SOLANA_ADDRESS,
                    recovery: recovery as RecoverySignerConfigForChain<"solana">[],
                },
                mockApiClient as unknown as ApiClient
            );

        describe("when a quorum comes before a recovery method that signs alone", () => {
            it("is that recovery method", async () => {
                const wallet = walletWithRecovery([
                    createQuorumApiEntry(),
                    { type: "external-wallet", address: EXTERNAL_WALLET_ADDRESS },
                ]);
                await wallet.waitForInit();

                expect(wallet.recovery).toEqual({ type: "external-wallet", address: EXTERNAL_WALLET_ADDRESS });
            });
        });

        describe("when every recovery method is a quorum", () => {
            it("throws QuorumSignerNotSupportedError naming the quorum", async () => {
                const quorum = createQuorumApiEntry();
                const wallet = walletWithRecovery([quorum]);
                await wallet.waitForInit();

                expect(() => wallet.recovery).toThrow(QuorumSignerNotSupportedError);
                expect(() => wallet.recovery).toThrow(quorum.locator);
            });
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

    describe.each(["useSigner", "useRecoveryMethod"] as const)("%s() with a quorum", (method) => {
        it("throws QuorumSignerNotSupportedError and keeps the active signer", async () => {
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
            const signerBefore = wallet.signer;

            await expect(wallet[method](quorum as unknown as SignerConfigForChain<"solana">)).rejects.toThrow(
                QuorumSignerNotSupportedError
            );
            expect(wallet.signer).toBe(signerBefore);
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });
    });
});
