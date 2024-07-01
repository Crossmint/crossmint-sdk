import { NftWithMetadata } from "@/verifiableCredentialsSKD";

export interface CrossmintWalletNft extends NftWithMetadata {
    metadata: any;
    locators: string;
    tokenStandard: string;
}
