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
    "evm-smart-wallet": [adminSigner: EVMAdminSigner, linkedUser: string];
    "evm-mpc-wallet": [linkedUser: string];
    "solana-smart-wallet": [adminSigner: SolanaAdminSigner, linkedUser: string];
    "solana-mpc-wallet": [linkedUser: string];
};

class WalletSDK {
    constructor(
        private readonly apiKey: string,
        private readonly jwt?: string
    ) {}

    public async getOrCreateWallet(
        type: "evm-smart-wallet",
        ...args: WalletTypeToArgs["evm-smart-wallet"]
    ): Promise<EVMSmartWallet>;
    public async getOrCreateWallet(
        type: "evm-mpc-wallet",
        ...args: WalletTypeToArgs["evm-mpc-wallet"]
    ): Promise<EVMMPCWallet>;
    public async getOrCreateWallet(
        type: "solana-smart-wallet",
        ...args: WalletTypeToArgs["solana-smart-wallet"]
    ): Promise<SolanaSmartWallet>;
    public async getOrCreateWallet(
        type: "solana-mpc-wallet",
        ...args: WalletTypeToArgs["solana-mpc-wallet"]
    ): Promise<SolanaMPCWallet>;

    // biome-ignore lint/suspicious/useAwait: <explanation>
    public async getOrCreateWallet<WalletType extends keyof WalletTypeToArgs>(
        _type: WalletType,
        ..._args: WalletTypeToArgs[WalletType]
    ): Promise<EVMSmartWallet | EVMMPCWallet> {
        // if (type === "evm-smart-wallet") {
        //     const [adminSigner, linkedUser] =
        //         args as WalletTypeToArgs["evm-smart-wallet"];
        //     return new EVMSmartWallet();
        // }
        throw new Error("Not implemented");
    }
}

export default WalletSDK;
