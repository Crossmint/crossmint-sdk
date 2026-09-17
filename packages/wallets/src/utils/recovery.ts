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
        return args.recoveryMethods;
    }
    if (args.recovery == null) {
        return [];
    }
    return [args.recovery];
}
