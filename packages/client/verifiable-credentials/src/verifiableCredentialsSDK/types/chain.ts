export const VCChain = {
    POLYGON: "polygon",
    POLYGON_AMOY: "polygon-amoy",
    POLY_AMOY: "poly-amoy", // Deprecated
} as const;

export type VCChain = (typeof VCChain)[keyof typeof VCChain];

export type ChainRPCConfig = Record<VCChain, string>;
