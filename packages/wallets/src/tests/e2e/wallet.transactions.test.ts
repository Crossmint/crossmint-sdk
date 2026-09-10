import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import base58 from "bs58";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { Wallet } from "../../wallets/wallet";
import { VERSION_1_MESSAGE } from "../../signers/solana-version-1.fixture";
import { SolanaExternalWalletSigner } from "../../signers/solana-external-wallet";
import type { ExternalWalletInternalSignerConfig } from "../../signers/types";
import type { SolanaChain } from "../../chains/chains";
import type { ApiClient } from "../../api";
import type { SignerAdapter, SignerConfigForChain } from "../../signers/types";
import { createMockApiClient, createMockWallet, type MockedApiClient } from "../../wallets/__tests__/test-helpers";

const approvalMessage = (label: string) => base58.encode(Buffer.from(label));

const EVM_EXTERNAL_SIGNER_LOCATOR = "external-wallet:0x123";
const STELLAR_EXTERNAL_SIGNER_LOCATOR = "external-wallet:GABC123";

function makeFakeSigner(type: string, locator: string, signature: string) {
    return {
        type,
        locator: () => locator,
        signMessage: vi.fn().mockResolvedValue({ signature }),
        signTransaction: vi.fn().mockResolvedValue({ signature }),
    };
}
const asAdapter = (fake: ReturnType<typeof makeFakeSigner>): SignerAdapter => fake as unknown as SignerAdapter;

const evmPendingTx = (id: string, pending: Array<{ message: string; signer: { locator: string } }>) => ({
    id,
    status: "awaiting-approval",
    chainType: "evm",
    walletType: "smart",
    onChain: {},
    approvals: { pending, submitted: [] },
});
const successTx = (id: string) => ({
    id,
    status: "success",
    onChain: { txId: "0xabcdef", explorerLink: "https://explorer.test/tx/0xabcdef" },
});

