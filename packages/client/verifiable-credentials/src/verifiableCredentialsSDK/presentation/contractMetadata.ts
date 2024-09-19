import { NFTService } from "../onchainServices/nft";
import { IPFSService } from "../services/ipfs";
import type { VCChain } from "../types/chain";
import type { Collection, CredentialsCollection } from "../types/collection";
import { isVerifiableCredentialContractMetadata } from "../types/utils";

/**
 * Service for retrieving and managing contract metadata.
 */
export class ContractMetadataService {
    /**
     * The blockchain on which the contract is deployed.
     */
    chain: VCChain;

    /**
     * Initializes a new instance of the ContractMetadataService.
     * @param chain - The blockchain to be used.
     */
    constructor(chain: VCChain) {
        this.chain = chain;
    }

    /**
     * Retrieves metadata for a given contract.
     *
     * @param contractAddress - The address of the contract.
     * @returns The metadata object or `null` if the contractURI call returns null.
     * @throws Will throw an error if the retrieval process fails.
     */
    async getContractMetadata(contractAddress: string) {
        const uri = await new NFTService(this.chain).getContractURI(contractAddress);
        if (uri == null) {
            return null;
        }

        const metadata = await new IPFSService().getFile(uri);
        return metadata;
    }

    /**
     * Retrieves metadata for multiple contracts and filters those that are verifiable credentials collections.
     *
     * @param collections - An array of collections containing contract addresses.
     * @returns A promise that resolves to an array of collections with valid verifiable credential metadata.
     * @throws Will continue to the next collection if an error occurs during metadata retrieval.
     */
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
