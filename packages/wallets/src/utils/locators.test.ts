import { describe, expect, it } from "vitest";

import { toRecipientLocator, toTokenLocator } from "./locators";
import { InvalidAddressError } from "./errors";
import type { UserLocator } from "../wallets/types";

const VALID_EVM_RECIPIENT = "0x1111111111111111111111111111111111111111";
const VALID_SOLANA_RECIPIENT = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const VALID_STELLAR_RECIPIENT = `G${"A".repeat(55)}`;

describe("toRecipientLocator", () => {
    describe("string address branch", () => {
        it("passes a valid EVM address through unchanged", () => {
            expect(toRecipientLocator(VALID_EVM_RECIPIENT)).toBe(VALID_EVM_RECIPIENT);
        });

        it("passes a valid Solana address through unchanged", () => {
            expect(toRecipientLocator(VALID_SOLANA_RECIPIENT)).toBe(VALID_SOLANA_RECIPIENT);
        });

        it("passes a valid Stellar address through unchanged", () => {
            expect(toRecipientLocator(VALID_STELLAR_RECIPIENT)).toBe(VALID_STELLAR_RECIPIENT);
        });

        it("throws InvalidAddressError with exact message for an invalid address string", () => {
            expect(() => toRecipientLocator("not-a-valid-address")).toThrow(InvalidAddressError);
            expect(() => toRecipientLocator("not-a-valid-address")).toThrow(
                'Invalid recipient address: "not-a-valid-address". Expected a valid EVM (0x...), Solana (base58), or Stellar (G.../C...) address.'
            );
        });
    });

    describe("user locator arms", () => {
        it("maps email user locator to email: prefix", () => {
            expect(toRecipientLocator({ email: "user@example.com" })).toBe("email:user@example.com");
        });

        it("maps x user locator to x: prefix", () => {
            expect(toRecipientLocator({ x: "handle" })).toBe("x:handle");
        });

        it("maps twitter user locator to twitter: prefix without converting to x:", () => {
            const recipient = toRecipientLocator({ twitter: "handle" });
            expect(recipient).toBe("twitter:handle");
            expect(recipient).not.toBe("x:handle");
        });

        it("maps phone user locator to phoneNumber: prefix", () => {
            expect(toRecipientLocator({ phone: "+15555550123" })).toBe("phoneNumber:+15555550123");
        });

        it("maps userId user locator to userId: prefix", () => {
            expect(toRecipientLocator({ userId: "user-1" })).toBe("userId:user-1");
        });
    });

    describe("branch order", () => {
        it("prefers email over userId when both keys are present", () => {
            const locator = { email: "user@example.com", userId: "user-1" } as UserLocator;
            expect(toRecipientLocator(locator)).toBe("email:user@example.com");
        });

        it("prefers x over twitter when both keys are present", () => {
            const locator = { x: "xHandle", twitter: "twitterHandle" } as UserLocator;
            expect(toRecipientLocator(locator)).toBe("x:xHandle");
        });

        it("prefers phone over userId when both keys are present", () => {
            const locator = { phone: "+15555550123", userId: "user-1" } as UserLocator;
            expect(toRecipientLocator(locator)).toBe("phoneNumber:+15555550123");
        });
    });

    describe("terminal branch", () => {
        it("throws plain Error('Invalid recipient locator') for an object with no recognized keys", () => {
            expect(() => toRecipientLocator({} as UserLocator)).toThrow(Error);
            expect(() => toRecipientLocator({} as UserLocator)).toThrow("Invalid recipient locator");
            expect(() => toRecipientLocator({} as UserLocator)).not.toThrow(InvalidAddressError);
        });
    });
});

describe("toTokenLocator", () => {
    it("lowercases token symbols when building the token locator", () => {
        expect(toTokenLocator("USDC", "base-sepolia")).toBe("base-sepolia:usdc");
    });

    it("passes EVM token contract addresses through without lowercasing", () => {
        const mixedCaseTokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        expect(toTokenLocator(mixedCaseTokenAddress, "base-sepolia")).toBe(`base-sepolia:${mixedCaseTokenAddress}`);
    });

    it("passes Solana mint addresses through without lowercasing", () => {
        const mixedCaseMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        expect(toTokenLocator(mixedCaseMint, "solana")).toBe(`solana:${mixedCaseMint}`);
    });

    it("passes Stellar contract addresses through unmodified", () => {
        expect(toTokenLocator(VALID_STELLAR_RECIPIENT, "stellar")).toBe(`stellar:${VALID_STELLAR_RECIPIENT}`);
    });
});
