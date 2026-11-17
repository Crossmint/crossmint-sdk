import { describe, expect, test, vi } from "vitest";

import type { CrossmintEmbeddedOfframpProps } from "@/types/embedded-offramp/CrossmintEmbeddedOfframpProps";
import { createEmbeddedOfframpService } from "./embeddedOfframpService";

function makeApiClient(sdkMetadata = { name: "@crossmint/client-sdk-react-ui", version: "1.0.0" }) {
    return {
        buildUrl: (path: string) => `https://staging.crossmint.com${path}`,
        crossmint: { apiKey: "ck_staging_1" },
        internalConfig: { sdkMetadata },
    } as never;
}

const CREDENTIALS = { sessionId: "ofs_1", clientSecret: "jwt" };

function iframeUrl(props: Record<string, unknown>, apiClient = makeApiClient()) {
    return new URL(
        createEmbeddedOfframpService({ apiClient }).iframe.getUrl({
            credentials: CREDENTIALS,
            payer: { signAndSendTransaction: vi.fn() },
            ...props,
        } as CrossmintEmbeddedOfframpProps)
    );
}

describe("embeddedOfframpService", () => {
    describe("iframe.getUrl", () => {
        test("points at the standalone embedded-offramp route", () => {
            expect(iframeUrl({}).pathname).toBe("/sdk/unstable/embedded-offramp");
        });

        test("serializes credentials, appearance and locale the way the route parses them", () => {
            const appearance = { variables: { colors: { backgroundPrimary: "#060510" } } };

            const url = iframeUrl({ appearance, locale: "es-ES" });

            expect(JSON.parse(url.searchParams.get("credentials") ?? "")).toEqual(CREDENTIALS);
            expect(JSON.parse(url.searchParams.get("appearance") ?? "")).toEqual(appearance);
            expect(url.searchParams.get("locale")).toBe("es-ES");
            expect(url.searchParams.get("apiKey")).toBe("ck_staging_1");
        });

        test("omits the payer and the callbacks from the query string", () => {
            const url = iframeUrl({
                onReady: vi.fn(),
                onStatusChange: vi.fn(),
                onComplete: vi.fn(),
                onCancel: vi.fn(),
                onError: vi.fn(),
            });

            for (const key of ["payer", "onReady", "onStatusChange", "onComplete", "onCancel", "onError"]) {
                expect(url.searchParams.has(key)).toBe(false);
            }
        });

        test("adds fill=true only when fill is on", () => {
            expect(iframeUrl({ fill: true }).searchParams.get("fill")).toBe("true");
            expect(iframeUrl({ fill: false }).searchParams.has("fill")).toBe(false);
            expect(iframeUrl({}).searchParams.has("fill")).toBe(false);
        });

        describe("when the sdk metadata exceeds the route's limits", () => {
            test("truncates name to 64 and version to 32 so the route does not drop it", () => {
                const url = iframeUrl({}, makeApiClient({ name: "n".repeat(100), version: "1".repeat(50) }));

                expect(JSON.parse(url.searchParams.get("sdkMetadata") ?? "")).toEqual({
                    name: "n".repeat(64),
                    version: "1".repeat(32),
                });
            });
        });
    });
});
