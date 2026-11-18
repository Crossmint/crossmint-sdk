import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    createFixture,
    operationsFor,
    runOperation,
    type Entry,
    type Fixture,
    type Installed,
    type Key,
    type MatrixChain,
    type Operation,
} from "./__tests__/signer-matrix-fixture";

// Which key signs, and as what, after any sequence of useSigner() / useRecoveryMethod() calls, on EVM and Stellar,
// with every wallet entry installed on the wallet's chain, on another EVM chain only, or still awaiting approval.
//
// Every sequence of up to two selection calls over every kind of key is reduced to a state by a small model: the last
// valid useSigner() sets the active key, the last valid useRecoveryMethod() sets the selection, and an invalid call
// throws and changes nothing. Each state then has a reviewed outcome per operation in BASELINE, adjusted per variant.

type Active = Key | "none";
type Selected = "none" | "E" | "A" | "M";
type State = `${Active}/${Selected}`;
type Outcomes = Record<State, Record<Operation, string>>;

// "<signer or approver sent> [<keys whose callback signed>] <landed | waiting | error>"; "-" when nothing was sent.
// Reviewed against EDD 007 section 7, EDD 008 I10 and the useSigner / useRecoveryMethod docs.
const BASELINE: Outcomes = {
    "none/none": {
        send: "- [] Error",
        signMessage: "- [] Error",
        addSigner: "- [] RecoveryMethodRequiredError",
        approveE: "- [] Error",
        approveD: "- [] Error",
        approveQ: "- [] Error",
        approveQ2: "- [] Error",
    },
    "none/E": {
        send: "- [] Error",
        signMessage: "- [] Error",
        addSigner: "E [E] landed",
        approveE: "- [E] landed",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [] InvalidSignerError",
        approveQ2: "- [] InvalidSignerError",
    },
    "none/A": {
        send: "- [] Error",
        signMessage: "- [] Error",
        addSigner: "Q [] waiting",
        approveE: "- [] InvalidSignerError",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [A] waiting",
        approveQ2: "- [] InvalidSignerError",
    },
    "none/M": {
        send: "- [] Error",
        signMessage: "- [] Error",
        addSigner: "Q [] waiting",
        approveE: "- [] InvalidSignerError",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [M] waiting",
        approveQ2: "- [M] waiting",
    },
    "D/none": {
        send: "D [D] landed",
        signMessage: "D [D] landed",
        addSigner: "- [] RecoveryMethodRequiredError",
        approveE: "- [] InvalidSignerError",
        approveD: "- [D] landed",
        approveQ: "- [] InvalidSignerError",
        approveQ2: "- [] InvalidSignerError",
    },
    "D/E": {
        send: "D [D] landed",
        signMessage: "D [D] landed",
        addSigner: "E [E] landed",
        approveE: "- [E] landed",
        approveD: "- [D] landed",
        approveQ: "- [] InvalidSignerError",
        approveQ2: "- [] InvalidSignerError",
    },
    "D/A": {
        send: "D [D] landed",
        signMessage: "D [D] landed",
        addSigner: "Q [] waiting",
        approveE: "- [] InvalidSignerError",
        approveD: "- [D] landed",
        approveQ: "- [A] waiting",
        approveQ2: "- [] InvalidSignerError",
    },
    "D/M": {
        send: "D [D] landed",
        signMessage: "D [D] landed",
        addSigner: "Q [] waiting",
        approveE: "- [] InvalidSignerError",
        approveD: "- [D] landed",
        approveQ: "- [M] waiting",
        approveQ2: "- [M] waiting",
    },
    "E/none": {
        send: "E [E] landed",
        signMessage: "E [E] landed",
        addSigner: "E [E] landed",
        approveE: "- [E] landed",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [] InvalidSignerError",
        approveQ2: "- [] InvalidSignerError",
    },
    "E/E": {
        send: "E [E] landed",
        signMessage: "E [E] landed",
        addSigner: "E [E] landed",
        approveE: "- [E] landed",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [] InvalidSignerError",
        approveQ2: "- [] InvalidSignerError",
    },
    "E/A": {
        send: "E [E] landed",
        signMessage: "E [E] landed",
        addSigner: "Q [] waiting",
        approveE: "- [E] landed",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [A] waiting",
        approveQ2: "- [] InvalidSignerError",
    },
    "E/M": {
        send: "E [E] landed",
        signMessage: "E [E] landed",
        addSigner: "Q [] waiting",
        approveE: "- [E] landed",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [M] waiting",
        approveQ2: "- [M] waiting",
    },
    "A/none": {
        send: "Q [] waiting",
        signMessage: "Q [] waiting",
        addSigner: "- [] RecoveryMethodRequiredError",
        approveE: "- [] InvalidSignerError",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [A] waiting",
        approveQ2: "- [] InvalidSignerError",
    },
    "A/E": {
        send: "Q [] waiting",
        signMessage: "Q [] waiting",
        addSigner: "E [E] landed",
        approveE: "- [E] landed",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [A] waiting",
        approveQ2: "- [] InvalidSignerError",
    },
    "A/A": {
        send: "Q [] waiting",
        signMessage: "Q [] waiting",
        addSigner: "Q [] waiting",
        approveE: "- [] InvalidSignerError",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [A] waiting",
        approveQ2: "- [] InvalidSignerError",
    },
    "A/M": {
        send: "Q [] waiting",
        signMessage: "Q [] waiting",
        addSigner: "Q [] waiting",
        approveE: "- [] InvalidSignerError",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [A,M] landed",
        approveQ2: "- [M] waiting",
    },
    "C/none": {
        send: "Q2 [] waiting",
        signMessage: "Q2 [] waiting",
        addSigner: "- [] RecoveryMethodRequiredError",
        approveE: "- [] InvalidSignerError",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [] InvalidSignerError",
        approveQ2: "- [C] waiting",
    },
    "C/E": {
        send: "Q2 [] waiting",
        signMessage: "Q2 [] waiting",
        addSigner: "E [E] landed",
        approveE: "- [E] landed",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [] InvalidSignerError",
        approveQ2: "- [C] waiting",
    },
    "C/A": {
        send: "Q2 [] waiting",
        signMessage: "Q2 [] waiting",
        addSigner: "Q [] waiting",
        approveE: "- [] InvalidSignerError",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [A] waiting",
        approveQ2: "- [C] waiting",
    },
    "C/M": {
        send: "Q2 [] waiting",
        signMessage: "Q2 [] waiting",
        addSigner: "Q [] waiting",
        approveE: "- [] InvalidSignerError",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [M] waiting",
        approveQ2: "- [C,M] landed",
    },
    "M/none": {
        send: "- [] QuorumSelectionAmbiguousError",
        signMessage: "- [] QuorumSelectionAmbiguousError",
        addSigner: "- [] RecoveryMethodRequiredError",
        approveE: "- [] InvalidSignerError",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [M] waiting",
        approveQ2: "- [M] waiting",
    },
    "M/E": {
        send: "- [] QuorumSelectionAmbiguousError",
        signMessage: "- [] QuorumSelectionAmbiguousError",
        addSigner: "E [E] landed",
        approveE: "- [E] landed",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [M] waiting",
        approveQ2: "- [M] waiting",
    },
    "M/A": {
        send: "- [] QuorumSelectionAmbiguousError",
        signMessage: "- [] QuorumSelectionAmbiguousError",
        addSigner: "Q [] waiting",
        approveE: "- [] InvalidSignerError",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [A,M] landed",
        approveQ2: "- [M] waiting",
    },
    "M/M": {
        send: "- [] QuorumSelectionAmbiguousError",
        signMessage: "- [] QuorumSelectionAmbiguousError",
        addSigner: "Q [] waiting",
        approveE: "- [] InvalidSignerError",
        approveD: "- [] InvalidSignerError",
        approveQ: "- [M] waiting",
        approveQ2: "- [M] waiting",
    },
};

