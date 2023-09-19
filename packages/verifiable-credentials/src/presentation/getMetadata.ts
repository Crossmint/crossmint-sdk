import { ethers } from "ethers";
import fetch from "node-fetch";

import { abi_ERC_721 } from "../ABI/ERC721";
import { CredentialsCollection, EVMNFT } from "../types/nfts";

const provider = new ethers.providers.JsonRpcProvider("https://rpc-mumbai.maticvigil.com/");

export async function getVCMetadata(contractAddress: string): Promise<any> {
    const getMetadataABI = [
        {
            inputs: [],
            name: "getVcMetadata",
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
    const ABI = abi_ERC_721.concat(getMetadataABI);
    const contract = new ethers.Contract(contractAddress, ABI, provider);

    try {
        const metadata = await contract.getVcMetadata();
        return metadata;
    } catch (error) {
        console.error(`Failed to get metadata for contract ${contractAddress}: ${error}`);
    }
}

export async function getCredentialCollections(collections: CredentialsCollection[]): Promise<CredentialsCollection[]> {
    const collectionsWithMetadata = [];

    for (const collection of collections) {
        const credentialMetadata = await getVCMetadata(collection.contractAddress);

        if (credentialMetadata != null) {
            collection.metadata = credentialMetadata;
            collectionsWithMetadata.push(collection);
        }
    }

    return collectionsWithMetadata;
}
