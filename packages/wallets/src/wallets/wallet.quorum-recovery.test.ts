import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Wallet } from "./wallet";
import { WalletFactory } from "./wallet-factory";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import type { Chain } from "../chains/chains";
import type { SignerAdapter, SignerConfigForChain } from "../signers/types";
import { deriveServerSignerDetails } from "../signers/server";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { createMockApiClient, type MockedApiClient } from "./__tests__/test-helpers";

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

const evmQuorumWallet = {
    chainType: "evm" as const,
    type: "smart" as const,
    address: "0x1234567890123456789012345678901234567890",
    owner: "test-owner",
    config: {
        adminSigner: {
            type: "quorum",
            threshold: 1,
            locator: "quorum:9f2c0000",
            signers: [
                { type: "external-wallet", address: "0xMemberAAA", locator: "external-wallet:0xMemberAAA" },
                { type: "email", email: "bob@gmail.com", locator: "email:bob@gmail.com" },
            ],
        },
    },
    createdAt: Date.now(),
} as unknown as GetWalletSuccessResponse;

const passkeyQuorumWallet = {
    chainType: "evm" as const,
    type: "smart" as const,
    address: "0x1234567890123456789012345678901234567890",
    owner: "test-owner",
    config: {
        adminSigner: {
            type: "quorum",
            threshold: 1,
            locator: "quorum:9f2c0000",
            signers: [
                { type: "passkey", id: "pk-1", name: "primary", locator: "passkey:pk-1" },
                { type: "passkey", id: "pk-2", name: "backup", locator: "passkey:pk-2" },
            ],
        },
    },
    createdAt: Date.now(),
} as unknown as GetWalletSuccessResponse;