// What changes when one wallet entry is not installed on the wallet's chain. A key that selects only an entry missing
// here is rejected by useSigner(); a request made as a missing entry is rejected by the API, which names the reason.
type Variant = {
    installed: Partial<Record<Entry, Installed>>;
    overrides: Partial<Record<State, Partial<Record<Operation, string>>>>;
};
const EVM_VARIANTS: Variant[] = [
    {
        installed: { E: "elsewhere" },
        overrides: {
            "none/E": { addSigner: "E [] InvalidSignerError" },
            "D/E": { addSigner: "E [] InvalidSignerError" },
            "E/none": {
                send: "E [] TransactionNotCreatedError",
                signMessage: "E [] SignatureNotCreatedError",
                addSigner: "E [] InvalidSignerError",
            },
            "E/E": {
                send: "E [] TransactionNotCreatedError",
                signMessage: "E [] SignatureNotCreatedError",
                addSigner: "E [] InvalidSignerError",
            },
            "E/A": { send: "E [] TransactionNotCreatedError", signMessage: "E [] SignatureNotCreatedError" },
            "E/M": { send: "E [] TransactionNotCreatedError", signMessage: "E [] SignatureNotCreatedError" },
            "A/E": { addSigner: "E [] InvalidSignerError" },
            "C/E": { addSigner: "E [] InvalidSignerError" },
            "M/E": { addSigner: "E [] InvalidSignerError" },
        },
    },
    {
        installed: { E: "pending" },
        overrides: {
            "none/E": { addSigner: "E [] InvalidSignerError" },
            "D/E": { addSigner: "E [] InvalidSignerError" },
            "E/none": {
                send: "E [] TransactionNotCreatedError",
                signMessage: "E [] SignatureNotCreatedError",
                addSigner: "E [] InvalidSignerError",
            },
            "E/E": {
                send: "E [] TransactionNotCreatedError",
                signMessage: "E [] SignatureNotCreatedError",
                addSigner: "E [] InvalidSignerError",
            },
            "E/A": { send: "E [] TransactionNotCreatedError", signMessage: "E [] SignatureNotCreatedError" },
            "E/M": { send: "E [] TransactionNotCreatedError", signMessage: "E [] SignatureNotCreatedError" },
            "A/E": { addSigner: "E [] InvalidSignerError" },
            "C/E": { addSigner: "E [] InvalidSignerError" },
            "M/E": { addSigner: "E [] InvalidSignerError" },
        },
    },
    {
        installed: { Q: "elsewhere" },
        overrides: {
            "none/A": { addSigner: "Q [] InvalidSignerError" },
            "none/M": { addSigner: "Q [] InvalidSignerError" },
            "D/A": { addSigner: "Q [] InvalidSignerError" },
            "D/M": { addSigner: "Q [] InvalidSignerError" },
            "E/A": { addSigner: "Q [] InvalidSignerError" },
            "E/M": { addSigner: "Q [] InvalidSignerError" },
            "A/none": { send: "A [] TransactionNotCreatedError", signMessage: "A [] SignatureNotCreatedError" },
            "A/E": { send: "A [] TransactionNotCreatedError", signMessage: "A [] SignatureNotCreatedError" },
            "A/A": {
                send: "A [] TransactionNotCreatedError",
                signMessage: "A [] SignatureNotCreatedError",
                addSigner: "Q [] InvalidSignerError",
            },
            "A/M": {
                send: "A [] TransactionNotCreatedError",
                signMessage: "A [] SignatureNotCreatedError",
                addSigner: "Q [] InvalidSignerError",
            },
            "C/A": { addSigner: "Q [] InvalidSignerError" },
            "C/M": { addSigner: "Q [] InvalidSignerError" },
            "M/none": { send: "Q2 [] waiting", signMessage: "Q2 [] waiting" },
            "M/E": { send: "Q2 [] waiting", signMessage: "Q2 [] waiting" },
            "M/A": { send: "Q2 [] waiting", signMessage: "Q2 [] waiting", addSigner: "Q [] InvalidSignerError" },
            "M/M": { send: "Q2 [] waiting", signMessage: "Q2 [] waiting", addSigner: "Q [] InvalidSignerError" },
        },
    },
    {
        installed: { Q: "pending" },
        overrides: {
            "none/A": { addSigner: "Q [] InvalidSignerError" },
            "none/M": { addSigner: "Q [] InvalidSignerError" },
            "D/A": { addSigner: "Q [] InvalidSignerError" },
            "D/M": { addSigner: "Q [] InvalidSignerError" },
            "E/A": { addSigner: "Q [] InvalidSignerError" },
            "E/M": { addSigner: "Q [] InvalidSignerError" },
            "A/none": { send: "A [] TransactionNotCreatedError", signMessage: "A [] SignatureNotCreatedError" },
            "A/E": { send: "A [] TransactionNotCreatedError", signMessage: "A [] SignatureNotCreatedError" },
            "A/A": {
                send: "A [] TransactionNotCreatedError",
                signMessage: "A [] SignatureNotCreatedError",
                addSigner: "Q [] InvalidSignerError",
            },
            "A/M": {
                send: "A [] TransactionNotCreatedError",
                signMessage: "A [] SignatureNotCreatedError",
                addSigner: "Q [] InvalidSignerError",
            },
            "C/A": { addSigner: "Q [] InvalidSignerError" },
            "C/M": { addSigner: "Q [] InvalidSignerError" },
            "M/none": { send: "Q2 [] waiting", signMessage: "Q2 [] waiting" },
            "M/E": { send: "Q2 [] waiting", signMessage: "Q2 [] waiting" },
            "M/A": { send: "Q2 [] waiting", signMessage: "Q2 [] waiting", addSigner: "Q [] InvalidSignerError" },
            "M/M": { send: "Q2 [] waiting", signMessage: "Q2 [] waiting", addSigner: "Q [] InvalidSignerError" },
        },
    },
    { installed: { D: "elsewhere" }, overrides: {} },
    {
        installed: { D: "pending" },
        overrides: {
            "D/none": { send: "D [] TransactionNotCreatedError", signMessage: "D [] SignatureNotCreatedError" },
            "D/E": { send: "D [] TransactionNotCreatedError", signMessage: "D [] SignatureNotCreatedError" },
            "D/A": { send: "D [] TransactionNotCreatedError", signMessage: "D [] SignatureNotCreatedError" },
            "D/M": { send: "D [] TransactionNotCreatedError", signMessage: "D [] SignatureNotCreatedError" },
        },
    },
    {
        installed: { Q2: "elsewhere" },
        overrides: {
            "M/none": { send: "Q [] waiting", signMessage: "Q [] waiting" },
            "M/E": { send: "Q [] waiting", signMessage: "Q [] waiting" },
            "M/A": { send: "Q [] waiting", signMessage: "Q [] waiting" },
            "M/M": { send: "Q [] waiting", signMessage: "Q [] waiting" },
        },
    },
    {
        installed: { Q2: "pending" },
        overrides: {
            "C/none": { send: "C [] TransactionNotCreatedError", signMessage: "C [] SignatureNotCreatedError" },
            "C/E": { send: "C [] TransactionNotCreatedError", signMessage: "C [] SignatureNotCreatedError" },
            "C/A": { send: "C [] TransactionNotCreatedError", signMessage: "C [] SignatureNotCreatedError" },
            "C/M": { send: "C [] TransactionNotCreatedError", signMessage: "C [] SignatureNotCreatedError" },
            "M/none": { send: "Q [] waiting", signMessage: "Q [] waiting" },
            "M/E": { send: "Q [] waiting", signMessage: "Q [] waiting" },
            "M/A": { send: "Q [] waiting", signMessage: "Q [] waiting" },
            "M/M": { send: "Q [] waiting", signMessage: "Q [] waiting" },
        },
    },
];

