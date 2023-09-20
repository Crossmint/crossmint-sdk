import { EVMNFT } from "@crossmint/client-sdk-base/src/types/blockchain";

interface VerifiableCredentialCreationParams {
    id: string;
    credentialSubject: any;
    expirationDate?: string;
    nft: EVMNFT;
    issuer: { id: string };
    type: string[];
    issuanceDate: string;
}

export interface VerifiableCredential extends VerifiableCredentialCreationParams {
    "@context": string[];
    credentialSchema: { id: string; type: string };
    proof?: { proofValue: string; [key: string]: any };
}
