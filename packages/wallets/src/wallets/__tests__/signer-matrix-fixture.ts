import { AsyncLocalStorage } from "node:async_hooks";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { Base64 } from "ox";
import type { ApiClient } from "../../api";
import type { Chain } from "../../chains/chains";
import type { QuorumMember, RecoverySignerConfigForChain, SignerConfigForChain } from "../../signers/types";
import { isSameSignerLocator } from "../../utils/signer-locator";
import { EVMWallet } from "../evm";
import { Wallet } from "../wallet";
import { createQuorumApiEntryWith, settle, signatureOver, signerNotFound } from "./test-helpers";

// One wallet with every kind of key a client can hold:
//   recovery methods  E (signs alone) and Q (quorum of A, M and a third member)
//   delegated signers D (signs alone) and Q2 (quorum of C, M and a third member)
// A is a member of Q only, C of Q2 only, M of both. X is on the wallet nowhere.
export type MatrixChain = "base-sepolia" | "stellar";
export const OTHER_EVM_CHAIN = "polygon-amoy";

export const KEYS = ["D", "E", "A", "C", "M", "X"] as const;
export type Key = (typeof KEYS)[number];
export type Entry = "E" | "Q" | "D" | "Q2";
// Where an entry's add landed: on the wallet's chain, on another EVM chain only, or awaiting approval here.
export type Installed = "here" | "elsewhere" | "pending";

const EVM_ADDRESSES: Record<Key, string> = {
    D: "0xdddddddddddddddddddddddddddddddddddddddd",
    E: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    A: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    C: "0xcccccccccccccccccccccccccccccccccccccccc",
    M: "0x9999999999999999999999999999999999999999",
    X: "0x5555555555555555555555555555555555555555",
};
const STELLAR_ADDRESSES: Record<Key, string> = {
    D: "GDDDDMATRIXDELEGATED",
    E: "GEEEEMATRIXRECOVERY",
    A: "GAAAAMATRIXMEMBERQ",
    C: "GCCCCMATRIXMEMBERQTWO",
    M: "GMMMMMATRIXMEMBERBOTH",
    X: "GXXXXMATRIXSTRANGER",
};
const WALLET_ADDRESS: Record<MatrixChain, string> = {
    "base-sepolia": "0x1234567890123456789012345678901234567890",
    stellar: "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY",
};
const RECIPIENT: Record<MatrixChain, string> = {
    "base-sepolia": "0x1111111111111111111111111111111111111111",
    stellar: "GDQNY3PBOJOKYZSRMK2S7LHHGWZIUISD4QORETLMXEWXBI7KFZZMKTL3",
};
const NEW_SIGNER: Record<MatrixChain, string> = {
    "base-sepolia": "0x7777777777777777777777777777777777777777",
    stellar: "GNEWSIGNERMATRIX",
};

export type FixtureOptions = { chain?: MatrixChain; installed?: Partial<Record<Entry, Installed>> };
export type Fixture = ReturnType<typeof createFixture>;

