/**
 * Proves the m7 fake wallets API works through the public SDK (CrossmintWallets / WalletFactory over the real
 * ApiClient): wallet creation and reads, flat and quorum approvals, flat and quorum device recovery, and one fault.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { ApiClientError } from "@crossmint/common-sdk-base";
import { EVMWallet } from "../../wallets/evm";
import { QuorumRequestError, TransactionExpiredError, WalletNotAvailableError } from "../../utils/errors";
import {
    drive,
    forEachSeed,
    quorumOf,
    recipientFor,
    rng,
    settle,
    stressEnv,
    stressSeed,
    useStressTimers,
    type StressEnv,
} from "./harness";

type Chain = "base-sepolia" | "stellar" | "solana";
const QUORUM_CHAINS: Chain[] = ["base-sepolia", "stellar"];
const ALL_CHAINS: Chain[] = ["base-sepolia", "stellar", "solana"];

// biome-ignore lint/suspicious/noExplicitAny: the SDK's generic configs are not worth spelling out in a smoke test
type Any = any;

let env: StressEnv;
const seed = stressSeed();

beforeEach(() => {
    useStressTimers();
    env = stressEnv(seed);
});

afterEach(() => {
    env.dispose();
    vi.useRealTimers();
});

const requestsOf = (route: string) => env.fake.calls.filter((call) => call.route === route);

describe.each(ALL_CHAINS)("wallet creation and reads on %s", (chain) => {
    it("creates a wallet with a flat external-wallet recovery method and reads it back", async () => {
        const recovery = env.key(chain);
        const sdk = env.sdk();

        const created = await drive(sdk.createWallet({ chain, recovery: recovery.config } as Any));
        const read = await drive(sdk.getWallet({ chain } as Any));

        expect(read.address).toBe(created.address);
        expect(requestsOf("createWallet")[0].body.config.adminSigner).toEqual({
            type: "external-wallet",
            address: recovery.address,
        });
        expect(read.recoveryMethods).toEqual([
            expect.objectContaining({ type: "external-wallet", address: recovery.address }),
        ]);
    });

    it("creates a wallet with an api-key recovery method", async () => {
        const sdk = env.sdk();

        const created = await drive(sdk.createWallet({ chain, recovery: { type: "api-key" } } as Any));

        expect(created.recovery.type).toBe("api-key");
        expect(env.fake.renderedWallet(created.address).config.adminSigner.locator).toMatch(/^api-key:/);
    });
});

describe.each(QUORUM_CHAINS)("wallet creation with a recovery quorum on %s", (chain) => {
    it("creates a wallet with a 2-of-3 recovery quorum and reads its locator back", async () => {
        const members = [env.key(chain), env.key(chain), env.key(chain)];
        const sdk = env.sdk();

        await drive(sdk.createWallet({ chain, recoveryMethods: [quorumOf(members, 2)] } as Any));
        const read = await drive(sdk.getWallet({ chain } as Any));

        expect(read.recoveryMethods).toEqual([
            expect.objectContaining({
                type: "quorum",
                threshold: 2,
                locator: expect.stringMatching(/^quorum:[0-9a-f-]{36}$/),
                members: members.map((member) => expect.objectContaining({ locator: member.locator })),
            }),
        ]);
    });
});

describe("wallet creation with a recovery quorum on solana", () => {
    it("is rejected with the quorum error code the SDK maps", async () => {
        const members = [env.key("solana"), env.key("solana"), env.key("solana")];

        const outcome = await settle(
            env.sdk().createWallet({ chain: "solana", recoveryMethods: [quorumOf(members, 2)] } as Any)
        );

        expect("error" in outcome && outcome.error).toBeInstanceOf(QuorumRequestError);
    });
});

describe.each(ALL_CHAINS)("send with a flat signer on %s", (chain) => {
    it("lands with the recovery key signing the approval", async () => {
        const recovery = env.key(chain);
        const wallet = await drive(env.sdk().createWallet({ chain, recovery: recovery.config } as Any));

        const transaction = await drive(wallet.send(recipientFor(chain, env.rng), "usdc", "1"));

        expect(transaction.hash).toEqual(expect.any(String));
        expect(recovery.signCount()).toBe(1);
        expect(env.fake.renderedRequest(transaction.transactionId).status).toBe("success");
    });

    it("lands with an api-key recovery method, the API signing", async () => {
        const wallet = await drive(env.sdk().createWallet({ chain, recovery: { type: "api-key" } } as Any));

        const transaction = await drive(wallet.send(recipientFor(chain, env.rng), "usdc", "1"));

        expect(transaction.hash).toEqual(expect.any(String));
        expect(requestsOf("approveTransaction")).toHaveLength(0);
    });
});

describe("sendTransaction with a flat signer on base-sepolia", () => {
    it("lands", async () => {
        const recovery = env.key("base-sepolia");
        const wallet = await drive(env.sdk().createWallet({ chain: "base-sepolia", recovery: recovery.config } as Any));

        const transaction = await drive(
            EVMWallet.from(wallet).sendTransaction({ to: recipientFor("base-sepolia", env.rng), value: BigInt(1) })
        );

        expect(transaction.hash).toEqual(expect.any(String));
    });
});

describe.each(QUORUM_CHAINS)("a recovery quorum member sending on %s", (chain) => {
    it("creates the transaction unsigned; two members approve it and it lands", async () => {
        const [alice, bob, carol] = [env.key(chain), env.key(chain), env.key(chain)];
        const quorum = quorumOf([alice, bob, carol], 2);
        const aliceWallet = await drive(env.sdk().createWallet({ chain, recoveryMethods: [quorum] } as Any));
        await drive(aliceWallet.useSigner(alice.config));

        const prepared = await drive(aliceWallet.send(recipientFor(chain, env.rng), "usdc", "1"));
        expect(prepared).toEqual({ hash: undefined, explorerLink: undefined, transactionId: expect.any(String) });
        expect(requestsOf("send")[0].body.signer).toMatch(/^quorum:/);

        const afterAlice = await drive(aliceWallet.approve({ transactionId: prepared.transactionId }));
        expect(afterAlice.hash).toBeUndefined();
        expect(env.fake.renderedRequest(prepared.transactionId).status).toBe("awaiting-approval");

        // Bob, on his own device.
        const bobWallet = await drive(env.sdk().getWallet({ chain } as Any));
        await drive(bobWallet.useSigner(bob.config));
        const landed = await drive(bobWallet.approve({ transactionId: prepared.transactionId }));

        expect(landed.hash).toEqual(expect.any(String));
        expect([alice.signCount(), bob.signCount(), carol.signCount()]).toEqual([1, 1, 0]);
    });
});

describe.each(QUORUM_CHAINS)("device recovery with a flat recovery method on %s", (chain) => {
    it("registers a new device signer approved by the external-wallet recovery and removes the old one", async () => {
        const recovery = env.key(chain);
        const device = env.device();
        const created = await drive(
            env
                .sdk()
                .createWallet({ chain, recovery: recovery.config, options: { deviceSignerKeyStorage: device } } as Any)
        );
        const oldDevice = device.locatorFor(created.address);
        expect(oldDevice).toMatch(/^device:/);
        expect(created.signer?.locator()).toBe(oldDevice);

        // The device loses its key; its saved signer locator survives.
        await device.deleteKey(created.address);
        const wallet = await drive(
            env
                .sdk()
                .getWallet({ chain, recovery: recovery.config, options: { deviceSignerKeyStorage: device } } as Any)
        );
        expect(wallet.needsRecovery()).toBe(true);

        await expect(drive(wallet.recover())).resolves.toBeUndefined();

        const newDevice = device.locatorFor(created.address);
        expect(newDevice).not.toBe(oldDevice);
        expect(wallet.needsRecovery()).toBe(false);
        expect(wallet.signer?.locator()).toBe(newDevice);
        const listed = (await drive(wallet.signers())).map((signer) => signer.locator);
        expect(listed).toEqual([newDevice]);
        expect(requestsOf("removeSigner").map((call) => call.path)).toEqual([
            expect.stringContaining(`/signers/${oldDevice}`),
        ]);

        // The new device signs a transfer on its own.
        const transaction = await drive(wallet.send(recipientFor(chain, env.rng), "usdc", "1"));
        expect(transaction.hash).toEqual(expect.any(String));
    });
});

describe.each(QUORUM_CHAINS)("device recovery through a recovery quorum on %s", (chain) => {
    it("registers the new device through the quorum; members approve; the next recover() removes the old device", async () => {
        const [alice, bob, carol] = [env.key(chain), env.key(chain), env.key(chain)];
        const quorum = quorumOf([alice, bob, carol], 2);
        const device = env.device();
        const created = await drive(
            env
                .sdk()
                .createWallet({ chain, recoveryMethods: [quorum], options: { deviceSignerKeyStorage: device } } as Any)
        );
        const oldDevice = device.locatorFor(created.address);
        await device.deleteKey(created.address);

        const wallet = await drive(env.sdk().getWallet({ chain, options: { deviceSignerKeyStorage: device } } as Any));
        expect(wallet.needsRecovery()).toBe(true);
        await drive(wallet.useRecoveryMethod(alice.config));

        const registration = await drive(wallet.recover());
        expect(registration).toEqual({ transactionId: expect.any(String) });
        const newDevice = device.locatorFor(created.address);
        expect(requestsOf("registerSigner")[0].body.approver).toMatch(/^quorum:/);

        const afterAlice = await drive(wallet.approve(registration as { transactionId: string }));
        expect(afterAlice.hash).toBeUndefined();

        // Bob approves from his own device, with no device key.
        const bobWallet = await drive(env.sdk().getWallet({ chain } as Any));
        await drive(bobWallet.useRecoveryMethod(bob.config));
        const landed = await drive(bobWallet.approve(registration as { transactionId: string }));
        expect(landed.hash).toEqual(expect.any(String));

        const removal = await drive(wallet.recover());
        expect(removal).toEqual({ transactionId: expect.any(String) });
        expect(wallet.signer?.locator()).toBe(newDevice);
        expect(wallet.needsRecovery()).toBe(false);
        expect(requestsOf("removeSigner")[0].path).toContain(`/signers/${oldDevice}`);
        expect(requestsOf("removeSigner")[0].query.approver).toMatch(/^quorum:/);

        // The members approve the removal too, and the old device is gone.
        await drive(wallet.approve(removal as { transactionId: string }));
        const removed = await drive(bobWallet.approve(removal as { transactionId: string }));
        expect(removed.hash).toEqual(expect.any(String));
        const listed = (await drive(wallet.signers())).map((signer) => signer.locator);
        expect(listed).toEqual([newDevice]);
        await expect(drive(wallet.recover())).resolves.toBeUndefined();
    });
});

describe("device signers on solana", () => {
    it("retries wallet creation without the auto-injected device signer when the provider rejects it", async () => {
        const recovery = env.key("solana");

        const wallet = await drive(
            env.sdk().createWallet({
                chain: "solana",
                recovery: recovery.config,
                options: { deviceSignerKeyStorage: env.device() },
            } as Any)
        );

        expect(requestsOf("createWallet").map((call) => call.status)).toEqual([400, 201]);
        expect(wallet.address).toEqual(expect.any(String));
    });
});

describe("a fault on GET signers/:locator", () => {
    async function walletWithSigner() {
        const recovery = env.key("base-sepolia");
        const wallet = await drive(env.sdk().createWallet({ chain: "base-sepolia", recovery: recovery.config } as Any));
        const operational = env.key("base-sepolia");
        await drive(wallet.addSigner(operational.config));
        return { wallet, operational };
    }

    it("a 404 for an unknown signer reads as not approved", async () => {
        const { wallet } = await walletWithSigner();

        await expect(drive(wallet.isSignerApproved(env.key("base-sepolia").locator))).resolves.toBe(false);
        expect(requestsOf("getSigner").at(-1)?.status).toBe(404);
    });

    it("a 503 throws instead of reading as not approved", async () => {
        const { wallet, operational } = await walletWithSigner();
        await expect(drive(wallet.isSignerApproved(operational.locator))).resolves.toBe(true);
        env.fake.faults.failNext("getSigner", { type: "status", status: 503 });

        const outcome = await settle(wallet.isSignerApproved(operational.locator));

        expect("error" in outcome && outcome.error).toBeInstanceOf(ApiClientError);
        expect(("error" in outcome && (outcome.error as ApiClientError)).status).toBe(503);
    });
});

describe("the fake's approval rules, through the real ApiClient", () => {
    async function quorumTransaction() {
        const members = [env.key("base-sepolia"), env.key("base-sepolia"), env.key("base-sepolia")];
        const wallet = await drive(
            env.sdk().createWallet({ chain: "base-sepolia", recoveryMethods: [quorumOf(members, 2)] } as Any)
        );
        const quorumLocator = env.fake.renderedWallet(wallet.address).config.recoveryMethods[0].locator;
        const client = env.client();
        const transaction: Any = await client.send("me:evm:smart", "base-sepolia:usdc", {
            recipient: recipientFor("base-sepolia", env.rng),
            amount: "1",
            signer: quorumLocator,
        } as Any);
        const message = transaction.approvals.pending[0].quorumApprovals.pending[0].message;
        const approval = async (index: number) => ({
            signer: members[index].locator,
            signature: await members[index].config.onSign(message),
        });
        return { client, transaction, approval, wallet, members };
    }

    it("ignores a member's second approval, completes at the threshold, and answers 422 after that", async () => {
        const { client, transaction, approval } = await quorumTransaction();
        const approve = async (index: number): Promise<Any> =>
            client.approveTransaction("me:evm:smart", transaction.id, { approvals: [await approval(index)] });

        expect((await approve(0)).approvals.pending[0].quorumApprovals.remaining).toBe(1);
        expect((await approve(0)).approvals.pending[0].quorumApprovals.remaining).toBe(1);
        const completed = await approve(1);
        expect(completed.status).toBe("pending");
        expect(completed.approvals.submitted[0].quorumApprovals).toEqual(
            expect.objectContaining({ remaining: 0, submitted: [expect.anything(), expect.anything()] })
        );

        // The client answers the 422 by reading the request back.
        const late = await approve(2);
        expect(env.fake.calls.at(-2)?.status).toBe(422);
        expect(late.id).toBe(transaction.id);
    });

    it("rejects an approval from a key that is not pending", async () => {
        const { client, transaction } = await quorumTransaction();
        const stranger = env.key("base-sepolia");

        const response: Any = await client.approveTransaction("me:evm:smart", transaction.id, {
            approvals: [{ signer: stranger.locator, signature: await stranger.config.onSign("0x01") }],
        } as Any);

        expect(response).toEqual(expect.objectContaining({ error: true, statusCode: 400 }));
    });

    it("stores an expired request as failed, which approve() reports as TransactionExpiredError", async () => {
        const { transaction, wallet, members } = await quorumTransaction();
        await drive(wallet.useSigner(members[0].config));
        env.fake.expire(transaction.id);

        const outcome = await settle(wallet.approve({ transactionId: transaction.id }));

        expect("error" in outcome && outcome.error).toBeInstanceOf(TransactionExpiredError);
    });
});

describe("the harness", () => {
    it("replays the same draws for the same seed", () => {
        const draw = (s: number) => {
            const random = rng(s);
            return [random.int(0, 1000), random.pick(["a", "b", "c"]), random.bool(), random.shuffle([1, 2, 3, 4])];
        };
        expect(draw(7)).toEqual(draw(7));
        expect(draw(7)).not.toEqual(draw(8));
    });

    it("names the failing seed so the run can be replayed", async () => {
        const failing = forEachSeed(
            3,
            async (s) => {
                if (s === 11) throw new Error("boom");
            },
            10
        );

        await expect(failing).rejects.toThrow("seed=11 (replay: STRESS_SEED=11 STRESS_RUNS=1) Error: boom");
    });
});

describe("signatures, signer changes and recovery changes on base-sepolia", () => {
    it("signs a message, adds a signer by signature, swaps the recovery method and removes the signer", async () => {
        const chain = "base-sepolia";
        const [first, second, operational] = [env.key(chain), env.key(chain), env.key(chain)];
        const wallet = await drive(env.sdk().createWallet({ chain, recovery: first.config } as Any));

        const signature = await drive(EVMWallet.from(wallet).signMessage({ message: "hello" }));
        expect(signature.signature).toMatch(/^0x[0-9a-f]{130}$/);

        const added = await drive(wallet.addSigner(operational.config, { deployImmediately: false }));
        expect(added.status).toBe("success");
        expect(env.fake.signersOf(wallet.address)[0].chains[chain]).toEqual({ status: "active" });

        const addedRecovery = await drive(wallet.addRecoveryMethod(second.config));
        expect(addedRecovery.status).toBe("success");
        await drive(wallet.useRecoveryMethod(second.config));
        await drive(wallet.removeRecoveryMethod(first.config));
        expect(env.fake.renderedWallet(wallet.address).config.recoveryMethods).toEqual([
            expect.objectContaining({ locator: second.locator }),
        ]);

        const removed = await drive(wallet.removeSigner(operational.config));
        expect(removed.status).toBe("success");
        expect(env.fake.signersOf(wallet.address)).toEqual([]);
        await expect(drive(wallet.isSignerApproved(operational.locator))).resolves.toBe(false);
    });
});

describe("a delegated quorum on stellar", () => {
    it("is added with the flat recovery method approving, and listed with its locator", async () => {
        const chain = "stellar";
        const recovery = env.key(chain);
        const members = [env.key(chain), env.key(chain), env.key(chain)];
        const wallet = await drive(env.sdk().createWallet({ chain, recovery: recovery.config } as Any));

        const added: Any = await drive(wallet.addSigner(quorumOf(members, 2) as Any));

        expect(added).toEqual(expect.objectContaining({ type: "quorum", status: "success" }));
        expect((await drive(wallet.signers())).map((signer) => signer.locator)).toEqual([added.locator]);
    });
});

// Findings the harness surfaced in the SDK. `it.fails` keeps the suite green while the behavior stands.
describe("BUG? candidates", () => {
    // ApiClient.getWallet runs `"error" in result` on the parsed body, so a 200 with a JSON `null` (a proxy or CDN, not
    // the wallets API itself) escapes as a TypeError; SignerManager.getSignerState already guards the same case.
    it.fails(
        "BUG?: getWallet throws a TypeError, not WalletNotAvailableError, when the response body is JSON null",
        async () => {
            const recovery = env.key("base-sepolia");
            await drive(env.sdk().createWallet({ chain: "base-sepolia", recovery: recovery.config } as Any));
            env.fake.faults.failNext("getWallet", { type: "null-body" });

            const outcome = await settle(env.sdk().getWallet({ chain: "base-sepolia" } as Any));

            expect("error" in outcome && outcome.error).toBeInstanceOf(WalletNotAvailableError);
        }
    );
});
