import type { Chain } from "../chains/chains";
import type { RecoverySignerConfigFor } from "../wallets/types";
import type { WalletCreateArgs } from "../wallets/types";
import { InvalidRecoveryConfigError } from "./errors";

/** Reads and normalizes the recovery methods from creation args. */
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
    // Pre-1.17 callers on Solana and Stellar passed a list here. Reject it with a migration hint instead of
    // wrapping it into a one-entry list, which would slip past the chain checks and reach the API malformed.
    if (Array.isArray(args.recovery)) {
        throw new InvalidRecoveryConfigError(
            "`recovery` takes a single recovery method. To pass several, use `recoveryMethods: [...]` instead"
        );
    }
    return [args.recovery];
}
