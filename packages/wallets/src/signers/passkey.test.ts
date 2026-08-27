import { describe, expect, it } from "vitest";
import type { PasskeyInternalSignerConfig, PasskeySignResult } from "./types";
import { PasskeySigner } from "./passkey";

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

function signerWithCallback(result: PasskeySignResult): PasskeySigner {
    return new PasskeySigner({
        type: "passkey",
        id: "credential-id",
        locator: "evm-passkey:credential-id",
        onSignWithPasskey: async () => result,
    } as PasskeyInternalSignerConfig);
}

describe("PasskeySigner", () => {
    describe("when the onSignWithPasskey callback returns a user-verified assertion", () => {
        it("returns it unchanged", async () => {
            const result = signResult("1d");

            await expect(signerWithCallback(result).signMessage("0xdeadbeef")).resolves.toEqual(result);
        });
    });

    describe("when the onSignWithPasskey callback returns an assertion without user verification", () => {
        it("throws so the caller does not submit a signature the on-chain verifier rejects", async () => {
            await expect(signerWithCallback(signResult("19")).signMessage("0xdeadbeef")).rejects.toThrow(
                "without user verification"
            );
        });
    });
});
