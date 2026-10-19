import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, createRef } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { CrossmintCvcRecollectionRef } from "@crossmint/client-sdk-base";
import { CrossmintCvcRecollection } from "./CrossmintCvcRecollection";

const listeners = new Map<string, (data: unknown) => void>();
const mocks = vi.hoisted(() => ({
    sendAction: vi.fn(),
    handshakeWithChild: vi.fn().mockResolvedValue(undefined),
    createClient: vi.fn(),
    off: vi.fn(),
}));

vi.mock("@crossmint/client-sdk-base", async (original) => ({
    ...(await original<typeof import("@crossmint/client-sdk-base")>()),
    createCvcRecollectionService: () => ({
        iframe: {
            getUrl: (props: { jwt: string; paymentMethodId: string; hideSubmitButton?: boolean }) =>
                `https://staging.crossmint.com/sdk/unstable/cvc-recollection?jwt=${props.jwt}&paymentMethodId=${props.paymentMethodId}&hidden=${props.hideSubmitButton ?? false}`,
            createClient: mocks.createClient,
        },
    }),
}));

vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: () => ({ crossmint: { apiKey: "ck_staging_key" } }),
}));

vi.mock("@/utils/createCrossmintApiClient", () => ({
    createCrossmintApiClient: () => ({}),
}));

const PROPS = { jwt: "jwt-1", paymentMethodId: "pm_1" } as const;
const COMPLETE = { status: "complete" } as const;

function emit(event: string, data: unknown) {
    const handler = listeners.get(event);
    if (handler == null) {
        throw new Error(`no listener registered for ${event}`);
    }
    act(() => handler(data));
}

function mount({ load = true }: { load?: boolean } = {}) {
    const ref = createRef<CrossmintCvcRecollectionRef>();
    const view = render(<CrossmintCvcRecollection ref={ref} {...PROPS} hideSubmitButton />);
    if (load) {
        fireEvent.load(screen.getByTitle("CVC recollection"));
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
    vi.resetAllMocks();
    listeners.clear();
    mocks.handshakeWithChild.mockResolvedValue(undefined);
    mocks.createClient.mockImplementation(() => ({
        // Returns an id distinct from the event name on purpose, so the unmount test
        // fails if cleanup passes event names to off() instead of the returned ids.
        on: vi.fn((event: string, handler: (data: unknown) => void) => {
            listeners.set(event, handler);
            return `listener-id:${event}`;
        }),
        off: mocks.off,
        sendAction: mocks.sendAction,
        handshakeWithChild: mocks.handshakeWithChild,
    }));
});

afterEach(() => {
    cleanup();
});

describe("<CrossmintCvcRecollection />", () => {
    describe("when mounted", () => {
        test("renders an iframe pointed at the cvc-recollection route", () => {
            render(<CrossmintCvcRecollection {...PROPS} />);

            const iframe = screen.getByTitle("CVC recollection");
            expect(iframe.getAttribute("src")).toContain("/sdk/unstable/cvc-recollection");
        });

        test("requests no device permissions, since the CVC field is a plain text element", () => {
            render(<CrossmintCvcRecollection {...PROPS} />);

            expect(screen.getByTitle("CVC recollection").hasAttribute("allow")).toBe(false);
        });
    });

    describe("when the iframe relays lifecycle events", () => {
        test("forwards cvc:complete and cvc:error to the callbacks", () => {
            const onComplete = vi.fn();
            const onError = vi.fn();
            render(<CrossmintCvcRecollection {...PROPS} onComplete={onComplete} onError={onError} />);

            emit("cvc:complete", {});
            emit("cvc:error", { retriable: true, reason: "provider-error", message: "vault timeout" });

            expect(onComplete).toHaveBeenCalledTimes(1);
            expect(onComplete).toHaveBeenCalledWith();
            expect(onError).toHaveBeenCalledWith({
                retriable: true,
                reason: "provider-error",
                message: "vault timeout",
            });
        });

        test("forwards a verification-refused error as retriable", () => {
            const onError = vi.fn();
            render(<CrossmintCvcRecollection {...PROPS} onError={onError} />);

            emit("cvc:error", { retriable: true, reason: "verification-refused", message: "not verified" });

            expect(onError).toHaveBeenCalledWith({
                retriable: true,
                reason: "verification-refused",
                message: "not verified",
            });
        });

        test("calls the callback from the latest render, not the one captured at subscribe time", () => {
            const stale = vi.fn();
            const fresh = vi.fn();
            const { rerender } = render(<CrossmintCvcRecollection {...PROPS} onComplete={stale} />);

            rerender(<CrossmintCvcRecollection {...PROPS} onComplete={fresh} />);
            emit("cvc:complete", {});

            expect(fresh).toHaveBeenCalledTimes(1);
            expect(stale).not.toHaveBeenCalled();
        });

        test("applies the relayed height to the iframe", () => {
            render(<CrossmintCvcRecollection {...PROPS} />);

            emit("ui:height.changed", { height: 220 });

            expect(screen.getByTitle("CVC recollection")).toHaveStyle({ height: "220px" });
        });
    });

    describe("when unmounted", () => {
        test("removes every listener by its returned id, not by event name", () => {
            const { unmount } = render(<CrossmintCvcRecollection {...PROPS} />);

            unmount();

            for (const event of ["ui:height.changed", "cvc:complete", "cvc:error"]) {
                expect(mocks.off).toHaveBeenCalledWith(`listener-id:${event}`);
            }
            expect(mocks.off).toHaveBeenCalledTimes(3);
        });
    });
});

