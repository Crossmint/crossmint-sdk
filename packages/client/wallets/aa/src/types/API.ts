import type { deserializePasskeyValidatorData } from "@zerodev/passkey-validator/utils";
import { EntryPointVersion } from "permissionless/_types/types";

export type CrossmintServiceUser = { type: "whiteLabel"; userId: string };
export type StoreAbstractWalletInput = {
    userIdentifier: CrossmintServiceUser;
    type: string;
    smartContractWalletAddress: string;
    signerData: SignerData;
    sessionKeySignerAddress?: string;
    version: number;
    baseLayer: string;
    chainId: number;
    entryPointVersion: EntryPointVersion;
};

export type SignerData = EOASignerData | PasskeysSignerData;

export interface EOASignerData {
    eoaAddress: string;
    type: "eoa";
}

type ZeroDevPasskeyValidatorFields = ReturnType<typeof deserializePasskeyValidatorData>;
export type PasskeysSignerData = ZeroDevPasskeyValidatorFields & {
    passkeyName: string;
    domain: string;
    type: "passkeys";
};
