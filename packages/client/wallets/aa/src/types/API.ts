import type { deserializePasskeyValidatorData } from "@zerodev/passkey-validator/utils";
import { EntryPointVersion } from "permissionless/_types/types";

export type StoreAbstractWalletInput = {
    type: string;
    smartContractWalletAddress: string;
    signerData: SignerData;
    sessionKeySignerAddress?: string;
    version: number;
    baseLayer: string;
    chainId: number;
    entryPointVersion: EntryPointVersion;
};

export type SignerData = EOASignerData | PasskeySignerData;

export interface EOASignerData {
    eoaAddress: string;
    type: "eoa";
}

type ZeroDevPasskeyValidatorFields = ReturnType<typeof deserializePasskeyValidatorData>;
export type PasskeySignerData = ZeroDevPasskeyValidatorFields & {
    passkeyName: string;
    domain: string;
    type: "passkeys";
};
