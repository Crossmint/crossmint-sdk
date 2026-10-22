import { beforeEach, describe, expect, test, vi } from "vitest";

const { fromEvm, fromSolana } = vi.hoisted(() => ({
    fromEvm: vi.fn((w: unknown) => w),
    fromSolana: vi.fn((w: unknown) => w),
}));
vi.mock("@crossmint/wallets-sdk", () => {
    class TransactionNotCreatedError extends Error {}
    return {
        TransactionNotCreatedError,
        EVMWallet: { from: fromEvm },
        SolanaWallet: { from: fromSolana },
    };
});
import { TransactionNotCreatedError } from "@crossmint/wallets-sdk";
import { createCrossmintWalletSigner } from "./createCrossmintWalletSigner";

const tx = { serializedTransaction: "0x", chain: "base", payerAddress: "0xabc" };
const solanaTx = { serializedTransaction: "base58tx", chain: "solana", payerAddress: "9Wz" };

describe("createCrossmintWalletSigner", () => {
    beforeEach(() => {
        fromEvm.mockClear();
        fromSolana.mockClear();
    });

    describe("when the wallet is EVM", () => {
        test("sends the serialized transaction and returns its hash", async () => {
            const wallet = {
                chain: "base",
                address: "0xABC",
                sendTransaction: vi.fn().mockResolvedValue({ hash: "0xtx" }),
            };
            await expect(createCrossmintWalletSigner(wallet as never).signAndSendTransaction(tx)).resolves.toBe("0xtx");
            expect(wallet.sendTransaction).toHaveBeenCalledWith({ transaction: "0x" });
        });

        test("refuses a payload for another wallet", async () => {
            const wallet = { chain: "base", address: "0xother", sendTransaction: vi.fn() };
            await expect(createCrossmintWalletSigner(wallet as never).signAndSendTransaction(tx)).rejects.toThrow(
                /different wallet/
            );
            expect(wallet.sendTransaction).not.toHaveBeenCalled();
        });

        test("refuses a payload for another chain without sending", async () => {
            const wallet = { chain: "polygon", address: "0xabc", sendTransaction: vi.fn() };
            const error = await createCrossmintWalletSigner(wallet as never)
                .signAndSendTransaction(tx)
                .catch((e: unknown) => e);
            expect(error).toMatchObject({ message: expect.stringMatching(/different chain/) });
            expect(error).not.toHaveProperty("rejected", true);
            expect(wallet.sendTransaction).not.toHaveBeenCalled();
            expect(fromEvm).not.toHaveBeenCalled();
        });

        test("marks a not-created transaction as rejected", async () => {
            const wallet = {
                chain: "base",
                address: "0xabc",
                sendTransaction: vi.fn().mockRejectedValue(new TransactionNotCreatedError("nope")),
            };
            await expect(createCrossmintWalletSigner(wallet as never).signAndSendTransaction(tx)).rejects.toMatchObject(
                { rejected: true }
            );
        });

        test("leaves a confirmation timeout as unknown", async () => {
            const wallet = {
                chain: "base",
                address: "0xabc",
                sendTransaction: vi.fn().mockRejectedValue(new Error("Transaction confirmation timeout")),
            };
            await expect(
                createCrossmintWalletSigner(wallet as never).signAndSendTransaction(tx)
            ).rejects.not.toHaveProperty("rejected", true);
        });

        test("leaves a failure to build the wallet as unknown", async () => {
            fromEvm.mockImplementationOnce(() => {
                throw new Error("not an evm wallet");
            });
            const wallet = { chain: "base", address: "0xabc", sendTransaction: vi.fn() };
            const error = await createCrossmintWalletSigner(wallet as never)
                .signAndSendTransaction(tx)
                .catch((e: unknown) => e);
            expect(error).toMatchObject({ message: "not an evm wallet" });
            expect(error).not.toHaveProperty("rejected", true);
        });
    });

    describe("when the wallet is Stellar", () => {
        test("refuses before building any wallet, even for a matching payload", async () => {
            const wallet = { chain: "stellar", address: "GABC", sendTransaction: vi.fn() };
            const error = await createCrossmintWalletSigner(wallet as never)
                .signAndSendTransaction({ serializedTransaction: "xdr", chain: "stellar", payerAddress: "GABC" })
                .catch((e: unknown) => e);
            expect(error).toMatchObject({ message: expect.stringMatching(/EVM and Solana wallets only/) });
            expect(error).not.toHaveProperty("rejected", true);
            expect(fromEvm).not.toHaveBeenCalled();
            expect(fromSolana).not.toHaveBeenCalled();
        });
    });

    describe("when the wallet is Solana", () => {
        test("sends the transaction and compares the address exactly", async () => {
            const wallet = {
                chain: "solana",
                address: "9Wz",
                sendTransaction: vi.fn().mockResolvedValue({ hash: "sig" }),
            };
            await expect(createCrossmintWalletSigner(wallet as never).signAndSendTransaction(solanaTx)).resolves.toBe(
                "sig"
            );
            expect(wallet.sendTransaction).toHaveBeenCalledWith({ serializedTransaction: "base58tx" });
            await expect(
                createCrossmintWalletSigner(wallet as never).signAndSendTransaction({
                    ...solanaTx,
                    payerAddress: "9wz",
                })
            ).rejects.toThrow(/different wallet/);
        });

        test("marks a not-created transaction as rejected", async () => {
            const wallet = {
                chain: "solana",
                address: "9Wz",
                sendTransaction: vi.fn().mockRejectedValue(new TransactionNotCreatedError("nope")),
            };
            await expect(
                createCrossmintWalletSigner(wallet as never).signAndSendTransaction(solanaTx)
            ).rejects.toMatchObject({ rejected: true });
        });

        test("leaves a failure to build the wallet as unknown", async () => {
            fromSolana.mockImplementationOnce(() => {
                throw new Error("not a solana wallet");
            });
            const wallet = { chain: "solana", address: "9Wz", sendTransaction: vi.fn() };
            const error = await createCrossmintWalletSigner(wallet as never)
                .signAndSendTransaction(solanaTx)
                .catch((e: unknown) => e);
            expect(error).toMatchObject({ message: "not a solana wallet" });
            expect(error).not.toHaveProperty("rejected", true);
        });
    });
});