describe("CrossmintCvcRecollection ref", () => {
    test("submit asks the iframe and resolves with its result for the same request", async () => {
        mocks.sendAction.mockImplementationOnce(async ({ data }: { data: { requestId: string } }) => ({
            requestId: data.requestId,
            result: COMPLETE,
        }));
        const { component } = mount();

        await expect(component.submit()).resolves.toEqual(COMPLETE);

        const call = mocks.sendAction.mock.calls[0][0];
        expect(call.event).toBe("cvc:submit");
        expect(call.responseEvent).toBe("cvc:result");
        expect(call.options.condition({ requestId: call.data.requestId })).toBe(true);
        expect(call.options.condition({ requestId: "another" })).toBe(false);
        expect(call.options.timeoutMs).toBe(60_000);
    });

    test("resolves the iframe's refused verdict without mapping it to failed", async () => {
        const refused = {
            status: "refused",
            reason: "invalid-credentials",
            message: "[cvc-recollection] card fetch refused",
        } as const;
        mocks.sendAction.mockResolvedValueOnce({ requestId: "r1", result: refused });
        const { component } = mount();

        await expect(component.submit()).resolves.toEqual(refused);
    });

    test("shares a submit in flight and starts a new one after it settles", async () => {
        let completeFirst!: (value: { requestId: string; result: typeof COMPLETE }) => void;
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                completeFirst = resolve;
            })
        );
        mocks.sendAction.mockResolvedValueOnce({ requestId: "r2", result: COMPLETE });
        const { component } = mount();

        const first = component.submit();
        const second = component.submit();
        expect(first).toBe(second);
        await act(async () => {
            completeFirst({ requestId: "r1", result: COMPLETE });
            await first;
        });
        const third = component.submit();
        expect(third).not.toBe(first);
        await expect(third).resolves.toEqual(COMPLETE);
        expect(mocks.sendAction).toHaveBeenCalledTimes(2);
    });

    test("a failed handshake resolves unavailable and the next submit retries it", async () => {
        mocks.handshakeWithChild.mockRejectedValueOnce(new Error("Handshake timed out"));
        const { component } = mount();

        await expect(component.submit()).resolves.toMatchObject({ status: "unavailable" });
        expect(mocks.sendAction).not.toHaveBeenCalled();

        mocks.sendAction.mockResolvedValueOnce({ result: COMPLETE });
        await expect(component.submit()).resolves.toEqual(COMPLETE);
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(2);
    });

    test("resolves unavailable when the iframe does not answer in time", async () => {
        mocks.sendAction.mockRejectedValueOnce("Timed out waiting for cvc:result event");
        const { component } = mount();

        await expect(component.submit()).resolves.toMatchObject({
            status: "unavailable",
            message:
                "The CVC recollection component did not answer in time. The CVC may still have been updated: onComplete fires if it was, and submitting again returns the outcome.",
        });
    });

    test("under StrictMode the iframe document gets one client and one handshake", async () => {
        const ref = createRef<CrossmintCvcRecollectionRef>();
        render(
            <StrictMode>
                <CrossmintCvcRecollection ref={ref} {...PROPS} hideSubmitButton />
            </StrictMode>
        );

        expect(mocks.createClient).toHaveBeenCalledTimes(1);
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(1);

        mocks.sendAction.mockResolvedValueOnce({ result: COMPLETE });
        await expect(ref.current?.submit()).resolves.toEqual(COMPLETE);
    });

    test("a reload during a pending handshake restarts it for the new document, keeping the client", async () => {
        const handshake = deferred<void>();
        mocks.handshakeWithChild.mockReturnValueOnce(handshake.promise);
        mocks.sendAction.mockResolvedValueOnce({ result: COMPLETE });
        const ref = createRef<CrossmintCvcRecollectionRef>();
        render(<CrossmintCvcRecollection ref={ref} {...PROPS} hideSubmitButton />);

        fireEvent.load(screen.getByTitle("CVC recollection"));
        fireEvent.load(screen.getByTitle("CVC recollection"));

        expect(mocks.createClient).toHaveBeenCalledTimes(1);
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(2);

        const component = ref.current;
        if (component == null) {
            throw new Error("The component ref did not mount");
        }
        const submit = component.submit();
        await act(async () => {
            handshake.resolve();
            await Promise.resolve();
        });
        await expect(submit).resolves.toEqual(COMPLETE);
    });

    test("the first load keeps a pending submit; a second load creates a new client and supersedes", async () => {
        const onError = vi.fn();
        const firstReply = deferred<{ result: typeof COMPLETE }>();
        const secondReply = deferred<{ result: typeof COMPLETE }>();
        mocks.sendAction.mockReturnValueOnce(firstReply.promise).mockReturnValueOnce(secondReply.promise);
        const ref = createRef<CrossmintCvcRecollectionRef>();
        render(<CrossmintCvcRecollection ref={ref} {...PROPS} hideSubmitButton onError={onError} />);
        const retiredListener = listeners.get("cvc:error");
        const component = ref.current;
        if (component == null) {
            throw new Error("The component ref did not mount");
        }
        const pending = component.submit();
        await act(async () => {
            await Promise.resolve();
        });

        fireEvent.load(screen.getByTitle("CVC recollection"));
        await act(async () => {
            firstReply.resolve({ result: COMPLETE });
            await firstReply.promise;
        });
        await expect(pending).resolves.toEqual(COMPLETE);
        expect(mocks.createClient).toHaveBeenCalledTimes(1);

        const next = component.submit();
        await act(async () => {
            await Promise.resolve();
        });
        fireEvent.load(screen.getByTitle("CVC recollection"));

        await expect(next).resolves.toMatchObject({ status: "superseded" });
        await act(async () => {
            secondReply.resolve({ result: COMPLETE });
            await secondReply.promise;
        });
        expect(mocks.createClient).toHaveBeenCalledTimes(2);
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(2);

        act(() => retiredListener?.({ retriable: true, reason: "provider-error", message: "stale frame" }));
        expect(onError).not.toHaveBeenCalled();
        emit("cvc:error", { retriable: true, reason: "provider-error", message: "fresh frame" });
        expect(onError).toHaveBeenCalledWith({
            retriable: true,
            reason: "provider-error",
            message: "fresh frame",
        });
    });

    test("keeps the last reported height when the iframe URL changes until the new iframe reports", () => {
        const view = render(<CrossmintCvcRecollection {...PROPS} />);
        act(() => listeners.get("ui:height.changed")?.({ height: 400 }));
        expect(screen.getByTitle("CVC recollection").style.height).toBe("400px");

        listeners.clear();
        view.rerender(<CrossmintCvcRecollection {...PROPS} paymentMethodId="pm_2" />);

        const newIframe = screen.getByTitle("CVC recollection");
        expect(newIframe.style.height).toBe("400px");
        act(() => listeners.get("ui:height.changed")?.({ height: 500 }));
        expect(newIframe.style.height).toBe("500px");
    });
});
