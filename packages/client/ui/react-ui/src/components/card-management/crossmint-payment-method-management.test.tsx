import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { CrossmintPaymentMethodManagementRef } from "@crossmint/client-sdk-base";
import { CrossmintPaymentMethodManagement } from "./CrossmintPaymentMethodManagement";

const mocks = vi.hoisted(() => ({
    crossmint: { apiKey: "ck_test" },
    send: vi.fn(),
    off: vi.fn(),
    sendAction: vi.fn(),
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
        const selectedListener = mocks.on.mock.calls.find(([event]) => event === "payment-method:selected")?.[1];
        rerender(
            <CrossmintPaymentMethodManagement jwt="buyer-jwt" hideSubmitButton onPaymentMethodSelected={second} />
        );

        selectedListener?.(CARD);

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith(CARD);
    });
});
