import { EVMNFT } from "@crossmint/common-sdk-base";

export interface VC_EVMNFT extends EVMNFT {
    metadata: any;
    locators: string;
    tokenStandard: string;
}

export interface CredentialsCollection {
    nfts: VC_EVMNFT[];
    contractAddress: string;
    metadata: {
        credentialMetadata: {
            type: string[];
            issuerDid: string;
            encryption: boolean;
            credentialsEndpoint: string;
            [key: string]: any;
        };
    };
}
