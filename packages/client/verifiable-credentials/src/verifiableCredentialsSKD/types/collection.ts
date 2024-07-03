import { VCChain } from "./chain";
import { Nft } from "./nft";

export interface Collection {
    nfts: Nft[];
    contractAddress: string;
    chain: VCChain;
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
    details?: LitEncryptionDetails;
}

export interface LitEncryptionDetails {
    network: string;
}

export enum VerifiableCredentialEncryptionType {
    NONE = "none",
    DECENTRALIZED = "decentralized-lit",
}
