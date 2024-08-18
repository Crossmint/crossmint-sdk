import type { CrossmintWalletService } from "../../../api/CrossmintWalletService";
import type { SmartWalletChain } from "../../../blockchain/chains";
import { SmartWalletError } from "../../../error";
import type {
    PreExistingWalletProperties,
    SupportedEntryPointVersion,
    SupportedKernelVersion,
} from "../../../types/internal";
import type { UserParams } from "../../../types/params";
import type { SignerData, SmartWalletConfig } from "../../../types/service";
import { AccountConfigCache } from "./cache";
import { EOASignerConfig, PasskeySignerConfig, type SignerConfig } from "./signer";

interface AccountConfig {
    entryPointVersion: SupportedEntryPointVersion;
    kernelVersion: SupportedKernelVersion;
    userWithId: UserParams & { id: string };
    existing?: PreExistingWalletProperties;
}
export class AccountConfigService {
    constructor(
        private readonly crossmintService: CrossmintWalletService,
        private readonly configCache: AccountConfigCache
    ) {}

    public async get(
        user: UserParams,
        chain: SmartWalletChain
    ): Promise<{
        config: AccountConfig;
        cached: boolean;
    }> {
        const cached = this.configCache.get(user);
        if (cached != null) {
            return {
                config: this.validateAndFormat(user, cached),
                cached: true,
            };
        }

        const config = await this.crossmintService.getSmartWalletConfig(user, chain);
        return { config: this.validateAndFormat(user, config), cached: false };
    }

    public cache({
        entryPointVersion,
        kernelVersion,
        user,
        existing,
    }: {
        entryPointVersion: SupportedEntryPointVersion;
        kernelVersion: SupportedKernelVersion;
        user: UserParams & { id: string };
        existing: PreExistingWalletProperties;
    }) {
        this.configCache.clear();
        this.configCache.set(user, {
            entryPointVersion,
            kernelVersion,
            userId: user.id,
            signers: [{ signerData: existing.signerConfig.data }],
            smartContractWalletAddress: existing.address,
        });
    }

    private validateAndFormat(
        user: UserParams,
        { entryPointVersion, kernelVersion, signers, smartContractWalletAddress, userId }: SmartWalletConfig
    ): AccountConfig {
        if (
            (entryPointVersion === "v0.7" && kernelVersion.startsWith("0.2")) ||
            (entryPointVersion === "v0.6" && kernelVersion.startsWith("0.3"))
        ) {
            throw new SmartWalletError(
                `Unsupported combination: entryPoint ${entryPointVersion} and kernel version ${kernelVersion}. Please contact support`
            );
        }

        const signerData = signers.map((x) => x.signerData);
        const signer = this.getSigner(signerData);

        if (
            (smartContractWalletAddress != null && signer == null) ||
            (signer != null && smartContractWalletAddress == null)
        ) {
            throw new SmartWalletError("Either both signer and address must be present, or both must be null");
        }

        if (signer == null || smartContractWalletAddress == null) {
            return { entryPointVersion, kernelVersion, userWithId: { ...user, id: userId } };
        }

        return {
            entryPointVersion,
            kernelVersion,
            userWithId: { ...user, id: userId },
            existing: { signerConfig: signer, address: smartContractWalletAddress },
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
