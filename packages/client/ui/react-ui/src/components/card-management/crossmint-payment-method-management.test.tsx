import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, createRef } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type {
    CrossmintPaymentMethodManagementProps,
    CrossmintPaymentMethodManagementRef,
} from "@crossmint/client-sdk-base";
import { CrossmintPaymentMethodManagement } from "./CrossmintPaymentMethodManagement";

const mocks = vi.hoisted(() => ({
    crossmint: { apiKey: "ck_test" },
    send: vi.fn(),
    off: vi.fn(),
    sendAction: vi.fn(),
    handshakeWithChild: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnValue("subscription"),
    getUrl: vi.fn().mockReturnValue("https://staging.crossmint.com/sdk/unstable/payment-method-management"),
    getSuggestionsUrl: vi.fn(),
    createClient: vi.fn(),
}));
vi.mock("@crossmint/client-sdk-base", async (original) => ({
    ...(await original<typeof import("@crossmint/client-sdk-base")>()),
    createPaymentMethodManagementService: () => ({
        iframe: {
            getUrl: mocks.getUrl,
            getSuggestionsUrl: mocks.getSuggestionsUrl,
            createClient: mocks.createClient,
        },
    }),
}));
vi.mock("@crossmint/client-sdk-react-base", () => ({ useCrossmint: () => ({ crossmint: mocks.crossmint }) }));
vi.mock("@/utils/createCrossmintApiClient", () => ({ createCrossmintApiClient: () => ({}) }));

const CARD = {
    type: "card",
    paymentMethodId: "pm_1",
    card: {
        source: { type: "basis-theory-token", id: "bt_1" },
        brand: "visa",
        last4: "4242",
        expiration: { month: "08", year: "2030" },
    },
} as const;
const SAVED = { status: "saved", paymentMethod: CARD } as const;
const SKELETON = "crossmint-payment-method-management.skeleton";
const SAVED_SKELETON = "crossmint-payment-method-management.saved-methods-skeleton";

function mount({ load = true, onSelected }: { load?: boolean; onSelected?: (method: unknown) => void } = {}) {
    const ref = createRef<CrossmintPaymentMethodManagementRef>();
    const view = render(
        <CrossmintPaymentMethodManagement ref={ref} jwt="buyer-jwt" onPaymentMethodSelected={onSelected} />
    );
    if (load) {
        fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));
    }
    if (ref.current == null) {
        throw new Error("The component ref did not mount");
    }
    return { ...view, ref, component: ref.current };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

beforeEach(() => {
    window.sessionStorage.clear();
    vi.resetAllMocks();
    mocks.handshakeWithChild.mockResolvedValue(undefined);
    mocks.on.mockReturnValue("subscription");
    mocks.createClient.mockImplementation(() => ({ ...mocks }));
    mocks.getUrl.mockImplementation(
        (props) => `https://staging.crossmint.com/sdk/unstable/payment-method-management?jwt=${props.jwt}&hidden=true`
    );
    mocks.getSuggestionsUrl.mockImplementation(
        (_props, channel) =>
            `https://staging.crossmint.com/sdk/unstable/payment-method-management/suggestions?channel=${channel}`
    );
});

