/** Signer types accepted as wallet recovery methods (device signers cannot be recovery methods). */
export const RECOVERY_METHOD_TYPES = ["email", "phone", "passkey", "external-wallet", "server"] as const;
export type RecoveryMethodType = (typeof RECOVERY_METHOD_TYPES)[number];

/** Chains that accept more than one recovery method and support adding/removing them after creation. */
export const MULTI_RECOVERY_CHAINS = ["solana", "stellar"] as const;
export type MultiRecoveryChain = (typeof MULTI_RECOVERY_CHAINS)[number];
