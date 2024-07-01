import { ChainRPCConfig, VCChain } from "./types/chain";

const POLYGON_RPC_URL = "https://polygon.llamarpc.com/";
const POLYGON_RPC_URL_TEST = "https://rpc-amoy.polygon.technology/";

export const DEFAULT_CHAIN_RPCS: ChainRPCConfig[] = [
    {
        chain: VCChain.POLYGON,
        rpc: POLYGON_RPC_URL,
    },
    {
        chain: VCChain.POLY_AMOY,
        rpc: POLYGON_RPC_URL_TEST,
    },
    {
        chain: VCChain.POLYGON_AMOY,
        rpc: POLYGON_RPC_URL_TEST,
    },
];

export const DEFAULT_IPFS_GATEWAYS = [
    "https://fleek.ipfs.io/ipfs/{cid}",
    "https://ipfs.io/ipfs/{cid}",
    "https://gateway.ipfs.io/ipfs/{cid}",
    "https://nftstorage.link/ipfs/{cid}",
];

export interface VCSDKConfig {
    ipfsGateways: string[];
    blockchainRpcs: ChainRPCConfig[];
}

class ConfigManager {
    private static instance: ConfigManager;
    private config: VCSDKConfig | null = null;

    private constructor() {}

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public init(config: { ipfsGateways?: string[]; blockchainRpcs?: ChainRPCConfig[] }): void {
        let ipfsGateways = config.ipfsGateways;
        let blockchainRpcs = config.blockchainRpcs;

        if (!ipfsGateways) {
            ipfsGateways = DEFAULT_IPFS_GATEWAYS;
            console.debug(`No IPFS gateways provided using defaults: ${ipfsGateways}`);
        }
        if (!blockchainRpcs) {
            blockchainRpcs = DEFAULT_CHAIN_RPCS;
            console.debug(`No RPC providers provided using defaults: ${blockchainRpcs}`);
        }

        this.config = {
            ipfsGateways,
            blockchainRpcs,
        };
    }

    public getConfig(): VCSDKConfig {
        if (!this.config) {
            throw new Error("SDK configuration not set. Use init(VCSDKConfig) to set the configuration.");
        }
        return this.config;
    }

    public getIpfsGateways(): string[] {
        return this.getConfig().ipfsGateways;
    }

    public getBlockchainRpcs(): ChainRPCConfig[] {
        return this.getConfig().blockchainRpcs;
    }
}

export const configManager = ConfigManager.getInstance();
