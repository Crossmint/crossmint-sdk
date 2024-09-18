import { IPFSService } from "../services/ipfs";
import type { CredentialsCollection } from "../types/collection";
import { isCredentialType, isVerifiableCredentialContractMetadata } from "../types/utils";
import type { VerifiableCredentialType } from "../types/verifiableCredential";

export type CredentialRetrievalProcedure = {
    endpointCondition: (endpoint: string) => boolean;
    procedure: (query: { locator: string; retrievalPath: string }) => Promise<VerifiableCredentialType>;
};

async function ipfsProcedure({
    locator,
    retrievalPath,
}: {
    locator: string;
    retrievalPath: string;
}): Promise<VerifiableCredentialType> {
    const raw = await new IPFSService().getFile(retrievalPath);
    if (!isCredentialType(raw)) {
        throw new Error(`The credential is malformed`);
    }
    return raw;
}

function ipfsCondition(endpoint: string): boolean {
    return endpoint.startsWith("ipfs://");
}

/**
 * Default retrieval procedure for ipfs, can be overridden by the user.
 * Will match all credentials with a retrieval endpoint starting with ipfs://
 * Will use the ipfs gataways provided in SDK init to fetch the credential
 */
export const ipfsRetrievalProcedure: CredentialRetrievalProcedure = {
    endpointCondition: ipfsCondition,
    procedure: ipfsProcedure,
};

/**
 * Service for managing and retrieving Verifiable Credentials.
 *
 * The `CredentialService` class allows for retrieving credentials from a collection using various procedures defined by the user or default procedures like IPFS retrieval.
 */
export class CredentialService {
    retrievalProcedures: CredentialRetrievalProcedure[];

    /**
     * Creates an instance of `CredentialService`.
     * @param retrievalProcedures - An array of retrieval procedures to use. Defaults to using `ipfsRetrievalProcedure`.
     */
    constructor(retrievalProcedures = [ipfsRetrievalProcedure]) {
        this.retrievalProcedures = retrievalProcedures;
    }

    /**
     * Retrieves a Verifiable Credential from a given collection and token ID.
     *
     * This function finds the appropriate retrieval procedure based on the collection's metadata and uses it to fetch the credential.
     *
     * @param collection - The `CredentialsCollection` containing the credential's metadata.
     * @param tokenId - The token ID of the credential to retrieve.
     * @returns A promise that resolves to a `VerifiableCredentialType`.
     * @throws Will throw an error if the collection is not a verifiable credential collection or if the retrieval endpoint is unsupported.
     */
    async getCredential(collection: CredentialsCollection, tokenId: string): Promise<VerifiableCredentialType> {
        const metadata = collection.metadata;
        if (!isVerifiableCredentialContractMetadata(metadata)) {
            throw new Error(`The collection provided is not a verifiable credential collection`);
        }
        const retrievalEndpoint = metadata.credentialMetadata.credentialsEndpoint;
        const retrievalPath = `${retrievalEndpoint}/${tokenId}`;
        const locator = `${collection.chain}:${collection.contractAddress}:${tokenId}`;

        for (const { endpointCondition, procedure } of this.retrievalProcedures) {
            // Find the first procedure that matches the endpoint condition
            // Eg if the endpoint is crossmint, we will use the crossmint api to fetch the credential
            if (endpointCondition(retrievalEndpoint)) {
                return await procedure({ locator, retrievalPath });
            }
        }

        throw new Error(`Unsupported retrieval endpoint ${retrievalEndpoint}`);
    }
}
