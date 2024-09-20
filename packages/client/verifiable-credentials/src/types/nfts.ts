import type { NftWithMetadata } from "@/verifiableCredentialsSDK";

export interface CrossmintWalletNft extends NftWithMetadata {
    metadata: any;
    locators: string;
    tokenStandard: string;
}
