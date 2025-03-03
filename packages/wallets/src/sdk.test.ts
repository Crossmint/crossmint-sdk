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
            apiKey: "sk_staging_A4vDwAp4t5az6fVQMpQK6qapBnAqgpxrrD35TaFQnyKgxehNbd959uZeaHjNCadWDXrgLRAK1CxeasZjtYEq4TbFkKMBBvbQ9oinAxQf8LbHsSYW2DMzT8fBko3YGLq9t7ZiXZjmgkTioxGVUUjyLtWLeBKwNUDLgpshWjaoR7pKRnSE9SqhwjQbiK62VKiBTdA3KvHsyG9k8mLMcKrDyfXp",
        });
    });

    describe("init", () => {
        it("should initialize the SDK correctly", () => {
            expect(sdk).toBeInstanceOf(WalletSDK);
        });
    });
});
