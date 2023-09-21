import { EVMNFT } from "@crossmint/client-sdk-base";

export interface VerifiableCredential {
    id: string;
    credentialSubject: any;
    expirationDate?: string;
    nft: EVMNFT;
    issuer: { id: string };
    type: string[];
    issuanceDate: string;
    "@context": string[];
    credentialSchema: { id: string; type: string };
    proof?: { proofValue: string; [key: string]: any };
}
