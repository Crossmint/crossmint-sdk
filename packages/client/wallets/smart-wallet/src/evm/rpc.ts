import { viemNetworks, type SmartWalletChain } from "./chains";

export function getRPC(chain: SmartWalletChain): string {
    return viemNetworks[chain].rpcUrls.default.http[0];
}
