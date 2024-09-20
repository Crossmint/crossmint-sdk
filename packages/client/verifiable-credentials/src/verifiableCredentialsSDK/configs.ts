import { type ChainRPCConfig, VCChain } from "./types/chain";

const POLYGON_RPC_URL = "https://polygon.llamarpc.com/";
const POLYGON_RPC_URL_TEST = "https://rpc-amoy.polygon.technology/";

export const DEFAULT_CHAIN_RPCS: ChainRPCConfig = {
    [VCChain.POLYGON]: POLYGON_RPC_URL,
    [VCChain.POLY_AMOY]: POLYGON_RPC_URL_TEST,
    [VCChain.POLYGON_AMOY]: POLYGON_RPC_URL_TEST,
};

export const DEFAULT_IPFS_GATEWAYS = [
    "https://ipfs.io/ipfs/",
    "https://hardbin.com/ipfs/",
    "https://nftstorage.link/ipfs/",
];

export interface VCSDKConfig {
    ipfsGateways: string[];
    ipfstimeout: number;
    blockchainRpcs: ChainRPCConfig;
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

    public init(config: { ipfsGateways?: string[]; ipfsTimeout?: number; blockchainRpcs?: ChainRPCConfig }): void {
        let ipfsGateways = config.ipfsGateways;
        const blockchainRpcs = { ...DEFAULT_CHAIN_RPCS, ...config.blockchainRpcs };

        if (!ipfsGateways) {
            ipfsGateways = DEFAULT_IPFS_GATEWAYS;
            console.debug(`No IPFS gateways provided using defaults: ${ipfsGateways}`);
        }

        console.debug(`Current rpc provided: ${blockchainRpcs}`);

        this.config = {
            ipfsGateways,
            blockchainRpcs,
            ipfstimeout: config.ipfsTimeout || 10000,
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

    public getIpfsTimeout(): number {
        return this.getConfig().ipfstimeout;
    }

    public getBlockchainRpcs(): ChainRPCConfig {
        return this.getConfig().blockchainRpcs;
    }
}

export const configManager = ConfigManager.getInstance();
