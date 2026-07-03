import { describe, it, expect, vi, afterEach } from "vitest";
import { HandshakeParent } from "@crossmint/client-sdk-window";
import { WebViewParent } from "./Parent";
import type { RecoveryOptions } from "./Parent";

// The real transport imports RN polyfills (react-native-get-random-values) that vitest can't parse.
// We only exercise the retry decision, so stub the transport with no-op methods.
vi.mock("../transport/RNWebViewTransport", () => ({
    RNWebViewTransport: vi.fn().mockImplementation(() => new Proxy({}, { get: () => vi.fn() })),
}));

function makeParent(recovery: RecoveryOptions) {
    const webviewRef = { current: null } as never;
    const parent = new WebViewParent(webviewRef, {
        incomingEvents: {} as never,
        outgoingEvents: {} as never,
        recovery,
    });
    // Stub the actual reload + re-handshake; we only care about whether the request is replayed.
    const reload = vi
        .spyOn(parent as unknown as { reloadAndHandshake: () => Promise<void> }, "reloadAndHandshake")
        .mockResolvedValue(undefined);
    return { parent, reload };
}

const TIMEOUT = "Timed out waiting for response";
const recovery: RecoveryOptions = {
    recoverableErrorCodes: [],
    reloadWithoutRetryEvents: ["request:complete-onboarding"],
};

describe("WebViewParent timeout recovery", () => {
    afterEach(() => vi.restoreAllMocks());

    it("reloads but does not retry a reloadWithoutRetry event", async () => {
        const { parent, reload } = makeParent(recovery);
        const superSend = vi.spyOn(HandshakeParent.prototype, "sendAction").mockRejectedValue(TIMEOUT);

        await expect(parent.sendAction({ event: "request:complete-onboarding" } as never)).rejects.toBe(TIMEOUT);

        expect(reload).toHaveBeenCalledTimes(1);
        expect(superSend).toHaveBeenCalledTimes(1); // surfaced the timeout instead of replaying
    });

    it("reloads and retries other events", async () => {
        const { parent, reload } = makeParent(recovery);
        const superSend = vi
            .spyOn(HandshakeParent.prototype, "sendAction")
            .mockRejectedValueOnce(TIMEOUT)
            .mockResolvedValueOnce({ status: "success" } as never);

        const res = await parent.sendAction({ event: "request:sign" } as never);

        expect(res).toEqual({ status: "success" });
        expect(reload).toHaveBeenCalledTimes(1);
        expect(superSend).toHaveBeenCalledTimes(2); // reloaded and replayed
    });
});
