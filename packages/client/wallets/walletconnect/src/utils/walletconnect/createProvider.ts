import type { WalletConnectConfig } from "@/hooks/useWalletConnectProvider";
import { Core } from "@walletconnect/core";
import { Web3Wallet } from "@walletconnect/web3wallet";

export async function createProvider({ projectId, metadata }: WalletConnectConfig) {
    const core = new Core({
        projectId,
    });

    return await Web3Wallet.init({
        core,
        metadata,
    });
}
