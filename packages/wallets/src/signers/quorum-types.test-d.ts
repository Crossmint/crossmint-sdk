import { describe, expectTypeOf, it } from "vitest";
import type { Chain } from "../chains/chains";
import type { Wallet } from "../wallets/wallet";
import type { QuorumMemberConfig } from "./types";

type MemberTypes<C extends Chain> = QuorumMemberConfig<C>["type"];

declare const evmWallet: Wallet<"base-sepolia">;
declare const solanaWallet: Wallet<"solana">;
declare const stellarWallet: Wallet<"stellar">;

describe("QuorumMemberConfig", () => {
    it("allows email, phone, external-wallet, server and passkey members on EVM and Stellar", () => {
        expectTypeOf<MemberTypes<"base-sepolia">>().toEqualTypeOf<
            "email" | "phone" | "external-wallet" | "server" | "passkey"
        >();
        expectTypeOf<MemberTypes<"stellar">>().toEqualTypeOf<
            "email" | "phone" | "external-wallet" | "server" | "passkey"
        >();
    });

    it("allows no passkey member on Solana", () => {
        expectTypeOf<MemberTypes<"solana">>().toEqualTypeOf<"email" | "phone" | "external-wallet" | "server">();
    });
});

describe("Wallet.recovery", () => {
    it("is accepted wherever a signer config is expected", () => {
        expectTypeOf(evmWallet.recovery).toMatchTypeOf<Parameters<typeof evmWallet.useRecoveryMethod>[0]>();
        expectTypeOf(evmWallet.recovery).toMatchTypeOf<Parameters<typeof evmWallet.useSigner>[0]>();
        expectTypeOf(solanaWallet.recovery).toMatchTypeOf<Parameters<typeof solanaWallet.useRecoveryMethod>[0]>();
        expectTypeOf(stellarWallet.recovery).toMatchTypeOf<Parameters<typeof stellarWallet.useRecoveryMethod>[0]>();
    });
});
