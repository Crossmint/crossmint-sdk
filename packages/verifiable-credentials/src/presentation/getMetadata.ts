import { getProvider } from "@/services.ts/provider";
import { ethers } from "ethers";
import fetch from "node-fetch";

import { abi_ERC_721 } from "../ABI/ERC721";
import { CredentialsCollection, VC_EVMNFT } from "../types/nfts";

const tempContractURI_ABI = [
    {
        inputs: [],
        name: "contractURI",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];

export async function getMetadata(contractAddress: string, environment: string): Promise<any> {
    const ABI = abi_ERC_721.concat(tempContractURI_ABI);
    const provider = getProvider(environment);
    const contract = new ethers.Contract(contractAddress, ABI, provider);

    try {
        const uri = await contract.contractURI();
        if (uri == null) {
            return null;
        }

        const response = await fetch(uri);
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
        // const metadata = await getMetadata(collection.contractAddress, environment);

        // if (metadata == null || metadata.credentials == null) {
        //     continue;
        // }
        // collection.metadata = metadata;
        // credentialCollections.push(collection);

        if (collection.nfts[0].metadata.credentialId != null) {
            credentialCollections.push(collection);
        }
    }

    return credentialCollections;
}
