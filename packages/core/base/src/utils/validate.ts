import { NFTCollectionViewProps, NFTDetailProps } from "../models/types";

export function assertValidNFTCollectionViewProps({ wallets, projectId }: NFTCollectionViewProps) {
    if (wallets.length === 0) {
        throw new Error("wallets prop is empty. Please provide at least one wallet.");
    }

    if (!projectId) {
        throw new Error("projectId prop is empty. Please provide a valid projectId.");
    }
}

export function assertValidValidateNFTDetailProps({ nft, projectId }: NFTDetailProps) {
    if (nft == null) {
        throw new Error("nft prop is empty. Please provide a valid nft.");
    }
}
