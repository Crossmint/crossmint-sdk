import { EVMNFT } from "@crossmint/common-sdk-base";

export interface VerifiableCredential {
    id: string;
    credentialSubject: any;
    expirationDate?: string;
    nft: EVMNFT;
    issuer: { id: string };
    type: string[];
    issuanceDate: string;
    "@context": string[];
    proof?: { proofValue: string; [key: string]: any };
}

export interface EncryptedVerifiableCredential {
    id: string;
    payload: string;
}

export type VerifiableCredentialType = VerifiableCredential | EncryptedVerifiableCredential;
