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

/** Configuration for automatic wallet creation on user login. */
export type CreateOnLogin =
    | {
          /** The blockchain to create the wallet on (e.g. "base-sepolia"). */
          chain: SolanaChain;
          /** The signer configuration (e.g. `{ type: "email" }`). */
          signer: SignerConfigForChain<SolanaChain>;
          /** Optional owner identifier. */
          owner?: string;
          /** Optional array of wallet plugins. */
          plugins?: WalletPlugin<SolanaChain>[];
          /** Optional array of delegated signers. */
          delegatedSigners?: Array<DelegatedSigner>;
          /** Optional wallet alias. */
          alias?: string;
      }
    | {
          /** The blockchain to create the wallet on (e.g. "base-sepolia"). */
          chain: EVMChain;
          /** The signer configuration (e.g. `{ type: "email" }`). */
          signer: SignerConfigForChain<EVMChain>;
          /** Optional owner identifier. */
          owner?: string;
          /** Optional array of wallet plugins. */
          plugins?: WalletPlugin<EVMChain>[];
          /** Optional array of delegated signers. */
          delegatedSigners?: Array<DelegatedSigner>;
          /** Optional wallet alias. */
          alias?: string;
      }
    | {
          /** The blockchain to create the wallet on (e.g. "base-sepolia"). */
          chain: StellarChain;
          /** The signer configuration (e.g. `{ type: "email" }`). */
          signer: SignerConfigForChain<StellarChain>;
          /** Optional owner identifier. */
          owner?: string;
          /** Optional array of wallet plugins. */
          plugins?: WalletPlugin<StellarChain>[];
          /** Optional array of delegated signers. */
          delegatedSigners?: Array<DelegatedSigner>;
          /** Optional wallet alias. */
          alias?: string;
      };

export type BaseCrossmintWalletProviderProps = {
    /** Configuration for automatic wallet creation on login. */
    createOnLogin?: CreateOnLogin;
    /** Whether to show passkey helper UI. Default: true. */
    showPasskeyHelpers?: boolean;
    /** Appearance configuration for wallet UI components. */
    appearance?: UIConfig;
};
