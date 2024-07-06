import { EntryPointVersion } from "permissionless/_types/types";

import { PasskeyValidatorSerializedData } from "./internal";

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

export type PasskeySignerData = PasskeyValidatorSerializedData & {
    passkeyName: string;
    domain: string;
    type: "passkeys";
};
