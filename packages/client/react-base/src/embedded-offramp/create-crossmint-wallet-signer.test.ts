import { describe, expect, it, vi } from "vitest";

vi.mock("@crossmint/wallets-sdk", () => {
    class TransactionNotCreatedError extends Error {}
    return {
        TransactionNotCreatedError,
        EVMWallet: { from: (w: unknown) => w },
        SolanaWallet: { from: (w: unknown) => w },
    };
});
import { TransactionNotCreatedError } from "@crossmint/wallets-sdk";
import { createCrossmintWalletSigner } from "./createCrossmintWalletSigner";

const tx = { serializedTransaction: "0x", chain: "base", payerAddress: "0xabc" };

describe("createCrossmintWalletSigner", () => {
    it("sends the serialized EVM transaction and returns its hash", async () => {
        const wallet = {
            chain: "base",
            address: "0xABC",
            sendTransaction: vi.fn().mockResolvedValue({ hash: "0xtx" }),
        };
        await expect(createCrossmintWalletSigner(wallet as never).signAndSendTransaction(tx)).resolves.toBe("0xtx");
        expect(wallet.sendTransaction).toHaveBeenCalledWith({ transaction: "0x" });
    });

    it("sends a Solana transaction for a Solana wallet and compares its address exactly", async () => {
        const wallet = { chain: "solana", address: "9Wz", sendTransaction: vi.fn().mockResolvedValue({ hash: "sig" }) };
        const solanaTx = { serializedTransaction: "base58tx", chain: "solana", payerAddress: "9Wz" };
        await expect(createCrossmintWalletSigner(wallet as never).signAndSendTransaction(solanaTx)).resolves.toBe(
            "sig"
        );
        expect(wallet.sendTransaction).toHaveBeenCalledWith({ serializedTransaction: "base58tx" });
        await expect(
            createCrossmintWalletSigner(wallet as never).signAndSendTransaction({ ...solanaTx, payerAddress: "9wz" })
        ).rejects.toThrow(/different wallet/);
    });

    it("marks only a not-created transaction as rejected", async () => {
        const wallet = {
            chain: "base",
            address: "0xabc",
            sendTransaction: vi.fn().mockRejectedValue(new TransactionNotCreatedError("nope")),
        };
        await expect(createCrossmintWalletSigner(wallet as never).signAndSendTransaction(tx)).rejects.toMatchObject({
            rejected: true,
        });
    });

    it("leaves a confirmation timeout as unknown", async () => {
        const wallet = {
            chain: "base",
            address: "0xabc",
            sendTransaction: vi.fn().mockRejectedValue(new Error("Transaction confirmation timeout")),
        };
        await expect(
            createCrossmintWalletSigner(wallet as never).signAndSendTransaction(tx)
        ).rejects.not.toHaveProperty("rejected", true);
    });

    it("refuses a payload for another wallet", async () => {
        const wallet = { chain: "base", address: "0xother", sendTransaction: vi.fn() };
        await expect(createCrossmintWalletSigner(wallet as never).signAndSendTransaction(tx)).rejects.toThrow(
            /different wallet/
        );
        expect(wallet.sendTransaction).not.toHaveBeenCalled();
    });
});
