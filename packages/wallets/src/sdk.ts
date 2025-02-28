import type { EVMSmartWallet, EVMMPCWallet } from "@/evm";
import type { SolanaSmartWallet, SolanaMPCWallet } from "@/solana";

type EVMAdminSigner =
    | {
          type: "evm-keypair";
          address: string;
      }
    | {
          type: "evm-fireblocks-custodial";
      }
    | {
          type: "evm-passkey";
          id: string;
          name: string;
          publicKey: {
              x: string;
              y: string;
          };
      };

type SolanaAdminSigner =
    | {
          type: "solana-keypair";
          address: string;
      }
    | {
          type: "solana-fireblocks-custodial";
      };

type WalletTypeToArgs = {
    "evm-smart-wallet": [adminSigner: EVMAdminSigner, linkedUser?: string];
    "evm-mpc-wallet": [linkedUser?: string];
    "solana-smart-wallet": [adminSigner: SolanaAdminSigner, linkedUser?: string];
    "solana-mpc-wallet": [linkedUser?: string];
};

type WalletTypeToWallet = {
    "evm-smart-wallet": EVMSmartWallet;
    "evm-mpc-wallet": EVMMPCWallet;
    "solana-smart-wallet": SolanaSmartWallet;
    "solana-mpc-wallet": SolanaMPCWallet;
};

class CrossmintWallet {
    constructor(
        private readonly apiKey: string,
        private readonly jwt?: string
    ) {}

    // biome-ignore lint/suspicious/useAwait: <explanation>
    public async getOrCreateWallet<WalletType extends keyof WalletTypeToArgs>(
        _type: WalletType,
        ..._args: WalletTypeToArgs[WalletType]
    ): Promise<WalletTypeToWallet[WalletType]> {
        // if (type === "evm-smart-wallet") {
        //     const [adminSigner, linkedUser] =
        //         args as WalletTypeToArgs["evm-smart-wallet"];
        //     return new EVMSmartWallet();
        // }
        throw new Error("Not implemented");
    }
}

export default CrossmintWallet;
