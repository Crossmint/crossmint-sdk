import {
    type CredentialFilter,
    type CredentialsCollection,
    type VCChain,
    getCredentialNfts as getCredentialNftsRaw,
} from "@/verifiableCredentialsSDK";

import { getWalletVcCompatibleNfts } from "./getNfts";

/**
 * Get all the NFTs of a given user that are verifiable credentials
 * To use this method an api key with the `credentials.read` scope  must have been provided.
 * @param chain - Chain to get the NFTs from
 * @param wallet - Wallet address of the user
 * @param filters - Filters to select only desired credentials (i.e. credential type, credential issuer)
 * @returns - List CredentialsCollection that match the filters each containing a list of nfts
 */
export async function getCredentialNfts(
    chain: VCChain,
    wallet: string,
    filters: CredentialFilter = {}
): Promise<CredentialsCollection[]> {
    return getCredentialNftsRaw(chain, wallet, getWalletVcCompatibleNfts, filters);
}
