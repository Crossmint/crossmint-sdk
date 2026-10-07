import type { WalletConnectConfig } from "@/hooks/useWalletConnectProvider";
import { WalletKit } from "@reown/walletkit";
import { Core } from "@walletconnect/core";

export async function createProvider({ projectId, metadata }: WalletConnectConfig) {
    const core = new Core({
        projectId,
    });

    return await WalletKit.init({
        core,
        metadata,
    });
}
