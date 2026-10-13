import { beforeAll, describe, expect, it } from "vitest";
import { exportJWK, generateKeyPair, SignJWT, UnsecuredJWT, type JWK, type KeyLike } from "jose";
import { CrossmintAuthenticationError } from "@crossmint/common-sdk-auth";

import { assertJwtAudience, verifyCrossmintJwt } from "./jwt";

describe("verifyCrossmintJwt audience validation", () => {
    let jwks: { keys: JWK[] };
    let privateKey: KeyLike;

    beforeAll(async () => {
        const keyPair = await generateKeyPair("RS256");
        privateKey = keyPair.privateKey;
        const jwk = await exportJWK(keyPair.publicKey);
        jwk.kid = "test-key";
        jwk.alg = "RS256";
        jwks = { keys: [jwk] };
    });

    async function signToken(payload: Record<string, unknown>) {
        return new SignJWT(payload)
            .setProtectedHeader({ alg: "RS256", kid: "test-key" })
            .setIssuer("crossmint")
            .setSubject("user123")
            .setExpirationTime("1h")
            .sign(privateKey);
    }

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

    it("resolves when the expected project is one of several JWT audiences", async () => {
        const token = await signToken({ aud: ["project-x", "project-b"] });

        const payload = await verifyCrossmintJwt(token, jwks, { audience: "project-b" });

        expect(payload.sub).toBe("user123");
    });
});

describe("assertJwtAudience", () => {
    function unsignedToken(payload: Record<string, unknown>) {
        return new UnsecuredJWT(payload).setSubject("user123").encode();
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
        expect(() => assertJwtAudience(token, "project-a")).toThrow("JWT audience does not match the expected project");
    });

    it("throws CrossmintAuthenticationError when the token has no aud claim", () => {
        const token = unsignedToken({});

        expect(() => assertJwtAudience(token, "project-a")).toThrow(CrossmintAuthenticationError);
    });

    it("throws CrossmintAuthenticationError when the token cannot be decoded", () => {
        expect(() => assertJwtAudience("not-a-jwt", "project-a")).toThrow(CrossmintAuthenticationError);
    });
});
