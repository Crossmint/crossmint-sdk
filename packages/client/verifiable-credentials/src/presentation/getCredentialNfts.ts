import { CredentialFilter, VCChain, getCredentialNfts as getCredentialNftsRaw } from "@/verifiableCredentialsSDK";

import { getWalletVcCompatibleNfts } from "./getNfts";

export async function getCredentialNfts(chain: VCChain, wallet: string, filters: CredentialFilter = {}) {
    return getCredentialNftsRaw(chain, wallet, getWalletVcCompatibleNfts, filters);
}
