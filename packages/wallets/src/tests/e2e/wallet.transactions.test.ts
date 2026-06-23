import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Wallet } from "../../wallets/wallet";
import type { ApiClient } from "../../api";
import type { SignerAdapter, SignerConfigForChain } from "../../signers/types";
import { createMockApiClient, createMockWallet, type MockedApiClient } from "../../wallets/__tests__/test-helpers";

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
        it("solana: signs the serialized onChain.transaction for ed25519 signers but pendingApproval.message for device signers", async () => {
            const solanaWallet = await createMockWallet("solana", mockApiClient, "external-wallet");
            const ed25519Signer = makeFakeSigner("external-wallet", "external-wallet:EdSignerLocator", "ed-sig");
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
                            { message: "msg-for-ed25519", signer: { locator: "external-wallet:EdSignerLocator" } },
                            { message: "msg-for-device", signer: { locator: "device:DeviceSignerLocator" } },
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
                options: { additionalSigners: [asAdapter(ed25519Signer), asAdapter(deviceSigner)] },
            });
            await vi.runAllTimersAsync();
            await approvePromise;

            // ed25519 (non-device) signer receives the full serialized transaction
            expect(ed25519Signer.signTransaction).toHaveBeenCalledWith("SERIALIZED_SOLANA_TX");
            // device signer receives the pendingApproval.message (keccak256 hash for the SWIG precompile)
            expect(deviceSigner.signTransaction).toHaveBeenCalledWith("msg-for-device");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith("me:solana:smart", "sol-txn", {
                approvals: [
                    { signature: "ed-sig", signer: "external-wallet:EdSignerLocator" },
                    { signature: "device-sig", signer: "device:DeviceSignerLocator" },
                ],
            });
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
                                message: "pending-message-not-to-be-signed",
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
            expect(signSpy).not.toHaveBeenCalledWith("pending-message-not-to-be-signed");
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
                            { message: "0xevm-pending-message", signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR } },
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
            expect(signSpy).not.toHaveBeenCalledWith("0xevm-pending-message");
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
