export interface VcNft {
    tokenId: string;
    chain: string;
    contractAddress: string;
}
interface VerifiableCredentialCreationParams {
    id: string;
    credentialSubject: any;
    expirationDate?: string;
    nft: VcNft;
    issuer: { id: string };
    type: string[];
    issuanceDate: string;
}

export interface VerifiableCredential
    extends VerifiableCredentialCreationParams {
    "@context": string[];
    credentialSchema: { id: string; type: string };
    proof?: { proofValue: string; [key: string]: any };
}