type Scenario = { name: string; chain: MatrixChain; variant: Variant };
const describeInstalled = (installed: Variant["installed"]) =>
    Object.entries(installed)
        .map(([entry, state]) => `${entry} ${state === "elsewhere" ? "on another chain only" : "awaiting approval"}`)
        .join(", ");
const SCENARIOS: Scenario[] = [
    { name: "base-sepolia, every entry installed", chain: "base-sepolia", variant: { installed: {}, overrides: {} } },
    { name: "stellar, every entry installed", chain: "stellar", variant: { installed: {}, overrides: {} } },
    ...EVM_VARIANTS.map((variant) => ({
        name: `base-sepolia, ${describeInstalled(variant.installed)}`,
        chain: "base-sepolia" as const,
        variant,
    })),
    // Stellar has no other chain: an entry is installed or awaiting approval, as on EVM.
    ...EVM_VARIANTS.filter((variant) => !Object.values(variant.installed).includes("elsewhere")).map((variant) => ({
        name: `stellar, ${describeInstalled(variant.installed)}`,
        chain: "stellar" as const,
        variant,
    })),
];

type Call = { kind: "useSigner" | "useRecoveryMethod"; key: Key };
const KEYS: Key[] = ["D", "E", "A", "C", "M", "X"];
const CALLS: Call[] = (["useSigner", "useRecoveryMethod"] as const).flatMap((kind) =>
    KEYS.map((key) => ({ kind, key }))
);
const SEQUENCES: Call[][] = [
    [],
    ...CALLS.map((call) => [call]),
    ...CALLS.flatMap((first) => CALLS.map((second) => [first, second])),
];

