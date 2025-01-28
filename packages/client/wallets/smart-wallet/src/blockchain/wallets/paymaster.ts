import type { CrossmintWalletService } from "@/api/CrossmintWalletService";
import type { Middleware } from "permissionless/actions/smartAccount";
import type { PimlicoBundlerClient } from "permissionless/clients/pimlico";
import type { EntryPoint } from "permissionless/types/entrypoint";

import type { UserParams } from "../../types/params";
import type { SmartWalletChain } from "../chains";

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
