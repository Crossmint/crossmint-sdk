import { Environments, NFTCollectionViewProps, NFTDetailProps, baseUrls } from "../models/types";

export const getEnvironmentBaseUrl = (environment = ""): string => {
    const productionValues = ["prod", "production"];
    if (environment === "staging") return baseUrls.staging;
    if (productionValues.includes(environment) || !environment) return baseUrls.prod;
    return environment;
};

function blockchainTypeToLocatorStr(chain: string) {
    switch (chain) {
        case "solana":
            return "sol";
        case "ethereum":
            return "eth";
        case "polygon":
            return "poly";
        case "cardano":
            return "ada";
        case "bsc":
            return "bsc";
        default:
            throw new Error(`Invalid chain type ${chain}`);
    }
}

function getNFTLocator(address: string, chain: string, tokenId?: string): string {
    const chainLocator = blockchainTypeToLocatorStr(chain);

    switch (chain) {
        case "solana":
            return `${chainLocator}:${address}`;
        case "ethereum":
            if (tokenId == null) {
                throw new Error(
                    `Missing or invalid tokenId when trying to get locator for NFT from contract ${address}`
                );
            }
            return `${chainLocator}:${address}:${tokenId}`;
        // address in this context is actually an AssetId
        case "cardano":
            return `${chainLocator}:${address}`;
        default:
            throw new Error(`Invalid chain type ${chain}`);
    }
}

export function getNFTCollectionViewSrc(props: NFTCollectionViewProps, clientVersion: string) {
    const baseUrl = getEnvironmentBaseUrl(props.environment);
    const { wallets, projectId } = props;
    const walletsStringify = JSON.stringify(wallets);

    const queryParams = new URLSearchParams({
        wallets: walletsStringify,
        projectId,
        clientVersion,
        ...(props.uiConfig != null ? { uiConfig: JSON.stringify(props.uiConfig) } : {}),
    });
    return `${baseUrl}/sdk/wallets/collection?${queryParams.toString()}`;
}

export function getNFTDetailSrc(props: NFTDetailProps, clientVersion: string) {
    const baseUrl = getEnvironmentBaseUrl(props.environment);
    const { projectId } = props;
    const queryParams = new URLSearchParams({
        projectId,
        clientVersion,
        ...(props.uiConfig != null ? { uiConfig: JSON.stringify(props.uiConfig) } : {}),
    });
    const tokenLocator = getNFTLocator(props.nft.address, props.nft.chain, props.nft.tokenId);
    return `${baseUrl}/sdk/wallets/tokens/${tokenLocator}?${queryParams.toString()}`;
}
