import { EVMNFT } from "@crossmint/client-sdk-base";

export interface VC_EVMNFT extends EVMNFT {
    metadata: any;
    locators: string;
    tokenStandard: string;
}

export interface CredentialsCollection {
    nfts: VC_EVMNFT[];
    contractAddress: string;
    metadata?: {
        credentials: {
            types: string[];
            [key: string]: any;
        };
    };
}
