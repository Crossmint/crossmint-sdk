import type { VCChain } from "./chain";
import type { Nft } from "./nft";

/**
 * Collection represents a generic collection of NFTs.
 */
export interface Collection {
    /**
     * List of NFTs within the collection.
     */
    nfts: Nft[];

    /**
     * Address of the contract associated with the collection.
     */
    contractAddress: string;

    /**
     * The blockchain chain on which the contract is deployed.
     */
    chain: VCChain;

    /**
     * Metadata associated with the collection.
     */
    metadata: any;
}

// VC Contract types

/**
 * CredentialsCollection represents a collection of credential NFTs.
 *
 * @extends Collection
 */
export interface CredentialsCollection extends Collection {
    /**
     * Metadata of the contract, including credential-specific metadata.
     */
    metadata: VCContractMetadata;
}

/**
 * VCContractMetadata contains metadata related to the contract, including credentials specific metadata.
 */
export interface VCContractMetadata {
    /**
     * Credential-specific metadata inside the contract metadata.
     */
    credentialMetadata: CredentialMetadata;
}

/**
 * CredentialMetadata represents credentials-specific metadata inside the contract metadata.
 */
export interface CredentialMetadata {
    /**
     * Specifies the types of credentials in the collection.
     */
    type: string[];

    /**
     * Specifies the encryption type used for the credentials in the collection.
     */
    encryption: VerifiableCredentialEncryption;

    /**
     * Endpoint to fetch the credentials.
     */
    credentialsEndpoint: string;

    /**
     * The DID (Decentralized Identifier) of the issuer of the credentials for this collection.
     */
    issuerDid: string;
}

/**
 * VerifiableCredentialEncryption defines the encryption settings for verifiable credentials collection.
 */
export interface VerifiableCredentialEncryption {
    /**
     * Specifies the type of encryption used for the verifiable credentials.
     */
    type: VerifiableCredentialEncryptionType;

    /**
     * Optional additional details about the encryption useful for decryption.
     */
    details?: LitEncryptionDetails;
}

export interface LitEncryptionDetails {
    network: string;
}

/**
 * VerifiableCredentialEncryptionType defines the types of encryption used for the credentials.
 */
export enum VerifiableCredentialEncryptionType {
    /**
     * No encryption applied to the verifiable credentials.
     */
    NONE = "none",

    /**
     * Decentralized encryption using the Lit protocol.
     */
    DECENTRALIZED_LIT = "decentralized-lit",

    /**
     * Wallet based encryption that is recoverable via Crossmint.
     */
    CROSSMINT_RECOVERABLE = "crossmint-recoverable",
}