describe("Wallet integration — transaction approval orchestration", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("approval payload selection (keyed off the API response shape)", () => {
        it("solana: only an external wallet receives onChain.transaction, everyone else receives pendingApproval.message", async () => {
            const solanaWallet = await createMockWallet("solana", mockApiClient, "external-wallet");
            const externalSigner = makeFakeSigner(
                "external-wallet",
                "external-wallet:ExternalSignerLocator",
                "external-sig"
            );
            const emailSigner = makeFakeSigner("email", "email:ed@example.com", "ed-sig");
            const deviceSigner = makeFakeSigner("device", "device:DeviceSignerLocator", "device-sig");

            mockApiClient.getTransaction
                .mockResolvedValueOnce({
                    id: "sol-txn",
                    status: "awaiting-approval",
                    chainType: "solana",
                    walletType: "smart",
                    onChain: { transaction: "SERIALIZED_SOLANA_TX" },
                    approvals: {
                        pending: [
                            {
                                message: approvalMessage("msg-for-external"),
                                signer: { locator: "external-wallet:ExternalSignerLocator" },
                            },
                            {
                                message: approvalMessage("msg-for-ed25519"),
                                signer: { locator: "email:ed@example.com" },
                            },
                            {
                                message: approvalMessage("msg-for-device"),
                                signer: { locator: "device:DeviceSignerLocator" },
                            },
                        ],
                        submitted: [],
                    },
                } as any)
                .mockResolvedValue({
                    id: "sol-txn",
                    status: "success",
                    onChain: { txId: "sol-tx-hash", explorerLink: "https://explorer.solana.com/tx/sol-tx-hash" },
                } as any);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "sol-txn", status: "pending" } as any);

            const approvePromise = solanaWallet.approve({
                transactionId: "sol-txn",
                options: {
                    additionalSigners: [asAdapter(externalSigner), asAdapter(emailSigner), asAdapter(deviceSigner)],
                },
            });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(externalSigner.signTransaction).toHaveBeenCalledWith("SERIALIZED_SOLANA_TX");
            expect(emailSigner.signTransaction).toHaveBeenCalledWith(approvalMessage("msg-for-ed25519"));
            expect(deviceSigner.signTransaction).toHaveBeenCalledWith(approvalMessage("msg-for-device"));
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith("me:solana:smart", "sol-txn", {
                approvals: [
                    { signature: "external-sig", signer: "external-wallet:ExternalSignerLocator" },
                    { signature: "ed-sig", signer: "email:ed@example.com" },
                    { signature: "device-sig", signer: "device:DeviceSignerLocator" },
                ],
            });
        });

        it("solana: an external wallet keypair approves a version-1 transaction with a verifiable signature", async () => {
            const keypair = Keypair.generate();
            const locator = "external-wallet:V1RealKey";
            const solanaWallet = await createMockWallet("solana", mockApiClient, "external-wallet");
            const signer = new SolanaExternalWalletSigner({
                type: "external-wallet",
                address: keypair.publicKey.toBase58(),
                locator,
                onSignBytes: async (payload: string) =>
                    base58.encode(nacl.sign.detached(base58.decode(payload), keypair.secretKey)),
            } as unknown as ExternalWalletInternalSignerConfig<SolanaChain>);

            mockApiClient.getTransaction
                .mockResolvedValueOnce({
                    id: "v1-txn",
                    status: "awaiting-approval",
                    chainType: "solana",
                    walletType: "smart",
                    onChain: { transaction: "SERIALIZED_V1_TX" },
                    approvals: {
                        pending: [{ message: VERSION_1_MESSAGE, signer: { locator } }],
                        submitted: [],
                    },
                } as never)
                .mockResolvedValue({
                    id: "v1-txn",
                    status: "success",
                    onChain: { txId: "v1-sig", explorerLink: "https://explorer.test/v1" },
                } as never);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "v1-txn", status: "pending" } as never);

            const approvePromise = solanaWallet.approve({
                transactionId: "v1-txn",
                options: { additionalSigners: [signer] },
            });
            await vi.runAllTimersAsync();
            await approvePromise;

            const submitted = mockApiClient.approveTransaction.mock.calls[0][2].approvals[0];
            expect(submitted.signer).toBe(locator);
            expect(
                nacl.sign.detached.verify(
                    base58.decode(VERSION_1_MESSAGE),
                    base58.decode(submitted.signature),
                    keypair.publicKey.toBytes()
                )
            ).toBe(true);
        });

        it("stellar wallet signs onChain.transaction when the response claims chainType 'solana' with onChain.transaction", async () => {
            const stellarWallet = await createMockWallet("stellar", mockApiClient, "external-wallet");
            // biome-ignore lint/style/noNonNullAssertion: signer is set by createMockWallet
            const signSpy = vi.spyOn(stellarWallet.signer!, "signTransaction");

            mockApiClient.getTransaction
                .mockResolvedValueOnce({
                    id: "stellar-txn",
                    status: "awaiting-approval",
                    chainType: "solana",
                    walletType: "smart",
                    onChain: { transaction: "SERIALIZED_STELLAR_AS_SOLANA_TX" },
                    approvals: {
                        pending: [
                            {
                                message: approvalMessage("pending-message-not-to-be-signed"),
                                signer: { locator: STELLAR_EXTERNAL_SIGNER_LOCATOR },
                            },
                        ],
                        submitted: [],
                    },
                } as any)
                .mockResolvedValue({
                    id: "stellar-txn",
                    status: "success",
                    chainType: "stellar",
                    onChain: {
                        txEnvelope: "envelope-xdr",
                        txHash: "stellar-hash",
                        explorerLink: "https://stellar.explorer/stellar-txn",
                    },
                } as any);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "stellar-txn", status: "pending" } as any);

            const approvePromise = stellarWallet.approve({ transactionId: "stellar-txn" });
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect(signSpy).toHaveBeenCalledWith("SERIALIZED_STELLAR_AS_SOLANA_TX");
            expect(signSpy).not.toHaveBeenCalledWith(approvalMessage("pending-message-not-to-be-signed"));
            // stellar terminal success resolves the hash from onChain.txHash (txId is absent)
            expect(result.hash).toBe("stellar-hash");
        });

        it("evm wallet signs onChain.transaction when the response claims chainType 'solana' with onChain.transaction", async () => {
            const evmWallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");
            // biome-ignore lint/style/noNonNullAssertion: signer is set by createMockWallet
            const signSpy = vi.spyOn(evmWallet.signer!, "signTransaction");

            mockApiClient.getTransaction
                .mockResolvedValueOnce({
                    id: "evm-txn",
                    status: "awaiting-approval",
                    chainType: "solana",
                    walletType: "smart",
                    onChain: { transaction: "SOLANA_SHAPED_TX_ON_EVM_WALLET" },
                    approvals: {
                        pending: [
                            {
                                message: approvalMessage("0xevm-pending-message"),
                                signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR },
                            },
                        ],
                        submitted: [],
                    },
                } as any)
                .mockResolvedValue({
                    id: "evm-txn",
                    status: "success",
                    onChain: { txId: "0xevmhash", explorerLink: "https://explorer.test/tx/0xevmhash" },
                } as any);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "evm-txn", status: "pending" } as any);

            const approvePromise = evmWallet.approve({ transactionId: "evm-txn" });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(signSpy).toHaveBeenCalledWith("SOLANA_SHAPED_TX_ON_EVM_WALLET");
            expect(signSpy).not.toHaveBeenCalledWith(approvalMessage("0xevm-pending-message"));
        });
    });

    describe("onTransactionStart callback", () => {
        it("invokes callbacks.onTransactionStart after fetching the transaction and before signing", async () => {
            const callOrder: string[] = [];
            const onTransactionStart = vi.fn(async () => {
                callOrder.push("onTransactionStart");
            });
            const onSign = vi.fn(async (_message: string) => {
                callOrder.push("sign");
                return "0xsigned";
            });

            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as SignerConfigForChain<"base-sepolia">,
                    options: { callbacks: { onTransactionStart } },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([
                {
                    type: "external-wallet",
                    address: "0x123",
                    locator: EVM_EXTERNAL_SIGNER_LOCATOR,
                    status: "success",
                } as any,
            ]);
            await wallet.useSigner({
                type: "external-wallet",
                address: "0x123",
                onSign,
            } as unknown as SignerConfigForChain<"base-sepolia">);

            let fetchCount = 0;
            mockApiClient.getTransaction.mockImplementation(async () => {
                fetchCount++;
                if (fetchCount === 1) {
                    callOrder.push("getTransaction");
                    return evmPendingTx("txn-cb", [
                        { message: "0xcbmsg", signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR } },
                    ]) as any;
                }
                return successTx("txn-cb") as any;
            });
            mockApiClient.approveTransaction.mockResolvedValue({ id: "txn-cb", status: "pending" } as any);

            const approvePromise = wallet.approve({ transactionId: "txn-cb" });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(callOrder).toEqual(["getTransaction", "onTransactionStart", "sign"]);
        });
    });
});
