import { PasskeyValidatorContractVersion } from "@zerodev/passkey-validator";
import { isAddress, isHex } from "viem";
import { z } from "zod";

import { SUPPORTED_ENTRYPOINT_VERSIONS, SUPPORTED_KERNEL_VERSIONS } from "../utils/constants";

const HexSchema = z.custom<`0x${string}`>((val): val is `0x${string}` => isHex(val as string), {
    message: "Invalid hex string",
});

const evmAddressSchema = z.custom<`0x${string}`>((val): val is `0x${string}` => isAddress(val as string), {
    message: "Invalid evm address",
});

export const EOASignerDataSchema = z.object({
    eoaAddress: evmAddressSchema,
    type: z.literal("eoa"),
});

export const PasskeyValidatorSerializedDataSchema = z.object({
    entryPoint: evmAddressSchema,
    validatorAddress: evmAddressSchema,
    pubKeyX: z.string(),
    pubKeyY: z.string(),
    authenticatorIdHash: HexSchema,
    authenticatorId: z.string(),
});

export const PasskeySignerDataSchema = PasskeyValidatorSerializedDataSchema.extend({
    passkeyName: z.string(),
    validatorContractVersion: z.nativeEnum(PasskeyValidatorContractVersion),
    domain: z.string(),
    type: z.literal("passkeys"),
});

export const SignerDataSchema = z.discriminatedUnion("type", [PasskeySignerDataSchema, EOASignerDataSchema]);

export const SmartWalletConfigSchema = z.object({
    kernelVersion: z.enum(SUPPORTED_KERNEL_VERSIONS, {
        errorMap: (_, ctx) => ({
            message: `Unsupported kernel version. Supported versions: ${SUPPORTED_KERNEL_VERSIONS.join(
                ", "
            )}. Version used: ${ctx.data}. Please contact support`,
        }),
    }),
    entryPointVersion: z.enum(SUPPORTED_ENTRYPOINT_VERSIONS, {
        errorMap: (_, ctx) => ({
            message: `Unsupported entry point version. Supported versions: ${SUPPORTED_ENTRYPOINT_VERSIONS.join(
                ", "
            )}. Version used: ${ctx.data}. Please contact support`,
        }),
    }),
    userId: z.string().min(1),
    signers: z
        .array(
            z.object({
                signerData: SignerDataSchema,
            })
        )
        .min(0)
        .max(1, "Invalid wallet signer configuration. Please contact support"),
    smartContractWalletAddress: evmAddressSchema.optional(),
});
