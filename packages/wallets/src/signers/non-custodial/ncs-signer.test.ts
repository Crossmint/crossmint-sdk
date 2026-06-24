import { describe, it, expect, vi } from "vitest";

import type { EmailInternalSignerConfig } from "../types";
import { EVMNonCustodialSigner } from "./ncs-evm-signer";

function makeReadyConnection(onSendAction?: () => void) {
    return {
        sendAction: vi.fn(async () => {
            onSendAction?.();
            return { status: "success", signerStatus: "ready" };
        }),
    };
}

function makeConfig(overrides: Partial<EmailInternalSignerConfig> = {}): EmailInternalSignerConfig {
    return {
        type: "email",
        email: "test@example.com",
        locator: "email:test@example.com",
        address: "0x0000000000000000000000000000000000000000",
        crossmint: { apiKey: "ck_staging_test", jwt: "test-jwt" },
        clientTEEConnection: makeReadyConnection(),
        // Required by handleAuthRequired; not invoked when the signer reports "ready".
        onAuthRequired: vi.fn(async () => {}),
        ...overrides,
    } as unknown as EmailInternalSignerConfig;
}

describe("NonCustodialSigner.ensureAuthenticated", () => {
    it("resets the signer frame before checking signer status", async () => {
        const calls: string[] = [];
        const resetSignerFrame = vi.fn(async () => {
            calls.push("reset");
        });
        const clientTEEConnection = makeReadyConnection(() => calls.push("get-status"));
        const signer = new EVMNonCustodialSigner(makeConfig({ resetSignerFrame, clientTEEConnection }));

        await signer.ensureAuthenticated();

        expect(resetSignerFrame).toHaveBeenCalledTimes(1);
        expect(clientTEEConnection.sendAction).toHaveBeenCalledTimes(1);
        // The reset must run before the status check so the OTP flow targets the fresh frame.
        expect(calls).toEqual(["reset", "get-status"]);
    });

    it("resets the signer frame on every signature", async () => {
        const resetSignerFrame = vi.fn(async () => {});
        const signer = new EVMNonCustodialSigner(makeConfig({ resetSignerFrame }));

        await signer.ensureAuthenticated();
        await signer.ensureAuthenticated();

        expect(resetSignerFrame).toHaveBeenCalledTimes(2);
    });

    it("is a no-op when no reset hook is provided", async () => {
        const clientTEEConnection = makeReadyConnection();
        const signer = new EVMNonCustodialSigner(makeConfig({ clientTEEConnection, resetSignerFrame: undefined }));

        await expect(signer.ensureAuthenticated()).resolves.toBeUndefined();
        expect(clientTEEConnection.sendAction).toHaveBeenCalledTimes(1);
    });
});
