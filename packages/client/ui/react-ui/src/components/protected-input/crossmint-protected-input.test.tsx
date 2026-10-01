import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { CrossmintProtectedInputRef } from "@crossmint/client-sdk-base";
import { CrossmintProtectedInput } from "./CrossmintProtectedInput";

const mocks = vi.hoisted(() => ({
    crossmint: { apiKey: "ck_test" },
    send: vi.fn(),
    off: vi.fn(),
    handshakeWithChild: vi.fn().mockResolvedValue(undefined),
    sendAction: vi.fn(),
    on: vi.fn().mockReturnValue("height-subscription"),
}));
vi.mock("@crossmint/client-sdk-base", async (original) => ({
    ...(await original<typeof import("@crossmint/client-sdk-base")>()),
    createProtectedInputService: () => ({
        iframe: {
            getUrl: () => "https://staging.crossmint.com/sdk/unstable/protected-input",
            createClient: () => ({ ...mocks }),
        },
    }),
}));
vi.mock("@crossmint/client-sdk-react-base", () => ({ useCrossmint: () => ({ crossmint: mocks.crossmint }) }));
vi.mock("@/utils/createCrossmintApiClient", () => ({ createCrossmintApiClient: () => ({}) }));
const FIELD = {
    key: "code",
    label: "Verification code",
    required: true,
    handling: "protected",
    input: { kind: "text" },
} as const;
const COLLECTED = { status: "collected", input: { protectedInputId: "pi_test" } } as const;

function mount(jwt = "buyer-jwt") {
    const ref = createRef<CrossmintProtectedInputRef>();
    const view = render(<CrossmintProtectedInput ref={ref} field={FIELD} jwt={jwt} />);
    fireEvent.load(screen.getByTitle(FIELD.label));
    if (ref.current == null) {
        throw new Error("Protected input ref did not mount");
    }
    return { ...view, ref, input: ref.current };
}

describe("CrossmintProtectedInput", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    test("renders only an accessible iframe without permissions or host controls", () => {
        const { container } = mount();
        expect(container.querySelectorAll("input, textarea, select, button")).toHaveLength(0);
        expect(screen.getByTitle(FIELD.label)).not.toHaveAttribute("allow");
        expect(mocks.handshakeWithChild).toHaveBeenCalledOnce();
    });

    test("shares concurrent collections and returns only the protected reference", async () => {
        let complete: (value: { result: typeof COLLECTED }) => void = () => {
            throw new Error("not collecting");
        };
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        const { input } = mount();
        const first = input.collect();
        const second = input.collect();
        expect(first).toBe(second);
        await act(async () => {
            complete({ result: COLLECTED });
            expect(await first).toEqual(COLLECTED);
        });
        expect(mocks.sendAction).toHaveBeenCalledOnce();
        expect(mocks.sendAction.mock.calls[0][0].data).toMatchObject({ jwt: "buyer-jwt", apiKey: "ck_test" });
        expect(mocks.sendAction.mock.calls[0][0].data).not.toHaveProperty("value");
    });

    test("supersedes a completed collection when buyer authentication changes", async () => {
        let complete: (value: { result: typeof COLLECTED }) => void = () => {
            throw new Error("not collecting");
        };
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        const { input, ref, rerender } = mount();
        const pending = input.collect();
        await act(async () => {
            await Promise.resolve();
        });
        rerender(<CrossmintProtectedInput ref={ref} field={FIELD} jwt="new-buyer" />);
        complete({ result: COLLECTED });
        await expect(pending).resolves.toMatchObject({ status: "superseded" });
    });

    test("invalidates auth that changes and returns to the original buyer", async () => {
        let complete!: (value: { result: typeof COLLECTED }) => void;
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        const { input, ref, rerender } = mount();
        const pending = input.collect();
        await act(async () => {
            await Promise.resolve();
        });
        rerender(<CrossmintProtectedInput ref={ref} field={FIELD} jwt="another-buyer" />);
        rerender(<CrossmintProtectedInput ref={ref} field={FIELD} jwt="buyer-jwt" />);
        complete({ result: COLLECTED });
        await expect(pending).resolves.toMatchObject({ status: "superseded" });
        expect(mocks.send).toHaveBeenCalledWith("protected-input:reset", {});
    });

    test("returns a safe failure without exposing a transport exception", async () => {
        mocks.sendAction.mockRejectedValueOnce(new Error("sensitive provider details"));
        const { input } = mount();
        await expect(input.collect()).resolves.toMatchObject({
            status: "unavailable",
            code: "collector_unavailable",
        });
    });

    test("reconnects after iframe reload and supersedes the old completion", async () => {
        let complete: (value: { result: typeof COLLECTED }) => void = () => {
            throw new Error("not collecting");
        };
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        const { input } = mount();
        const pending = input.collect();
        await act(async () => {
            await Promise.resolve();
        });
        fireEvent.load(screen.getByTitle(FIELD.label));
        complete({ result: COLLECTED });
        await expect(pending).resolves.toMatchObject({ status: "superseded" });
        expect(mocks.off).toHaveBeenCalledWith("height-subscription");
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(2);
    });
});
