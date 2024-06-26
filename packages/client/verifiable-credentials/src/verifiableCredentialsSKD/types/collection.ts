import { VCNFT } from "./nft";

export interface Collection {
    nfts: VCNFT[];
    contractAddress: string;
    metadata: any;
}

// VC Contract types

export interface CredentialsCollection extends Collection {
    metadata: VCContractMetadata;
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

export interface VerifiableCredentialEncryption {
    type: VerifiableCredentialEncryptionType;
    details?: string;
}

export enum VerifiableCredentialEncryptionType {
    NONE = "none",
    DECENTRALIZED = "decentralized-lit",
}
