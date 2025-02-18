import {
    BlockchainIncludingTestnet as Blockchain,
    objectValues,
    type ObjectValues,
} from "@crossmint/common-sdk-base";

const SmartWalletTestnet = {
    BASE_SEPOLIA: Blockchain.BASE_SEPOLIA,
    POLYGON_AMOY: Blockchain.POLYGON_AMOY,
    OPTIMISM_SEPOLIA: Blockchain.OPTIMISM_SEPOLIA,
    ARBITRUM_SEPOLIA: Blockchain.ARBITRUM_SEPOLIA,
} as const;
type SmartWalletTestnet = ObjectValues<typeof SmartWalletTestnet>;
const SMART_WALLET_TESTNETS: readonly SmartWalletChain[] =
    objectValues(SmartWalletTestnet);

const SmartWalletMainnet = {
    BASE: Blockchain.BASE,
    POLYGON: Blockchain.POLYGON,
    OPTIMISM: Blockchain.OPTIMISM,
    ARBITRUM: Blockchain.ARBITRUM,
} as const;
type SmartWalletMainnet = ObjectValues<typeof SmartWalletMainnet>;
const SMART_WALLET_MAINNETS: readonly SmartWalletChain[] =
    objectValues(SmartWalletMainnet);

const SmartWalletChain = {
    ...SmartWalletTestnet,
    ...SmartWalletMainnet,
} as const;

export function isTestnetChain(
    chain: SmartWalletChain
): chain is SmartWalletTestnet {
    return SMART_WALLET_TESTNETS.includes(chain);
}

export function isMainnetChain(
    chain: SmartWalletChain
): chain is SmartWalletMainnet {
    return SMART_WALLET_MAINNETS.includes(chain);
}

export type SmartWalletChain = ObjectValues<typeof SmartWalletChain>;
