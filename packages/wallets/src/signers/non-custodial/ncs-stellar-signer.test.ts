import { describe, expect, test, vi } from "vitest";
import { encodeBase64 } from "@crossmint/client-signers-cryptography";

import type { EmailInternalSignerConfig, PhoneInternalSignerConfig } from "../types";
import { SignerKeyMismatchError } from "../types";
import { encodeStellarPublicKey } from "../../utils/stellar";
import { StellarNonCustodialSigner } from "./ncs-stellar-signer";

function randomKey() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return { bytes, address: encodeStellarPublicKey(bytes), base64: encodeBase64(bytes) };
}

const PHONE_KEY = randomKey();
const EMAIL_KEY = randomKey();
const EMAIL_AUTH_ID = "email:test@example.com";

/**
 * Simulates a signer frame whose device holds the keys of `deviceKey`, regardless of which
 * recovery method the SDK asks about.
 */
function makeSigner({
    deviceKey,
    signerAddress,
    statusOnStart = "ready",
}: {
    deviceKey: ReturnType<typeof randomKey>;
    signerAddress: string;
    statusOnStart?: "ready" | "new-device";
}) {
    const publicKeys = { ed25519: { bytes: deviceKey.base64, encoding: "base64", keyType: "ed25519" } };
    const sendAction = vi.fn(async (args: { event: string }) => {
        switch (args.event) {
            case "request:get-status":
                return { status: "success", signerStatus: "ready", publicKeys };
            case "request:start-onboarding":
                return { status: "success", signerStatus: statusOnStart, publicKeys };
            default:
                return {
                    status: "success",
                    signature: { bytes: "c2ln", encoding: "base64", keyType: "ed25519" },
                    publicKey: publicKeys.ed25519,
                };
        }
    });
    // Mirrors the UI layer: request the OTP as soon as auth is needed and swallow send failures.
    const onAuthRequired = vi.fn(
        async (_type: string, _locator: string, needsAuth: boolean, sendOtp: () => Promise<void>) => {
            if (needsAuth) {
                await sendOtp().catch(() => {});
            }
        }
    );
    const config = {
        type: "email",
        email: "test@example.com",
        locator: EMAIL_AUTH_ID,
        address: signerAddress,
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
    describe("when the device already holds the keys of the selected recovery method", () => {
        test("signs without re-onboarding and tells the frame which recovery method is signing", async () => {
            const { signer, sendAction, onAuthRequired } = makeSigner({
                deviceKey: EMAIL_KEY,
                signerAddress: EMAIL_KEY.address,
            });

            const result = await signer.signTransaction("cGF5bG9hZA==");

            expect(result).toEqual({ signature: "c2ln" });
            expect(onAuthRequired).not.toHaveBeenCalled();
            expect(requestData(sendAction, "request:get-status")).toEqual({ authId: EMAIL_AUTH_ID });
            expect(requestData(sendAction, "request:sign")).toMatchObject({ authId: EMAIL_AUTH_ID });
        });
    });

    describe("when the device holds the keys of another recovery method (phone onboarded, email selected)", () => {
        test("re-onboards the selected recovery method instead of trusting the frame's ready status", async () => {
            const { signer, sendAction, onAuthRequired } = makeSigner({
                deviceKey: PHONE_KEY,
                signerAddress: EMAIL_KEY.address,
            });

            await signer.signTransaction("cGF5bG9hZA==").catch(() => {});

            expect(onAuthRequired).toHaveBeenCalledWith(
                "email",
                EMAIL_AUTH_ID,
                true,
                expect.any(Function),
                expect.any(Function),
                expect.any(Function)
            );
            expect(requestData(sendAction, "request:start-onboarding")).toEqual({ authId: EMAIL_AUTH_ID });
        });

        test("fails with the two addresses when the frame keeps answering with the other recovery method's key", async () => {
            const { signer, sendAction } = makeSigner({ deviceKey: PHONE_KEY, signerAddress: EMAIL_KEY.address });

            const error = await signer.signTransaction("cGF5bG9hZA==").catch((e: unknown) => e);

            expect(error).toBeInstanceOf(SignerKeyMismatchError);
            expect(error).toMatchObject({ expectedAddress: EMAIL_KEY.address, actualAddress: PHONE_KEY.address });
            expect(sendAction.mock.calls.some(([args]) => args.event === "request:sign")).toBe(false);
        });
    });

    describe("when the recovery method has no registered address", () => {
        test("does not compare keys", async () => {
            const { signer } = makeSigner({ deviceKey: PHONE_KEY, signerAddress: "" });

            await expect(signer.signTransaction("cGF5bG9hZA==")).resolves.toEqual({ signature: "c2ln" });
        });
    });
});
