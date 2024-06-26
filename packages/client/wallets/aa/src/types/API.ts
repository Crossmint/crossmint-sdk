import type { deserializePasskeyValidatorData } from "@zerodev/passkey-validator/utils";
import { EntryPointVersion } from "permissionless/_types/types";

import type { UserIdentifier } from "./Config";

export type StoreAbstractWalletInput = {
    userIdentifier: UserIdentifier;
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