// useSigner() takes any key installed for this chain, alone or as a member; useRecoveryMethod() a recovery method or
// a member of a recovery quorum. D is unknown here when installed elsewhere, C when its only quorum Q2 is.
function isValid({ kind, key }: Call, installed: Variant["installed"]) {
    if (kind === "useRecoveryMethod") {
        return key === "E" || key === "A" || key === "M";
    }
    if (key === "X") {
        return false;
    }
    if (key === "D") {
        return installed.D !== "elsewhere";
    }
    if (key === "C") {
        return installed.Q2 !== "elsewhere";
    }
    return true;
}

function modelState(sequence: Call[], installed: Variant["installed"]): State {
    let active: Active = "none";
    let selected: Selected = "none";
    for (const call of sequence.filter((candidate) => isValid(candidate, installed))) {
        if (call.kind === "useSigner") {
            active = call.key;
        } else {
            selected = call.key as Selected;
        }
    }
    return `${active}/${selected}`;
}

const expectedOutcome = (variant: Variant, state: State, operation: Operation) =>
    variant.overrides[state]?.[operation] ?? BASELINE[state][operation];

const describeCall = ({ kind, key }: Call) => `${kind}(${key})`;
const describeSequence = (sequence: Call[]) =>
    sequence.length === 0 ? "no selection" : sequence.map(describeCall).join(" then ");
