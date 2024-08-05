export const VCChain = {
    POLYGON: "polygon",
    POLYGON_AMOY: "polygon-amoy",
    POLY_AMOY: "poly-amoy", // Deprecated
} as const;

export type VCChain = (typeof VCChain)[keyof typeof VCChain];

/**
 * ChainRPCConfig is a mapping of chain to RPC endpoint
 * {
 *   polygon: "https://polygon.llamarpc.com/",
 * }
 */
export type ChainRPCConfig = Record<VCChain, string>;
