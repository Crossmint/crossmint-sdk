import type { Wallet } from "@crossmint/wallets-sdk";
import { describe, expect, test } from "vitest";

import { cachedWalletMatchesArgs, type LoadedWalletArgs } from "./CrossmintWalletBaseProvider";

function walletFor(): Wallet<"base-sepolia"> {
    return {} as unknown as Wallet<"base-sepolia">;
}

function loadedArgsFor(chain: LoadedWalletArgs["chain"], alias?: string): LoadedWalletArgs {
    return { chain, alias };
}

describe("cachedWalletMatchesArgs", () => {
    test("matches when the loaded args' chain and alias are both the same as the requested args", () => {
        const wallet = walletFor();
        const loadedArgs = loadedArgsFor("base-sepolia", "main");

        expect(cachedWalletMatchesArgs(wallet, loadedArgs, { chain: "base-sepolia", alias: "main" })).toBe(true);
    });

    test("rejects a different chain, even with the same alias", () => {
        const wallet = walletFor();
        const loadedArgs = loadedArgsFor("base-sepolia", "main");

        expect(cachedWalletMatchesArgs(wallet, loadedArgs, { chain: "solana", alias: "main" })).toBe(false);
    });

    test("rejects a different alias on the same chain", () => {
        const wallet = walletFor();
        const loadedArgs = loadedArgsFor("base-sepolia", "main");

        expect(cachedWalletMatchesArgs(wallet, loadedArgs, { chain: "base-sepolia", alias: "other" })).toBe(false);
    });

    test("matches when neither the loaded args nor the requested args specify an alias", () => {
        const wallet = walletFor();
        const loadedArgs = loadedArgsFor("base-sepolia");

        expect(cachedWalletMatchesArgs(wallet, loadedArgs, { chain: "base-sepolia" })).toBe(true);
    });

    test("rejects when there is no cached wallet", () => {
        const loadedArgs = loadedArgsFor("base-sepolia", "main");

        expect(cachedWalletMatchesArgs(undefined, loadedArgs, { chain: "base-sepolia", alias: "main" })).toBe(false);
    });

    test("rejects when no args were recorded for the loaded wallet", () => {
        const wallet = walletFor();

        expect(cachedWalletMatchesArgs(wallet, undefined, { chain: "base-sepolia", alias: "main" })).toBe(false);
    });

    test("matches on the args the wallet was loaded with, even when the wallet reports a different chain", () => {
        // A staging key auto-converts a mainnet chain to its testnet equivalent (e.g. "base" ->
        // "base-sepolia"), so the loaded wallet's own `.chain` no longer equals what was requested.
        const wallet = { chain: "base-sepolia" } as unknown as Wallet<"base-sepolia">;
        const loadedArgs = loadedArgsFor("base", "main");

        expect(cachedWalletMatchesArgs(wallet, loadedArgs, { chain: "base", alias: "main" })).toBe(true);
    });
});
