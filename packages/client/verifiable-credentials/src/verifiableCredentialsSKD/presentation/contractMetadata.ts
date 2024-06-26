import { NFTService } from "@/verifiableCredentialsSKD/onchainServices/nft";
import { IPFSService } from "@/verifiableCredentialsSKD/services/ipfs";

import { Collection, CredentialsCollection } from "../types/collection";
import { isVerifiableCredentialContractMetadata } from "../types/utils";

export class ContractMetadataService {
    ipfsGateways?: string[];
    environment: string;

    constructor(environment: string, ipfsGateways?: string[]) {
        this.ipfsGateways = ipfsGateways;
        this.environment = environment;
    }

    async getContractMetadata(contractAddress: string) {
        const uri = await new NFTService(this.environment).getContractURI(contractAddress);
        if (uri == null) {
            return null;
        }

        const metadata = await new IPFSService(this.ipfsGateways).getFile(uri);
        return metadata;
    }

    async retrieveContractsWithMetadata(collections: Collection[]): Promise<CredentialsCollection[]> {
        const credentialCollections: CredentialsCollection[] = [];

        for (const collection of collections) {
            const metadata = await this.getContractMetadata(collection.contractAddress);
            if (!isVerifiableCredentialContractMetadata(metadata)) {
                continue;
            }
            collection.metadata = metadata;
            credentialCollections.push(collection);
        }

        return credentialCollections;
    }
}
