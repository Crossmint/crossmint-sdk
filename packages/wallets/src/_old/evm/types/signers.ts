import type { WebAuthnP256 } from "ox";
import type { Account, Hex, EIP1193Provider } from "viem";

export type PasskeySigningCallback = (
    message: string
) => Promise<{ signature: Hex; metadata: WebAuthnP256.SignMetadata }>;
export type PasskeyCreationCallback = (name: string) => Promise<{ id: string; publicKey: { x: string; y: string } }>;

export type EVMSignerInput =
    | {
          type: "evm-keypair";
          address: string;
          signer:
              | {
                    type: "provider";
                    provider: EIP1193Provider;
                }
              | {
                    type: "viem_v2";
                    account: Account;
                };
      }
    | {
          type: "evm-passkey";
          name?: string;
          signingCallback?: PasskeySigningCallback;
          creationCallback?: PasskeyCreationCallback;
      };

export type EVMSigner = EVMSignerInput & {
    locator: string;
} & (
        | {
              type: "evm-passkey";
              id: string;
          }
        | {
              type: "evm-keypair";
          }
    );
