import { VCChain } from "./chain";
import { Nft } from "./nft";

export interface Collection {
    nfts: Nft[];
    contractAddress: string;
    chain: VCChain;
    metadata: any;
}

// VC Contract types

/**
 * CredentialsCollection is a collection of credentials nfts
 * @param nfts - List of nfts
 * @param contractAddress - Address of the contract associated with the collection
 * @param chain - Chain on which the contract is deployed
 * @param metadata - Metadata of the contract
 * @param metadata.credentialMetadata - Credentials specific metadata
 */
export interface CredentialsCollection extends Collection {
    metadata: VCContractMetadata;
}

export interface VCContractMetadata {
    credentialMetadata: CredentialMetadata;
}

/**
 * CredentialMetadata is credentials specific metadata inside the contract metadata
 * @param type - Specifies the type of the credentials in the collection
 * @param encryption - Specifies the encryption type of the credentials in the collection
 * @param credentialsEndpoint - Endpoint to fetch the credentials
 * @param issuerDid - DID of the issuer of the credentials for this collection
 */
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
    DECENTRALIZED_LIT = "decentralized-lit",
    CROSSMINT_RECOVERABLE = "crossmint-recoverable",
}
