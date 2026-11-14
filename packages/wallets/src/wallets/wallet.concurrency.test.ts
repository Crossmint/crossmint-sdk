import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Chain } from "../chains/chains";
import {
    createFixture,
    finishOperation,
    HOLD_POINT,
    operationsFor,
    startOperation,
    type Fixture,
    type Key,
    type MatrixChain,
    type Operation,
    type Outcome,
} from "./__tests__/signer-matrix-fixture";
import type { Wallet } from "./wallet";

// Calls that overlap on one wallet. Nothing here is a hand-written expectation: an operation that runs next to another
// must do exactly what it does alone from the same starting state, and a selection call that lands while an operation
// runs must leave the wallet exactly as if it had been made with nothing running.
//
// Interleavings are forced with a delay on the API call an operation starts with (fake timers, so no real waiting):
// "first finishes first" holds the second operation, "second finishes first" holds the first.

type Selection = { kind: "useSigner" | "useRecoveryMethod"; key: Key };
type StartState = { active: Key | "none"; selected: "none" | "E" | "A" | "M" };

const HOLD_MS = 5_000;
const ACTIVE: StartState["active"][] = ["none", "D", "E", "A", "C", "M"];
const SELECTED: StartState["selected"][] = ["none", "E", "A", "M"];
const START_STATES: StartState[] = ACTIVE.flatMap((active) => SELECTED.map((selected) => ({ active, selected })));
const SELECTIONS: Selection[] = (["useSigner", "useRecoveryMethod"] as const).flatMap((kind) =>
    (["D", "E", "A", "C", "M", "X"] as const).map((key) => ({ kind, key }))
);
const CHAINS: MatrixChain[] = ["base-sepolia", "stellar"];

const describeSelection = ({ kind, key }: Selection) => `${kind}(${key})`;
const describeState = ({ active, selected }: StartState) => `useSigner(${active}), useRecoveryMethod(${selected})`;

async function select(wallet: Wallet<Chain>, fixture: Fixture, { kind, key }: Selection) {
    const config = fixture.keyConfig(key);
    const selecting = kind === "useSigner" ? wallet.useSigner(config) : wallet.useRecoveryMethod(config);
    await selecting.catch(() => undefined);
}

async function walletIn(fixture: Fixture, { active, selected }: StartState) {
    const wallet = await fixture.createWallet();
    if (active !== "none") {
        await select(wallet, fixture, { kind: "useSigner", key: active });
    }
    if (selected !== "none") {
        await select(wallet, fixture, { kind: "useRecoveryMethod", key: selected });
    }
    return wallet;
}

const outcomeOf = (promise: Promise<unknown>) =>
    promise.then(
        () => ({}),
        (error: unknown) => ({ error })
    );

// One operation alone, from `state`, on a fresh wallet.
async function alone(chain: MatrixChain, state: StartState, operation: Operation, after: Selection[] = []) {
    const fixture = createFixture({ chain });
    const wallet = await walletIn(fixture, state);
    for (const selection of after) {
        await select(wallet, fixture, selection);
    }
    fixture.signed.length = 0;
    const started = startOperation(fixture, wallet, operation);
    const result = outcomeOf(started.promise);
    await vi.runAllTimersAsync();
    return finishOperation(fixture, operation, started, await result);
}

const withoutSigned = ({ sent, ended }: Outcome) => ({ sent, ended });
const sorted = (keys: string[]) => [...keys].sort();

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe.each(CHAINS)("two operations at once on %s", (chain) => {
    const operations = operationsFor(chain);
    const pairs = operations.flatMap((first) =>
        operations.flatMap((second) =>
            (["first finishes first", "second finishes first"] as const).map((order) => ({ first, second, order }))
        )
    );

    describe.each(START_STATES.map((state) => [describeState(state), state] as const))("from %s", (_name, state) => {
        it.each(pairs)("$first with $second, $order", async ({ first, second, order }) => {
            const [firstAlone, secondAlone] = [await alone(chain, state, first), await alone(chain, state, second)];
            const fixture = createFixture({ chain });
            const wallet = await walletIn(fixture, state);
            fixture.signed.length = 0;

            const held = order === "first finishes first" ? second : first;
            fixture.delays[HOLD_POINT[held]] = HOLD_MS;
            const startedFirst = startOperation(fixture, wallet, first);
            const startedSecond = startOperation(fixture, wallet, second);
            const results = Promise.all([outcomeOf(startedFirst.promise), outcomeOf(startedSecond.promise)]);
            await vi.runAllTimersAsync();
            const [firstResult, secondResult] = await results;
            const firstTogether = await finishOperation(fixture, first, startedFirst, firstResult);
            const secondTogether = await finishOperation(fixture, second, startedSecond, secondResult);

            expect({ first: withoutSigned(firstTogether), second: withoutSigned(secondTogether) }).toEqual({
                first: withoutSigned(firstAlone),
                second: withoutSigned(secondAlone),
            });
            expect(sorted(fixture.signed)).toEqual(sorted([...firstAlone.signed, ...secondAlone.signed]));
        });
    });
});

describe.each(CHAINS)("a selection call while an operation runs on %s", (chain) => {
    const cases = operationsFor(chain).flatMap((operation) =>
        SELECTIONS.map((selection) => ({ operation, selection, name: describeSelection(selection) }))
    );

    describe.each(START_STATES.map((state) => [describeState(state), state] as const))("from %s", (_name, state) => {
        it.each(cases.map((testCase) => [testCase.operation, testCase.name, testCase] as const))(
            "%s keeps its key when %s lands, and the selection holds afterwards",
            async (_operation, _selection, { operation, selection }) => {
                const runAlone = await alone(chain, state, operation);
                const fixture = createFixture({ chain });
                const wallet = await walletIn(fixture, state);
                fixture.signed.length = 0;

                fixture.delays[HOLD_POINT[operation]] = HOLD_MS;
                const started = startOperation(fixture, wallet, operation);
                const result = outcomeOf(started.promise);
                const selecting = select(wallet, fixture, selection);
                await vi.runAllTimersAsync();
                await selecting;
                const during = await finishOperation(fixture, operation, started, await result);

                expect(during).toEqual(runAlone);

                // Afterwards the wallet acts as if the selection had been made with nothing running.
                delete fixture.delays[HOLD_POINT[operation]];
                for (const probe of ["send", "addSigner"] as const) {
                    const expected = await alone(chain, state, probe, [selection]);
                    fixture.signed.length = 0;
                    const startedProbe = startOperation(fixture, wallet, probe);
                    const probeResult = outcomeOf(startedProbe.promise);
                    await vi.runAllTimersAsync();
                    expect(await finishOperation(fixture, probe, startedProbe, await probeResult)).toEqual(expected);
                }
            }
        );
    });
});
