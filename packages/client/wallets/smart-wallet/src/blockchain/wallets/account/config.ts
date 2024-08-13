import { Address } from "viem";

import type { CrossmintWalletService } from "../../../api/CrossmintWalletService";
import type { SmartWalletChain } from "../../../blockchain/chains";
import { SmartWalletError } from "../../../error";
import type { SupportedEntryPointVersion, SupportedKernelVersion } from "../../../types/internal";
import type { UserParams } from "../../../types/params";
import type { SignerData } from "../../../types/service";
import { EOASignerConfig, PasskeySignerConfig, SignerConfig } from "./signer";

export class AccountConfigFacade {
    constructor(private readonly crossmintService: CrossmintWalletService) {}

    public async get(
        user: UserParams,
        chain: SmartWalletChain
    ): Promise<{
        entryPointVersion: SupportedEntryPointVersion;
        kernelVersion: SupportedKernelVersion;
        userId: string;
        existingSignerConfig?: SignerConfig;
        smartContractWalletAddress?: Address;
    }> {
        const { entryPointVersion, kernelVersion, signers, smartContractWalletAddress, userId } =
            await this.crossmintService.getSmartWalletConfig(user, chain);

        if (
            (entryPointVersion === "v0.7" && kernelVersion.startsWith("0.2")) ||
            (entryPointVersion === "v0.6" && kernelVersion.startsWith("0.3"))
        ) {
            throw new SmartWalletError(
                `Unsupported combination: entryPoint ${entryPointVersion} and kernel version ${kernelVersion}. Please contact support`
            );
        }

        return {
            entryPointVersion,
            kernelVersion,
            userId,
            existingSignerConfig: this.getSigner(signers.map((x) => x.signerData)),
            smartContractWalletAddress,
        };
    }

    private getSigner(signers: SignerData[]): SignerConfig | undefined {
        if (signers.length === 0) {
            return undefined;
        }

        const data = signers[0];

        if (data.type === "eoa") {
            return new EOASignerConfig(data);
        }

        if (data.type === "passkeys") {
            return new PasskeySignerConfig(data);
        }
    }
}
