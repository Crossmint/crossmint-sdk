import { VCNFTComplete } from "@/verifiableCredentialsSKD";

export interface CrossmintWalletNft extends VCNFTComplete {
    metadata: any;
    locators: string;
    tokenStandard: string;
}