describe("CrossmintPaymentMethodManagement ref", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    test("submit asks the iframe and resolves with its result for the same request", async () => {
        mocks.sendAction.mockImplementationOnce(async ({ data }: { data: { requestId: string } }) => ({
            requestId: data.requestId,
            result: SAVED,
        }));
        const { component } = mount();

        await expect(component.submit()).resolves.toEqual(SAVED);

        const call = mocks.sendAction.mock.calls[0][0];
        expect(call.event).toBe("payment-method:submit");
        expect(call.responseEvent).toBe("payment-method:result");
        expect(call.options.condition({ requestId: call.data.requestId })).toBe(true);
        expect(call.options.condition({ requestId: "another" })).toBe(false);
        expect(call.options.timeoutMs).toBe(60_000);
    });

    test("shares a submit in flight and starts a new one after it settles", async () => {
        let complete!: (value: { requestId: string; result: typeof SAVED }) => void;
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        mocks.sendAction.mockResolvedValueOnce({ requestId: "r2", result: SAVED });
        const { component } = mount();

        const first = component.submit();
        const second = component.submit();
        expect(first).toBe(second);
        await act(async () => {
            complete({ requestId: "r1", result: SAVED });
            await first;
        });
        const third = component.submit();
        expect(third).not.toBe(first);
        await expect(third).resolves.toEqual(SAVED);
        expect(mocks.sendAction).toHaveBeenCalledTimes(2);
    });

    test("a failed handshake resolves unavailable and the next submit retries it", async () => {
        mocks.handshakeWithChild.mockRejectedValueOnce(new Error("Handshake timed out"));
        const { component } = mount();

        await expect(component.submit()).resolves.toMatchObject({ status: "unavailable", code: "not_ready" });
        expect(mocks.sendAction).not.toHaveBeenCalled();

        mocks.sendAction.mockResolvedValueOnce({ result: SAVED });
        await expect(component.submit()).resolves.toEqual(SAVED);
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(2);
    });

    test("resolves unavailable when the iframe does not answer in time", async () => {
        mocks.sendAction.mockRejectedValueOnce("Timed out waiting for payment-method:result event");
        const { component } = mount();

        await expect(component.submit()).resolves.toMatchObject({
            status: "unavailable",
            code: "timeout",
            message:
                "The payment method component did not answer in time. The payment method may still have been saved: onPaymentMethodSelected fires if it was, and submitting again returns it.",
        });
    });

    test("under StrictMode the iframe document gets one client and one handshake", async () => {
        const ref = createRef<CrossmintPaymentMethodManagementRef>();
        render(
            <StrictMode>
                <CrossmintPaymentMethodManagement ref={ref} jwt="buyer-jwt" />
            </StrictMode>
        );

        expect(mocks.createClient).toHaveBeenCalledTimes(1);
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(1);

        mocks.sendAction.mockResolvedValueOnce({ result: SAVED });
        await expect(ref.current?.submit()).resolves.toEqual(SAVED);
    });

    test("the first load keeps a pending submit; a second load creates a new client and supersedes", async () => {
        const selected = vi.fn();
        const firstReply = deferred<{ result: typeof SAVED }>();
        const secondReply = deferred<{ result: typeof SAVED }>();
        mocks.sendAction.mockReturnValueOnce(firstReply.promise).mockReturnValueOnce(secondReply.promise);
        const { component } = mount({ load: false, onSelected: selected });
        const retiredListener = mocks.on.mock.calls.find(([event]) => event === "payment-method:selected")?.[1];
        const pending = component.submit();
        await act(async () => {
            await Promise.resolve();
        });

        fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));
        await act(async () => {
            firstReply.resolve({ result: SAVED });
            await firstReply.promise;
        });
        await expect(pending).resolves.toEqual(SAVED);
        expect(mocks.createClient).toHaveBeenCalledTimes(1);

        const next = component.submit();
        await act(async () => {
            await Promise.resolve();
        });
        fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));

        await expect(next).resolves.toMatchObject({ status: "superseded" });
        await act(async () => {
            secondReply.resolve({ result: SAVED });
            await secondReply.promise;
        });
        expect(mocks.createClient).toHaveBeenCalledTimes(2);
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(2);

        retiredListener?.(CARD);
        expect(selected).not.toHaveBeenCalled();
        mocks.on.mock.calls
            .filter(([event]) => event === "payment-method:selected")
            .at(-1)?.[1](CARD);
        expect(selected).toHaveBeenCalledWith(CARD);

        mocks.sendAction.mockResolvedValueOnce({ result: SAVED });
        await expect(component.submit()).resolves.toEqual(SAVED);
    });

    test("keeps the last reported height when the iframe URL changes until the new iframe reports", () => {
        const view = render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" />);
        const heightListener = mocks.on.mock.calls.find(([event]) => event === "ui:height.changed")?.[1];
        act(() => heightListener?.({ height: 400 }));
        expect(screen.getByRole("crossmint-payment-method-management.iframe").style.height).toBe("400px");

        mocks.on.mockClear();
        view.rerender(<CrossmintPaymentMethodManagement jwt="new-buyer" />);

        const newIframe = screen.getByRole("crossmint-payment-method-management.iframe");
        expect(newIframe.style.height).toBe("400px");
        const newListener = mocks.on.mock.calls.find(([event]) => event === "ui:height.changed")?.[1];
        act(() => newListener?.({ height: 500 }));
        expect(newIframe.style.height).toBe("500px");
    });

    test("shows the card form's skeleton until the form is ready and its height holds", () => {
        vi.useFakeTimers();
        try {
            const listener = (event: string) => mocks.on.mock.calls.filter(([name]) => name === event).at(-1)?.[1];
            render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" />);
            const iframe = screen.getByRole("crossmint-payment-method-management.iframe");
            expect(screen.getByTestId(SKELETON)).toBeTruthy();
            expect(iframe.style.opacity).toBe("0");
            expect(iframe.inert).toBe(true);

            act(() => listener("ui:height.changed")?.({ height: 96 }));
            act(() => listener("payment-method:ready")?.({}));
            act(() => vi.advanceTimersByTime(100));
            act(() => listener("ui:height.changed")?.({ height: 198 }));
            act(() => vi.advanceTimersByTime(149));
            expect(screen.getByTestId(SKELETON)).toBeTruthy();

            act(() => vi.advanceTimersByTime(1));
            expect(screen.queryByTestId(SKELETON)).toBeNull();
            expect(iframe.style.opacity).toBe("1");
            expect(iframe.style.position).toBe("");
            expect(iframe.inert).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    test("shows the skeleton again when the iframe reloads in place, until the new form is ready", () => {
        vi.useFakeTimers();
        try {
            const listener = (event: string) => mocks.on.mock.calls.filter(([name]) => name === event).at(-1)?.[1];
            render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" />);
            const iframe = screen.getByRole("crossmint-payment-method-management.iframe");
            fireEvent.load(iframe);
            act(() => listener("ui:height.changed")?.({ height: 198 }));
            act(() => listener("payment-method:ready")?.({}));
            act(() => vi.advanceTimersByTime(150));
            expect(screen.queryByTestId(SKELETON)).toBeNull();

            fireEvent.load(iframe);
            expect(screen.getByTestId(SKELETON)).toBeTruthy();

            act(() => listener("payment-method:ready")?.({}));
            act(() => vi.advanceTimersByTime(150));
            expect(screen.queryByTestId(SKELETON)).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    test("shows the skeleton again when a prop change reloads the iframe", () => {
        const listener = (event: string) => mocks.on.mock.calls.filter(([name]) => name === event).at(-1)?.[1];
        const view = render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" />);
        act(() => listener("ui:height.changed")?.({ height: 198 }));
        act(() => listener("payment-method:ready")?.({}));

        view.rerender(<CrossmintPaymentMethodManagement jwt="new-buyer" />);

        expect(screen.getByTestId(SKELETON)).toBeTruthy();
    });

    test("styles the skeleton's fields from the appearance", () => {
        render(
            <CrossmintPaymentMethodManagement
                jwt="buyer-jwt"
                appearance={{
                    variables: { borderRadius: "4px", colors: { borderPrimary: "#111111", textPrimary: "#333333" } },
                    rules: { Input: { colors: { background: "#222222" } } },
                }}
            />
        );
        const field = screen.getByTestId(SKELETON).firstElementChild as HTMLElement;
        expect(field.style.borderRadius).toBe("4px");
        expect(field.style.border).toBe("1px solid rgb(17, 17, 17)");
        expect(field.style.backgroundColor).toBe("rgb(34, 34, 34)");
        expect(field.style.color).toBe("rgb(51, 51, 51)");
    });

    test.each<[Partial<CrossmintPaymentMethodManagementProps>, string | null]>([
        [{ allowedModes: ["new"] }, SKELETON],
        [{ allowedModes: ["new", "existing"] }, SAVED_SKELETON],
        [{ allowedPaymentMethodTypes: ["bank-account-us", "card"] }, null],
    ])("picks the skeleton of the iframe's first screen: %o", (formProps, skeleton) => {
        render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" {...formProps} />);
        for (const id of [SKELETON, SAVED_SKELETON]) {
            expect(screen.queryByTestId(id) != null).toBe(id === skeleton);
        }
    });

    test("shows an unready iframe that has drawn once its document has loaded for a while", () => {
        vi.useFakeTimers();
        try {
            const listener = (event: string) => mocks.on.mock.calls.filter(([name]) => name === event).at(-1)?.[1];
            render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" />);
            const iframe = screen.getByRole("crossmint-payment-method-management.iframe");
            fireEvent.load(iframe);
            act(() => listener("ui:height.changed")?.({ height: 120 }));

            act(() => vi.advanceTimersByTime(7_999));
            expect(screen.getByTestId(SKELETON)).toBeTruthy();

            act(() => vi.advanceTimersByTime(1));
            expect(screen.queryByTestId(SKELETON)).toBeNull();
            expect(iframe.style.opacity).toBe("1");
            expect(iframe.inert).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    test("opens on the screen and settled height the same configuration last opened on in this session", () => {
        vi.useFakeTimers();
        try {
            const listener = (event: string) => mocks.on.mock.calls.filter(([name]) => name === event).at(-1)?.[1];
            const first = render(
                <CrossmintPaymentMethodManagement jwt="buyer-jwt" allowedModes={["new", "existing"]} />
            );
            act(() => {
                listener("ui:height.changed")?.({ height: 96 });
                listener("payment-method:ready")?.({});
                listener("payment-method:change")?.({ mode: "new", empty: true, complete: false });
            });
            act(() => vi.advanceTimersByTime(30));
            act(() => listener("ui:height.changed")?.({ height: 222 }));
            act(() => vi.advanceTimersByTime(150));
            act(() => listener("ui:height.changed")?.({ height: 400 }));
            first.unmount();

            render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" allowedModes={["new", "existing"]} />);

            expect(screen.queryByTestId(SAVED_SKELETON)).toBeNull();
            expect((screen.getByTestId(SKELETON).parentElement as HTMLElement).style.minHeight).toBe("222px");
        } finally {
            vi.useRealTimers();
        }
    });

    test('a bank form opening on "new" is not remembered as the card form', () => {
        vi.useFakeTimers();
        try {
            const listener = (event: string) => mocks.on.mock.calls.filter(([name]) => name === event).at(-1)?.[1];
            const props = {
                allowedModes: ["new", "existing"],
                allowedPaymentMethodTypes: ["bank-account-us", "card"],
            } satisfies Partial<CrossmintPaymentMethodManagementProps>;
            const first = render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" {...props} />);
            act(() => {
                listener("payment-method:ready")?.({});
                listener("payment-method:change")?.({ mode: "new", empty: true, complete: false });
                listener("ui:height.changed")?.({ height: 300 });
            });
            act(() => vi.advanceTimersByTime(150));
            first.unmount();

            render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" {...props} />);

            expect(screen.queryByTestId(SKELETON)).toBeNull();
            expect((screen.getByTestId(SAVED_SKELETON).parentElement as HTMLElement).style.minHeight).toBe("");
        } finally {
            vi.useRealTimers();
        }
    });

    test("calls onReady and onChange with the iframe's form state, and only for the live iframe", () => {
        const onReady = vi.fn();
        const onChange = vi.fn();
        const listener = (event: string) => mocks.on.mock.calls.filter(([name]) => name === event).at(-1)?.[1];
        const view = render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" onReady={onReady} onChange={onChange} />);

        act(() => listener("payment-method:ready")?.({}));
        act(() => listener("payment-method:change")?.({ mode: "new", empty: false, complete: true }));
        expect(onReady).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith({ mode: "new", empty: false, complete: true });

        const retiredChange = listener("payment-method:change");
        view.rerender(<CrossmintPaymentMethodManagement jwt="new-buyer" onReady={onReady} onChange={onChange} />);
        act(() => retiredChange?.({ mode: "existing", empty: false, complete: true }));
        // The reload resets `complete`; the retired iframe's event is ignored.
        expect(onChange).toHaveBeenCalledTimes(2);
        expect(onChange).toHaveBeenLastCalledWith({ mode: "new", empty: false, complete: false });
    });

    test("reports complete: false when a prop change reloads a complete form", () => {
        const onChange = vi.fn();
        const listener = (event: string) => mocks.on.mock.calls.filter(([name]) => name === event).at(-1)?.[1];
        const view = render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" onChange={onChange} />);
        act(() => listener("payment-method:change")?.({ mode: "existing", empty: false, complete: true }));

        view.rerender(<CrossmintPaymentMethodManagement jwt="new-buyer" onChange={onChange} />);

        expect(onChange).toHaveBeenLastCalledWith({ mode: "existing", empty: false, complete: false });
        act(() => listener("payment-method:change")?.({ mode: "new", empty: true, complete: false }));
        expect(onChange).toHaveBeenLastCalledWith({ mode: "new", empty: true, complete: false });
        expect(onChange).toHaveBeenCalledTimes(3);
    });

    test("does not report a reload when the form was not complete", () => {
        const onChange = vi.fn();
        const listener = (event: string) => mocks.on.mock.calls.filter(([name]) => name === event).at(-1)?.[1];
        const view = render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" onChange={onChange} />);
        act(() => listener("payment-method:change")?.({ mode: "new", empty: true, complete: false }));

        view.rerender(<CrossmintPaymentMethodManagement jwt="new-buyer" onChange={onChange} />);

        expect(onChange).toHaveBeenCalledTimes(1);
    });

    test("reports complete: false when the iframe reloads in place", () => {
        const onChange = vi.fn();
        const listener = (event: string) => mocks.on.mock.calls.filter(([name]) => name === event).at(-1)?.[1];
        render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" onChange={onChange} />);
        const iframe = screen.getByRole("crossmint-payment-method-management.iframe");
        fireEvent.load(iframe);
        act(() => listener("payment-method:change")?.({ mode: "new", empty: false, complete: true }));

        fireEvent.load(iframe);

        expect(onChange).toHaveBeenLastCalledWith({ mode: "new", empty: false, complete: false });
        expect(onChange).toHaveBeenCalledTimes(2);
    });

    test("draws the address suggestions iframe the form asks for below its field, and only while open", () => {
        const listener = (event: string) => mocks.on.mock.calls.filter(([name]) => name === event).at(-1)?.[1];
        mount();
        expect(screen.queryByTitle("Address suggestions")).toBeNull();

        act(() => listener("ui:suggestions.mount")?.({ channel: "channel-1" }));
        const frame = screen.getByTitle("Address suggestions") as HTMLIFrameElement;
        expect(frame.src).toContain("/payment-method-management/suggestions?channel=channel-1");
        expect(frame.style.height).toBe("0px");
        expect(frame.style.pointerEvents).toBe("none");
        expect(frame.inert).toBe(true);

        act(() => listener("ui:suggestions.layout")?.({ open: true, top: 120, left: -4, width: 408, height: 260 }));
        expect(frame.style).toMatchObject({ top: "120px", left: "-4px", width: "408px", height: "260px" });
        expect(frame.style.pointerEvents).toBe("auto");
        expect(frame.inert).toBe(false);

        act(() => listener("ui:suggestions.layout")?.({ open: false, top: 120, left: -4, width: 408, height: 260 }));
        expect(frame.style.height).toBe("0px");
        expect(frame.inert).toBe(true);
    });
});