export function createFixture({ chain = "base-sepolia", installed = {} }: FixtureOptions = {}) {
    const addresses = chain === "stellar" ? STELLAR_ADDRESSES : EVM_ADDRESSES;
    const locatorOf = (key: Key) => `external-wallet:${addresses[key]}`;
    const memberOf = (key: Key) =>
        ({ type: "external-wallet", address: addresses[key], locator: locatorOf(key) }) as QuorumMember;
    const Q = createQuorumApiEntryWith([memberOf("A"), memberOf("M")]);
    const Q2 = createQuorumApiEntryWith([memberOf("C"), memberOf("M")]);
    const names = new Map<string, string>([
        ...KEYS.map((key) => [locatorOf(key), key] as const),
        [Q.locator, "Q"],
        [Q2.locator, "Q2"],
    ]);
    const nameOf = (locator: string | undefined) => {
        if (locator == null) {
            return undefined;
        }
        const match = [...names.entries()].find(([known]) => isSameSignerLocator(known, locator));
        return match?.[1] ?? locator;
    };

    // Which key's callback signed, in order.
    const signed: string[] = [];
    const keyConfig = (key: Key) =>
        ({
            type: "external-wallet",
            address: addresses[key],
            onSign: async (payload: string) => {
                signed.push(key);
                return signatureOver(payload);
            },
        }) as unknown as SignerConfigForChain<Chain>;

    // An entry as the API lists it, with its installation on the wallet's chain.
    const listed = (entry: Entry, body: object) => {
        const state = installed[entry] ?? "here";
        if (chain === "stellar") {
            return state === "pending"
                ? { ...body, status: "awaiting-approval", transaction: { id: "tx-add", status: "awaiting-approval" } }
                : { ...body, status: "success" };
        }
        if (state === "elsewhere") {
            return { ...body, chains: { [OTHER_EVM_CHAIN]: { id: "tx-add", status: "success" } } };
        }
        return {
            ...body,
            chains: { [chain]: { id: "tx-add", status: state === "pending" ? "awaiting-approval" : "success" } },
        };
    };
    const onThisChain = (entry: Entry) => (installed[entry] ?? "here") !== "elsewhere";

    const storedE = { type: "external-wallet", address: addresses.E, locator: locatorOf("E") };
    const storedD = { type: "external-wallet", address: addresses.D, locator: locatorOf("D") };
    const recoveryMethods = [listed("E", storedE), listed("Q", Q)];
    const delegatedSigners = [listed("D", storedD), listed("Q2", Q2)];
    // signers() lists the delegated signers on this chain with their status here, as the API reads them.
    const statusHere = (entry: Entry) => ((installed[entry] ?? "here") === "pending" ? "awaiting-approval" : "success");
    const walletSigners = (["D", "Q2"] as const)
        .filter(onThisChain)
        .map((entry) => ({ ...(entry === "D" ? storedD : Q2), status: statusHere(entry) }));

    // The API takes a request only from a signer installed on this chain, and a signer change only from such a
    // recovery method: anything else is rejected with the reason, as the real API does.
    const installedHere = (entry: Entry) => (installed[entry] ?? "here") === "here";
    const entryLocator: Record<Entry, string> = { E: locatorOf("E"), Q: Q.locator, D: locatorOf("D"), Q2: Q2.locator };
    const signersHere = (["E", "Q", "D", "Q2"] as const).filter(installedHere).map((entry) => entryLocator[entry]);
    const approversHere = (["E", "Q"] as const).filter(installedHere).map((entry) => entryLocator[entry]);
    const ledger = createLedger(chain, [Q, Q2]);
    // A delay per API method, so a test can hold one operation while another runs; and every creating call, tagged
    // with the operation that made it, so operations running at once each find their own call.
    const delays: Partial<Record<CreatingMethod, number>> = {};
    const calls: CreatingCall[] = [];
    const storedWallet = {
        type: "smart",
        chainType: chain === "stellar" ? "stellar" : "evm",
        address: WALLET_ADDRESS[chain],
        config: { adminSigner: recoveryMethods[0], recoveryMethods, delegatedSigners },
    };
    const api = createFakeApi(ledger, chain, { signersHere, approversHere }, { delays, calls }, storedWallet);

    async function createWallet() {
        const wallet = new Wallet(
            {
                chain,
                address: WALLET_ADDRESS[chain],
                recovery: [storedE, Q] as unknown as RecoverySignerConfigForChain<Chain>[],
                signers: [storedD, Q2].filter((_, index) =>
                    onThisChain((["D", "Q2"] as const)[index])
                ) as unknown as SignerConfigForChain<Chain>[],
            },
            api
        );
        await wallet.waitForInit();
        Object.assign(wallet, { signers: async () => walletSigners });
        return wallet;
    }

    return {
        chain,
        Q,
        Q2,
        api,
        ledger,
        signed,
        keyConfig,
        locatorOf,
        nameOf,
        createWallet,
        delays,
        calls,
        recipient: RECIPIENT[chain],
        newSigner: NEW_SIGNER[chain],
    };
}

// The API method each operation starts with: holding it holds the whole operation.
export type CreatingMethod = "send" | "createSignature" | "registerSigner" | "getTransaction";

// A request the fake API holds: the signers it waits on and the approvals it got.
type LedgerEntry = { id: string; waitsOn: string[]; approvedBy: string[] };

