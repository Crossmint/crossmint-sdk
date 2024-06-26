import { VCNFTComplete } from "@/verifiableCredentialsSKD/types/nft";

export interface CrossmintWalletNft extends VCNFTComplete {
    metadata: any;
    locators: string;
    tokenStandard: string;
}
