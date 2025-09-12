import type { UIConfig } from "@crossmint/common-sdk-base";
import type {
    DelegatedSigner,
    EVMChain,
    SignerConfigForChain,
    SolanaChain,
    StellarChain,
    WalletPlugin,
} from "@crossmint/wallets-sdk";

export type {
    Balances,
    Chain,
    EvmExternalWalletSignerConfig,
    DelegatedSigner,
    SolanaExternalWalletSignerConfig,
    Wallet,
    WalletPlugin,
} from "@crossmint/wallets-sdk";

export { EVMWallet, SolanaWallet, StellarWallet } from "@crossmint/wallets-sdk";

export type CreateOnLogin =
    | {
          chain: SolanaChain;
          signer: SignerConfigForChain<SolanaChain>;
          owner?: string;
          plugins?: WalletPlugin<SolanaChain>[];
          delegatedSigners?: Array<DelegatedSigner>;
      }
    | {
          chain: EVMChain;
          signer: SignerConfigForChain<EVMChain>;
          owner?: string;
          plugins?: WalletPlugin<EVMChain>[];
          delegatedSigners?: Array<DelegatedSigner>;
      }
    | {
          chain: StellarChain;
          signer: SignerConfigForChain<StellarChain>;
          owner?: string;
          plugins?: WalletPlugin<StellarChain>[];
          delegatedSigners?: Array<DelegatedSigner>;
      };

export type BaseCrossmintWalletProviderProps = {
    createOnLogin?: CreateOnLogin;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
};
