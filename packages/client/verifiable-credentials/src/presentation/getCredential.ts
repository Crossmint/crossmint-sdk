import {
    CredentialRetrievalProcedure,
    CredentialService as CredentialServiceRaw,
    ipfsRetrievalProcedure,
} from "@/verifiableCredentialsSDK";
import type {
    EncryptedVerifiableCredential,
    VerifiableCredential,
    VerifiableCredentialType,
} from "@/verifiableCredentialsSDK";

import { crossmintAPI } from "../crossmintAPI";

export class CrossmintCredentialRetrieval {
    constructor() {}

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
 * Crossmint retrieval procedure for ipfs, will use the crossmint api to fetch the credentials.
 * Will match all credentials that are stored in crossmint
 * Requires a crossmint api key with the `credentials.read` scope
 */
export const crossmintRetrievalProcedure: CredentialRetrievalProcedure = {
    endpointCondition: (endpoint: string) => endpoint.includes("crossmint"),
    procedure: async ({ locator }: { locator: string; retrievalPath: string }) => {
        return await new CrossmintCredentialRetrieval().getCredential({ locator });
    },
};

/**
 * Credential service is used to fetch credentials from different sources
 * By deafult the procedures provided are the ipfs and crossmint procedures,
 * but the user can add more procedures to fetch credentials from other sources.
 *
 * For using the crossmint procedure, the user must have set a crossmint api key with the `credentials.read` scope
 *
 * CredentialService().getCredential(collection: CredentialsCollection, tokenId: string) will fetch the credential from the source that matches the storage location of the credential
 * CredentialService().getById(credentialId: string) will fetch the credential from crossmint using the credentialId
 */
export class CredentialService extends CredentialServiceRaw {
    constructor(retrievalProcedures = [ipfsRetrievalProcedure, crossmintRetrievalProcedure]) {
        super(retrievalProcedures);
    }

    async getById(credentialId: string): Promise<VerifiableCredentialType | null> {
        return await new CrossmintCredentialRetrieval().getCredential({ credentialId });
    }
}
