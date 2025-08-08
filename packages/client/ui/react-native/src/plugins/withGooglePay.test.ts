import { describe, it, expect, vi } from "vitest";
import { withGooglePay } from "./withGooglePay";
import type { ExpoConfig } from "@expo/config-types";

vi.mock("@expo/config-plugins", () => ({
    withAndroidManifest: vi.fn((config, callback) => callback(config)),
}));

describe("withGooglePay", () => {
    const mockConfig: ExpoConfig = {
        name: "test-app",
        slug: "test-app",
    };

    const mockAndroidManifest = {
        modResults: {
            manifest: {
                application: [
                    {
                        "meta-data": [],
                    },
                ],
                queries: [],
            },
        },
    };

    it("should return config unchanged when enableGooglePay is false", () => {
        const result = withGooglePay(mockConfig, { enableGooglePay: false });
        expect(result).toBe(mockConfig);
    });

    it("should return config unchanged when enableGooglePay is undefined", () => {
        const result = withGooglePay(mockConfig, {});
        expect(result).toBe(mockConfig);
    });

    it("should return config unchanged when no options provided", () => {
        const result = withGooglePay(mockConfig);
        expect(result).toBe(mockConfig);
    });

    it("should add Google Pay meta-data when enableGooglePay is true", () => {
        const configWithManifest = {
            ...mockConfig,
            ...mockAndroidManifest,
        };

        const result = withGooglePay(configWithManifest, { enableGooglePay: true });

        const metaData = result.modResults.manifest.application[0]["meta-data"];
        expect(metaData).toHaveLength(1);
        expect(metaData[0]).toEqual({
            $: {
                "android:name": "com.google.android.gms.wallet.api.enabled",
                "android:value": "true",
            },
        });
    });

    it("should add Google Pay queries when enableGooglePay is true", () => {
        const configWithManifest = {
            ...mockConfig,
            ...mockAndroidManifest,
        };

        const result = withGooglePay(configWithManifest, { enableGooglePay: true });

        const queries = result.modResults.manifest.queries;
        expect(queries).toHaveLength(3);

        expect(queries[0]).toEqual({
            intent: [
                {
                    action: [
                        {
                            $: {
                                "android:name": "org.chromium.intent.action.PAY",
                            },
                        },
                    ],
                },
            ],
        });

        expect(queries[1]).toEqual({
            intent: [
                {
                    action: [
                        {
                            $: {
                                "android:name": "org.chromium.intent.action.IS_READY_TO_PAY",
                            },
                        },
                    ],
                },
            ],
        });

        expect(queries[2]).toEqual({
            intent: [
                {
                    action: [
                        {
                            $: {
                                "android:name": "org.chromium.intent.action.UPDATE_PAYMENT_DETAILS",
                            },
                        },
                    ],
                },
            ],
        });
    });

    it("should not duplicate meta-data if it already exists", () => {
        const configWithExistingMetaData = {
            ...mockConfig,
            modResults: {
                manifest: {
                    application: [
                        {
                            "meta-data": [
                                {
                                    $: {
                                        "android:name": "com.google.android.gms.wallet.api.enabled",
                                        "android:value": "true",
                                    },
                                },
                            ],
                        },
                    ],
                    queries: [],
                },
            },
        };

        const result = withGooglePay(configWithExistingMetaData, { enableGooglePay: true });

        const metaData = result.modResults.manifest.application[0]["meta-data"];
        expect(metaData).toHaveLength(1);
    });

    it("should not duplicate queries if they already exist", () => {
        const configWithExistingQueries = {
            ...mockConfig,
            modResults: {
                manifest: {
                    application: [
                        {
                            "meta-data": [],
                        },
                    ],
                    queries: [
                        {
                            intent: [
                                {
                                    action: [
                                        {
                                            $: {
                                                "android:name": "org.chromium.intent.action.PAY",
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            },
        };

        const result = withGooglePay(configWithExistingQueries, { enableGooglePay: true });

        const queries = result.modResults.manifest.queries;
        expect(queries).toHaveLength(3);
    });

    it("should create meta-data array if it doesn't exist", () => {
        const configWithoutMetaData = {
            ...mockConfig,
            modResults: {
                manifest: {
                    application: [{}],
                    queries: [],
                },
            },
        };

        const result = withGooglePay(configWithoutMetaData, { enableGooglePay: true });

        const application = result.modResults.manifest.application[0];
        expect(application["meta-data"]).toBeDefined();
        expect(application["meta-data"]).toHaveLength(1);
    });

    it("should create queries array if it doesn't exist", () => {
        const configWithoutQueries = {
            ...mockConfig,
            modResults: {
                manifest: {
                    application: [
                        {
                            "meta-data": [],
                        },
                    ],
                },
            },
        };

        const result = withGooglePay(configWithoutQueries, { enableGooglePay: true });

        expect(result.modResults.manifest.queries).toBeDefined();
        expect(result.modResults.manifest.queries).toHaveLength(3);
    });

    it("should throw error if main application is not found", () => {
        const configWithoutApplication = {
            ...mockConfig,
            modResults: {
                manifest: {
                    application: [],
                },
            },
        };

        expect(() => {
            withGooglePay(configWithoutApplication, { enableGooglePay: true });
        }).toThrow("Unable to find main application in AndroidManifest.xml");
    });

    it("should throw error if manifest structure is invalid", () => {
        const configWithInvalidManifest = {
            ...mockConfig,
            modResults: {
                manifest: {},
            },
        };

        expect(() => {
            withGooglePay(configWithInvalidManifest, { enableGooglePay: true });
        }).toThrow("Unable to find main application in AndroidManifest.xml");
    });
});