describe("Wallet - quorum member selection", () => {
    const TEST_SECRET = "b".repeat(64);
    const PROJECT_ID = "test-project";

    let mockApiClient: MockedApiClient & { crossmint: { projectId: string }; projectId: string };
    let walletFactory: WalletFactory;
    let onSign: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = {
            ...createMockApiClient(),
            crossmint: { projectId: PROJECT_ID },
            projectId: PROJECT_ID,
            environment: APIKeyEnvironmentPrefix.STAGING,
        };
        mockApiClient.getWallet.mockResolvedValue(quorumWallet);
        walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        onSign = vi.fn().mockResolvedValue("0xmembersig");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("when the caller holds an external-wallet member", () => {
        test("useSigner selects it as an admin signer under the member locator", async () => {
            const wallet = await walletFactory.getWallet({ chain: "solana" });

            await wallet.useSigner({ type: "external-wallet", address: "MemberWallet111", onSign } as Parameters<
                Wallet<Chain>["useSigner"]
            >[0]);

            expect(wallet.signer?.locator()).toBe("external-wallet:MemberWallet111");
            expect(wallet.signer?.status).toBe("active");
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });

        test("a subsequent approve submits the member's signature under its locator", async () => {
            mockApiClient.getWallet.mockResolvedValue(evmQuorumWallet);
            const wallet = await walletFactory.getWallet({ chain: "base-sepolia" });
            await wallet.useSigner({ type: "external-wallet", address: "0xMemberAAA", onSign } as Parameters<
                Wallet<Chain>["useSigner"]
            >[0]);
            mockApiClient.getTransaction.mockResolvedValue({
                id: "txn-1",
                status: "success",
                chainType: "evm",
                approvals: {
                    pending: [
                        {
                            signer: { type: "quorum", locator: "quorum:9f2c0000" },
                            quorumApprovals: {
                                threshold: 1,
                                remaining: 1,
                                pending: [
                                    {
                                        signer: {
                                            type: "external-wallet",
                                            address: "0xMemberAAA",
                                            locator: "external-wallet:0xMemberAAA",
                                        },
                                        message: "member-message",
                                    },
                                    {
                                        signer: {
                                            type: "email",
                                            email: "bob@gmail.com",
                                            locator: "email:bob@gmail.com",
                                        },
                                        message: "member-message-bob",
                                    },
                                ],
                                submitted: [],
                            },
                        },
                    ],
                    submitted: [],
                },
                onChain: { txId: "0xabcdef", explorerLink: "https://explorer.example.com/tx/0xabcdef" },
            } as Awaited<ReturnType<ApiClient["getTransaction"]>>);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "txn-1", status: "success" } as Awaited<
                ReturnType<ApiClient["approveTransaction"]>
            >);

            vi.useFakeTimers();
            const approvePromise = wallet.approve({ transactionId: "txn-1" });
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect(result.hash).toBe("0xabcdef");
            expect(onSign).toHaveBeenCalledWith("member-message");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith(expect.anything(), "txn-1", {
                approvals: [{ signer: "external-wallet:0xMemberAAA", signature: "0xmembersig" }],
            });
        });
    });

    describe("when the caller holds the email member", () => {
        test("a denormalized email input still selects the member", async () => {
            const wallet = await walletFactory.getWallet({ chain: "solana" });

            await wallet.useSigner({ type: "email", email: "Alice@GMAIL.com" });

            expect(wallet.signer?.locator()).toBe("email:alice@gmail.com");
            expect(wallet.signer?.status).toBe("active");
        });
    });

    describe("when the caller holds the server member", () => {
        test("useSigner with the secret resolves the member derivation and strips the secret", async () => {
            const { derivedAddress } = deriveServerSignerDetails(
                { type: "server", secret: TEST_SECRET },
                "solana",
                PROJECT_ID,
                APIKeyEnvironmentPrefix.STAGING
            );
            mockApiClient.getWallet.mockResolvedValue({
                ...(quorumWallet as unknown as Record<string, unknown>),
                config: {
                    adminSigner: {
                        type: "quorum",
                        threshold: 1,
                        locator: "quorum:9f2c0000",
                        signers: [
                            { type: "server", address: derivedAddress, locator: `server:${derivedAddress}` },
                            { type: "email", email: "alice@gmail.com", locator: "email:alice@gmail.com" },
                        ],
                    },
                },
            } as unknown as GetWalletSuccessResponse);
            const wallet = await walletFactory.getWallet({ chain: "solana" });

            await wallet.useSigner({ type: "server", secret: TEST_SECRET });

            expect(wallet.signer?.locator()).toBe(`server:${derivedAddress}`);
            expect(wallet.signer?.status).toBe("active");
            const recovery = wallet.recovery as unknown as { signers: Array<Record<string, unknown>> };
            const serverMember = recovery.signers.find((member) => member.type === "server");
            expect(serverMember).toEqual({
                type: "server",
                address: derivedAddress,
                locator: `server:${derivedAddress}`,
            });
        });
    });

    describe("when the config matches no member", () => {
        test("the error lists the member locators and points at useSigner", async () => {
            const wallet = await walletFactory.getWallet({ chain: "solana" });

            await expect(wallet.useSigner({ type: "email", email: "mallory@example.com" })).rejects.toThrow(
                'Signer "email:mallory@example.com" is not a registered delegated signer and does not match any member ' +
                    "of this wallet's quorum admin signer [external-wallet:MemberWallet111, email:alice@gmail.com]. " +
                    "Call wallet.useSigner() with the config of the quorum member you hold."
            );
        });

        test("keeps the unregistered-signer error for wallets with a single admin signer", async () => {
            mockApiClient.getWallet.mockResolvedValue(singleAdminWallet);
            const wallet = await walletFactory.getWallet({ chain: "solana" });

            await expect(wallet.useSigner({ type: "email", email: "not-a-signer@example.com" })).rejects.toThrow(
                'Signer "email:not-a-signer@example.com" is not registered in this wallet.'
            );
        });
    });

    describe("when quorumLocator is provided", () => {
        test("forces the member interpretation without a registration lookup", async () => {
            const wallet = await walletFactory.getWallet({ chain: "solana" });
            const getWalletCallsAfterInit = mockApiClient.getWallet.mock.calls.length;

            await wallet.useSigner(
                { type: "external-wallet", address: "MemberWallet111", onSign } as Parameters<
                    Wallet<Chain>["useSigner"]
                >[0],
                { quorumLocator: "quorum:9f2c0000" }
            );

            expect(wallet.signer?.locator()).toBe("external-wallet:MemberWallet111");
            expect(wallet.signer?.status).toBe("active");
            expect(mockApiClient.getWallet.mock.calls.length).toBe(getWalletCallsAfterInit);
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });

        test("rejects a locator that names a different quorum", async () => {
            const wallet = await walletFactory.getWallet({ chain: "solana" });

            await expect(
                wallet.useSigner({ type: "email", email: "alice@gmail.com" }, { quorumLocator: "quorum:deadbeef" })
            ).rejects.toThrow(
                'Quorum locator "quorum:deadbeef" does not match this wallet\'s quorum admin signer ("quorum:9f2c0000").'
            );
        });

        test("rejects a config that matches no member", async () => {
            const wallet = await walletFactory.getWallet({ chain: "solana" });

            await expect(
                wallet.useSigner({ type: "email", email: "mallory@example.com" }, { quorumLocator: "quorum:9f2c0000" })
            ).rejects.toThrow(/does not match any member of this wallet's quorum admin signer/);
        });

        test("rejects device configs", async () => {
            const wallet = await walletFactory.getWallet({ chain: "solana" });

            await expect(wallet.useSigner({ type: "device" }, { quorumLocator: "quorum:9f2c0000" })).rejects.toThrow(
                "Device signers cannot be quorum members — quorumLocator does not apply."
            );
        });

        test("rejects wallets whose admin signer is not a quorum", async () => {
            mockApiClient.getWallet.mockResolvedValue(singleAdminWallet);
            const wallet = await walletFactory.getWallet({ chain: "solana" });

            await expect(
                wallet.useSigner({ type: "email", email: "alice@gmail.com" }, { quorumLocator: "quorum:9f2c0000" })
            ).rejects.toThrow("A quorumLocator was provided, but this wallet's admin signer is not a quorum.");
        });
    });

    describe("when the quorum has multiple passkey members", () => {
        beforeEach(() => {
            mockApiClient.getWallet.mockResolvedValue(passkeyQuorumWallet);
        });

        test("an id-less, name-less config is rejected as ambiguous", async () => {
            const wallet = await walletFactory.getWallet({ chain: "base-sepolia" });

            await expect(wallet.useSigner({ type: "passkey" } as SignerConfigForChain<"base-sepolia">)).rejects.toThrow(
                /Multiple passkey members are in this wallet's quorum admin signer/
            );
        });

        test("selecting by name adopts the stored credential id", async () => {
            const wallet = await walletFactory.getWallet({ chain: "base-sepolia" });

            await wallet.useSigner({ type: "passkey", name: "backup" } as SignerConfigForChain<"base-sepolia">);

            expect(wallet.signer?.locator()).toBe("passkey:pk-2");
            expect(wallet.signer?.status).toBe("active");
        });

        test("selecting by credential id works even though the passkey is not a registered signer", async () => {
            const wallet = await walletFactory.getWallet({ chain: "base-sepolia" });

            await wallet.useSigner({ type: "passkey", id: "pk-1" } as SignerConfigForChain<"base-sepolia">);

            expect(wallet.signer?.locator()).toBe("passkey:pk-1");
            expect(wallet.signer?.status).toBe("active");
        });
    });
});

