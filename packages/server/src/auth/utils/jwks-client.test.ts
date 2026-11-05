import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT, type JWK, type KeyLike } from "jose";
import { createJWKSClient } from "./jwksClient";
import { JwksUnavailableError, verifyCrossmintJwt } from "./jwt";

// Runs verifyCrossmintJwt against a real JWKS endpoint on localhost, with only Date faked to move key age.

const AUDIENCE = "project-a";
const MINUTE = 60 * 1000;

type EndpointState = "up" | "down" | "hanging";

type JwksEndpoint = {
    uri: string;
    state: EndpointState;
    requests: number;
    addKey(kid: string): Promise<void>;
    sign(kid: string): Promise<string>;
    close(): Promise<void>;
};

async function startJwksEndpoint(): Promise<JwksEndpoint> {
    const privateKeys = new Map<string, KeyLike>();
    const publicJwks: JWK[] = [];

    const endpoint = {
        state: "up" as EndpointState,
        requests: 0,
        async addKey(kid: string) {
            const { publicKey, privateKey } = await generateKeyPair("RS256");
            privateKeys.set(kid, privateKey);
            publicJwks.push({ ...(await exportJWK(publicKey)), kid, alg: "RS256", use: "sig" });
        },
        sign(kid: string) {
            const key = privateKeys.get(kid);
            if (key == null) {
                throw new Error(`no key ${kid}`);
            }
            return new SignJWT({})
                .setProtectedHeader({ alg: "RS256", kid })
                .setSubject("user-1")
                .setAudience(AUDIENCE)
                .setIssuedAt()
                .setExpirationTime("1d")
                .sign(key);
        },
    };

    const server: Server = createServer((_req, res) => {
        endpoint.requests++;
        if (endpoint.state === "hanging") {
            return; // never answers; closed in close()
        }
        if (endpoint.state === "down") {
            res.writeHead(503).end();
            return;
        }
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ keys: publicJwks }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    await endpoint.addKey("key-1");
    return Object.assign(endpoint, {
        // a new port per endpoint, so each test gets its own cached client
        uri: `http://127.0.0.1:${port}/.well-known/jwks.json`,
        close: () => {
            server.closeAllConnections();
            return new Promise<void>((resolve) => server.close(() => resolve()));
        },
    });
}

describe("createJWKSClient", () => {
    let endpoint: JwksEndpoint;
    let start: number;

    function at(minutes: number) {
        vi.setSystemTime(start + minutes * MINUTE);
    }

    async function verify(kid = "key-1") {
        return verifyCrossmintJwt(await endpoint.sign(kid), endpoint.uri, { audience: AUDIENCE });
    }

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ["Date"] });
        start = Date.now();
        endpoint = await startJwksEndpoint();
    });

    afterEach(async () => {
        await endpoint.close();
        vi.useRealTimers();
    });

    it("returns the same client for the same URI", () => {
        expect(createJWKSClient(endpoint.uri)).toBe(createJWKSClient(endpoint.uri));
    });

    it("throws for a URI that is not a URL", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});

        expect(() => createJWKSClient("not a url")).toThrow("Unable to create JWKS client");
    });

    describe("when the keys are younger than 10 minutes", () => {
        it("verifies without downloading them again", async () => {
            await verify();
            at(9);
            await verify();

            expect(endpoint.requests).toBe(1);
        });
    });

    describe("when the keys are older than 10 minutes", () => {
        it("verifies with them right away and re-downloads them in the background", async () => {
            await verify();
            endpoint.state = "hanging";
            at(11);

            await expect(verify()).resolves.toMatchObject({ sub: "user-1" });
            await vi.waitFor(() => expect(endpoint.requests).toBe(2));
        });

        it("keeps using them while the endpoint fails, retrying at most every 30 seconds", async () => {
            await verify();
            endpoint.state = "down";

            at(11);
            await verify();
            await verify();
            at(59);
            await verify();

            // the first verification at 10 minutes, then the one at 59; not the second at 10
            await vi.waitFor(() => expect(endpoint.requests).toBe(3));
        });
    });

    describe("when no download has succeeded for an hour", () => {
        it("fails until the endpoint answers again", async () => {
            await verify();
            endpoint.state = "down";
            at(61);

            await expect(verify()).rejects.toBeInstanceOf(JwksUnavailableError);

            endpoint.state = "up";
            await expect(verify()).resolves.toMatchObject({ sub: "user-1" });
        });
    });

    describe("when a token is signed with a key it has not seen", () => {
        it("downloads the keys again before verifying", async () => {
            await verify();
            await endpoint.addKey("key-2");
            // jose waits 30 seconds between downloads triggered by unknown keys
            at(1);

            await expect(verify("key-2")).resolves.toMatchObject({ sub: "user-1" });
            expect(endpoint.requests).toBe(2);
        });
    });
});
