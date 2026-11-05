import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Chain } from "../chains/chains";
import { isQuorumSigner, type QuorumLocator, type QuorumSigner } from "../signers/types";
import { InvalidSignerError, QuorumRequestError } from "../utils/errors";
import type { Wallet } from "./wallet";
import {
    QUORUM_SERVER_MEMBER_SECRET,
    QUORUM_TEST_PROJECT_ID,
    createMockApiClient,
    createMockWallet,
    createQuorumApiEntry,
    createQuorumFixture,
    withMembersReordered,
    type MockedApiClient,
} from "./__tests__/test-helpers";

type ChainCase = { chain: "base-sepolia" | "solana" | "stellar" };
const CHAINS: ChainCase[] = [{ chain: "base-sepolia" }, { chain: "solana" }, { chain: "stellar" }];

// A wallet read as the API returns it: recovery quorums under `recoveryMethods`, delegated ones under `delegatedSigners`.
function walletRead(chain: Chain, { recoveryMethods = [] as object[], delegatedSigners = [] as object[] }) {
    return {
        chainType: chain === "solana" ? "solana" : chain === "stellar" ? "stellar" : "evm",
        type: "smart",
        address: "wallet-address",
        config: { adminSigner: { type: "api-key", locator: "api-key" }, recoveryMethods, delegatedSigners },
    };
}

// A delegated quorum as the register-signer endpoint returns it once it is active on `chain`.
function registeredQuorum(chain: Chain, entry: QuorumSigner) {
    if (chain === "solana" || chain === "stellar") {
        return { ...entry, transaction: { id: "txn-add-quorum", status: "success" } };
    }
    return { ...entry, chains: { [chain]: { id: "txn-add-quorum", status: "success", onChain: {} } } };
}

const LANDED = { id: "txn-change", status: "success", onChain: { txId: "0xhash", explorerLink: "https://explorer" } };

