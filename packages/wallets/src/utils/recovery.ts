import type { Chain } from "../chains/chains";
import type { RecoverySignerConfigForChain } from "../signers/types";
import type { WalletCreateArgs } from "../wallets/types";
import { InvalidRecoveryConfigError } from "./errors";

/** Reads the recovery methods from creation args, accepting the deprecated `recovery` alias. */
export function recoveryMethodsFromCreateArgs<C extends Chain>(
    args: Pick<WalletCreateArgs<C>, "recovery" | "recoveryMethods">
): WalletCreateArgs<C>["recoveryMethods"] {
    if (args.recoveryMethods != null && args.recovery != null) {
        throw new InvalidRecoveryConfigError("Pass either `recoveryMethods` or the deprecated `recovery`, not both");
    }
    return args.recoveryMethods ?? args.recovery;
}

/** Normalizes the single-or-list `recoveryMethods` wallet creation argument into a list. */
export function toRecoverySignerList<C extends Chain>(
    recovery?: WalletCreateArgs<C>["recoveryMethods"]
): Array<RecoverySignerConfigForChain<C>> {
    if (recovery == null) {
        return [];
    }
    return (Array.isArray(recovery) ? recovery : [recovery]) as Array<RecoverySignerConfigForChain<C>>;
}