function createLedger(chain: MatrixChain, quorums: Array<ReturnType<typeof createQuorumApiEntryWith>>) {
    const entries = new Map<string, LedgerEntry>();
    let next = 0;
    const quorumOf = (locator: string) => quorums.find((quorum) => quorum.locator === locator);
    const approvedBy = (entry: LedgerEntry, locator: string) =>
        entry.approvedBy.some((approver) => isSameSignerLocator(approver, locator));
    // EVM signs hex messages, Stellar base64 auth-entry hashes.
    const message = (seed: string) =>
        chain === "stellar"
            ? Base64.fromString(seed.padEnd(32, "0").slice(0, 32))
            : `0x${Buffer.from(seed).toString("hex")}`;

    const satisfied = (entry: LedgerEntry, signer: string) => {
        const quorum = quorumOf(signer);
        if (quorum == null) {
            return approvedBy(entry, signer);
        }
        return quorum.members.filter((member) => approvedBy(entry, member.locator)).length >= quorum.threshold;
    };

    const pendingOf = (entry: LedgerEntry) =>
        entry.waitsOn
            .filter((signer) => !satisfied(entry, signer))
            .map((signer) => {
                const quorum = quorumOf(signer);
                if (quorum == null) {
                    return { signer: { type: "external-wallet", locator: signer }, message: message(entry.id) };
                }
                const submitted = quorum.members.filter((member) => approvedBy(entry, member.locator));
                return {
                    signer: { type: "quorum", locator: quorum.locator },
                    quorumApprovals: {
                        threshold: quorum.threshold,
                        remaining: quorum.threshold - submitted.length,
                        pending: quorum.members
                            .filter((member) => !approvedBy(entry, member.locator))
                            .map((member) => ({ member, message: message(`${entry.id}${member.locator}`) })),
                        submitted: submitted.map((member) => ({
                            member,
                            message: message(entry.id),
                            signature: "0xsubmitted",
                            submittedAt: new Date(0).toISOString(),
                        })),
                    },
                };
            });

    return {
        create(waitsOn: string[]) {
            next += 1;
            const id = `req-${next}`;
            entries.set(id, { id, waitsOn, approvedBy: [] });
            return id;
        },
        approve(id: string, approvals: Array<{ signer: string }>) {
            entries.get(id)?.approvedBy.push(...approvals.map((approval) => approval.signer));
        },
        landed(id: string) {
            const entry = entries.get(id);
            return entry != null && entry.waitsOn.every((signer) => satisfied(entry, signer));
        },
        pending(id: string) {
            const entry = entries.get(id);
            return entry == null ? [] : pendingOf(entry);
        },
        last() {
            return [...entries.keys()].at(-1);
        },
    };
}

type Ledger = ReturnType<typeof createLedger>;

type Installation = { signersHere: string[]; approversHere: string[] };
// The operation an API call runs under. One store for the module: Node keeps every AsyncLocalStorage alive and
// tracks each on every promise, so one per fixture slows every test after it.
const caller = new AsyncLocalStorage<number>();
let nextOperation = 0;

// What a creating call sent and the request it made (null when the API rejected it).
type CreatingCall = { operation?: number; method: CreatingMethod; signer?: string; id: string | null };

// A plain fake rather than vi.fn(): Vitest keeps every vi.fn() for the life of the file, so ~15k fixtures of mocks
// held every wallet in memory and made each test slower than the last.
function createFakeApi(
    ledger: Ledger,
    chain: MatrixChain,
    { signersHere, approversHere }: Installation,
    { delays, calls }: { delays: Partial<Record<CreatingMethod, number>>; calls: CreatingCall[] },
    storedWallet: object
) {
    const pause = async (method: CreatingMethod) => {
        const ms = delays[method];
        if (ms != null) {
            await new Promise((resolve) => setTimeout(resolve, ms));
        }
    };
    const isIn = (locators: string[], locator: string | undefined) =>
        locator != null && locators.some((known) => isSameSignerLocator(known, locator));
    const rejected = (locator: string | undefined) => ({
        error: true,
        message: `Signer ${locator} is not installed on ${chain}`,
    });
    const chainType = chain === "stellar" ? "stellar" : "evm";
    const transaction = (id: string) =>
        ledger.landed(id)
            ? {
                  id,
                  status: "success",
                  chainType,
                  onChain: { txId: "0xhash", txHash: "stellar-hash", explorerLink: "https://explorer.example/tx" },
              }
            : { id, status: "awaiting-approval", chainType, approvals: { pending: ledger.pending(id), submitted: [] } };
    const signature = (id: string) =>
        ledger.landed(id)
            ? { id, status: "success", outputSignature: "0xerc1271", approvals: { pending: [], submitted: [] } }
            : { id, status: "awaiting-approval", approvals: { pending: ledger.pending(id), submitted: [] } };
    const create = async (method: CreatingMethod, signer: string | undefined, allowed: string[]) => {
        const call: CreatingCall = { operation: caller.getStore(), method, signer, id: null };
        calls.push(call);
        await pause(method);
        if (!isIn(allowed, signer)) {
            return null;
        }
        call.id = ledger.create([signer as string]);
        return call.id;
    };
    const unused = async () => undefined;

    const api = {
        isServerSide: false,
        environment: APIKeyEnvironmentPrefix.STAGING,
        getWallet: async () => storedWallet,
        send: async (_wallet: string, _token: string, params: { signer: string }) => {
            const id = await create("send", params.signer, signersHere);
            return id == null ? rejected(params.signer) : { id };
        },
        createSignature: async (_wallet: string, body: { params: { signer: string } }) => {
            const id = await create("createSignature", body.params.signer, signersHere);
            return id == null ? rejected(body.params.signer) : { id };
        },
        getTransaction: async (_wallet: string, id: string) => {
            await pause("getTransaction");
            return transaction(id);
        },
        getSignature: async (_wallet: string, id: string) => signature(id),
        approveTransaction: async (_wallet: string, id: string, body: { approvals: Array<{ signer: string }> }) => {
            ledger.approve(id, body.approvals);
            return { id, status: "pending" };
        },
        approveSignature: async (_wallet: string, id: string, body: { approvals: Array<{ signer: string }> }) => {
            ledger.approve(id, body.approvals);
            return signature(id);
        },
        registerSigner: async (_wallet: string, body: { approver?: string }) => {
            const id = await create("registerSigner", body.approver, approversHere);
            if (id == null) {
                return rejected(body.approver);
            }
            const registered = { type: "external-wallet", address: "new", locator: "external-wallet:new" };
            return chain === "stellar"
                ? { ...registered, transaction: { id, status: "awaiting-approval" } }
                : { ...registered, chains: { [chain]: { id, status: "awaiting-approval" } } };
        },
        getSigner: async () => {
            throw signerNotFound();
        },
        createTransaction: unused,
        getBalance: unused,
        removeSigner: unused,
        registerRecoveryMethod: unused,
        removeRecoveryMethod: unused,
    };
    return api as unknown as ApiClient;
}

