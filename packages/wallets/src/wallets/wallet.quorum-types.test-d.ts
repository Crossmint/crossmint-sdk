import { describe, expectTypeOf, it } from "vitest";
import type { EVMWallet } from "./evm";
import type { SolanaWallet } from "./solana";
import type { StellarWallet } from "./stellar";
import type {
    AddRecoveryMethodReturnType,
    ApproveParams,
    ApproveResult,
    EVMTransactionInput,
    MigrateOptions,
    QuorumAddSignerResult,
    QuorumSignatureResult,
    QuorumSignerChangeResult,
    QuorumTransactionResult,
    RemoveRecoveryMethodReturnType,
    RemoveSignerOptions,
    RemoveSignerReturnType,
    SendTokenTransactionOptions,
    Signature,
    Signer,
    SignMessageInput,
    SolanaTransactionInput,
    StellarTransactionInput,
    Transaction,
    TransactionInputOptions,
    UpgradeOptions,
} from "./types";
import type { Wallet } from "./wallet";

declare const wallet: Wallet<"base-sepolia">;
declare const evm: EVMWallet;
declare const solana: SolanaWallet;
declare const stellar: StellarWallet;
declare const quorum: string;
declare const value: bigint;
declare const maybeQuorum: string | undefined;
// biome-ignore lint/suspicious/noExplicitAny: callers that pass untyped options
declare const untyped: any;
declare const signerConfig: Parameters<Wallet<"base-sepolia">["removeSigner"]>[0];

describe("calls without the quorum option", () => {
    it("keep today's result types on direct calls", async () => {
        expectTypeOf(await wallet.send("0x1", "usdc", "1")).toEqualTypeOf<Transaction<false>>();
        expectTypeOf(await wallet.send("0x1", "usdc", "1", { prepareOnly: true })).toEqualTypeOf<Transaction<true>>();
        expectTypeOf(await wallet.approve({ transactionId: "t" })).toEqualTypeOf<Transaction<false>>();
        expectTypeOf(await evm.signMessage({ message: "m" })).toEqualTypeOf<Signature<false>>();
        expectTypeOf(await wallet.addSigner(signerConfig)).toEqualTypeOf<Signer>();
        expectTypeOf(await wallet.removeSigner(signerConfig)).toEqualTypeOf<RemoveSignerReturnType>();
    });

    it("keep today's result types through forwarders typed with the public option types", () => {
        const forwardEvm = async (input: EVMTransactionInput) => (await evm.sendTransaction(input)).hash;
        const forwardSolana = async (input: SolanaTransactionInput) => (await solana.sendTransaction(input)).hash;
        const forwardStellar = async (input: StellarTransactionInput) => (await stellar.sendTransaction(input)).hash;
        const forwardMigrate = async (options?: MigrateOptions) => (await stellar.migrate(options)).transactionId;
        const forwardApprove = async (params: ApproveParams & { transactionId: string }) =>
            (await wallet.approve(params)).hash;

        expectTypeOf(forwardEvm).returns.resolves.toEqualTypeOf<string>();
        expectTypeOf(forwardSolana).returns.resolves.toEqualTypeOf<string>();
        expectTypeOf(forwardStellar).returns.resolves.toEqualTypeOf<string>();
        expectTypeOf(forwardMigrate).returns.resolves.toEqualTypeOf<string>();
        expectTypeOf(forwardApprove).returns.resolves.toEqualTypeOf<string>();
    });

    it("keep today's result types through generic forwarders", () => {
        const sendWith = async <O extends SendTokenTransactionOptions>(options: O) =>
            (await wallet.send("0x1", "usdc", "1", options)).hash;
        const sendEvm = async <I extends EVMTransactionInput>(input: I) => (await evm.sendTransaction(input)).hash;
        const sendSolana = async <O extends TransactionInputOptions>(options: O) =>
            (await solana.sendTransaction({ serializedTransaction: "x", options })).hash;
        const signWith = async <I extends SignMessageInput>(input: I) => (await evm.signMessage(input)).signature;
        const removeWith = <O extends RemoveSignerOptions>(options: O): Promise<RemoveSignerReturnType> =>
            wallet.removeSigner(signerConfig, options);
        const approveWith = <P extends ApproveParams>(params: P): Promise<ApproveResult<P>> => wallet.approve(params);
        const sendMirrored = <O extends SendTokenTransactionOptions | undefined = undefined>(
            options?: O
        ): Promise<Transaction<O extends { prepareOnly: true } ? true : false>> =>
            wallet.send("0x1", "usdc", "1", options);

        expectTypeOf(sendWith).returns.resolves.toEqualTypeOf<string | undefined>();
        expectTypeOf(sendEvm).returns.resolves.toEqualTypeOf<string | undefined>();
        expectTypeOf(sendSolana).returns.resolves.toEqualTypeOf<string | undefined>();
        expectTypeOf(signWith).returns.resolves.toEqualTypeOf<string | undefined>();
        expectTypeOf(removeWith).toBeFunction();
        expectTypeOf(approveWith).toBeFunction();
        expectTypeOf(sendMirrored).toBeFunction();
    });

    it("accept a spread of typed options that overrides signer", () => {
        const sendAs = (options: SendTokenTransactionOptions) =>
            wallet.send("0x1", "usdc", "1", { ...options, signer: "external-wallet:0x1" });
        const upgradeAs = (options: UpgradeOptions) => stellar.upgrade({ ...options, signer: "external-wallet:0x1" });

        expectTypeOf(sendAs).toBeFunction();
        expectTypeOf(upgradeAs).toBeFunction();
    });

    it("keep today's result types for untyped options", async () => {
        expectTypeOf((await wallet.send("0x1", "usdc", "1", untyped)).hash).toEqualTypeOf<string | undefined>();
        expectTypeOf((await evm.sendTransaction(untyped)).hash).toEqualTypeOf<string | undefined>();
        expectTypeOf((await stellar.upgrade(untyped)).hash).toEqualTypeOf<string | undefined>();
        expectTypeOf((await evm.signMessage(untyped)).signature).toEqualTypeOf<string | undefined>();
        expectTypeOf(await wallet.removeSigner(signerConfig, untyped)).toEqualTypeOf<RemoveSignerReturnType>();
    });

    it("keep today's ReturnType", () => {
        expectTypeOf<ReturnType<typeof solana.removeSigner>>().toEqualTypeOf<Promise<RemoveSignerReturnType>>();
        expectTypeOf<ReturnType<typeof solana.addRecoveryMethod>>().toEqualTypeOf<
            Promise<AddRecoveryMethodReturnType>
        >();
        expectTypeOf<ReturnType<typeof solana.removeRecoveryMethod>>().toEqualTypeOf<
            Promise<RemoveRecoveryMethodReturnType>
        >();
    });
});

