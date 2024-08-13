import { z } from "zod";

import type { SupportedEntryPointVersion, SupportedKernelVersion } from "./internal";
import type {
    EOASignerDataSchema,
    PasskeySignerDataSchema,
    PasskeyValidatorSerializedDataSchema,
    SignerDataSchema,
} from "./schema";

export type EOASignerData = z.infer<typeof EOASignerDataSchema>;
export type PasskeyValidatorSerializedData = z.infer<typeof PasskeyValidatorSerializedDataSchema>;
export type PasskeySignerData = z.infer<typeof PasskeySignerDataSchema>;
export type SignerData = z.infer<typeof SignerDataSchema>;

export type PasskeyDisplay = Pick<PasskeySignerData, "type" | "passkeyName" | "pubKeyX" | "pubKeyY">;
export type SignerDisplay = EOASignerData | PasskeyDisplay;

export type StoreSmartWalletParams = {
    type: string;
    smartContractWalletAddress: string;
    signerData: SignerData;
    sessionKeySignerAddress?: string;
    version: number;
    baseLayer: string;
    chainId: number;
    entryPointVersion: SupportedEntryPointVersion;
    kernelVersion: SupportedKernelVersion;
};
