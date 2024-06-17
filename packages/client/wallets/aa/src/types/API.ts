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
