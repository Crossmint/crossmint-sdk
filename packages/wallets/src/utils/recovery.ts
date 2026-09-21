import type { Chain } from "../chains/chains";
import { walletsLogger } from "../logger";
import type { RecoverySignerConfigFor } from "../wallets/types";
import type { WalletCreateArgs } from "../wallets/types";
import { InvalidRecoveryConfigError } from "./errors";

/**
 * Reads and normalizes the recovery methods from creation args.
 *
 * `recoveryMethods` is the source of truth. The deprecated `recovery` is routed to it: a single method becomes a
 * one-entry list, and a list is used as is, so pre-1.17 callers keep working.
 */
export function recoveryMethodsFromCreateArgs<C extends Chain>(
    args: Pick<WalletCreateArgs<C>, "recovery" | "recoveryMethods">
): Array<RecoverySignerConfigFor<C>> {
    if (args.recoveryMethods != null && args.recovery != null) {
        throw new InvalidRecoveryConfigError("Pass either `recovery` or `recoveryMethods`, not both");
    }
    if (args.recoveryMethods != null) {
        if (!Array.isArray(args.recoveryMethods)) {
            throw new InvalidRecoveryConfigError(
                "`recoveryMethods` must be an array of recovery methods. To pass a single recovery method, use `recovery`"
            );
        }
        return args.recoveryMethods;
    }
    if (args.recovery == null) {
        return [];
    }
    if (Array.isArray(args.recovery)) {
        walletsLogger.warn("wallet.create.recovery.deprecatedListForm", {
            message: "Passing a list to `recovery` is deprecated. Use `recoveryMethods` instead.",
            count: args.recovery.length,
        });
        return args.recovery;
    }
    return [args.recovery];
}

/** True when the caller supplied a list of recovery methods, through `recoveryMethods` or a list under the deprecated `recovery`. */
export function hasRecoveryMethodList<C extends Chain>(
    args: Pick<WalletCreateArgs<C>, "recovery" | "recoveryMethods">
): boolean {
    return args.recoveryMethods != null || Array.isArray(args.recovery);
}
