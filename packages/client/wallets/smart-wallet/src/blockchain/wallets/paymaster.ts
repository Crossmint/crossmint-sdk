import { CrossmintWalletService } from "@/api/CrossmintWalletService";
import { Middleware } from "permissionless/actions/smartAccount";
import { PimlicoBundlerClient } from "permissionless/clients/pimlico";
import { EntryPoint } from "permissionless/types/entrypoint";

import { UserParams } from "../../types/params";
import { usesGelatoBundler } from "../../utils/blockchain";
import { SmartWalletChain } from "../chains";

export function usePaymaster(chain: SmartWalletChain) {
    return !usesGelatoBundler(chain);
}

export function paymasterMiddleware({
    bundlerClient,
    entryPoint,
    chain,
    walletService,
    user,
}: {
    bundlerClient: PimlicoBundlerClient<EntryPoint>;
    entryPoint: EntryPoint;
    chain: SmartWalletChain;
    walletService: CrossmintWalletService;
    user: UserParams;
}): Middleware<EntryPoint> {
    return {
        middleware: {
            gasPrice: async () => (await bundlerClient.getUserOperationGasPrice()).fast,
            sponsorUserOperation: async ({ userOperation }) => {
                const { sponsorUserOpParams } = await walletService.sponsorUserOperation(
                    user,
                    userOperation,
                    entryPoint,
                    chain
                );
                return sponsorUserOpParams;
            },
        },
    };
}