describe("calls with the quorum option", () => {
    it("return the quorum result, or the prepared request with prepareOnly", async () => {
        expectTypeOf(await wallet.send("0x1", "usdc", "1", { quorum })).toEqualTypeOf<QuorumTransactionResult>();
        expectTypeOf(await wallet.send("0x1", "usdc", "1", { quorum, prepareOnly: true })).toEqualTypeOf<
            Transaction<true>
        >();
        expectTypeOf(
            await evm.sendTransaction({ to: "0x1", value, options: { quorum } })
        ).toEqualTypeOf<QuorumTransactionResult>();
        expectTypeOf(
            await solana.sendTransaction({ serializedTransaction: "x", options: { quorum } })
        ).toEqualTypeOf<QuorumTransactionResult>();
        expectTypeOf(await stellar.upgrade({ quorum })).toEqualTypeOf<QuorumTransactionResult>();
        expectTypeOf(await stellar.migrate({ quorum })).toEqualTypeOf<QuorumTransactionResult>();
        expectTypeOf(
            await evm.signMessage({ message: "m", options: { quorum } })
        ).toEqualTypeOf<QuorumSignatureResult>();
    });

    it("return the quorum result from approve, for each request kind", async () => {
        expectTypeOf(await wallet.approve({ transactionId: "t", quorum })).toEqualTypeOf<QuorumTransactionResult>();
        expectTypeOf(await wallet.approve({ signatureId: "s", quorum })).toEqualTypeOf<QuorumSignatureResult>();
    });

    it("return the quorum result from signer changes", async () => {
        expectTypeOf(await wallet.addSigner(signerConfig, { quorum })).toEqualTypeOf<QuorumAddSignerResult>();
        expectTypeOf(await wallet.removeSigner(signerConfig, { quorum })).toEqualTypeOf<QuorumSignerChangeResult>();
    });

    it("do not compile together with signer", async () => {
        // @ts-expect-error a call acts as a signer or as a quorum, never both
        await wallet.send("0x1", "usdc", "1", { quorum, signer: "external-wallet:0x1", prepareOnly: false });
        // @ts-expect-error a call acts as a signer or as a quorum, never both
        await stellar.upgrade({ quorum, signer: "external-wallet:0x1" });
        // @ts-expect-error a call acts as a signer or as a quorum, never both
        await evm.sendTransaction({ to: "0x1", value, options: { quorum, signer: "x", prepareOnly: false } });
        // @ts-expect-error a call acts as a signer or as a quorum, never both
        await solana.sendTransaction({
            serializedTransaction: "x",
            options: { quorum, signer: "x", prepareOnly: false },
        });
    });

    it("do not compile with a quorum that can be undefined", async () => {
        // @ts-expect-error the result type depends on whether the quorum is set
        await wallet.approve({ transactionId: "t", quorum: maybeQuorum });
        // @ts-expect-error the result type depends on whether the quorum is set
        await wallet.send("0x1", "usdc", "1", { quorum: maybeQuorum, prepareOnly: false });
        // @ts-expect-error the result type depends on whether the quorum is set
        await evm.signMessage({ message: "m", options: { quorum: maybeQuorum, prepareOnly: false } });
        // @ts-expect-error the result type depends on whether the quorum is set
        await wallet.removeSigner(signerConfig, { quorum: maybeQuorum, prepareOnly: false });
    });
});
