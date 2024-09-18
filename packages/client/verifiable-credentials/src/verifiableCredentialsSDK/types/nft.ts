import type { VCChain } from "./chain";

export interface Nft {
    chain: VCChain;
    contractAddress: string;
    tokenId: string;
    metadata?: any;
}

export interface NftWithMetadata extends Nft {
    metadata: any;
}
