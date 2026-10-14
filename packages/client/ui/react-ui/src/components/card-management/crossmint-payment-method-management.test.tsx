import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CrossmintPaymentMethodManagementRef } from "@crossmint/client-sdk-base";
import { CrossmintPaymentMethodManagement } from "./CrossmintPaymentMethodManagement";

const mocks = vi.hoisted(() => ({
    crossmint: { apiKey: "ck_test" },
    send: vi.fn(),
    off: vi.fn(),
    sendAction: vi.fn(),
    handshakeWithChild: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnValue("subscription"),
    getUrl: vi.fn().mockReturnValue("https://staging.crossmint.com/sdk/unstable/payment-method-management"),
}));
vi.mock("@crossmint/client-sdk-base", async (original) => ({
    ...(await original<typeof import("@crossmint/client-sdk-base")>()),
    createPaymentMethodManagementService: () => ({
        iframe: {
            getUrl: mocks.getUrl,
            createClient: () => ({ ...mocks }),
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

function mount({ load = true } = {}) {
    const ref = createRef<CrossmintPaymentMethodManagementRef>();
    const view = render(<CrossmintPaymentMethodManagement ref={ref} jwt="buyer-jwt" hideSubmitButton />);
    if (load) {
        fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));
    }
    if (ref.current == null) {
        throw new Error("The component ref did not mount");
    }
    return { ...view, ref, component: ref.current };
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.handshakeWithChild.mockResolvedValue(undefined);
    mocks.on.mockReturnValue("subscription");
    mocks.getUrl.mockImplementation(
        (props) =>
            `https://staging.crossmint.com/sdk/unstable/payment-method-management?jwt=${props.jwt}&hidden=${props.hideSubmitButton ?? false}`
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

        expect(mocks.sendAction).toHaveBeenCalledOnce();
        const call = mocks.sendAction.mock.calls[0][0];
        expect(call.event).toBe("payment-method:submit");
        expect(call.responseEvent).toBe("payment-method:result");
        expect(call.data.requestId).toEqual(expect.any(String));
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

    test("resolves unavailable before the iframe has loaded, without asking it", async () => {
        const { component } = mount({ load: false });

        await expect(component.submit()).resolves.toMatchObject({ status: "unavailable" });

        expect(mocks.sendAction).not.toHaveBeenCalled();
    });

    test("resolves unavailable when the iframe does not answer in time", async () => {
        mocks.sendAction.mockRejectedValueOnce("Timed out waiting for payment-method:result event");
        const { component } = mount();

        await expect(component.submit()).resolves.toMatchObject({ status: "unavailable" });
    });

    test("passes hideSubmitButton to the iframe URL and calls the latest onPaymentMethodSelected", async () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = render(
            <CrossmintPaymentMethodManagement jwt="buyer-jwt" hideSubmitButton onPaymentMethodSelected={first} />
        );
        expect(mocks.getUrl).toHaveBeenCalledWith(expect.objectContaining({ hideSubmitButton: true }));
        fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));
        const selectedListener = mocks.on.mock.calls.find(([event]) => event === "payment-method:selected")?.[1];
        rerender(
            <CrossmintPaymentMethodManagement jwt="buyer-jwt" hideSubmitButton onPaymentMethodSelected={second} />
        );

        selectedListener?.(CARD);

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith(CARD);
    });
});

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

describe("submit connection lifecycle", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    test("keeps the active connection when provider identity changes without changing the URL", async () => {
        const reply = deferred<{ result: typeof SAVED }>();
        mocks.sendAction.mockReturnValueOnce(reply.promise);
        const { component, ref, rerender } = mount();
        const pending = component.submit();
        mocks.crossmint = { ...mocks.crossmint };
        rerender(<CrossmintPaymentMethodManagement ref={ref} jwt="buyer-jwt" hideSubmitButton />);
        expect(ref.current?.submit()).toBe(pending);
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(1);
        reply.resolve({ result: SAVED });
        await expect(pending).resolves.toEqual(SAVED);
    });

    test("waits for the channel handshake before submitting", async () => {
        const ready = deferred<void>();
        mocks.handshakeWithChild.mockReturnValueOnce(ready.promise);
        mocks.sendAction.mockResolvedValueOnce({ result: SAVED });
        const { component } = mount();
        const pending = component.submit();
        await act(async () => {
            await Promise.resolve();
        });
        expect(mocks.sendAction).not.toHaveBeenCalled();
        ready.resolve();
        await expect(pending).resolves.toEqual(SAVED);
    });

    test("returns unavailable when the handshake fails", async () => {
        mocks.handshakeWithChild.mockRejectedValueOnce(new Error("Blocked channel"));
        const { component } = mount();
        await expect(component.submit()).resolves.toMatchObject({ status: "unavailable" });
        expect(mocks.sendAction).not.toHaveBeenCalled();
    });

    test.each(["buyer", "configuration", "reload", "unmount"] as const)(
        "supersedes an unanswered submit immediately on %s and ignores its late result",
        async (change) => {
            const reply = deferred<{ result: typeof SAVED }>();
            mocks.sendAction.mockReturnValueOnce(reply.promise);
            const { component, ref, rerender, unmount } = mount();
            const pending = component.submit();
            await act(async () => {
                await Promise.resolve();
            });
            const signal: AbortSignal = mocks.sendAction.mock.calls[0][0].options.signal;
            if (change === "buyer" || change === "configuration") {
                rerender(
                    <CrossmintPaymentMethodManagement
                        ref={ref}
                        jwt={change === "buyer" ? "new-buyer" : "buyer-jwt"}
                        hideSubmitButton={change !== "configuration"}
                    />
                );
                await expect(ref.current?.submit()).resolves.toMatchObject({ status: "unavailable" });
                fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));
            } else if (change === "reload") {
                fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));
            } else {
                unmount();
            }
            await expect(pending).resolves.toMatchObject({ status: "superseded" });
            expect(signal.aborted).toBe(true);
            reply.resolve({ result: SAVED });
            await expect(pending).resolves.toMatchObject({ status: "superseded" });
            if (change !== "unmount") {
                mocks.sendAction.mockResolvedValueOnce({ result: SAVED });
                await expect(ref.current?.submit()).resolves.toEqual(SAVED);
                expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(2);
            }
        }
    );

    test("settles immediately when unmounted during a pending handshake", async () => {
        mocks.handshakeWithChild.mockReturnValueOnce(deferred<void>().promise);
        const { component, unmount } = mount();
        const pending = component.submit();
        unmount();
        await expect(pending).resolves.toMatchObject({ status: "superseded" });
        expect(mocks.sendAction).not.toHaveBeenCalled();
    });

    test("ignores selected events from the previous connection after reloading", async () => {
        const selected = vi.fn();
        render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" onPaymentMethodSelected={selected} />);
        fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));
        const oldListener = mocks.on.mock.calls.find(([event]) => event === "payment-method:selected")?.[1];
        fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));
        expect(oldListener).toBeTypeOf("function");
        oldListener?.(CARD);
        expect(selected).not.toHaveBeenCalled();
        const listeners = mocks.on.mock.calls.filter(([event]) => event === "payment-method:selected");
        listeners.at(-1)?.[1](CARD);
        expect(selected).toHaveBeenCalledWith(CARD);
    });
});
