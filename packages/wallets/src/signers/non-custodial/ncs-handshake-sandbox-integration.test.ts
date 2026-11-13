import { Keypair } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import type { EmailInternalSignerConfig } from "../types";
import { SandboxNcsConnection } from "../../testing/ncs-handshake-sandbox";
import { SolanaNonCustodialSigner } from "./ncs-solana-signer";

const SIGNER_KEYPAIR = Keypair.generate();

function makeConfig(
    sandbox: SandboxNcsConnection,
    onAuthRequired: EmailInternalSignerConfig["onAuthRequired"]
): EmailInternalSignerConfig {
    return {
        type: "email",
        email: "test@example.com",
        locator: "email:test@example.com",
        address: SIGNER_KEYPAIR.publicKey.toBase58(),
        crossmint: { apiKey: "ck_staging_test", jwt: "test-jwt" },
        clientTEEConnection: sandbox.createConnection(),
        onAuthRequired,
    } as unknown as EmailInternalSignerConfig;
}

describe("NonCustodialSigner — onboarding driven through the TEE sandbox", () => {
    it("resolves immediately as ready when the fixture already reports ready, skipping OTP", async () => {
        const sandbox = new SandboxNcsConnection();
        const onAuthRequired = vi.fn();

        const signer = new SolanaNonCustodialSigner(makeConfig(sandbox, onAuthRequired));
        await signer.ensureAuthenticated();

        expect(onAuthRequired).not.toHaveBeenCalled();
    });

    it("takes the OTP path when the fixture reports a new device, reaching ready after verification", async () => {
        const sandbox = new SandboxNcsConnection();
        sandbox.setSignerStatus("new-device");

        const onAuthRequired = vi.fn(async (_type, _locator, needsAuth, sendOtp, verifyOtp) => {
            if (!needsAuth) {
                return;
            }
            await sendOtp();
            await verifyOtp("encrypted-otp");
        });

        const signer = new SolanaNonCustodialSigner(makeConfig(sandbox, onAuthRequired));
        await signer.ensureAuthenticated();

        expect(onAuthRequired).toHaveBeenCalledTimes(2);
        expect(onAuthRequired).toHaveBeenNthCalledWith(
            1,
            "email",
            "email:test@example.com",
            true,
            expect.any(Function),
            expect.any(Function),
            expect.any(Function)
        );
        expect(onAuthRequired).toHaveBeenNthCalledWith(
            2,
            "email",
            "email:test@example.com",
            false,
            expect.any(Function),
            expect.any(Function),
            expect.any(Function)
        );
    });
});
