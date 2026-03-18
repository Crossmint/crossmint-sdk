import type { WebAuthnP256 } from "ox";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type {
    exportSignerInboundEvents,
    exportSignerOutboundEvents,
    signerInboundEvents,
    signerOutboundEvents,
} from "@crossmint/client-signers";
import type {
    Crossmint,
    EvmExternalWalletSignerConfig,
    SolanaExternalWalletSignerConfig,
    StellarExternalWalletSignerConfig,
} from "@crossmint/common-sdk-base";
import type { Chain, SolanaChain, StellarChain } from "../chains/chains";
import type { Callbacks } from "@/wallets/types";

export type {
    EvmExternalWalletSignerConfig,
    SolanaExternalWalletSignerConfig,
    StellarExternalWalletSignerConfig,
    GenericEIP1193Provider,
} from "@crossmint/common-sdk-base";

////////////////////////////////////////////////////////////
// Signer configs
////////////////////////////////////////////////////////////
export class AuthRejectedError extends Error {
    constructor() {
        super("Authentication was rejected by the user");
        this.name = "AuthRejectedError";
    }
}

export type EmailSignerConfig = {
    type: "email";
    email?: string;
    locator?: string;
};

export type PhoneSignerConfig = {
    type: "phone";
    phone?: string;
    locator?: string;
};

export type NonCustodialSignerType = PhoneSignerConfig["type"] | EmailSignerConfig["type"];

export type ExternalWalletSignerConfigForChain<C extends Chain> = C extends SolanaChain
    ? SolanaExternalWalletSignerConfig
    : C extends StellarChain
      ? StellarExternalWalletSignerConfig
      : EvmExternalWalletSignerConfig;

export type ApiKeySignerConfig = { type: "api-key" };

export type ServerSignerConfig = {
    type: "server";
    secret: string;
};

export type BaseSignerConfig<C extends Chain> =
    | ExternalWalletSignerConfigForChain<C>
    | ApiKeySignerConfig
    | ServerSignerConfig;

export type PasskeySignerConfig = {
    type: "passkey";
    name?: string;
    id?: string;
    locator?: string;
    onCreatePasskey?: (name: string) => Promise<{ id: string; publicKey: { x: string; y: string } }>;
    onSignWithPasskey?: (message: string) => Promise<PasskeySignResult>;
};

////////////////////////////////////////////////////////////
// Internal signer config
////////////////////////////////////////////////////////////
type BaseInternalSignerConfig = {
    locator: SignerLocator;
    address: string;
    crossmint: Crossmint;
    clientTEEConnection?: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
};

export type EmailInternalSignerConfig = EmailSignerConfig &
    Omit<BaseInternalSignerConfig, "locator"> & {
        locator: EmailSignerLocator;
        onAuthRequired?: Callbacks["onAuthRequired"];
    };

export type PhoneInternalSignerConfig = PhoneSignerConfig &
    Omit<BaseInternalSignerConfig, "locator"> & {
        locator: PhoneSignerLocator;
        onAuthRequired?: Callbacks["onAuthRequired"];
    };

export type DeviceInternalSignerConfig = {
    type: "device";
    locator?: DeviceSignerLocator;
    address: string;
};

export type PasskeyInternalSignerConfig = PasskeySignerConfig & {
    locator: PasskeySignerLocator;
    id: string;
};

export type ApiKeyInternalSignerConfig = ApiKeySignerConfig & {
    locator: ApiKeySignerLocator;
    address: string;
};

export type ExternalWalletInternalSignerConfig<C extends Chain> = ExternalWalletSignerConfigForChain<C> & {
    locator: ExternalWalletSignerLocator;
};

export type ServerInternalSignerConfig = {
    type: "server";
    /** The derived chain-specific private key bytes */
    derivedKeyBytes: Uint8Array;
    locator: string;
    address: string;
};

export type InternalSignerConfig<C extends Chain> =
    | EmailInternalSignerConfig
    | PhoneInternalSignerConfig
    | PasskeyInternalSignerConfig
    | ApiKeyInternalSignerConfig
    | ExternalWalletInternalSignerConfig<C>
    | DeviceInternalSignerConfig
    | ServerInternalSignerConfig;

////////////////////////////////////////////////////////////
// Signers
////////////////////////////////////////////////////////////
export type BaseSignResult = {
    signature: string;
};

export type DeviceSignResult = {
    signature: {
        r: string;
        s: string;
    };
};

export type PasskeySignResult = {
    signature: {
        r: string;
        s: string;
    };
    metadata: WebAuthnP256.SignMetadata;
};

export type DeviceSignerConfig = {
    type: "device";
    publicKey?: { x: string; y: string };
    locator?: string;
};

export type SignerConfigForChain<C extends Chain> = C extends SolanaChain
    ? EmailSignerConfig | PhoneSignerConfig | BaseSignerConfig<C> | DeviceSignerConfig
    : C extends StellarChain
      ? EmailSignerConfig | PhoneSignerConfig | BaseSignerConfig<C> | DeviceSignerConfig
      : EmailSignerConfig | PhoneSignerConfig | PasskeySignerConfig | BaseSignerConfig<C> | DeviceSignerConfig;

////////////////////////////////////////////////////////////
// Signer locator types
////////////////////////////////////////////////////////////
export type EmailSignerLocator = `email:${string}`;
export type PhoneSignerLocator = `phone:${string}`;
export type PasskeySignerLocator = `passkey:${string}`;
export type DeviceSignerLocator = `device:${string}`;
export type ExternalWalletSignerLocator = `external-wallet:${string}`;
export type ApiKeySignerLocator = "api-key" | `api-key:${string}`;

export type SignerLocator =
    | EmailSignerLocator
    | PhoneSignerLocator
    | PasskeySignerLocator
    | DeviceSignerLocator
    | ExternalWalletSignerLocator
    | ApiKeySignerLocator;

////////////////////////////////////////////////////////////
// Signer base types
////////////////////////////////////////////////////////////
type SignResultMap = {
    email: BaseSignResult;
    phone: BaseSignResult;
    "api-key": BaseSignResult;
    "external-wallet": BaseSignResult;
    server: BaseSignResult;
    passkey: PasskeySignResult;
    device: DeviceSignResult;
};

export interface Signer<T extends keyof SignResultMap = keyof SignResultMap> {
    type: T;
    locator(): SignerLocator;
    address?(): string;
    signMessage(message: string): Promise<SignResultMap[T]>;
    signTransaction(transaction: string): Promise<SignResultMap[T]>;
}

export interface ExportableSigner extends Signer {
    _exportPrivateKey: (exportTEEConnection: ExportSignerTEEConnection) => Promise<void>;
}

export function isExportableSigner(signer: Signer): signer is ExportableSigner {
    return (signer as ExportableSigner)._exportPrivateKey !== undefined;
}

export type ExportSignerTEEConnection = HandshakeParent<
    typeof exportSignerOutboundEvents,
    typeof exportSignerInboundEvents
>;
