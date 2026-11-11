import { CrossmintSDKError, WalletErrorCode } from "@crossmint/common-sdk-base";
import { WalletNotAvailableError, type Wallet, type WalletCreateArgs } from "@crossmint/wallets-sdk";
import { describe, expect, test, vi } from "vitest";

import { getExistingWallet } from "./CrossmintWalletBaseProvider";

const wallet = { address: "0x1bd5" } as unknown as Wallet<"base-sepolia">;
const options = {};
const args: WalletCreateArgs<"base-sepolia"> = {
    chain: "base-sepolia",
    alias: "main",
    recovery: { type: "phone", phone: "+5491168907058", channel: "whatsapp" },
    signers: [{ type: "phone", phone: "+5491168907058", channel: "whatsapp" }],
};

function mismatch() {
    return new CrossmintSDKError("signer config mismatch", WalletErrorCode.WALLET_CREATION_FAILED);
}

function setup(getWallet: ReturnType<typeof vi.fn>) {
    const logger = { warn: vi.fn() };
    return { wallets: { getWallet } as never, logger };
}

describe("getExistingWallet", () => {
    test("passes the recovery and signer config, so client-only fields such as the phone channel are kept", async () => {
        const getWallet = vi.fn().mockResolvedValue(wallet);
        const { wallets, logger } = setup(getWallet);

        await expect(getExistingWallet(wallets, args, options, logger)).resolves.toBe(wallet);

        expect(getWallet).toHaveBeenCalledTimes(1);
        expect(getWallet).toHaveBeenCalledWith({
            chain: "base-sepolia",
            alias: "main",
            recovery: args.recovery,
            recoveryMethods: undefined,
            signers: args.signers,
            options,
        });
    });

    test("keeps the recovery config when only the signers no longer match", async () => {
        const getWallet = vi.fn().mockRejectedValueOnce(mismatch()).mockResolvedValueOnce(wallet);
        const { wallets, logger } = setup(getWallet);

        await expect(getExistingWallet(wallets, args, options, logger)).resolves.toBe(wallet);

        expect(getWallet).toHaveBeenCalledTimes(2);
        expect(getWallet).toHaveBeenLastCalledWith({
            chain: "base-sepolia",
            alias: "main",
            recovery: args.recovery,
            recoveryMethods: undefined,
            options,
        });
        expect(logger.warn).toHaveBeenCalledWith(
            "react.wallet.getOrCreateWallet.signerConfigMismatch",
            expect.objectContaining({ withSigners: true })
        );
    });

    test("loads the wallet without any config when the recovery config does not match either", async () => {
        const getWallet = vi
            .fn()
            .mockRejectedValueOnce(mismatch())
            .mockRejectedValueOnce(mismatch())
            .mockResolvedValueOnce(wallet);
        const { wallets, logger } = setup(getWallet);

        await expect(getExistingWallet(wallets, args, options, logger)).resolves.toBe(wallet);

        expect(getWallet).toHaveBeenCalledTimes(3);
        expect(getWallet).toHaveBeenLastCalledWith({ chain: "base-sepolia", alias: "main", options });
        expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    test("loads without config at once when createOnLogin has none", async () => {
        const getWallet = vi.fn().mockResolvedValue(wallet);
        const { wallets, logger } = setup(getWallet);

        await getExistingWallet(wallets, { chain: "base-sepolia" }, options, logger);

        expect(getWallet).toHaveBeenCalledTimes(1);
        expect(getWallet).toHaveBeenCalledWith({ chain: "base-sepolia", alias: undefined, options });
    });

    test("lets WalletNotAvailableError through, so the caller creates the wallet", async () => {
        const notFound = new WalletNotAvailableError("not found");
        const getWallet = vi.fn().mockRejectedValue(notFound);
        const { wallets, logger } = setup(getWallet);

        await expect(getExistingWallet(wallets, args, options, logger)).rejects.toBe(notFound);
        expect(getWallet).toHaveBeenCalledTimes(1);
    });
});
