import base58 from "bs58";
import { describe, expect, test } from "vitest";

import { CrossmintApiClient } from "./CrossmintApiClient";

const INTERNAL_CONFIG = { sdkMetadata: { name: "@crossmint/test-sdk", version: "0.0.0" } };

describe("CrossmintApiClient construction", () => {
    test("throws before any request when the API key signature does not verify", () => {
        const apiKey = `sk_staging_${base58.encode(
            new TextEncoder().encode(
                "invalid_data:invalid_signature_12345678901234567890123456789012345678901234567890"
            )
        )}`;

        expect(() => new CrossmintApiClient({ apiKey }, { internalConfig: INTERNAL_CONFIG })).toThrow(
            "Invalid API key"
        );
    });
});
