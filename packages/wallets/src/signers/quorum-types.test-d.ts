import { describe, expectTypeOf, it } from "vitest";
import type { Chain } from "../chains/chains";
import type {
    ApprovingMember,
    RecoverResult,
    Transaction,
    TransactionInputOptions,
    WalletCreateArgs,
} from "../wallets/types";
import type { Wallet } from "../wallets/wallet";
import type { QuorumLocator, QuorumMemberConfig, QuorumSignerConfig } from "./types";

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

    it("takes a member by its identity alone, as another device holds its key", () => {
        expectTypeOf({ type: "external-wallet", address: "0xB0b" } as const).toMatchTypeOf<
            QuorumMemberConfig<"base-sepolia">
        >();
        expectTypeOf({ type: "server", address: "0xCa201" } as const).toMatchTypeOf<QuorumMemberConfig<"stellar">>();
        expectTypeOf({
            type: "passkey",
            id: "cred",
            name: "Dave",
            publicKey: { x: "1", y: "2" },
        } as const).toMatchTypeOf<QuorumMemberConfig<"base-sepolia">>();
    });

    it("needs the fields the API identifies a member by", () => {
        expectTypeOf({ type: "passkey", id: "cred" } as const).not.toMatchTypeOf<QuorumMemberConfig<"base-sepolia">>();
        expectTypeOf({ type: "email" } as const).not.toMatchTypeOf<QuorumMemberConfig<"base-sepolia">>();
        expectTypeOf({ type: "phone" } as const).not.toMatchTypeOf<QuorumMemberConfig<"stellar">>();
    });
});

describe("QuorumSignerConfig", () => {
    it("goes wherever a signer config goes", () => {
        expectTypeOf<QuorumSignerConfig<"base-sepolia">>().toMatchTypeOf<Parameters<typeof evmWallet.addSigner>[0]>();
        expectTypeOf<QuorumSignerConfig<"base-sepolia">>().toMatchTypeOf<
            Parameters<typeof evmWallet.addRecoveryMethod>[0]
        >();
        expectTypeOf<QuorumSignerConfig<"stellar">>().toMatchTypeOf<Parameters<typeof stellarWallet.removeSigner>[0]>();
        expectTypeOf<QuorumSignerConfig<"stellar">>().toMatchTypeOf<
            Parameters<typeof stellarWallet.removeRecoveryMethod>[0]
        >();
        expectTypeOf<QuorumSignerConfig<"stellar">>().toMatchTypeOf<
            NonNullable<WalletCreateArgs<"stellar">["recoveryMethods"]>[number]
        >();
        expectTypeOf<QuorumSignerConfig<"stellar">>().toMatchTypeOf<
            NonNullable<WalletCreateArgs<"stellar">["signers"]>[number]
        >();
    });

    it("is removed by its locator too", () => {
        expectTypeOf<{ locator: QuorumLocator }>().toMatchTypeOf<Parameters<typeof evmWallet.removeSigner>[0]>();
        expectTypeOf<{ locator: QuorumLocator }>().toMatchTypeOf<
            Parameters<typeof solanaWallet.removeRecoveryMethod>[0]
        >();
    });
});

describe("addRecoveryMethod", () => {
    it("returns the new recovery method's locator", () => {
        expectTypeOf<Awaited<ReturnType<typeof evmWallet.addRecoveryMethod>>>().toHaveProperty("locator");
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

describe("recover()", () => {
    it("returns a request approve() takes once it is checked for undefined", () => {
        expectTypeOf<Awaited<ReturnType<typeof evmWallet.recover>>>().toEqualTypeOf<RecoverResult>();
        expectTypeOf<NonNullable<RecoverResult>>().toMatchTypeOf<Parameters<typeof evmWallet.approve>[0]>();
        expectTypeOf<NonNullable<RecoverResult>>().toMatchTypeOf<Parameters<typeof stellarWallet.approve>[0]>();
    });
});

describe("approvingMembers", () => {
    type Members = ApprovingMember[];

    it("takes member locators and member configs", () => {
        expectTypeOf<
            ["external-wallet:Alice", "email:bob@example.com", "server:Srv", "phone:+1555"]
        >().toMatchTypeOf<Members>();
        expectTypeOf<[{ type: "server"; secret: string }, { type: "email"; email: string }]>().toMatchTypeOf<Members>();
        expectTypeOf<[{ type: "external-wallet"; address: string }]>().toMatchTypeOf<Members>();
    });

    it("takes no locator that cannot be a member", () => {
        expectTypeOf<["quorum:abc"]>().not.toMatchTypeOf<Members>();
        expectTypeOf<["api-key"]>().not.toMatchTypeOf<Members>();
        expectTypeOf<["device:abc"]>().not.toMatchTypeOf<Members>();
        expectTypeOf<["Alice"]>().not.toMatchTypeOf<Members>();
    });

    it("is an option of every call that creates a request a quorum acts in", () => {
        type Option<F extends (...args: never[]) => unknown> = NonNullable<
            Extract<Parameters<F>[number], { approvingMembers?: unknown }>
        >["approvingMembers"];
        expectTypeOf<Option<typeof solanaWallet.send>>().toEqualTypeOf<Members | undefined>();
        expectTypeOf<Option<typeof solanaWallet.addSigner>>().toEqualTypeOf<Members | undefined>();
        expectTypeOf<Option<typeof solanaWallet.removeSigner>>().toEqualTypeOf<Members | undefined>();
        expectTypeOf<Option<typeof solanaWallet.addRecoveryMethod>>().toEqualTypeOf<Members | undefined>();
        expectTypeOf<Option<typeof solanaWallet.removeRecoveryMethod>>().toEqualTypeOf<Members | undefined>();
        expectTypeOf<Option<typeof solanaWallet.recover>>().toEqualTypeOf<Members | undefined>();
        expectTypeOf<NonNullable<TransactionInputOptions["approvingMembers"]>>().toEqualTypeOf<Members>();
    });
});

describe("validUntil", () => {
    it("is an optional ISO string on transaction results", () => {
        expectTypeOf<Transaction<true>["validUntil"]>().toEqualTypeOf<string | undefined>();
        expectTypeOf<Transaction<false>["validUntil"]>().toEqualTypeOf<string | undefined>();
    });
});
