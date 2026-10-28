import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChainAdapter, type SignatureSigning } from "../chains/chain-adapter";
import type { Wallet } from "./wallet";
import { createMockApiClient, createMockWallet, type MockedApiClient } from "./__tests__/test-helpers";

const PENDING_MESSAGE = "0x4a5c5d454721bbbb25540c3317521e71c373ae36458f960d2ad46ef088110e95";

describe("approve({ signatureId })", () => {
    let api: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        api = createMockApiClient();
    });

    describe.each(["solana", "stellar"] as const)("on a %s wallet", (chain) => {
        it("throws that signatures are EVM-only and calls no API", async () => {
            const wallet = await createMockWallet(chain, api, "external-wallet");

            await expect(wallet.approve({ signatureId: "sig-1" })).rejects.toThrow(
                "Approving signatures is only supported for EVM smart wallets"
            );
            expect(api.getSignature).not.toHaveBeenCalled();
            expect(api.approveSignature).not.toHaveBeenCalled();
        });
    });

    describe("on an EVM wallet with a flat pending approval", () => {
        let wallet: Wallet<"base-sepolia">;
        let locator: string;

        beforeEach(async () => {
            wallet = await createMockWallet("base-sepolia", api, "external-wallet");
            locator = wallet.signer?.locator() ?? "";
            api.getSignature.mockResolvedValue({
                id: "sig-1",
                status: "awaiting-approval",
                approvals: {
                    pending: [{ signer: { type: "external-wallet", locator }, message: PENDING_MESSAGE }],
                    submitted: [],
                },
            } as never);
            api.approveSignature.mockResolvedValue({
                id: "sig-1",
                status: "success",
                outputSignature: "0xoutput",
            } as never);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("submits the active signer's signature over the pending message", async () => {
            const signMessage = vi.spyOn(wallet.signer as NonNullable<typeof wallet.signer>, "signMessage");

            const result = await wallet.approve({ signatureId: "sig-1" });

            expect(signMessage).toHaveBeenCalledWith(PENDING_MESSAGE);
            const [[, , body]] = api.approveSignature.mock.calls;
            expect(body.approvals).toEqual([{ signature: "0xsigned", signer: locator }]);
            expect(result).toEqual({ signature: "0xoutput", signatureId: "sig-1" });
        });

        it("submits the signature the EVM chain adapter returns", async () => {
            const evmSignatures = getChainAdapter("base-sepolia").signatures as SignatureSigning;
            const signApproval = vi
                .spyOn(evmSignatures, "signApproval")
                .mockResolvedValueOnce({ signature: "0xadapter" });

            await wallet.approve({ signatureId: "sig-1" });

            expect(signApproval).toHaveBeenCalledWith(wallet.signer, PENDING_MESSAGE);
            const [[, , body]] = api.approveSignature.mock.calls;
            expect(body.approvals).toEqual([{ signature: "0xadapter", signer: locator }]);
        });
    });
});
