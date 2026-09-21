import { describe, expect, test } from "vitest";
import { recoveryMethodsFromCreateArgs } from "./recovery";
import { InvalidRecoveryConfigError } from "./errors";
import type { WalletCreateArgs } from "../wallets/types";

const API_KEY_METHOD = { type: "api-key" } as const;
const EMAIL_METHOD = { type: "email", email: "user@example.com" } as const;

type SolanaRecoveryArgs = Pick<WalletCreateArgs<"solana">, "recovery" | "recoveryMethods">;

describe("recoveryMethodsFromCreateArgs", () => {
    describe("when only recovery is given", () => {
        test("wraps the single method in a list", () => {
            expect(recoveryMethodsFromCreateArgs({ recovery: API_KEY_METHOD })).toEqual([API_KEY_METHOD]);
        });

        test("rejects the removed array form and names recoveryMethods as the replacement", () => {
            const legacyArgs = { recovery: [API_KEY_METHOD, EMAIL_METHOD] } as unknown as SolanaRecoveryArgs;

            expect(() => recoveryMethodsFromCreateArgs(legacyArgs)).toThrow(InvalidRecoveryConfigError);
            expect(() => recoveryMethodsFromCreateArgs(legacyArgs)).toThrow(/recoveryMethods/);
        });

        test("rejects an empty array under recovery", () => {
            const legacyArgs = { recovery: [] } as unknown as SolanaRecoveryArgs;

            expect(() => recoveryMethodsFromCreateArgs(legacyArgs)).toThrow(InvalidRecoveryConfigError);
        });
    });

    describe("when only recoveryMethods is given", () => {
        test("returns the list as is", () => {
            const recoveryMethods = [API_KEY_METHOD, EMAIL_METHOD];

            expect(recoveryMethodsFromCreateArgs({ recoveryMethods })).toBe(recoveryMethods);
        });

        test("rejects a single method that is not wrapped in an array", () => {
            const args = { recoveryMethods: API_KEY_METHOD } as unknown as SolanaRecoveryArgs;

            expect(() => recoveryMethodsFromCreateArgs(args)).toThrow(InvalidRecoveryConfigError);
            expect(() => recoveryMethodsFromCreateArgs(args)).toThrow(/`recovery`/);
        });
    });

    describe("when both fields are given", () => {
        test("rejects the combination", () => {
            expect(() =>
                recoveryMethodsFromCreateArgs({ recovery: API_KEY_METHOD, recoveryMethods: [EMAIL_METHOD] })
            ).toThrow(InvalidRecoveryConfigError);
        });
    });

    describe("when neither field is given", () => {
        test("returns an empty list", () => {
            expect(recoveryMethodsFromCreateArgs({})).toEqual([]);
        });
    });
});
