import { name, version } from "../../package.json";

export const WALLETS_SERVICE = "WALLETS_SDK";
export const SDK_VERSION = version;
export const SDK_NAME = name;
export const STATUS_POLLING_INTERVAL_MS = 500;

export const TRANSACTION_TIMEOUT_MS = {
    ethereum: 60_000,
    polygon: 180_000, // 3 minutes for Polygon due to network congestion
    'polygon-amoy': 180_000,
    arbitrum: 90_000,
    optimism: 90_000,
    base: 90_000,
    solana: 60_000,
} as const;

export const DEFAULT_TRANSACTION_TIMEOUT_MS = 60_000;
