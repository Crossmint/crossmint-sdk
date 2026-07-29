import {
    type Chain,
    type DeviceSignerConfig,
    isQuorumRecovery,
    type SignerConfigForChain,
    type WalletCreateArgs,
} from "@crossmint/wallets-sdk";

type RecoveryConfig = WalletCreateArgs<Chain>["recovery"];
type RecoverySignerConfig = Exclude<SignerConfigForChain<Chain>, DeviceSignerConfig>;

/**
 * The signer configs a recovery carries: the signer itself for a flat recovery, or the member
 * signers for a quorum. Lets callers apply per-signer checks (e.g. "does this recovery involve
 * an email signer") without branching on the recovery's shape.
 */
export function recoverySigners(recovery: RecoveryConfig | undefined): RecoverySignerConfig[] {
    if (recovery == null) {
        return [];
    }
    return isQuorumRecovery(recovery) ? recovery.methods : [recovery];
}

/**
 * True when the logged-in user's email should be auto-filled into the recovery: exactly one
 * contained email signer is missing its `email`. Filling two or more quorum members with the
 * same address would create duplicate members (which the API rejects), so those configs pass
 * through untouched and validation surfaces the real problem.
 */
export function recoveryNeedsEmailAutoFill(recovery: RecoveryConfig | undefined): boolean {
    return recoverySigners(recovery).filter((signer) => signer.type === "email" && signer.email == null).length === 1;
}

/**
 * Returns a copy of the recovery with the single email signer missing `email` filled in, or the
 * original object when `recoveryNeedsEmailAutoFill` does not hold. Never mutates the input.
 */
export function fillRecoveryEmail(recovery: RecoveryConfig, email: string): RecoveryConfig {
    if (!recoveryNeedsEmailAutoFill(recovery)) {
        return recovery;
    }
    if (isQuorumRecovery(recovery)) {
        return {
            ...recovery,
            methods: recovery.methods.map((member) =>
                member.type === "email" && member.email == null ? { ...member, email } : member
            ),
        };
    }
    // recoveryNeedsEmailAutoFill guarantees the flat signer is an incomplete email signer,
    // but the type system needs the explicit narrow.
    return recovery.type === "email" ? { ...recovery, email } : recovery;
}
