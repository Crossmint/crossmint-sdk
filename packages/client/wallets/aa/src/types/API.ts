import { EntryPointVersion } from "permissionless/_types/types";

export type CrossmintServiceUser = { type: "whiteLabel"; userId: string };
export type StoreAbstractWalletInput = {
    userIdentifier: CrossmintServiceUser;
    type: string;
    smartContractWalletAddress: string;
    signerData: EOASignerData | PasskeysSignerData;
    sessionKeySignerAddress?: string;
    version: number;
    baseLayer: string;
    chainId: number;
    entryPointVersion: EntryPointVersion;
};

export interface EOASignerData {
    eoaAddress: string;
    type: "eoa";
}

export interface PasskeysSignerData {
    passkeyName: string;
    passkeyServerUrl: string;
    credentials: string;
    entryPoint: string;
    validatorAddress: string;
    pubKeyX: string;
    pubKeyY: string;
    authenticatorIdHash: string;
    domain: string;
    type: "passkeys";
}
