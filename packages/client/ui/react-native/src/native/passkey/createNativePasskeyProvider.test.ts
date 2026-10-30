import { describe, expect, it, vi } from "vitest";
import { createNativePasskeyProvider, type NativePasskeyModule } from "./createNativePasskeyProvider";
import { bytesToBase64Url } from "./webauthn";

const GX = "6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296";
const GY = "4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5";
const hexBytes = (hex: string) => Uint8Array.from(hex.match(/../g)!.map((byte) => Number.parseInt(byte, 16)));
// The P-256 generator point, as SPKI: any valid key works for the request-shape tests.
const GENERATOR_SPKI = bytesToBase64Url(
    hexBytes(`3059301306072a8648ce3d020106082a8648ce3d030107034200` + `04${GX}${GY}`)
);

function fakeModule(): NativePasskeyModule & { create: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> } {
    return {
        create: vi.fn().mockResolvedValue({
            id: "Y3JlZGVudGlhbA",
            response: { attestationObject: "", publicKey: GENERATOR_SPKI },
        }),
        get: vi.fn().mockRejectedValue(new Error("not used")),
    };
}

describe("createNativePasskeyProvider", () => {
    it("creates an ES256 passkey for the relying party, requiring user verification", async () => {
        const module = fakeModule();
        const provider = createNativePasskeyProvider({ rpId: "app.example.com", rpName: "Example", passkey: module });

        const created = await provider.createPasskey("My passkey");

        expect(created).toEqual({
            id: "Y3JlZGVudGlhbA",
            publicKey: {
                x: BigInt(`0x${GX}`).toString(),
                y: BigInt(`0x${GY}`).toString(),
            },
        });
        const request = module.create.mock.calls[0][0];
        expect(request).toMatchObject({
            rp: { id: "app.example.com", name: "Example" },
            user: { name: "My passkey", displayName: "My passkey" },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: { residentKey: "required", userVerification: "required" },
        });
        expect(request.challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it("signs the hex challenge as base64url with the given credential, requiring user verification", async () => {
        const module = fakeModule();
        module.get.mockRejectedValue(new Error("stop after the request"));
        const provider = createNativePasskeyProvider({ rpId: "app.example.com", passkey: module });

        await expect(provider.signWithPasskey(`0x${"ab".repeat(32)}`, "Y3JlZGVudGlhbA")).rejects.toThrow(
            "stop after the request"
        );

        expect(module.get).toHaveBeenCalledWith({
            challenge: "q6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6s",
            rpId: "app.example.com",
            allowCredentials: [{ type: "public-key", id: "Y3JlZGVudGlhbA" }],
            userVerification: "required",
        });
    });

    it("lets the system pick the passkey when the credential id is unknown", async () => {
        const module = fakeModule();
        const provider = createNativePasskeyProvider({ rpId: "app.example.com", passkey: module });

        await provider.signWithPasskey(`0x${"ab".repeat(32)}`).catch(() => undefined);

        expect(module.get.mock.calls[0][0].allowCredentials).toBeUndefined();
    });
});