describe.each(CHAINS)("managing quorums on $chain", ({ chain }) => {
    let api: MockedApiClient;
    let wallet: Wallet<Chain>;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        api = createMockApiClient({ projectId: QUORUM_TEST_PROJECT_ID } as Partial<MockedApiClient>);
        wallet = (await createMockWallet(chain, api)) as Wallet<Chain>;
        api.removeRecoveryMethod.mockResolvedValue({ id: "txn-change", status: "awaiting-approval" } as never);
        api.removeSigner.mockResolvedValue({ id: "txn-change", status: "awaiting-approval" } as never);
        api.getTransaction.mockResolvedValue(LANDED as never);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("addRecoveryMethod with a quorum", () => {
        let quorum: ReturnType<typeof createQuorumFixture>;

        beforeEach(() => {
            quorum = createQuorumFixture(chain);
            api.registerRecoveryMethod.mockResolvedValue({
                recoveryMethods: quorum.entry,
                tx: { id: "txn-change", status: "awaiting-approval" },
            } as never);
        });

        it("sends each member's identity fields only", async () => {
            await wallet.addRecoveryMethod(quorum.config as never);

            const sent = api.registerRecoveryMethod.mock.calls[0][1];
            expect(sent.recoveryMethods).toEqual(quorum.input);
            expect(JSON.stringify(sent)).not.toContain(QUORUM_SERVER_MEMBER_SECRET);
        });

        it("returns the locator the API gives the new quorum", async () => {
            const result = await wallet.addRecoveryMethod(quorum.config as never);

            expect(result).toEqual({ transactionId: "txn-change", status: "success", locator: quorum.entry.locator });
        });

        it("lists the API's entry, with its members' locators, once the change lands", async () => {
            await wallet.addRecoveryMethod(quorum.config as never);

            expect(wallet.recoveryMethods).toEqual([{ type: "api-key" }, quorum.entry]);
        });

        it("returns the locator and leaves the list unchanged when a quorum approves", async () => {
            const approver = createQuorumApiEntry();

            const result = await wallet.addRecoveryMethod(
                quorum.config as never,
                { signer: approver.locator } as never
            );

            expect(result).toEqual({ transactionId: "txn-change", status: undefined, locator: quorum.entry.locator });
            expect(wallet.recoveryMethods).toEqual([{ type: "api-key" }]);
        });

        it("holds none of the members' keys afterwards", async () => {
            await wallet.addRecoveryMethod(quorum.config as never);

            expect(wallet.signer?.locator()).toBe("api-key");
            expect(wallet.recoveryMethods.filter(isQuorumSigner).flatMap((method) => method.members)).toEqual(
                quorum.entry.members
            );
        });
    });

    describe("addRecoveryMethod with a single signer", () => {
        it("returns the locator the API gives it too", async () => {
            const address = "NewRecovery555";
            api.registerRecoveryMethod.mockResolvedValue({
                recoveryMethods: { type: "external-wallet", address, locator: `external-wallet:${address}` },
                tx: { id: "txn-change", status: "awaiting-approval" },
            } as never);

            const result = await wallet.addRecoveryMethod({ type: "external-wallet", address } as never);

            expect(result.locator).toBe(`external-wallet:${address}`);
        });
    });

    describe("addSigner with a quorum", () => {
        let quorum: ReturnType<typeof createQuorumFixture>;

        beforeEach(() => {
            quorum = createQuorumFixture(chain);
            api.registerSigner.mockResolvedValue(registeredQuorum(chain, quorum.entry) as never);
        });

        it("sends each member's identity fields only", async () => {
            await wallet.addSigner(quorum.config as never);

            const sent = api.registerSigner.mock.calls[0][1];
            expect(sent.signer).toEqual(quorum.input);
            expect(JSON.stringify(sent)).not.toContain(QUORUM_SERVER_MEMBER_SECRET);
        });

        it("returns the API's quorum with its locator and members", async () => {
            const result = await wallet.addSigner(quorum.config as never);

            expect(result).toEqual({ ...quorum.entry, status: "success" });
        });

        it("registers without first looking the new quorum up, as it has no locator yet", async () => {
            await wallet.addSigner(quorum.config as never);

            expect(api.getSigner).not.toHaveBeenCalled();
        });
    });

    describe("removeRecoveryMethod of a quorum", () => {
        it("sends the locator it is given", async () => {
            const target = createQuorumFixture(chain).entry;

            await wallet.removeRecoveryMethod({ locator: target.locator } as never, { prepareOnly: true } as never);

            expect(api.removeRecoveryMethod.mock.calls[0][1]).toBe(target.locator);
            expect(api.getWallet).not.toHaveBeenCalled();
        });

        it("takes the entry as the wallet lists it", async () => {
            const target = createQuorumFixture(chain).entry;

            await wallet.removeRecoveryMethod(target as never, { prepareOnly: true } as never);

            expect(api.removeRecoveryMethod.mock.calls[0][1]).toBe(target.locator);
        });

        it("finds the quorum by threshold and members, in any order, with one wallet read", async () => {
            const quorum = createQuorumFixture(chain);
            const other = createQuorumFixture(chain, 3).entry;
            api.getWallet.mockResolvedValue(walletRead(chain, { recoveryMethods: [other, quorum.entry] }) as never);

            await wallet.removeRecoveryMethod(
                withMembersReordered(quorum.config) as never,
                { prepareOnly: true } as never
            );

            expect(api.removeRecoveryMethod.mock.calls[0][1]).toBe(quorum.entry.locator);
            expect(api.getWallet).toHaveBeenCalledTimes(1);
        });

        it("rejects a composition no recovery quorum has, before any removal", async () => {
            const quorum = createQuorumFixture(chain);
            const sameMembersOtherThreshold = createQuorumFixture(chain, 3).entry;
            api.getWallet.mockResolvedValue(
                walletRead(chain, { recoveryMethods: [sameMembersOtherThreshold] }) as never
            );

            await expect(wallet.removeRecoveryMethod(quorum.config as never)).rejects.toBeInstanceOf(
                InvalidSignerError
            );
            expect(api.removeRecoveryMethod).not.toHaveBeenCalled();
        });

        it("does not match a delegated quorum with the same composition", async () => {
            const quorum = createQuorumFixture(chain);
            api.getWallet.mockResolvedValue(walletRead(chain, { delegatedSigners: [quorum.entry] }) as never);

            await expect(wallet.removeRecoveryMethod(quorum.config as never)).rejects.toBeInstanceOf(
                InvalidSignerError
            );
            expect(api.removeRecoveryMethod).not.toHaveBeenCalled();
        });

        it("names both quorums when two have the same composition, before any removal", async () => {
            const quorum = createQuorumFixture(chain);
            const twin = { ...quorum.entry, locator: `quorum:${crypto.randomUUID()}` as QuorumLocator };
            api.getWallet.mockResolvedValue(walletRead(chain, { recoveryMethods: [quorum.entry, twin] }) as never);

            const error = await wallet.removeRecoveryMethod(quorum.config as never).catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(InvalidSignerError);
            expect((error as Error).message).toContain(quorum.entry.locator);
            expect((error as Error).message).toContain(twin.locator);
            expect(api.removeRecoveryMethod).not.toHaveBeenCalled();
        });

        it("drops the quorum from the wallet's list once the removal lands", async () => {
            const quorum = createQuorumFixture(chain);
            api.registerRecoveryMethod.mockResolvedValue({
                recoveryMethods: quorum.entry,
                tx: { id: "txn-change", status: "awaiting-approval" },
            } as never);
            await wallet.addRecoveryMethod(quorum.config as never);

            await wallet.removeRecoveryMethod({ locator: quorum.entry.locator } as never);

            expect(wallet.recoveryMethods).toEqual([{ type: "api-key" }]);
        });
    });

    describe("removeSigner of a quorum", () => {
        it("sends the locator it is given", async () => {
            const target = createQuorumFixture(chain).entry;

            await wallet.removeSigner({ locator: target.locator } as never, { prepareOnly: true } as never);

            expect(api.removeSigner.mock.calls[0][1]).toBe(target.locator);
        });

        it("finds the delegated quorum by threshold and members", async () => {
            const quorum = createQuorumFixture(chain);
            api.getWallet.mockResolvedValue(walletRead(chain, { delegatedSigners: [quorum.entry] }) as never);

            await wallet.removeSigner(withMembersReordered(quorum.config) as never, { prepareOnly: true } as never);

            expect(api.removeSigner.mock.calls[0][1]).toBe(quorum.entry.locator);
        });

        it("does not match a recovery quorum with the same composition", async () => {
            const quorum = createQuorumFixture(chain);
            api.getWallet.mockResolvedValue(walletRead(chain, { recoveryMethods: [quorum.entry] }) as never);

            await expect(wallet.removeSigner(quorum.config as never)).rejects.toBeInstanceOf(InvalidSignerError);
            expect(api.removeSigner).not.toHaveBeenCalled();
        });
    });
});

describe("a Solana quorum the API does not take yet", () => {
    it("surfaces QUORUM_SIGNER_UNSUPPORTED as QuorumRequestError", async () => {
        const api = createMockApiClient({ projectId: QUORUM_TEST_PROJECT_ID } as Partial<MockedApiClient>);
        const wallet = await createMockWallet("solana", api);
        api.registerRecoveryMethod.mockResolvedValue({
            error: true,
            code: "QUORUM_SIGNER_UNSUPPORTED",
            message: "Quorum signers are not supported for solana-smart-wallet",
        } as never);

        const error = await wallet
            .addRecoveryMethod(createQuorumFixture("solana").config as never)
            .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(QuorumRequestError);
        expect((error as QuorumRequestError).reason).toBe("QUORUM_SIGNER_UNSUPPORTED");
    });
});
