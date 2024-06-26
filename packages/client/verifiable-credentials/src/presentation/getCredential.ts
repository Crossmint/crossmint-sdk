import {
    CredentialRetrievalProcedure,
    CredentialService as CredentialServiceRaw,
    ipfsRetrievalProcedure,
} from "@/verifiableCredentialsSKD/presentation/getCredential";
import {
    EncryptedVerifiableCredential,
    VerifiableCredential,
    VerifiableCredentialType,
} from "@/verifiableCredentialsSKD/types/verifiableCredential";

import { getEnvironmentBaseUrl } from "@crossmint/client-sdk-base";

import { CrossmintAPI } from "../services/crossmintAPI";

export class CrossmintCredentialRetrieval {
    environment: string;
    constructor(environment: string) {
        this.environment = environment;
    }

    async getCredential(query: { credentialId?: string; locator?: string }): Promise<VerifiableCredentialType | null> {
        const baseUrl = getEnvironmentBaseUrl(this.environment);
        const headers = CrossmintAPI.getHeaders();

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
            url = `${baseUrl}/api/unstable/credentials/${credentialId}`;
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

            let credential;
            if (data.encryptedCredential != null) {
                credential = data.encryptedCredential as EncryptedVerifiableCredential;
            } else {
                credential = data as VerifiableCredential;
            }
            return credential;
        } catch (error) {
            console.error(error);
            return null;
        }
    }
}

const crossmintRetrievalProcedure: CredentialRetrievalProcedure = {
    endpointCondition: (endpoint: string) => endpoint.includes("crossmint"),
    procedure: async ({ locator, retrievalPath }: { locator: string; retrievalPath: string }) => {
        return await new CrossmintCredentialRetrieval(environment).getCredential({ locator });
    },
};

export class CredentialService extends CredentialServiceRaw {
    constructor(
        environment: string,
        retrievalProcedures = [ipfsRetrievalProcedure, crossmintRetrievalProcedure],
        ipfsGateways?: string[]
    ) {
        super(retrievalProcedures, ipfsGateways);
    }

    async getById(credentialId: string, environment: string): Promise<VerifiableCredentialType | null> {
        return await new CrossmintCredentialRetrieval(environment).getCredential({ credentialId });
    }
}
