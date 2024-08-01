import { IPFSService } from "../services/ipfs";
import { CredentialsCollection } from "../types/collection";
import { isCredentialType, isVerifiableCredentialContractMetadata } from "../types/utils";
import { VerifiableCredentialType } from "../types/verifiableCredential";

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

export class CredentialService {
    retrievalProcedures: CredentialRetrievalProcedure[];
    constructor(retrievalProcedures = [ipfsRetrievalProcedure]) {
        this.retrievalProcedures = retrievalProcedures;
    }

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
