import { beforeEach, describe, expect, test, vi } from "vitest";
import { hasRecoveryMethodList, recoveryMethodsFromCreateArgs } from "./recovery";
import { InvalidRecoveryConfigError } from "./errors";
import { walletsLogger } from "../logger";
import type { WalletCreateArgs } from "../wallets/types";

const API_KEY_METHOD = { type: "api-key" } as const;
const EMAIL_METHOD = { type: "email", email: "user@example.com" } as const;

type SolanaRecoveryArgs = Pick<WalletCreateArgs<"solana">, "recovery" | "recoveryMethods">;

describe("recoveryMethodsFromCreateArgs", () => {
    beforeEach(() => {
        vi.spyOn(walletsLogger, "warn").mockReturnValue(undefined);
    });

    describe("when only recovery is given", () => {
        test("wraps a single method in a list", () => {
            expect(recoveryMethodsFromCreateArgs({ recovery: API_KEY_METHOD })).toEqual([API_KEY_METHOD]);
            expect(walletsLogger.warn).not.toHaveBeenCalled();
        });

        test("routes the deprecated list form to the method list unchanged", () => {
            const recovery = [API_KEY_METHOD, EMAIL_METHOD];

            expect(recoveryMethodsFromCreateArgs({ recovery })).toBe(recovery);
        });

        test("logs a deprecation warning for the list form", () => {
            recoveryMethodsFromCreateArgs({ recovery: [API_KEY_METHOD, EMAIL_METHOD] });

            expect(walletsLogger.warn).toHaveBeenCalledWith(
                "wallet.create.recovery.deprecatedListForm",
                expect.objectContaining({ count: 2 })
            );
        });

        test("returns an empty list for an empty deprecated list so the caller reports it as empty", () => {
            expect(recoveryMethodsFromCreateArgs({ recovery: [] })).toEqual([]);
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

        test("rejects the combination even when recovery is the deprecated list form", () => {
            expect(() =>
                recoveryMethodsFromCreateArgs({ recovery: [API_KEY_METHOD], recoveryMethods: [EMAIL_METHOD] })
            ).toThrow(InvalidRecoveryConfigError);
        });
    });

    describe("when neither field is given", () => {
        test("returns an empty list", () => {
            expect(recoveryMethodsFromCreateArgs({})).toEqual([]);
        });
    });
});

describe("hasRecoveryMethodList", () => {
    test("is true for recoveryMethods", () => {
        expect(hasRecoveryMethodList({ recoveryMethods: [API_KEY_METHOD] })).toBe(true);
    });

    test("is true for the deprecated list form of recovery", () => {
        expect(hasRecoveryMethodList({ recovery: [API_KEY_METHOD] })).toBe(true);
    });

    test("is false for a single recovery method", () => {
        expect(hasRecoveryMethodList({ recovery: API_KEY_METHOD })).toBe(false);
    });

    test("is false when neither field is given", () => {
        expect(hasRecoveryMethodList({})).toBe(false);
    });
});
