import { getUsersCredentialNfts as getUsersCredentialNftsRaw } from "@/verifiableCredentialsSKD/presentation/getCollections";
import { CredentialFilter } from "@/verifiableCredentialsSKD/types/credentialFilter";

import { getWalletVcCompatibleNfts } from "./getNfts";

export async function getUsersCredentialNfts(
    chain: string,
    wallet: string,
    environment: string,
    filters: CredentialFilter = {}
) {
    return getUsersCredentialNftsRaw(chain, wallet, environment, getWalletVcCompatibleNfts, filters);
}
