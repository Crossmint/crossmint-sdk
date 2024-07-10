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
    kernelVersion: "0.3.1" | "0.3.0";
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
