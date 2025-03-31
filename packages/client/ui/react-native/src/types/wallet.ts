import type { EVMSmartWalletChain, EVMSignerInput, SolanaSignerInput } from "@crossmint/wallets-sdk";

type GetOrCreateWalletBaseProps = {
    args: {
        linkedUser?: string;
    };
};

export type GetOrCreateWalletProps =
    | ({
          type: "evm-smart-wallet";
          args: {
              chain: EVMSmartWalletChain;
              adminSigner?: EVMSignerInput;
          };
      } & GetOrCreateWalletBaseProps)
    | ({
          type: "solana-smart-wallet";
          args: {
              adminSigner?: SolanaSignerInput;
          };
      } & GetOrCreateWalletBaseProps);

type WalletBaseConfig = {
    createOnLogin: "all-users" | "off";
    showPasskeyHelpers?: boolean;
    linkedUser?: string;
};

export type CrossmintAuthEmbeddedWallets =
    | ({
          type: "evm-smart-wallet";
          defaultChain: EVMSmartWalletChain;
          adminSigner?: EVMSignerInput;
      } & WalletBaseConfig)
    | ({
          type: "solana-smart-wallet";
          adminSigner?: SolanaSignerInput;
      } & WalletBaseConfig);
