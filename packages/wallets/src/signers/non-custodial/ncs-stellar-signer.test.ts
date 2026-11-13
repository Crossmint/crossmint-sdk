import { HandshakeParent, type SimpleMessageEvent, type Transport } from "@crossmint/client-sdk-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import { describe, expect, test, vi } from "vitest";

import type { EmailInternalSignerConfig, PhoneInternalSignerConfig } from "../types";
import { StellarNonCustodialSigner } from "./ncs-stellar-signer";

const EMAIL_AUTH_ID = "email:test@example.com";
const PUBLIC_KEY = { bytes: "cHVibGljLWtleQ==", encoding: "base64", keyType: "ed25519" };

function makeSigner({
    statusOnGetStatus,
    email = "test@example.com",
    clientTEEConnection,
}: {
    statusOnGetStatus: "ready" | "new-device";
    email?: string;
    clientTEEConnection?: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
}) {
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
        email,
        locator: EMAIL_AUTH_ID,
        address: "GWALLET",
        crossmint: { apiKey: "ck_staging_test", jwt: "test-jwt" },
        clientTEEConnection: clientTEEConnection ?? { sendAction },
        onAuthRequired,
    } as unknown as EmailInternalSignerConfig | PhoneInternalSignerConfig;

    return { signer: new StellarNonCustodialSigner(config), sendAction, onAuthRequired };
}

/**
 * Mirrors the signer frame's transport: every request is answered asynchronously with a bare
 * response event that carries no reference to the request it answers.
 */
function frameConnection() {
    const listeners = new Map<string, (event: SimpleMessageEvent) => void>();
    const reply = (event: string, data: object) => {
        setTimeout(() => {
            for (const listener of listeners.values()) {
                listener({ type: "message", data: { event, data } });
            }
        }, 0);
    };
    const transport: Transport<typeof signerInboundEvents> = {
        send: ({ event, data }) => {
            if (event === "request:get-status") {
                reply("response:get-status", {
                    status: "success",
                    signerStatus: "ready",
                    publicKeys: { ed25519: PUBLIC_KEY },
                });
            }
            if (event === "request:sign") {
                reply("response:sign", {
                    status: "success",
                    signature: { bytes: `signed:${data.data.bytes}`, encoding: "base64" },
                    publicKey: PUBLIC_KEY,
                });
            }
        },
        addMessageListener: (listener) => {
            const id = String(listeners.size + 1);
            listeners.set(id, listener as (event: SimpleMessageEvent) => void);
            return id;
        },
        removeMessageListener: (id) => {
            listeners.delete(id);
        },
    };
    return new HandshakeParent(transport, {
        incomingEvents: signerOutboundEvents,
        outgoingEvents: signerInboundEvents,
    });
}

function requestData(sendAction: ReturnType<typeof makeSigner>["sendAction"], event: string) {
    const call = sendAction.mock.calls.find(([args]) => args.event === event);
    if (call == null) {
        throw new Error(`No ${event} request was sent to the signer`);
    }
    return (call[0] as unknown as { data: { data?: Record<string, unknown> } }).data.data;
}

describe("StellarNonCustodialSigner.signTransaction", () => {
    describe("when several payloads are signed at the same time", () => {
        test("each caller receives the signature of its own payload", async () => {
            const { signer } = makeSigner({ statusOnGetStatus: "ready", clientTEEConnection: frameConnection() });

            const [first, second] = await Promise.all([
                signer.signTransaction("Zmlyc3Q="),
                signer.signTransaction("c2Vjb25k"),
            ]);

            expect(first).toEqual({ signature: "signed:Zmlyc3Q=" });
            expect(second).toEqual({ signature: "signed:c2Vjb25k" });
        });

        test("signers sharing a frame connection each receive the signature of their own payload", async () => {
            const clientTEEConnection = frameConnection();
            const { signer: first } = makeSigner({ statusOnGetStatus: "ready", clientTEEConnection });
            const { signer: second } = makeSigner({ statusOnGetStatus: "ready", clientTEEConnection });

            const [firstSignature, secondSignature] = await Promise.all([
                first.signTransaction("Zmlyc3Q="),
                second.signTransaction("c2Vjb25k"),
            ]);

            expect(firstSignature).toEqual({ signature: "signed:Zmlyc3Q=" });
            expect(secondSignature).toEqual({ signature: "signed:c2Vjb25k" });
        });
    });

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

    describe("when the recovery method email is not in canonical form", () => {
        test("uses the canonical email for status, onboarding and signing", async () => {
            const { signer, sendAction } = makeSigner({
                statusOnGetStatus: "new-device",
                email: "Test.User@GoogleMail.com",
            });
            const canonicalAuthId = "email:testuser@gmail.com";

            await signer.signTransaction("cGF5bG9hZA==");

            expect(requestData(sendAction, "request:get-status")).toEqual({ authId: canonicalAuthId });
            expect(requestData(sendAction, "request:start-onboarding")).toEqual({ authId: canonicalAuthId });
            expect(requestData(sendAction, "request:sign")).toMatchObject({ authId: canonicalAuthId });
        });
    });
});
