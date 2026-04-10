export const SIGNER_TYPES = ["device", "passkey", "external-wallet"] as const;
export type SignerType = (typeof SIGNER_TYPES)[number];
