import type { CrossmintWalletConnectEVMWallet } from "@/types/wallet";
import { describe, expect, it } from "vitest";

import type { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { getWalletByAddressAndChainId } from "./getWalletByAddressAndChainId";

const ETHEREUM_WALLET_ADDRESS = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
const POLYGON_WALLET_ADDRESS = "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359";
const UNKNOWN_ADDRESS = "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB";

function buildEVMWallet(address: string, chain: BlockchainIncludingTestnet): CrossmintWalletConnectEVMWallet {
    return {
        getSupportedChains: () => [chain],
        getAddress: async () => address,
        sendTransaction: async () => `0x${"4b".repeat(32)}`,
    };
}

const ethereumWallet = buildEVMWallet(ETHEREUM_WALLET_ADDRESS, "ethereum");
const polygonWallet = buildEVMWallet(POLYGON_WALLET_ADDRESS, "polygon");

describe("getWalletByAddressAndChainId", () => {
    it.each([
        {
            rule: "selects the wallet that owns the account, not the first wallet",
            address: POLYGON_WALLET_ADDRESS,
            chainId: "eip155:137",
            expected: polygonWallet,
        },
        {
            rule: "matches an EVM address without regard to case",
            address: POLYGON_WALLET_ADDRESS.toLowerCase(),
            chainId: "eip155:137",
            expected: polygonWallet,
        },
        {
            rule: "selects no wallet when the owner does not support the chain",
            address: ETHEREUM_WALLET_ADDRESS,
            chainId: "eip155:137",
            expected: undefined,
        },
        {
            rule: "selects no wallet when no wallet owns the address",
            address: UNKNOWN_ADDRESS,
            chainId: "eip155:1",
            expected: undefined,
        },
    ])("$rule", async ({ address, chainId, expected }) => {
        const wallet = await getWalletByAddressAndChainId([ethereumWallet, polygonWallet], address, chainId);

        expect(wallet).toBe(expected);
    });

    it("selects the owner when another wallet cannot load its address", async () => {
        const lockedWallet: CrossmintWalletConnectEVMWallet = {
            getSupportedChains: () => ["base"],
            getAddress: () => Promise.reject(new Error("unknown account #0")),
            sendTransaction: async () => `0x${"4b".repeat(32)}`,
        };

        const wallet = await getWalletByAddressAndChainId(
            [lockedWallet, ethereumWallet, polygonWallet],
            POLYGON_WALLET_ADDRESS,
            "eip155:137"
        );

        expect(wallet).toBe(polygonWallet);
    });
});
