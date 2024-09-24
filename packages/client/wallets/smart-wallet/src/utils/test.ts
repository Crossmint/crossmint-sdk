import type { SmartWalletConfig } from "../types/service";

export const mockConfig: SmartWalletConfig = {
    kernelVersion: "0.3.1",
    entryPointVersion: "v0.7",
    userId: "devlyn@paella.dev",
    signers: [
        {
            signerData: {
                entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
                validatorAddress: "0xbA45a2BFb8De3D24cA9D7F1B551E14dFF5d690Fd",
                pubKeyX: "110311240024954100085667226472791468894960420468782293097673057837941382345525",
                pubKeyY: "55639753423913323920634804373610812340711881298092778447611544058799129775494",
                authenticatorIdHash: "0xb7f951026ad956257e41c16f5e6c1c8969968356c9a8a8df916fcceda53f5c6a",
                authenticatorId: "u76dDdMEjTBgm68gbqfbaAlSoqE",
                passkeyName: "devlyn@paella.dev",
                validatorContractVersion: "0.0.2" as any,
                domain: "localhost",
                type: "passkeys",
            },
        },
    ],
    smartContractWalletAddress: "0x7EAf93269C06Af4236E08d16d5220Df5f964eD87",
};
