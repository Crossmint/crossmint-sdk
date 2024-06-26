import { PAYMASTER_RPC, PM_BASE_RPC, PM_BASE_SEPOLIA_RPC, usesGelatoBundler } from "@/utils";
import { logInputOutput } from "@/utils/log";
import { createZeroDevPaymasterClient } from "@zerodev/sdk";
import { Middleware } from "permissionless/actions/smartAccount";
import { EntryPoint } from "permissionless/types/entrypoint";
import { http } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { getViemNetwork, getZeroDevProjectIdByBlockchain } from "../BlockchainNetworks";

export function usePaymaster(chain: EVMBlockchainIncludingTestnet) {
    return !usesGelatoBundler(chain);
}

const getPaymasterRPC = logInputOutput((chain: EVMBlockchainIncludingTestnet) => {
    switch (chain) {
        case EVMBlockchainIncludingTestnet.BASE_SEPOLIA:
            return PM_BASE_SEPOLIA_RPC;
        case EVMBlockchainIncludingTestnet.BASE:
            return PM_BASE_RPC;
        default:
            return PAYMASTER_RPC + getZeroDevProjectIdByBlockchain(chain) + "?paymasterProvider=STACKUP";
    }
}, "getPaymasterRPC");

export function paymasterMiddleware({
    entryPoint,
    chain,
}: {
    entryPoint: EntryPoint;
    chain: EVMBlockchainIncludingTestnet;
}): Middleware<EntryPoint> {
    return {
        middleware: {
            sponsorUserOperation: async ({ userOperation }) => {
                const paymasterClient = createZeroDevPaymasterClient({
                    chain: getViemNetwork(chain),
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