describe("Wallet - quorum approval loop", () => {
    const MEMBER_ADDRESS = "0x123";
    const MEMBER_LOCATOR = `external-wallet:${MEMBER_ADDRESS}`;
    const OTHER_MEMBER = {
        signer: { type: "email", email: "alice@gmail.com", locator: "email:alice@gmail.com" },
        message: "member-message-alice",
    };

    let mockApiClient: MockedApiClient;
    let onSign: ReturnType<typeof vi.fn>;

    function quorumEntry(pendingMembers: unknown[], submittedMembers: unknown[] = []) {
        return {
            signer: { type: "quorum", locator: "quorum:9f2c0000" },
            quorumApprovals: {
                threshold: 1,
                remaining: 1,
                pending: pendingMembers,
                submitted: submittedMembers,
            },
        };
    }

    async function createWalletWithActiveSigner(chain: Chain, address: string, locator: string) {
        const wallet = new Wallet(
            {
                chain,
                address:
                    chain === "solana"
                        ? "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
                        : "0x1234567890123456789012345678901234567890",
                recovery: { type: "api-key" },
            } as ConstructorParameters<typeof Wallet>[0],
            mockApiClient as unknown as ApiClient
        );
        vi.spyOn(wallet, "signers").mockResolvedValue([
            { type: "external-wallet", address, locator, status: "success" },
        ] as Awaited<ReturnType<Wallet<Chain>["signers"]>>);
        await wallet.useSigner({ type: "external-wallet", address, onSign } as Parameters<
            Wallet<Chain>["useSigner"]
        >[0]);
        return wallet;
    }

    function mockTransaction(pending: unknown[], overrides: Record<string, unknown> = {}) {
        mockApiClient.getTransaction.mockResolvedValue({
            id: "txn-1",
            status: "success",
            chainType: "evm",
            approvals: { pending, submitted: [] },
            onChain: { txId: "0xabcdef", explorerLink: "https://explorer.example.com/tx/0xabcdef" },
            ...overrides,
        } as Awaited<ReturnType<ApiClient["getTransaction"]>>);
        mockApiClient.approveTransaction.mockResolvedValue({ id: "txn-1", status: "success" } as Awaited<
            ReturnType<ApiClient["approveTransaction"]>
        >);
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        onSign = vi.fn().mockResolvedValue("0xmembersig");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("when the active signer is a pending quorum member", () => {
        test("signs only its own member message and submits under the member locator", async () => {
            const wallet = await createWalletWithActiveSigner("base-sepolia", MEMBER_ADDRESS, MEMBER_LOCATOR);
            mockTransaction([
                quorumEntry([
                    {
                        signer: { type: "external-wallet", address: MEMBER_ADDRESS, locator: MEMBER_LOCATOR },
                        message: "member-message-0x123",
                    },
                    OTHER_MEMBER,
                ]),
            ]);

            const approvePromise = wallet.approve({ transactionId: "txn-1" });
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect(result.hash).toBe("0xabcdef");
            expect(onSign).toHaveBeenCalledTimes(1);
            expect(onSign).toHaveBeenCalledWith("member-message-0x123");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith(expect.anything(), "txn-1", {
                approvals: [{ signer: MEMBER_LOCATOR, signature: "0xmembersig" }],
            });
        });

        test("approves a signature by signing the member's own message", async () => {
            const wallet = await createWalletWithActiveSigner("base-sepolia", MEMBER_ADDRESS, MEMBER_LOCATOR);
            mockApiClient.getSignature.mockResolvedValue({
                id: "sig-1",
                status: "pending",
                approvals: {
                    pending: [
                        quorumEntry([
                            {
                                signer: { type: "external-wallet", address: MEMBER_ADDRESS, locator: MEMBER_LOCATOR },
                                message: "sig-member-message",
                            },
                        ]),
                    ],
                    submitted: [],
                },
            } as Awaited<ReturnType<ApiClient["getSignature"]>>);
            mockApiClient.approveSignature.mockResolvedValue({
                id: "sig-1",
                status: "success",
                outputSignature: "0xouter",
            } as Awaited<ReturnType<ApiClient["approveSignature"]>>);

            const approvePromise = wallet.approve({ signatureId: "sig-1" });
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect(result.signature).toBe("0xouter");
            expect(onSign).toHaveBeenCalledWith("sig-member-message");
            expect(mockApiClient.approveSignature).toHaveBeenCalledWith(expect.anything(), "sig-1", {
                approvals: [{ signer: MEMBER_LOCATOR, signature: "0xmembersig" }],
            });
        });

        test("signs the serialized Solana transaction for an ed25519 member instead of the member message", async () => {
            const wallet = await createWalletWithActiveSigner("solana", "ABC123", "external-wallet:ABC123");
            const memberAdapter = {
                type: "external-wallet",
                locator: () => "external-wallet:Member111",
                address: () => "Member111",
                signMessage: vi.fn().mockResolvedValue({ signature: "0xmembersig" }),
                signTransaction: vi.fn().mockResolvedValue({ signature: "0xmembersig" }),
            } as unknown as SignerAdapter;
            mockTransaction(
                [
                    quorumEntry([
                        {
                            signer: {
                                type: "external-wallet",
                                address: "Member111",
                                locator: "external-wallet:Member111",
                            },
                            message: "member-keccak-hash",
                        },
                    ]),
                ],
                {
                    chainType: "solana",
                    onChain: {
                        transaction: "serialized-solana-tx",
                        txId: "0xabcdef",
                        explorerLink: "https://explorer.example.com/tx/0xabcdef",
                    },
                }
            );

            const approvePromise = wallet.approve({
                transactionId: "txn-1",
                options: { additionalSigners: [memberAdapter] },
            });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(memberAdapter.signTransaction).toHaveBeenCalledWith("serialized-solana-tx");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith(expect.anything(), "txn-1", {
                approvals: [{ signer: "external-wallet:Member111", signature: "0xmembersig" }],
            });
        });
    });

    describe("when the active signer holds no pending quorum member", () => {
        test("skips the quorum entry without submitting or erroring", async () => {
            const wallet = await createWalletWithActiveSigner("base-sepolia", MEMBER_ADDRESS, MEMBER_LOCATOR);
            mockTransaction([quorumEntry([OTHER_MEMBER])]);

            const approvePromise = wallet.approve({ transactionId: "txn-1" });
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect(result.hash).toBe("0xabcdef");
            expect(onSign).not.toHaveBeenCalled();
            expect(mockApiClient.approveTransaction).not.toHaveBeenCalled();
        });

        test("skips the quorum entry when its member already submitted (idempotent resume)", async () => {
            const wallet = await createWalletWithActiveSigner("base-sepolia", MEMBER_ADDRESS, MEMBER_LOCATOR);
            mockTransaction([
                quorumEntry(
                    [OTHER_MEMBER],
                    [
                        {
                            signer: { type: "external-wallet", address: MEMBER_ADDRESS, locator: MEMBER_LOCATOR },
                            message: "member-message-0x123",
                            signature: "0xalreadysubmitted",
                            submittedAt: "2026-07-27T00:00:00.000Z",
                        },
                    ]
                ),
            ]);

            const approvePromise = wallet.approve({ transactionId: "txn-1" });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(onSign).not.toHaveBeenCalled();
            expect(mockApiClient.approveTransaction).not.toHaveBeenCalled();
        });

        test("still signs its own flat entry alongside a skipped quorum entry", async () => {
            const wallet = await createWalletWithActiveSigner("base-sepolia", MEMBER_ADDRESS, MEMBER_LOCATOR);
            mockTransaction([
                {
                    signer: { type: "external-wallet", address: MEMBER_ADDRESS, locator: MEMBER_LOCATOR },
                    message: "flat-message",
                },
                quorumEntry([OTHER_MEMBER]),
            ]);

            const approvePromise = wallet.approve({ transactionId: "txn-1" });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(onSign).toHaveBeenCalledTimes(1);
            expect(onSign).toHaveBeenCalledWith("flat-message");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith(expect.anything(), "txn-1", {
                approvals: [{ signer: MEMBER_LOCATOR, signature: "0xmembersig" }],
            });
        });
    });

    describe("when the same signer covers several pending messages", () => {
        test("attaches each message to its approval so the API can tell them apart", async () => {
            const wallet = await createWalletWithActiveSigner("base-sepolia", MEMBER_ADDRESS, MEMBER_LOCATOR);
            mockTransaction([
                {
                    signer: { type: "external-wallet", address: MEMBER_ADDRESS, locator: MEMBER_LOCATOR },
                    message: "flat-message",
                },
                quorumEntry([
                    {
                        signer: { type: "external-wallet", address: MEMBER_ADDRESS, locator: MEMBER_LOCATOR },
                        message: "quorum-member-message",
                    },
                ]),
            ]);

            const approvePromise = wallet.approve({ transactionId: "txn-1" });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith(expect.anything(), "txn-1", {
                approvals: [
                    { signer: MEMBER_LOCATOR, signature: "0xmembersig", message: "flat-message" },
                    { signer: MEMBER_LOCATOR, signature: "0xmembersig", message: "quorum-member-message" },
                ],
            });
        });
    });
});
