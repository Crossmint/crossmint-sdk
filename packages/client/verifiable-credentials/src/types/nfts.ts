import { EVMNFT } from "@crossmint/common-sdk-base";

import { VCContractMetadata } from "./verifiableCredential";

export interface VC_EVMNFT extends EVMNFT {
    metadata: any;
    locators: string;
    tokenStandard: string;
}

export interface Collection {
    nfts: VC_EVMNFT[];
    contractAddress: string;
    metadata: any;
}
export interface CredentialsCollection extends Collection {
    metadata: VCContractMetadata;
}
