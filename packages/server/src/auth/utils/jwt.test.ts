import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createLocalJWKSet, decodeJwt, jwtVerify } from "jose";
import { createJWKSClient } from "./jwksClient";
import { errors } from "jose";
import { assertJwtAudience, verifyCrossmintJwt } from "./jwt";
import { CrossmintAuthenticationError } from "@crossmint/common-sdk-auth";
import type { JWK, KeyLike } from "jose";

const actualJose = await vi.importActual<typeof import("jose")>("jose");

vi.mock("jose", () => ({
    createRemoteJWKSet: vi.fn(),
    createLocalJWKSet: vi.fn(),
    decodeJwt: vi.fn(),
    jwtVerify: vi.fn(),
    errors: {
        JWTExpired: class JWTExpired extends Error {
            payload: { exp?: number };
            constructor(message: string, payload: { exp?: number }) {
                super(message);
                this.payload = payload;
            }
        },
        JWSSignatureVerificationFailed: class JWSSignatureVerificationFailed extends Error {},
    },
}));

vi.mock("./jwksClient", () => ({
    createJWKSClient: vi.fn(),
}));

describe("JWT Verification", () => {
    const mockToken = "mock.jwt.token";
    const mockJwksUri = "https://example.com/.well-known/jwks.json";
    const mockJwks = {} as any;
    const mockPayload = { sub: "123", iat: 1234567890 };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(createJWKSClient).mockReturnValue(mockJwks);
        vi.mocked(jwtVerify).mockReset();
    });

    describe("verifyCrossmintJwt", () => {
        it("verifies a valid JWT with the expected audience and required claims", async () => {
            vi.mocked(jwtVerify).mockResolvedValue({ payload: mockPayload } as any);

            const result = await verifyCrossmintJwt(mockToken, mockJwksUri, { audience: "project-a" });

            expect(createJWKSClient).toHaveBeenCalledWith(mockJwksUri);
            expect(jwtVerify).toHaveBeenCalledWith(mockToken, mockJwks, {
                audience: "project-a",
                algorithms: ["RS256"],
                requiredClaims: ["exp", "sub", "aud"],
            });
            expect(result).toEqual(mockPayload);
        });

        it("throws without options before creating the JWKS client or verifying the JWT", async () => {
            await expect(
                // @ts-expect-error Runtime callers may omit options.
                verifyCrossmintJwt(mockToken, mockJwksUri)
            ).rejects.toThrow(
                "verifyCrossmintJwt requires options.audience: the Crossmint project ID the JWT must be issued for"
            );

            expect(createJWKSClient).not.toHaveBeenCalled();
            expect(jwtVerify).not.toHaveBeenCalled();
        });

        it("throws with an empty audience before creating the JWKS client or verifying the JWT", async () => {
            await expect(verifyCrossmintJwt(mockToken, mockJwksUri, { audience: "" })).rejects.toThrow(
                "verifyCrossmintJwt requires options.audience: the Crossmint project ID the JWT must be issued for"
            );

            expect(createJWKSClient).not.toHaveBeenCalled();
            expect(jwtVerify).not.toHaveBeenCalled();
        });

        it("throws error for expired JWT", async () => {
            const expiredTimestamp = 1234567890;
            const expiredDate = new Date(expiredTimestamp * 1000).toISOString();

            vi.mocked(jwtVerify).mockRejectedValue(new errors.JWTExpired("token expired", { exp: expiredTimestamp }));

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri, { audience: "project-a" })).rejects.toThrow(
                `JWT provided expired at timestamp ${expiredDate}`
            );
        });

        it("handles expired JWT with unknown expiration", async () => {
            vi.mocked(jwtVerify).mockRejectedValue(new errors.JWTExpired("token expired", { exp: undefined }));

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri, { audience: "project-a" })).rejects.toThrow(
                "JWT provided expired at timestamp unknown"
            );
        });

        it("throws error for signature verification failure", async () => {
            vi.mocked(jwtVerify).mockRejectedValue(new errors.JWSSignatureVerificationFailed());

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri, { audience: "project-a" })).rejects.toThrow(
                "signature verification failed"
            );
        });

        it("throws error for invalid algorithm", async () => {
            vi.mocked(jwtVerify).mockRejectedValue(new Error("invalid algorithm"));

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri, { audience: "project-a" })).rejects.toThrow(
                "invalid algorithm"
            );
        });

        it("propagates unknown errors", async () => {
            const unknownError = new Error("unknown error");
            vi.mocked(jwtVerify).mockRejectedValue(unknownError);

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri, { audience: "project-a" })).rejects.toThrow(
                unknownError
            );
        });

        it("propagates JWKS client errors", async () => {
            const jwksError = new Error("JWKS client error");
            vi.mocked(createJWKSClient).mockImplementation(() => {
                throw jwksError;
            });

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri, { audience: "project-a" })).rejects.toThrow(
                jwksError
            );
        });
    });
});

