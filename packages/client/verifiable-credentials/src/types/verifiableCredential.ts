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

export interface VerifiableCredentialEncryption {
    type: VerifiableCredentialEncryptionType;
    details?: string;
}

export enum VerifiableCredentialEncryptionType {
    NONE = "none",
    DECENTRALIZED = "decentralized-lit",
}

export interface VCContractMetadata {
    credentialMetadata: CredentialMetadata;
}

export interface CredentialMetadata {
    type: string[];
    encryption: VerifiableCredentialEncryption;
    credentialsEndpoint: string;
    issuerDid: string;
}

export type VerifiableCredentialType = VerifiableCredential | EncryptedVerifiableCredential;
