import { EVMBlockchain, EVMNFT } from "@crossmint/common-sdk-base";

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

export function parseLocator(locator: string): EVMNFT {
    const items = locator.split(":");
    const itemsLength = items.length;
    if (itemsLength < 2) {
        throw new Error(`Invalid locator format, expected <chain>:<contractAddress>:<tokenId>`);
    }

    return {
        chain: items[0] as EVMBlockchain,
        contractAddress: items[1],
        tokenId: items[2],
    };
}