describe("JWT audience validation", () => {
    let jwks: { keys: JWK[] };
    let privateKey: KeyLike;

    beforeAll(async () => {
        const keyPair = await actualJose.generateKeyPair("RS256");
        privateKey = keyPair.privateKey;
        const jwk = await actualJose.exportJWK(keyPair.publicKey);
        jwk.kid = "test-key";
        jwk.alg = "RS256";
        jwks = { keys: [jwk] };
    });

    beforeEach(() => {
        vi.mocked(jwtVerify).mockImplementation(actualJose.jwtVerify);
        vi.mocked(createLocalJWKSet).mockImplementation(actualJose.createLocalJWKSet);
        vi.mocked(decodeJwt).mockImplementation(actualJose.decodeJwt);
    });

    function signToken(payload: Record<string, unknown>) {
        return new actualJose.SignJWT(payload)
            .setProtectedHeader({ alg: "RS256", kid: "test-key" })
            .setIssuer("crossmint")
            .setSubject("user123")
            .setExpirationTime("1h")
            .sign(privateKey);
    }

    describe("verifyCrossmintJwt", () => {
        it("resolves the payload when the JWT audience matches the expected project", async () => {
            const token = await signToken({ aud: "project-a" });

            const payload = await verifyCrossmintJwt(token, jwks, { audience: "project-a" });

            expect(payload.sub).toBe("user123");
        });

        it("rejects when the JWT was issued for another project", async () => {
            const token = await signToken({ aud: "project-a" });

            await expect(verifyCrossmintJwt(token, jwks, { audience: "project-b" })).rejects.toThrow();
        });

        it("rejects when the JWT has no aud claim", async () => {
            const token = await signToken({});

            await expect(verifyCrossmintJwt(token, jwks, { audience: "project-b" })).rejects.toThrow();
        });

        it("rejects when the JWT has no exp claim", async () => {
            const token = await new actualJose.SignJWT({ aud: "project-a" })
                .setProtectedHeader({ alg: "RS256", kid: "test-key" })
                .setIssuer("crossmint")
                .setSubject("user123")
                .sign(privateKey);

            await expect(verifyCrossmintJwt(token, jwks, { audience: "project-a" })).rejects.toThrow();
        });

        it("rejects a JWT signed with a non-RS256 algorithm", async () => {
            const keyPair = await actualJose.generateKeyPair("RS512");
            const jwk = await actualJose.exportJWK(keyPair.publicKey);
            jwk.kid = "rs512-key";
            jwk.alg = "RS512";
            const localJwks = { keys: [jwk] };
            const token = await new actualJose.SignJWT({ aud: "project-a" })
                .setProtectedHeader({ alg: "RS512", kid: "rs512-key" })
                .setSubject("user123")
                .setExpirationTime("1h")
                .sign(keyPair.privateKey);

            await expect(verifyCrossmintJwt(token, localJwks, { audience: "project-a" })).rejects.toThrow();
        });

        it("resolves when the expected project is one of several JWT audiences", async () => {
            const token = await signToken({ aud: ["project-x", "project-b"] });

            const payload = await verifyCrossmintJwt(token, jwks, { audience: "project-b" });

            expect(payload.sub).toBe("user123");
        });
    });

    describe("assertJwtAudience", () => {
        function unsignedToken(payload: Record<string, unknown>) {
            return new actualJose.UnsecuredJWT(payload).setSubject("user123").encode();
        }

        it("passes when the aud claim matches the expected project", () => {
            const token = unsignedToken({ aud: "project-a" });

            expect(() => assertJwtAudience(token, "project-a")).not.toThrow();
        });

        it("passes when the expected project is one of several audiences", () => {
            const token = unsignedToken({ aud: ["project-x", "project-a"] });

            expect(() => assertJwtAudience(token, "project-a")).not.toThrow();
        });

        it("throws CrossmintAuthenticationError when the audience does not match", () => {
            const token = unsignedToken({ aud: "other-project" });

            expect(() => assertJwtAudience(token, "project-a")).toThrow(CrossmintAuthenticationError);
            expect(() => assertJwtAudience(token, "project-a")).toThrow(
                "JWT audience does not match the expected project"
            );
        });

        it("throws CrossmintAuthenticationError when the token has no aud claim", () => {
            const token = unsignedToken({});

            expect(() => assertJwtAudience(token, "project-a")).toThrow(CrossmintAuthenticationError);
        });

        it("throws CrossmintAuthenticationError when the token cannot be decoded", () => {
            expect(() => assertJwtAudience("not-a-jwt", "project-a")).toThrow(CrossmintAuthenticationError);
        });
    });
});
