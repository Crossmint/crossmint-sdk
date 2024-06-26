import { VCChain } from "./chain";

export interface VCNFT {
    chain: VCChain;
    contractAddress: string;
    tokenId: string;
}

export interface VCNFTComplete extends VCNFT {
    metadata: any;
}
