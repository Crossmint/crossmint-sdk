import { ethers } from "ethers";
import fetch from "node-fetch";

import { abi_ERC_721 } from "../ABI/ERC721";
import { CredentialsCollection, EVMNFT } from "../types/nfts";

const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID");

async function getVCMetadata(contractAddress: string): Promise<any> {
    const contract = new ethers.Contract(contractAddress, abi_ERC_721, provider);

    try {
        const metadata = await contract.getCredentialMetadata();
        return metadata;
    } catch (error) {
        console.error(`Failed to get metadata for contract ${contractAddress}: ${error}`);
    }
}

export async function getCredentialCollections(collections: CredentialsCollection[]): Promise<CredentialsCollection[]> {
    const collectionsWithMetadata = [];

    for (const collection of collections) {
        const credentialMetadata = await getVCMetadata(collection.contractAddress);

        if (credentialMetadata) {
            collection.metadata = credentialMetadata;
            collectionsWithMetadata.push(collection);
        }
    }

    return collectionsWithMetadata;
}
