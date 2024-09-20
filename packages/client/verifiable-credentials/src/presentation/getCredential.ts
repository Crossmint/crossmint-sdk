import {
    type CredentialRetrievalProcedure,
    CredentialService as CredentialServiceRaw,
    ipfsRetrievalProcedure,
} from "@/verifiableCredentialsSDK";
import type {
    EncryptedVerifiableCredential,
    VerifiableCredential,
    VerifiableCredentialType,
} from "@/verifiableCredentialsSDK";

import { crossmintAPI } from "../crossmintAPI";

/**
 * Service for retrieving credentials from Crossmint.
 *
 * This class handles fetching verifiable credentials from the Crossmint API using either a credential ID or a locator.
 */
export class CrossmintCredentialRetrieval {
    constructor() {}

    /**
     * Fetches a verifiable credential from Crossmint based on a given query.
     *
     * @param query - An object containing either `credentialId` or `locator` to specify the credential to retrieve.
     * @returns A promise that resolves to a `VerifiableCredentialType`, which could be either an `EncryptedVerifiableCredential` or a `VerifiableCredential`.
     *
     * @throws Will throw an error if neither `credentialId` nor `locator` is provided, or if both are provided.
     * @throws Will throw an error if the HTTP request fails or the response is invalid.
     */
    async getCredential(query: { credentialId?: string; locator?: string }): Promise<VerifiableCredentialType> {
        const baseUrl = crossmintAPI.getBaseUrl();
        const headers = crossmintAPI.getHeaders();

        if (query.credentialId == null && query.locator == null) {
            throw new Error(`Either credentialId or locator must be provided`);
        }
        if (query.credentialId != null && query.locator != null) {
            throw new Error(`Only one of credentialId or locator must be provided`);
        }
        let url;
        if (query.credentialId != null) {
            const credentialId = query.credentialId;
            console.debug(`Fetching credential ${credentialId}`);
            url = `${baseUrl}/api/v1-alpha1/credentials/${credentialId}`;
        } else {
            const locator = query.locator;
            console.debug(`Fetching credential from locator ${locator}`);
            url = `${baseUrl}/api/v1-alpha1/nfts/${locator}/credentials`;
        }

        const options = { method: "GET", headers: headers };
        console.log(url, options);
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, responses: ${JSON.stringify(data)}`);
            }

            if (data.unencryptedCredential != null) {
                return data.unencryptedCredential as VerifiableCredential;
            } else if (data.encryptedCredential != null) {
                return data.encryptedCredential as EncryptedVerifiableCredential;
            }

            throw new Error(`Invalid response`);
        } catch (error: any) {
            console.error(JSON.stringify(error));
            throw new Error(`Failed to get credential ${JSON.stringify(query)} from crossmint: ${error.message}`);
        }
    }
}

/**
 * Crossmint retrieval procedure for credentials stored in Crossmint.
 *
 * This procedure uses the Crossmint API to fetch credentials and matches all credentials that are stored in Crossmint.
 *
 * @remarks
 * This procedure requires a Crossmint API key with the `credentials.read` scope.
 */
export const crossmintRetrievalProcedure: CredentialRetrievalProcedure = {
    endpointCondition: (endpoint: string) => endpoint.includes("crossmint"),
    procedure: async ({ locator }: { locator: string; retrievalPath: string }) => {
        return await new CrossmintCredentialRetrieval().getCredential({ locator });
    },
};

/**
 * Service for managing and retrieving verifiable credentials from different sources. By default, it includes procedures for IPFS and Crossmint, but additional procedures can be added by the user.
 *
 * - CredentialService().getById(credentialId: string) : Fetches the credential from crossmint using the credentialId.
 * - CredentialService().getCredential(collection: CredentialsCollection, tokenId: string) : Fetches the credential from the source that matches the storage location of the credential.
 *
 * @remarks
 * To use the Crossmint procedure, a Crossmint API key with the `credentials.read` scope must be set.
 */
export class CredentialService extends CredentialServiceRaw {
    constructor(retrievalProcedures = [ipfsRetrievalProcedure, crossmintRetrievalProcedure]) {
        super(retrievalProcedures);
    }

    /**
     * Retrieves a verifiable credential from Crossmint using its credential ID.
     *
     * @param credentialId - The ID of the credential to retrieve.
     * @returns A promise that resolves to a `VerifiableCredentialType` or `null` if the credential is not found.
     *
     * @throws Will throw an error if the credential retrieval fails.
     */
    async getById(credentialId: string): Promise<VerifiableCredentialType | null> {
        return await new CrossmintCredentialRetrieval().getCredential({ credentialId });
    }
}
