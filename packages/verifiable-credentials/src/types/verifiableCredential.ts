export interface VcNft {
    tokenId: string;
    chain: string;
    contractAddress: string;
}
export interface VerifiableCredential {
    id: string;
    credentialSubject: any;
    expirationDate?: string;
    nft: VcNft;
    issuer: { id: string };
    type: string[];
    issuanceDate: string;
    "@context": string[];
    credentialSchema: { id: string; type: string };
    proof?: { proofValue: string; [key: string]: any };
}
