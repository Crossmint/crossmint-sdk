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

// Rename, this isn't really a facade if we include the cache method.
export class AccountConfigFacade {
    constructor(
        private readonly crossmintService: CrossmintWalletService,
        private readonly configCache: AccountConfigCache
    ) {}

    // TODO Expose whether this used the cache or not
    public async get(
        user: UserParams,
        chain: SmartWalletChain
    ): Promise<{
        entryPointVersion: SupportedEntryPointVersion;
        kernelVersion: SupportedKernelVersion;
        userId: string;
        existing?: PreExistingWalletProperties;
    }> {
        const { entryPointVersion, kernelVersion, signers, smartContractWalletAddress, userId } = await this.config(
            user,
            chain
        );

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
            return { entryPointVersion, kernelVersion, userId };
        }

        return {
            entryPointVersion,
            kernelVersion,
            userId,
            existing: { signerConfig: signer, address: smartContractWalletAddress },
        };
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
        this.configCache.set(user, {
            entryPointVersion,
            kernelVersion,
            userId: user.id,
            signers: [{ signerData: existing.signerConfig.data }],
            smartContractWalletAddress: existing.address,
        });
    }

    private async config(user: UserParams, chain: SmartWalletChain): Promise<SmartWalletConfig> {
        console.log(`Fetching config`);

        const cached = this.configCache.get(user);
        if (cached != null) {
            console.log("Config found in cache");
            return cached;
        }

        console.log("Config not found in cache, fetching from service");
        const config = await this.crossmintService.getSmartWalletConfig(user, chain);

        console.log("Config fetched successfully");
        return config;
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
