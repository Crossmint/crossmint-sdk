import { CrossmintWalletService } from "@/api/CrossmintWalletService";
import { UserParams } from "@/types/Config";
import { Middleware } from "permissionless/actions/smartAccount";
import { EntryPoint } from "permissionless/types/entrypoint";

import { usesGelatoBundler } from "../../utils/blockchain";
import { SmartWalletChain } from "../chains";

export function usePaymaster(chain: SmartWalletChain) {
    return !usesGelatoBundler(chain);
}

export function paymasterMiddleware({
    entryPoint,
    chain,
    walletService,
    user,
}: {
    entryPoint: EntryPoint;
    chain: SmartWalletChain;
    walletService: CrossmintWalletService;
    user: UserParams;
}): Middleware<EntryPoint> {
    return {
        middleware: {
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
