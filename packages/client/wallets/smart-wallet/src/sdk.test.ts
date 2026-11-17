import { beforeEach, describe, expect, it, vi } from "vitest";

import { SmartWalletSDK } from "./sdk";

vi.mock("./services/logging");

// Mock global window object
vi.stubGlobal("window", {
    location: {
        origin: "http://localhost",
    },
});

describe("SmartWalletSDK", () => {
    let sdk: SmartWalletSDK;

    beforeEach(() => {
        if (process.env.PREVIEW_SK_KEY == null) {
            throw new Error("PREVIEW_SK_KEY must be set to run this test suite.");
        }
        // Reset mocks before each test
        vi.clearAllMocks();
        sdk = SmartWalletSDK.init({
            clientApiKey: process.env.PREVIEW_SK_KEY,
        });
    });

    describe("init", () => {
        it("should initialize the SDK correctly", () => {
            expect(sdk).toBeInstanceOf(SmartWalletSDK);
        });
    });
});
