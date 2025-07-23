import type { UIConfig } from "@crossmint/common-sdk-base";
import type { EVMChain, SignerConfigForChain, SolanaChain, StellarChain } from "@crossmint/wallets-sdk";

export type {
    Balances,
    Chain,
    EvmExternalWalletSignerConfig,
    DelegatedSigner,
    SolanaExternalWalletSignerConfig,
    Wallet,
} from "@crossmint/wallets-sdk";

export { EVMWallet, SolanaWallet, StellarWallet } from "@crossmint/wallets-sdk";

export type CreateOnLogin =
    | {
          chain: SolanaChain;
          signer: SignerConfigForChain<SolanaChain>;
          owner?: string;
      }
    | {
          chain: EVMChain;
          signer: SignerConfigForChain<EVMChain>;
          owner?: string;
      }
    | {
          chain: StellarChain;
          signer: SignerConfigForChain<StellarChain>;
          owner?: string;
      };

export type BaseCrossmintWalletProviderProps = {
    createOnLogin?: CreateOnLogin;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
};
