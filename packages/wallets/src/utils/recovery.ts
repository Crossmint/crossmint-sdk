import type { Chain } from "../chains/chains";
import type { RecoverySignerConfigForChain } from "../signers/types";
import type { WalletCreateArgs } from "../wallets/types";

/** Normalizes the single-or-list `recovery` wallet creation argument into a list. */
export function toRecoverySignerList<C extends Chain>(
    recovery?: WalletCreateArgs<C>["recovery"]
): Array<RecoverySignerConfigForChain<C>> {
    if (recovery == null) {
        return [];
    }
    return (Array.isArray(recovery) ? recovery : [recovery]) as Array<RecoverySignerConfigForChain<C>>;
}
