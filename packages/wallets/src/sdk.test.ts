import { beforeEach, describe, expect, it, vi } from "vitest";

import WalletSDK from "./sdk";

vi.mock("./services/logging");

// Mock global window object
vi.stubGlobal("window", {
    location: {
        origin: "http://localhost",
    },
});

describe("WalletSDK", () => {
    let sdk: WalletSDK;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        sdk = WalletSDK.from({
            apiKey: "sk_staging_test",
        });
    });

    describe("init", () => {
        it("should initialize the SDK correctly", () => {
            expect(sdk).toBeInstanceOf(WalletSDK);
        });
    });
});
