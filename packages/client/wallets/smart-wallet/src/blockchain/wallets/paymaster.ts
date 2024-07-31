import { PAYMASTER_RPC } from "@/utils/constants";
import { createZeroDevPaymasterClient } from "@zerodev/sdk";
import { Middleware } from "permissionless/actions/smartAccount";
import { EntryPoint } from "permissionless/types/entrypoint";
import { http } from "viem";

import { usesGelatoBundler } from "../../utils/blockchain";
import { SmartWalletChain, viemNetworks, zerodevProjects } from "../chains";

export function usePaymaster(chain: SmartWalletChain) {
    return !usesGelatoBundler(chain);
}

const getPaymasterRPC = (chain: SmartWalletChain) => {
    return PAYMASTER_RPC + zerodevProjects[chain];
};

export function paymasterMiddleware({
    entryPoint,
    chain,
}: {
    entryPoint: EntryPoint;
    chain: SmartWalletChain;
}): Middleware<EntryPoint> {
    return {
        middleware: {
            sponsorUserOperation: async ({ userOperation }) => {
                const paymasterClient = createZeroDevPaymasterClient({
                    chain: viemNetworks[chain],
                    transport: http(getPaymasterRPC(chain)),
                    entryPoint,
                });
                return paymasterClient.sponsorUserOperation({
                    userOperation,
                    entryPoint,
                });
            },
        },
    };
}
