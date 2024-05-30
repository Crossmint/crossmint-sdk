import { createZeroDevPaymasterClient } from "@zerodev/sdk";
import { Middleware } from "permissionless/actions/smartAccount";
import { EntryPoint } from "permissionless/types/entrypoint";
import { http } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { getPaymasterRPC, getViemNetwork } from "../BlockchainNetworks";

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
