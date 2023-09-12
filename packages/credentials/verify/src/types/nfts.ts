export interface EVMNFT {
    chain: string;
    contractAddress: string;
    tokenId: string;
    metadata: any;
    locators: string;
    tokenStandard: string;
}

export interface CredentialsCollection {
    nfts: EVMNFT[];
    contractAddress: string;
    metadata?: any;
}