// What one operation did: the signer or approver it sent, whose keys signed, and how it ended.
export type Outcome = { sent?: string; signed: string[]; ended: string };

// approve() runs on a request made as each kind of signer: a request has one signer, a key or one quorum.
export const OPERATIONS = [
    "send",
    "signMessage",
    "addSigner",
    "approveE",
    "approveD",
    "approveQ",
    "approveQ2",
] as const;
export type Operation = (typeof OPERATIONS)[number];
// The SDK signs messages on EVM only.
export const operationsFor = (chain: MatrixChain) =>
    OPERATIONS.filter((operation) => chain !== "stellar" || operation !== "signMessage");

export function startOperation(fixture: Fixture, wallet: Wallet<Chain>, operation: Operation) {
    const { ledger } = fixture;
    const approveSigner: Partial<Record<Operation, string>> = {
        approveE: fixture.locatorOf("E"),
        approveD: fixture.locatorOf("D"),
        approveQ: fixture.Q.locator,
        approveQ2: fixture.Q2.locator,
    };
    const target = approveSigner[operation];
    const approveTarget = target != null ? ledger.create([target]) : undefined;
    const run: Record<Operation, () => Promise<unknown>> = {
        send: () => wallet.send(fixture.recipient, "usdc", "1"),
        signMessage: () => EVMWallet.from(wallet).signMessage({ message: "matrix" }),
        addSigner: () => wallet.addSigner({ type: "external-wallet", address: fixture.newSigner } as never),
        approveE: () => wallet.approve({ transactionId: approveTarget as string }),
        approveD: () => wallet.approve({ transactionId: approveTarget as string }),
        approveQ: () => wallet.approve({ transactionId: approveTarget as string }),
        approveQ2: () => wallet.approve({ transactionId: approveTarget as string }),
    };
    nextOperation += 1;
    const id = nextOperation;
    return { promise: caller.run(id, run[operation]), approveTarget, id };
}

// Settles a started operation into what it sent, which keys signed while it ran, and how it ended.
export async function finishOperation(
    fixture: Fixture,
    operation: Operation,
    started: ReturnType<typeof startOperation>,
    result: { error?: unknown }
): Promise<Outcome> {
    const method = CREATING_METHOD[operation];
    const call = fixture.calls.find((candidate) => candidate.operation === started.id && candidate.method === method);
    const request = started.approveTarget ?? call?.id;
    return {
        sent: fixture.nameOf(call?.signer),
        signed: [...fixture.signed],
        ended: endedAs(fixture, request, result),
    };
}

const CREATING_METHOD: Partial<Record<Operation, CreatingMethod>> = {
    send: "send",
    signMessage: "createSignature",
    addSigner: "registerSigner",
};

/** The operation's slow point when a test holds it: its creating call, or for approve() the request read. */
export const HOLD_POINT: Record<Operation, CreatingMethod> = {
    send: "send",
    signMessage: "createSignature",
    addSigner: "registerSigner",
    approveE: "getTransaction",
    approveD: "getTransaction",
    approveQ: "getTransaction",
    approveQ2: "getTransaction",
};

function endedAs(fixture: Fixture, request: string | null | undefined, result: { error?: unknown }) {
    if (result.error != null) {
        return (result.error as Error).constructor.name;
    }
    if (request != null && fixture.ledger.landed(request)) {
        return "landed";
    }
    return "waiting";
}

export async function runOperation(fixture: Fixture, wallet: Wallet<Chain>, operation: Operation) {
    fixture.signed.length = 0;
    const started = startOperation(fixture, wallet, operation);
    const result = await settle(started.promise);
    return finishOperation(fixture, operation, started, result);
}
