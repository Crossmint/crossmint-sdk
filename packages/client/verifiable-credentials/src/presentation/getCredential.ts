import { CredentialsCollection } from "@/types/nfts";
import {
    EncryptedVerifiableCredential,
    VerifiableCredential,
    VerifiableCredentialType,
} from "@/types/verifiableCredential";

import { getEnvironmentBaseUrl } from "@crossmint/client-sdk-base";

import { CrossmintAPI } from "../services/crossmintAPI";
import { isCredentialType, isVerifiableCredentialContractMetadata } from "../services/utils";
import { MetadataService } from "./getMetadata";

export async function getCredentialFromId(
    credentialId: string,
    environment: string
): Promise<VerifiableCredentialType | null> {
    return await getCredentialFromCrossmint({ credentialId }, environment);
}

export async function getCredentialFromCrossmint(
    query: {
        credentialId?: string;
        locator?: string;
    },
    environment: string
): Promise<VerifiableCredentialType | null> {
    const baseUrl = getEnvironmentBaseUrl(environment);
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

export async function getCredential(
    collection: CredentialsCollection,
    tokenId: string,
    environment: string
): Promise<VerifiableCredentialType | null> {
    const metadata = collection.metadata;
    if (!isVerifiableCredentialContractMetadata(metadata)) {
        throw new Error(`The collection provided is not a verifiable credential collection`);
    }
    const retrievalEndpoint = metadata.credentialMetadata.credentialsEndpoint;
    // shall we route ipfs requests through the crossmint API?
    if (retrievalEndpoint.startsWith("ipfs://")) {
        const raw = await new MetadataService().getFromIpfs(`${retrievalEndpoint}/${tokenId}`);
        if (!isCredentialType(raw)) {
            throw new Error(`The credential is malformed`);
        }
        return raw;
    } else if (retrievalEndpoint.includes("crossmint")) {
        const locator = `polygon:${collection.contractAddress}:${tokenId}`;
        return await getCredentialFromCrossmint({ locator }, environment);
    } else {
        throw new Error(`Unsupported retrieval endpoint ${retrievalEndpoint}`);
    }
}
