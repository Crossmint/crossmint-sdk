import type { UIConfig } from "@crossmint/common-sdk-base";
import type {
    DelegatedSigner,
    EVMChain,
    OnCreateConfig,
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
    OnCreateConfig,
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
          onCreateConfig?: OnCreateConfig<SolanaChain>;
      }
    | {
          chain: EVMChain;
          signer: SignerConfigForChain<EVMChain>;
          owner?: string;
          plugins?: WalletPlugin<EVMChain>[];
          delegatedSigners?: Array<DelegatedSigner>;
          onCreateConfig?: OnCreateConfig<EVMChain>;
      }
    | {
          chain: StellarChain;
          signer: SignerConfigForChain<StellarChain>;
          owner?: string;
          plugins?: WalletPlugin<StellarChain>[];
          delegatedSigners?: Array<DelegatedSigner>;
          onCreateConfig?: OnCreateConfig<StellarChain>;
      };

export type BaseCrossmintWalletProviderProps = {
    createOnLogin?: CreateOnLogin;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
};
