import type { Wallet } from "@crossmint/wallets-sdk";
import { describe, expect, test } from "vitest";

import { cachedWalletMatchesArgs } from "./CrossmintWalletBaseProvider";

function walletFor(chain: string, alias?: string): Wallet<"base-sepolia"> {
    return { chain, alias } as unknown as Wallet<"base-sepolia">;
}

describe("cachedWalletMatchesArgs", () => {
    test("matches when chain and alias are both the same", () => {
        const wallet = walletFor("base-sepolia", "main");

        expect(cachedWalletMatchesArgs(wallet, { chain: "base-sepolia", alias: "main" })).toBe(true);
    });

    test("does not match a different chain, even with the same alias", () => {
        const wallet = walletFor("base-sepolia", "main");

        expect(cachedWalletMatchesArgs(wallet, { chain: "solana", alias: "main" })).toBe(false);
    });

    test("does not match a different alias on the same chain", () => {
        const wallet = walletFor("base-sepolia", "main");

        expect(cachedWalletMatchesArgs(wallet, { chain: "base-sepolia", alias: "other" })).toBe(false);
    });

    test("matches when neither the cached wallet nor the args specify an alias", () => {
        const wallet = walletFor("base-sepolia");

        expect(cachedWalletMatchesArgs(wallet, { chain: "base-sepolia" })).toBe(true);
    });

    test("does not match when there is no cached wallet", () => {
        expect(cachedWalletMatchesArgs(undefined, { chain: "base-sepolia", alias: "main" })).toBe(false);
    });
});
