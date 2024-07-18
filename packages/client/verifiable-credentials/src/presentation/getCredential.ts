import {
    CredentialRetrievalProcedure,
    CredentialService as CredentialServiceRaw,
    ipfsRetrievalProcedure,
} from "@/verifiableCredentialsSKD";
import type {
    EncryptedVerifiableCredential,
    VerifiableCredential,
    VerifiableCredentialType,
} from "@/verifiableCredentialsSKD";

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
            url = `${baseUrl}/api/unstable/credentials/id/${credentialId}`;
        } else {
            const locator = query.locator;
            console.debug(`Fetching credential from locator ${locator}`);
            url = `${baseUrl}/api/unstable/nfts/${locator}/credentials`;
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
        } catch (error) {
            console.error(error);
            throw new Error(`Failed to get credential ${JSON.stringify(query)} from crossmint`);
        }
    }
}

export const crossmintRetrievalProcedure: CredentialRetrievalProcedure = {
    endpointCondition: (endpoint: string) => endpoint.includes("crossmint"),
    procedure: async ({ locator, retrievalPath }: { locator: string; retrievalPath: string }) => {
        return await new CrossmintCredentialRetrieval().getCredential({ locator });
    },
};

export class CredentialService extends CredentialServiceRaw {
    constructor(retrievalProcedures = [ipfsRetrievalProcedure, crossmintRetrievalProcedure]) {
        super(retrievalProcedures);
    }

    async getById(credentialId: string): Promise<VerifiableCredentialType | null> {
        return await new CrossmintCredentialRetrieval().getCredential({ credentialId });
    }
}
