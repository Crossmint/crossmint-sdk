import { assertValidNFTCollectionViewProps, getNFTCollectionViewSrc } from "@crossmint/client-sdk-base";
import type { NFTCollectionViewProps } from "@crossmint/common-sdk-base";

import { LIB_VERSION } from "../consts/version";

export function CrossmintNFTCollectionView(props: NFTCollectionViewProps) {
    assertValidNFTCollectionViewProps(props);

    const src = getNFTCollectionViewSrc(props, LIB_VERSION);

    return (
        <iframe
            src={src}
            width="100%"
            height="100%"
            style={{
                flexGrow: "1",
                border: "none",
                margin: "0",
                padding: "0",
            }}
            role="nft-collection-view"
        />
    );
}
