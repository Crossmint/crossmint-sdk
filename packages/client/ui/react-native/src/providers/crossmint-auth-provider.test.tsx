import { act, cleanup, render } from "@testing-library/react";
import type React from "react";
import { useContext } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { getPkceChallenge, type StorageProvider } from "@crossmint/client-sdk-auth";

import { AuthContext, CrossmintAuthProvider } from "./CrossmintAuthProvider";
import type { RNAuthContext } from "@/types/auth";

const { crossmintAuth } = vi.hoisted(() => ({
    crossmintAuth: {
        getOAuthUrl: vi.fn(),
        handleRefreshAuthMaterial: vi.fn(),
    },
}));

vi.mock("@crossmint/client-sdk-react-base", () => ({
    CrossmintAuthBaseProvider: ({ children }: { children: React.ReactNode }) => children,
    useCrossmintAuthBase: () => ({ crossmintAuth, user: undefined, jwt: undefined, status: "logged-out" }),
}));

vi.mock("../hooks", () => ({
    useCrossmint: () => ({ setJwt: vi.fn() }),
    useCrossmintAuth: () => ({ jwt: undefined }),
}));

vi.mock("expo-web-browser", () => ({
    warmUpAsync: vi.fn(),
    coolDownAsync: vi.fn(),
    openBrowserAsync: vi.fn(),
    openAuthSessionAsync: vi.fn(),
}));

vi.mock("expo-constants", () => ({ default: { expoConfig: { scheme: "crossmint-wallets" } } }));

vi.mock("react-native", () => ({ Platform: { OS: "android" } }));

vi.mock("../utils/SecureStorage", () => ({ SecureStorage: class {} }));

function createMemoryStorage(): StorageProvider {
    const values = new Map<string, string>();
    return {
        get: (key) => Promise.resolve(values.get(key)),
        set: (key, value) => {
            values.set(key, value);
            return Promise.resolve();
        },
        remove: (key) => {
            values.delete(key);
            return Promise.resolve();
        },
    };
}

async function renderProvider(props: { storageProvider: StorageProvider; refreshRoute?: string }) {
    let auth: RNAuthContext | undefined;
    function Consumer() {
        auth = useContext(AuthContext);
        return null;
    }
    await act(async () => {
        render(
            <CrossmintAuthProvider {...props}>
                <Consumer />
            </CrossmintAuthProvider>
        );
        await Promise.resolve();
    });
    return () => auth as RNAuthContext;
}

function sentCodeChallenge() {
    return crossmintAuth.getOAuthUrl.mock.lastCall?.[1]?.codeChallenge;
}

describe("CrossmintAuthProvider OAuth login on Android", () => {
    beforeEach(() => {
        crossmintAuth.getOAuthUrl.mockResolvedValue("https://auth.example.com/oauth");
        crossmintAuth.handleRefreshAuthMaterial.mockResolvedValue({ jwt: "jwt" });
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    test("redeems the one-time secret with the verifier of the challenge it sent, after the app restarts", async () => {
        const storageProvider = createMemoryStorage();
        const auth = await renderProvider({ storageProvider });
        await act(() => auth().loginWithOAuth("google"));
        const codeChallenge = sentCodeChallenge();
        cleanup();

        const restartedAuth = await renderProvider({ storageProvider });
        await act(() => restartedAuth().createAuthSession("crossmint-wallets://?oneTimeSecret=secret"));

        const codeVerifier = crossmintAuth.handleRefreshAuthMaterial.mock.lastCall?.[1];
        expect(crossmintAuth.handleRefreshAuthMaterial).toHaveBeenCalledWith("secret", expect.any(String));
        expect(getPkceChallenge(codeVerifier)).toEqual(codeChallenge);
        expect(await storageProvider.get("crossmint-oauth-code-verifier")).toBeUndefined();
    });

    test("sends no challenge or verifier when the app uses a custom refresh route", async () => {
        const auth = await renderProvider({ storageProvider: createMemoryStorage(), refreshRoute: "/api/refresh" });
        await act(() => auth().loginWithOAuth("google"));

        await act(() => auth().createAuthSession("secret"));

        expect(sentCodeChallenge()).toBeUndefined();
        expect(crossmintAuth.handleRefreshAuthMaterial).toHaveBeenCalledWith("secret", undefined);
    });
});
