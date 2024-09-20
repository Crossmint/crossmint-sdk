import type { NFTOrNFTLocator, Wallet } from "@/blockchain/types";

import type { UIConfig } from "../uiconfig";

interface CommonProps {
    uiConfig?: UIConfig;
    environment?: string;
}
export interface NFTCollectionViewProps extends CommonProps {
    wallets: Wallet[];
}
export interface NFTDetailProps extends CommonProps {
    nft: NFTOrNFTLocator;
}
