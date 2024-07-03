import { VCChain } from "./chain";

export interface Nft {
    chain: VCChain;
    contractAddress: string;
    tokenId: string;
}

export interface NftWithMetadata extends Nft {
    metadata: any;
}
