import { NFTService } from "../onchainServices/nft";
import { IPFSService } from "../services/ipfs";
import { VCChain } from "../types/chain";
import { Collection, CredentialsCollection } from "../types/collection";
import { isVerifiableCredentialContractMetadata } from "../types/utils";

export class ContractMetadataService {
    chain: VCChain;

    constructor(chain: VCChain) {
        this.chain = chain;
    }

    async getContractMetadata(contractAddress: string) {
        const uri = await new NFTService(this.chain).getContractURI(contractAddress);
        if (uri == null) {
            return null;
        }

        const metadata = await new IPFSService().getFile(uri);
        return metadata;
    }

    async getContractsWithCredentialMetadata(collections: Collection[]): Promise<CredentialsCollection[]> {
        const credentialCollections: CredentialsCollection[] = [];

        for (const collection of collections) {
            try {
                const metadata = await this.getContractMetadata(collection.contractAddress);
                if (!isVerifiableCredentialContractMetadata(metadata)) {
                    continue;
                }
                collection.metadata = metadata;
                credentialCollections.push(collection);
            } catch (e: any) {
                console.error(`Failed to get contract metadata for ${collection.contractAddress}: ${e.message}`);
                continue;
            }
        }

        return credentialCollections;
    }
}
