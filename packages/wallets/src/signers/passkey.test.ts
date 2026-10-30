import { WebAuthnP256 } from "ox";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PasskeyInternalSignerConfig, PasskeySignResult } from "./types";
import { PasskeySigner } from "./passkey";

vi.mock("ox", async () => {
    const actual = await vi.importActual<typeof import("ox")>("ox");
    return { ...actual, WebAuthnP256: { ...actual.WebAuthnP256, sign: vi.fn() } };
});

const RP_ID_HASH = "8ce59ed7bf9a179c701898023a4171cc52c0b15a91cfda0defb35609c06a5904";

function signResult(flags: string): PasskeySignResult {
    return {
        signature: { r: "0x1", s: "0x2" },
        metadata: {
            authenticatorData: `0x${RP_ID_HASH}${flags}00000000`,
            challengeIndex: 23,
            clientDataJSON: '{"type":"webauthn.get","challenge":"abc"}',
            typeIndex: 1,
            userVerificationRequired: false,
        },
    };
}

function signerWithoutCallback(): PasskeySigner {
    return new PasskeySigner({
        type: "passkey",
        id: "credential-id",
        locator: "evm-passkey:credential-id",
    } as PasskeyInternalSignerConfig);
}

type WebAuthnAssertion = Awaited<ReturnType<typeof WebAuthnP256.sign>>;

function webAuthnAssertion(flags: string): WebAuthnAssertion {
    return { signature: { r: 1n, s: 2n }, metadata: signResult(flags).metadata };
}

function signerWithCallback(result: PasskeySignResult): PasskeySigner {
    return new PasskeySigner({
        type: "passkey",
        id: "credential-id",
        locator: "evm-passkey:credential-id",
        onSignWithPasskey: async () => result,
    } as PasskeyInternalSignerConfig);
}

describe("PasskeySigner", () => {
    afterEach(() => {
        vi.mocked(WebAuthnP256.sign).mockReset();
    });

    it("passes its credential id to onSignWithPasskey, so a native passkey API can select the passkey", async () => {
        const onSignWithPasskey = vi.fn().mockResolvedValue(signResult("1d"));
        const signer = new PasskeySigner({
            type: "passkey",
            id: "credential-id",
            locator: "passkey:credential-id",
            onSignWithPasskey,
        } as PasskeyInternalSignerConfig);

        await signer.signMessage("0xdeadbeef");

        expect(onSignWithPasskey).toHaveBeenCalledWith("0xdeadbeef", "credential-id");
    });

    describe("when the onSignWithPasskey callback returns a user-verified assertion", () => {
        it("returns it unchanged", async () => {
            const result = signResult("1d");

            await expect(signerWithCallback(result).signMessage("0xdeadbeef")).resolves.toEqual(result);
        });
    });

    describe("when the onSignWithPasskey callback returns an assertion without user verification", () => {
        it("throws so the caller does not submit a signature the on-chain verifier rejects", async () => {
            await expect(signerWithCallback(signResult("19")).signMessage("0xdeadbeef")).rejects.toThrow(
                'Request the assertion with `userVerification: "required"`'
            );
        });
    });

    describe("when the browser's WebAuthn API returns a user-verified assertion", () => {
        it("returns the signature and metadata", async () => {
            vi.mocked(WebAuthnP256.sign).mockResolvedValue(webAuthnAssertion("1d"));

            const result = await signerWithoutCallback().signMessage("0xdeadbeef");

            expect(WebAuthnP256.sign).toHaveBeenCalledWith({ credentialId: "credential-id", challenge: "0xdeadbeef" });
            expect(result.signature).toEqual({ r: "0x1", s: "0x2" });
            expect(result.metadata.authenticatorData).toBe(signResult("1d").metadata.authenticatorData);
        });
    });

    describe("when the browser's WebAuthn API returns an assertion without user verification", () => {
        it("throws instead of forwarding a signature the on-chain verifier will reject", async () => {
            vi.mocked(WebAuthnP256.sign).mockResolvedValue(webAuthnAssertion("19"));

            await expect(signerWithoutCallback().signMessage("0xdeadbeef")).rejects.toThrow(
                "The passkey provider skipped the biometrics or PIN check"
            );
        });
    });
});
