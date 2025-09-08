import type { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export function getUrlProviderByBlockchain(chain: EVMBlockchainIncludingTestnet) {
    const url = new Map<EVMBlockchainIncludingTestnet, string | null>([
        ["ethereum", "https://eth.llamarpc.com"],
        ["polygon", "https://polygon-rpc.com"],
        ["bsc", "https://binance.llamarpc.com"],
        ["optimism", "https://mainnet.optimism.io"],
        ["arbitrum", "https://arb1.arbitrum.io/rpc"],
        ["ethereum-sepolia", "https://ethereum-sepolia.publicnode.com"],
        ["polygon-amoy", "https://rpc-amoy.polygon.technology"],
        ["zkatana", "https://rpc.startale.com/zkatana"],
        ["zkyoto", "https://rpc.startale.com/zkyoto"],
        ["arbitrum-sepolia", "https://sepolia-rollup.arbitrum.io/rpc"],
        ["base-goerli", null],
        ["base-sepolia", "https://base-sepolia-rpc.publicnode.com"],
        ["bsc-testnet", null],
        ["ethereum-goerli", "https://ethereum-goerli.publicnode.com"],
        ["optimism-goerli", null],
        ["optimism-sepolia", "https://sepolia.optimism.io"],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", "https://mainnet.base.org"],
        ["zora", null],
        ["arbitrumnova", "https://arbitrum-nova-rpc.publicnode.com"],
        ["astar-zkevm", "https://rpc.startale.com/astar-zkevm"],
    ]).get(chain)!;

    if (url == null) {
        throw new Error(`Url provider not found for chain ${chain}`);
    }
    return url;
}

export function getBlockExplorerByBlockchain(chain: EVMBlockchainIncludingTestnet) {
    const blockExplorer = new Map<EVMBlockchainIncludingTestnet, string | null>([
        ["ethereum", "https://etherscan.io"],
        ["polygon", "https://polygonscan.com"],
        ["bsc", "https://bscscan.com"],
        ["optimism", "https://optimistic.etherscan.io"],
        ["arbitrum", "https://arbiscan.io"],
        ["ethereum-goerli", "https://goerli.etherscan.io"],
        ["ethereum-sepolia", "https://sepolia.etherscan.io"],
        ["polygon-amoy", "https://www.oklink.com/amoy"],
        ["zkatana", "https://zkatana.blockscout.com"],
        ["zkyoto", "https://zkyoto.explorer.startale.com/"],
        ["arbitrum-sepolia", "https://sepolia.arbiscan.io"],
        ["base-goerli", "https://goerli.basescan.org"],
        ["base-sepolia", "https://sepolia.basescan.org"],
        ["bsc-testnet", "https://testnet.bscscan.com"],
        ["optimism-goerli", "https://goerli-optimism.etherscan.io"],
        ["optimism-sepolia", "https://sepolia-optimism.etherscan.io/"],
        ["zora-goerli", null],
        ["zora-sepolia", "https://sepolia.explorer.zora.energy"],
        ["base", "https://basescan.org"],
        ["zora", "https://explorer.zora.energy"],
        ["arbitrumnova", "https://nova.arbiscan.io/"],
        ["astar-zkevm", "https://astar-zkevm.explorer.startale.com"],
    ]).get(chain)!;

    if (blockExplorer == null) {
        throw new Error(`Block Explorer not found for chain ${chain}`);
    }
    return blockExplorer;
}

export function getTickerByBlockchain(chain: EVMBlockchainIncludingTestnet) {
    const ticker = new Map<EVMBlockchainIncludingTestnet, string | null>([
        ["ethereum", "ETH"],
        ["polygon", "MATIC"],
        ["bsc", "BNB"],
        ["optimism", "OP"],
        ["arbitrum", "ARB"],
        ["ethereum-goerli", "ETH"],
        ["ethereum-sepolia", "ETH"],
        ["polygon-amoy", "MATIC"],
        ["zkatana", "ETH"],
        ["zkyoto", "ETH"],
        ["arbitrum-sepolia", "ETH"],
        ["base-goerli", null],
        ["base-sepolia", "ETH"],
        ["bsc-testnet", null],
        ["optimism-goerli", null],
        ["optimism-sepolia", "ETH"],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", "ETH"],
        ["zora", null],
        ["arbitrumnova", "ETH"],
        ["astar-zkevm", "ETH"],
    ]).get(chain)!;

    if (ticker == null) {
        throw new Error(`Ticker project id not found for chain ${chain}`);
    }
    return ticker;
}

export function getTickerNameByBlockchain(chain: EVMBlockchainIncludingTestnet) {
    const tickerName = new Map<EVMBlockchainIncludingTestnet, string | null>([
        ["ethereum", "ETHEREUM"],
        ["polygon", "MATIC"],
        ["bsc", "BNB_BSC"],
        ["optimism", "OPTIMISM"],
        ["arbitrum", "ARBITRUM"],
        ["ethereum-goerli", "ETHEREUM"],
        ["ethereum-sepolia", "ETHEREUM"],
        ["polygon-amoy", "MATIC"],
        ["zkatana", "ETHEREUM"],
        ["zkyoto", "ETHEREUM"],
        ["arbitrum-sepolia", "ETHEREUM"],
        ["base-goerli", null],
        ["base-sepolia", "ETHEREUM"],
        ["bsc-testnet", null],
        ["optimism-goerli", null],
        ["optimism-sepolia", "ETHEREUM"],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", "ETHEREUM"],
        ["zora", null],
        ["arbitrumnova", "ETHEREUM"],
        ["astar-zkevm", "ETHEREUM"],
    ]).get(chain)!;

    if (tickerName == null) {
        throw new Error(`Ticker Name project id not found for chain ${chain}`);
    }
    return tickerName;
}