const format = ({ sent, signed, ended }: { sent?: string; signed: string[]; ended: string }) =>
    `${sent ?? "-"} [${signed.join(",")}] ${ended}`;

async function walletAfter(fixture: Fixture, sequence: Call[]) {
    const wallet = await fixture.createWallet();
    const rejected: string[] = [];
    for (const call of sequence) {
        const config = fixture.keyConfig(call.key);
        const selecting = call.kind === "useSigner" ? wallet.useSigner(config) : wallet.useRecoveryMethod(config);
        await selecting.catch(() => rejected.push(describeCall(call)));
    }
    return { wallet, rejected };
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe.each(SCENARIOS.map((scenario) => [scenario.name, scenario] as const))(
    "signer selection on %s",
    (_name, { chain, variant }) => {
        describe.each(operationsFor(chain))("then %s", (operation) => {
            it.each(SEQUENCES.map((sequence) => [describeSequence(sequence), sequence] as const))(
                "after %s",
                async (_name, sequence) => {
                    const fixture = createFixture({ chain, installed: variant.installed });
                    const { wallet, rejected } = await walletAfter(fixture, sequence);

                    const outcome = await runOperation(fixture, wallet, operation);

                    expect(rejected).toEqual(
                        sequence.filter((call) => !isValid(call, variant.installed)).map(describeCall)
                    );
                    expect(format(outcome)).toBe(
                        expectedOutcome(variant, modelState(sequence, variant.installed), operation)
                    );
                }
            );
        });
    }
);
