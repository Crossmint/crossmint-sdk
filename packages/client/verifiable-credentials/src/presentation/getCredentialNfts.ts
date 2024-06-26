import {
    CredentialFilter,
    VCChain,
    getUsersCredentialNfts as getUsersCredentialNftsRaw,
} from "@/verifiableCredentialsSKD";

import { getWalletVcCompatibleNfts } from "./getNfts";

export async function getUsersCredentialNfts(chain: VCChain, wallet: string, filters: CredentialFilter = {}) {
    return getUsersCredentialNftsRaw(chain, wallet, getWalletVcCompatibleNfts, filters);
}
