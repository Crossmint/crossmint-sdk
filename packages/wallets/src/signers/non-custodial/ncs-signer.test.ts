import { describe, it, expect, vi } from "vitest";

import type { EmailInternalSignerConfig } from "../types";
import { OnboardingSessionExpiredError, OtpValidationError } from "../types";
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

type CompleteOnboardingResult = { status: string; error?: string; code?: string; signerStatus?: string };

function makeScriptedConnection(completeOnboarding: (callIndex: number) => CompleteOnboardingResult) {
    let completeCalls = 0;
    return {
        // Mutable: the test advances this to simulate the frame reloading mid-onboarding.
        connectionGeneration: 1,
        sendAction: vi.fn(async (args: { event: string }) => {
            switch (args.event) {
                case "request:get-status":
                    return { status: "success", signerStatus: "new-device" };
                case "request:start-onboarding":
                    return { status: "success", signerStatus: "new-device" };
                case "request:complete-onboarding":
                    return completeOnboarding(completeCalls++);
                default:
                    return { status: "success" };
            }
        }),
    };
}

describe("NonCustodialSigner onboarding recovery", () => {
    function setup(completeOnboarding: (callIndex: number) => CompleteOnboardingResult) {
        const connection = makeScriptedConnection(completeOnboarding);
        let sendOtp: (() => Promise<void>) | undefined;
        let verifyOtp: ((otp: string) => Promise<void>) | undefined;
        // Capture the OTP callbacks from the first (needsAuth) onAuthRequired invocation.
        const onAuthRequired = vi.fn(
            async (
                _type: string,
                _locator: string,
                needsAuth: boolean,
                send: () => Promise<void>,
                verify: (otp: string) => Promise<void>
            ) => {
                if (needsAuth && sendOtp == null) {
                    sendOtp = send;
                    verifyOtp = verify;
                }
            }
        );
        const signer = new EVMNonCustodialSigner(
            makeConfig({ clientTEEConnection: connection as never, onAuthRequired: onAuthRequired as never })
        );
        return { signer, connection, getSendOtp: () => sendOtp, getVerifyOtp: () => verifyOtp };
    }

    const startCount = (connection: ReturnType<typeof makeScriptedConnection>) =>
        connection.sendAction.mock.calls.filter((c) => c[0].event === "request:start-onboarding").length;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

    it("re-issues a fresh OTP and keeps the flow alive when the frame reloads mid-onboarding", async () => {
        // complete-onboarding fails once (frame reloaded), then succeeds with the new code.
        const { signer, connection, getSendOtp, getVerifyOtp } = setup((i) =>
            i === 0 ? { status: "error", error: "no onboarding in progress" } : { status: "success" }
        );

        const authSettled = signer.ensureAuthenticated().then(
            () => "resolved",
            () => "rejected"
        );
        await flush();

        const sendOtp = getSendOtp();
        const verifyOtp = getVerifyOtp();
        expect(sendOtp).toBeDefined();
        expect(verifyOtp).toBeDefined();

        // OTP issued on connection generation 1.
        await sendOtp?.();

        // Process killed: the frame reloads and re-handshakes, advancing the generation.
        connection.connectionGeneration = 2;

        // The stale OTP fails to complete onboarding; a fresh OTP is requested and the flow stays alive.
        await expect(verifyOtp?.("stale-otp")).rejects.toBeInstanceOf(OnboardingSessionExpiredError);
        expect(startCount(connection)).toBe(2); // initial + re-issued

        // User enters the new code; onboarding completes and auth resolves.
        await verifyOtp?.("fresh-otp");
        await expect(authSettled).resolves.toBe("resolved");
    });

    it("rejects with OtpValidationError and does not re-issue when the OTP is simply wrong", async () => {
        const { signer, connection, getSendOtp, getVerifyOtp } = setup(() => ({
            status: "error",
            error: "invalid OTP",
        }));

        const authSettled = signer.ensureAuthenticated().then(
            () => "resolved",
            () => "rejected"
        );
        await flush();

        await getSendOtp()?.();
        // Frame was NOT reloaded (generation unchanged): a genuine wrong-OTP error.
        await expect(getVerifyOtp()?.("wrong-otp")).rejects.toBeInstanceOf(OtpValidationError);
        expect(startCount(connection)).toBe(1); // no re-issue
        await expect(authSettled).resolves.toBe("rejected");
    });
});
