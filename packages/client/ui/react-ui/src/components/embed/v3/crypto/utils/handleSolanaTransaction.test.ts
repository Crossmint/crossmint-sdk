import base58 from "bs58";
import { describe, expect, it, vi } from "vitest";
import { handleSolanaTransaction } from "./handleSolanaTransaction";

const LEGACY_TRANSACTION =
    "3md7BBV9wFjYGnMWcMNyAZcjca2HGfXWZkrU8vvho66z2sJMZFcx6HZdBiAddjo2kzgBv3uZoac3domBRjJJSXkbBvokxThZ5oh8T5ym9k6AXbRYtAAR6a3pECdz2pFCX2shi8b67DGHMtQVjLbdftyzbVvWeGJDUdj69qTnm6u6Lx2Z9iCXdGk4QSsRem8cHoAcpSq997N7BwMeauKofu9CA3Wa7YZYhdyoGk3LUF4B5U39sYKt6rpbWmxBAqT5sDh3ysRCy12ouPfuFcPFvubnf5GQRhmpB1yKD";

const VERSION_0_TRANSACTION =
    "vxBNpvao9QJmLKXUThbbjRnxm3ufu4Wku97kHd5a67FDjSqeHwcPrBKTjAHp4ECr61eWwoxvUEVTuuWX65P9bCNDJrTJpXGiS879qw3EiUHbtsVvir34pRPesJQ7S9S2MqxLzFKkYB5C4ada8bhKYW2eBkcM6D2D3aD2YpKPrF1TWnNEnpMctS13bhfaErAi1giU1UMwxzLwRPfrgLddjVwANYdUeye3GUYVJNre4Xzz4aKUAyhgek6TzRRwe6BMfshUYTeh65H2SyoE8MA9n14zAAL1CiiE47wQv3Z";

vi.mock("@dynamic-labs/solana", () => ({ isSolanaWallet: () => true }));

function harness() {
    const signAndSendTransaction = vi.fn().mockResolvedValue({ signature: "tx-id" });
    const primaryWallet = {
        getSigner: vi.fn().mockResolvedValue({ signAndSendTransaction }),
    } as never;
    const send = vi.fn();
    return { primaryWallet, iframeClient: { send } as never, signAndSendTransaction, send };
}

describe("handleSolanaTransaction", () => {
    it("sends a legacy transaction", async () => {
        const { primaryWallet, iframeClient, signAndSendTransaction, send } = harness();

        await handleSolanaTransaction({
            primaryWallet,
            serializedTransaction: LEGACY_TRANSACTION,
            iframeClient,
        });

        expect(signAndSendTransaction.mock.calls[0][0].message.version).toBe("legacy");
        expect(send).toHaveBeenCalledWith("crypto:send-transaction:success", { txId: "tx-id" });
    });

    it("sends a version-0 transaction, which the legacy parser refused", async () => {
        const { primaryWallet, iframeClient, signAndSendTransaction, send } = harness();

        await handleSolanaTransaction({
            primaryWallet,
            serializedTransaction: VERSION_0_TRANSACTION,
            iframeClient,
        });

        expect(signAndSendTransaction.mock.calls[0][0].message.version).toBe(0);
        expect(send).toHaveBeenCalledWith("crypto:send-transaction:success", { txId: "tx-id" });
    });

    it("reports a failure when the payload is not a transaction", async () => {
        const { primaryWallet, iframeClient, signAndSendTransaction, send } = harness();

        await handleSolanaTransaction({
            primaryWallet,
            serializedTransaction: base58.encode(new Uint8Array([1, 2, 3])),
            iframeClient,
        });

        expect(signAndSendTransaction).not.toHaveBeenCalled();
        expect(send).toHaveBeenCalledWith("crypto:send-transaction:failed", {
            error: "Failed to deserialize transaction",
        });
    });
});
