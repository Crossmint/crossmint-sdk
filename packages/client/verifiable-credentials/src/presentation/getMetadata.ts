import { CrossmintAPI } from "@/services/crossmintAPI";
import { ethers, utils } from "ethers";

import { nftZeroEight } from "../ABI/upgradeable721-v0.8";
import { getProvider } from "../services/provider";
import { CredentialsCollection } from "../types/nfts";

export async function getMetadata(contractAddress: string, environment: string): Promise<any> {
    const ABI = new utils.Interface(nftZeroEight.abi);
    const provider = getProvider(environment);
    const contract = new ethers.Contract(contractAddress, ABI, provider);
    const gateways = CrossmintAPI.ipfsGateways;

    let uri;
    try {
        uri = await contract.contractURI();
    } catch (error) {
        console.error(`Failed to get contractURI ${contractAddress}: ${error}`);
        return null;
    }
    if (uri == null) {
        return null;
    }
    console.debug(`Got contractURI ${uri} for contract ${contractAddress}`);

    const httpUri = uri.replace("ipfs://", "");
    for (const gateway of gateways) {
        console.debug(
            `Trying to get metadata from gateway ${gateway} for contract ${contractAddress} with uri ${httpUri}`
        );
        try {
            const httpUriFull = formatUrl(gateway, httpUri);
            const timeout = new Promise((resolve, reject) => {
                const timeoutSeconds = 5;
                const id = setTimeout(() => {
                    clearTimeout(id);
                    reject(`Timed out in ${timeoutSeconds} seconds`);
                }, timeoutSeconds);
            });

            const response = (await Promise.race([fetch(httpUriFull), timeout])) as Response;
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, responses: ${response.statusText}`);
            }

            const metadata = await response.json();
            console.debug(`Got metadata from gateway ${gateway} for contract ${contractAddress}`);
            return metadata;
        } catch (error) {
            console.error(`Failed to get metadata for contract ${contractAddress} with gataway ${gateway}: ${error}`);
        }
    }
}

export async function getContractWithVCMetadata(
    collections: CredentialsCollection[],
    environment: string
): Promise<CredentialsCollection[]> {
    const credentialCollections = [];

    for (const collection of collections) {
        const metadata = await getMetadata(collection.contractAddress, environment);

        if (metadata == null || metadata.credentialMetadata == null) {
            continue;
        }
        collection.metadata = metadata;
        credentialCollections.push(collection);
    }

    return credentialCollections;
}

function formatUrl(template: string, cid: string): string {
    return template.replace("{cid}", cid);
}
