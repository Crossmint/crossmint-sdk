import { describe, expect, test, vi } from "vitest";

import type { EmailInternalSignerConfig, PhoneInternalSignerConfig } from "../types";
import { StellarNonCustodialSigner } from "./ncs-stellar-signer";

const EMAIL_AUTH_ID = "email:test@example.com";
const PUBLIC_KEY = { bytes: "cHVibGljLWtleQ==", encoding: "base64", keyType: "ed25519" };

function makeSigner({ statusOnGetStatus }: { statusOnGetStatus: "ready" | "new-device" }) {
    const sendAction = vi.fn(async (args: { event: string }) => {
        switch (args.event) {
            case "request:get-status":
                return { status: "success", signerStatus: statusOnGetStatus, publicKeys: { ed25519: PUBLIC_KEY } };
            case "request:start-onboarding":
                return { status: "success", signerStatus: "new-device" };
            case "request:complete-onboarding":
                return { status: "success", signerStatus: "ready", publicKeys: { ed25519: PUBLIC_KEY } };
            default:
                return {
                    status: "success",
                    signature: { bytes: "c2ln", encoding: "base64", keyType: "ed25519" },
                    publicKey: PUBLIC_KEY,
                };
        }
    });
    // Mirrors the UI layer: request the OTP as soon as auth is needed, then verify it.
    const onAuthRequired = vi.fn(
        async (
            _type: string,
            _locator: string,
            needsAuth: boolean,
            sendOtp: () => Promise<void>,
            verifyOtp: (otp: string) => Promise<void>
        ) => {
            if (needsAuth) {
                await sendOtp();
                await verifyOtp("123456");
            }
        }
    );
    const config = {
        type: "email",
        email: "test@example.com",
        locator: EMAIL_AUTH_ID,
        address: "GWALLET",
        crossmint: { apiKey: "ck_staging_test", jwt: "test-jwt" },
        clientTEEConnection: { sendAction },
        onAuthRequired,
    } as unknown as EmailInternalSignerConfig | PhoneInternalSignerConfig;

    return { signer: new StellarNonCustodialSigner(config), sendAction, onAuthRequired };
}

function requestData(sendAction: ReturnType<typeof makeSigner>["sendAction"], event: string) {
    const call = sendAction.mock.calls.find(([args]) => args.event === event);
    if (call == null) {
        throw new Error(`No ${event} request was sent to the signer`);
    }
    return (call[0] as unknown as { data: { data?: Record<string, unknown> } }).data.data;
}

describe("StellarNonCustodialSigner.signTransaction", () => {
    describe("when the frame reports the device as ready for the selected recovery method", () => {
        test("signs without onboarding and tells the frame which recovery method is signing", async () => {
            const { signer, sendAction, onAuthRequired } = makeSigner({ statusOnGetStatus: "ready" });

            const result = await signer.signTransaction("cGF5bG9hZA==");

            expect(result).toEqual({ signature: "c2ln" });
            expect(onAuthRequired).not.toHaveBeenCalled();
            expect(requestData(sendAction, "request:get-status")).toEqual({ authId: EMAIL_AUTH_ID });
            expect(requestData(sendAction, "request:sign")).toMatchObject({ authId: EMAIL_AUTH_ID });
        });
    });

    describe("when the frame reports the device as not onboarded for the selected recovery method", () => {
        test("onboards the recovery method without an sms channel before signing", async () => {
            const { signer, sendAction, onAuthRequired } = makeSigner({ statusOnGetStatus: "new-device" });

            const result = await signer.signTransaction("cGF5bG9hZA==");

            expect(result).toEqual({ signature: "c2ln" });
            expect(onAuthRequired).toHaveBeenCalledWith(
                "email",
                EMAIL_AUTH_ID,
                true,
                expect.any(Function),
                expect.any(Function),
                expect.any(Function)
            );
            expect(requestData(sendAction, "request:start-onboarding")).toEqual({ authId: EMAIL_AUTH_ID });
            expect(requestData(sendAction, "request:sign")).toMatchObject({ authId: EMAIL_AUTH_ID });
        });
    });
});
