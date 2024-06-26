import { ethers, utils } from "ethers";

import { nftZeroEight } from "../ABI/upgradeable721-v0.8";
import { CrossmintAPI } from "../services/crossmintAPI";
import { getProvider } from "../services/provider";
import { isVerifiableCredentialContractMetadata } from "../services/utils";
import { Collection, CredentialsCollection } from "../types/nfts";

export class MetadataService {
    async getContractMetadata(contractAddress: string, environment: string): Promise<any> {
        const ABI = new utils.Interface(nftZeroEight.abi);
        const provider = getProvider(environment);
        const contract = new ethers.Contract(contractAddress, ABI, provider);

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
        console.debug(`Found contract ${uri} for contract ${contractAddress}`);

        return this.getFromIpfs(uri);
    }

    async getContractWithVCMetadata(collections: Collection[], environment: string): Promise<CredentialsCollection[]> {
        const credentialCollections: CredentialsCollection[] = [];

        for (const collection of collections) {
            const metadata = await this.getContractMetadata(collection.contractAddress, environment);
            if (!isVerifiableCredentialContractMetadata(metadata)) {
                continue;
            }
            collection.metadata = metadata;
            credentialCollections.push(collection);
        }

        return credentialCollections;
    }

    async getFromIpfs(uri: string) {
        const gateways = CrossmintAPI.ipfsGateways;

        const httpUri = uri.replace("ipfs://", "");
        for (const gateway of gateways) {
            console.debug(`Trying to get metadata from gateway ${gateway} with uri ${httpUri}`);
            try {
                const httpUriFull = formatUrl(gateway, httpUri);
                const timeout = new Promise((resolve, reject) => {
                    const timeoutMilliSeconds = 5000;
                    const id = setTimeout(() => {
                        clearTimeout(id);
                        reject(`Timed out in ${timeoutMilliSeconds / 1000} seconds`);
                    }, timeoutMilliSeconds);
                });

                const response = (await Promise.race([fetch(httpUriFull), timeout])) as Response;
                if (!response.ok) {
                    throw new Error(
                        `HTTP error! status: ${response.status}, responses: ${JSON.stringify(await response.json())}`
                    );
                }

                const metadata = await response.json();
                console.debug(`Got metadata from gateway ${gateway} for ${uri}`);
                return metadata;
            } catch (error) {
                console.error(`Failed to get metadata for ${uri} with gateway ${gateway}: ${error}`);
            }
        }
    }
}

export function formatUrl(template: string, cid: string): string {
    return template.replace("{cid}", cid);
}
