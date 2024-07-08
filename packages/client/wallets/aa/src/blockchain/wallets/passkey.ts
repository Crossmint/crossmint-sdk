import {
    CrossmintWalletService,
    EVMSmartWallet,
    EntryPointDetails,
    PasskeySigner,
    UserParams,
    WalletConfig,
    blockchainToChainId,
} from "@/index";
import { PasskeySignerData } from "@/types/API";
import { WalletCreationParams } from "@/types/internal";
import { CURRENT_VERSION, JWT_COOKIE_EXPIRY_TIME, ZERO_DEV_TYPE } from "@/utils/constants";
import { isLocalhost } from "@/utils/helpers";
import { createPasskeyValidator, deserializePasskeyValidator } from "@zerodev/passkey-validator";
import { KernelValidator, createKernelAccount } from "@zerodev/sdk";
import { EntryPoint } from "permissionless/types/entrypoint";
import { PublicClient } from "viem";

import { deserializePasskeyValidatorData, serializePasskeyValidatorData } from "../../utils/passkey";

export interface PasskeyWalletParams extends WalletCreationParams {
    walletConfig: WalletConfig & { signer: PasskeySigner };
}

export function isPasskeyParams(params: WalletCreationParams): params is PasskeyWalletParams {
    return (params.walletConfig.signer as PasskeySigner).type === "PASSKEY";
}

type PasskeyValidator = KernelValidator<EntryPoint, "WebAuthnValidator"> & {
    getSerializedData: () => string;
};

export class PasskeyWalletService {
    constructor(private readonly crossmintService: CrossmintWalletService) {}

    public async getOrCreate({ user, chain, publicClient, entrypoint }: PasskeyWalletParams) {
        this.setJwtCookie(user.jwt);

        const validator = await this.getOrCreateSigner({
            user,
            entrypoint,
            publicClient,
        });

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: { sudo: validator },
            entryPoint: entrypoint.address,
        });

        await this.crossmintService.storeAbstractWallet(user, {
            type: ZERO_DEV_TYPE,
            smartContractWalletAddress: kernelAccount.address,
            signerData: this.getSignerData(validator),
            version: CURRENT_VERSION,
            baseLayer: "evm",
            chainId: blockchainToChainId(chain),
            entryPointVersion: entrypoint.version,
        });

        return new EVMSmartWallet(this.crossmintService, kernelAccount, publicClient, chain);
    }

    private async getOrCreateSigner({
        user,
        entrypoint,
        publicClient,
    }: {
        user: UserParams;
        entrypoint: EntryPointDetails;
        publicClient: PublicClient;
    }): Promise<PasskeyValidator> {
        const serializedData = await this.fetchSerializedSigner(user);
        if (serializedData != null) {
            return deserializePasskeyValidator(publicClient, {
                serializedData,
                entryPoint: entrypoint.address,
            });
        }

        return createPasskeyValidator(publicClient, {
            passkeyServerUrl: this.crossmintService.getPasskeyServerUrl(),
            entryPoint: entrypoint.address,
            passkeyName: "no-op", // Parameter not used in our server. We infer the name from the jwt token.
            credentials: "include",
        });
    }

    private async fetchSerializedSigner(user: UserParams): Promise<string | null> {
        const signer = await this.crossmintService.getPasskeySigner(user);
        if (signer == null) {
            return null;
        }

        return serializePasskeyValidatorData(signer);
    }

    private getSignerData(validator: PasskeyValidator): PasskeySignerData {
        const fields = deserializePasskeyValidatorData(validator.getSerializedData());
        return {
            ...fields,
            domain: window.location.hostname,
            type: "passkeys",
        };
    }

    private setJwtCookie(jwt: string) {
        const now = new Date();
        const expireTime = new Date(now.getTime() + JWT_COOKIE_EXPIRY_TIME);
        document.cookie = `user_jwt=${jwt}; expires=${expireTime.toUTCString()}; path=/;${
            isLocalhost() ? "" : " Secure;"
        }`;
    }
}
