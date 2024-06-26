export const VCChain = {
    POLYGON: "polygon",
    POLYGON_MUMBAI: "polygon-mumbai",
    POLYGON_AMOY: "polygon-amoy",
    POLY_AMOY: "poly-amoy", // Deprecated
} as const;
export type VCChain = (typeof VCChain)[keyof typeof VCChain];

export interface VCNFT {
    chain: VCChain;
    contractAddress: string;
    tokenId: string;
}

export interface VCNFTComplete extends VCNFT {
    metadata: any;
}
