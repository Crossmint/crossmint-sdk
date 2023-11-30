import { ethers, utils } from "ethers";

import { nftZeroEight } from "../ABI/upgradeable721-v0.8";
import { getProvider } from "../services/provider";
import { CredentialsCollection } from "../types/nfts";

const ipfsGateway = "https://ipfs.io/ipfs/";

export async function getMetadata(contractAddress: string, environment: string): Promise<any> {
    const ABI = new utils.Interface(nftZeroEight.abi);
    const provider = getProvider(environment);
    const contract = new ethers.Contract(contractAddress, ABI, provider);

    try {
        const uri = await contract.contractURI();
        if (uri == null) {
            return null;
        }

        const httpUri = uri.replace("ipfs://", ipfsGateway);
        const response = await fetch(httpUri);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, responses: ${response.statusText}`);
        }

        const metadata = await response.json();
        return metadata;
    } catch (error) {
        console.error(`Failed to get metadata for contract ${contractAddress}: ${error}`);
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