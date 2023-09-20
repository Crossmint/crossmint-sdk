import type { JsonRpcSigner } from "@ethersproject/providers";

export async function isJsonRpcSigner(): Promise<(signer: unknown) => signer is JsonRpcSigner> {
    // @ts-ignore - Error because we don't use 'module' field in tsconfig, which is expected because we use tsup to compile
    const { JsonRpcSigner } = await import("@ethersproject/providers");

    return (signer: unknown): signer is JsonRpcSigner => signer instanceof JsonRpcSigner;
}
