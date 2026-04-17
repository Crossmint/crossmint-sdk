export const TOKENS = ["usdxm", "usdc"] as const;
export type Token = (typeof TOKENS)[number];
