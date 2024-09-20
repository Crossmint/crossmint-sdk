import type { NFTCollectionViewProps, NFTDetailProps } from "@crossmint/common-sdk-base";

export function assertValidNFTCollectionViewProps({ wallets }: NFTCollectionViewProps) {
    if (wallets.length === 0) {
        throw new Error("wallets prop is empty. Please provide at least one wallet.");
    }
}

export function assertValidValidateNFTDetailProps({ nft }: NFTDetailProps) {
    if (nft == null) {
        throw new Error("nft prop is empty. Please provide a valid nft.");
    }
}
