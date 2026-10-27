import type { WebAuthnP256 } from "ox";
import type { VersionedTransaction } from "@solana/web3.js";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type {
    exportSignerInboundEvents,
    exportSignerOutboundEvents,
    signerInboundEvents,
    signerOutboundEvents,
} from "@crossmint/client-signers";
import type { Crossmint } from "@crossmint/common-sdk-base";
import type { Chain, SolanaChain, StellarChain } from "../chains/chains";
import type { Callbacks, Signer, SignerStatus } from "@/wallets/types";
import { quorumSignerNotSupported } from "../utils/errors";

export type ExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign:
        | ((transaction: VersionedTransaction) => Promise<VersionedTransaction>)
        | ((payload: string) => Promise<string>);
};

export type SolanaExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
    onSignBytes?: (payload: string) => Promise<string>;
};

export type EvmExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign: (payload: string) => Promise<string>;
};

export type StellarExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign: (payload: string) => Promise<string>;
};

export type ExternalWalletRegistrationConfig = {
    type: "external-wallet";
    address: string;
};

////////////////////////////////////////////////////////////
// Signer configs
////////////////////////////////////////////////////////////
export class AuthRejectedError extends Error {
    constructor() {
        super("Authentication was rejected by the user");
        this.name = "AuthRejectedError";
    }
}

export class OtpValidationError extends Error {
    public readonly code: string | undefined;

    constructor(message: string, code?: string) {
        super(message);
        this.name = "OtpValidationError";
        this.code = code;
    }
}

/**
 * Thrown when the signer backend rejects the request's credentials (missing, empty or expired JWT).
 * Distinct from `OtpValidationError`: the OTP flow never ran, the user must re-authenticate with the app first.
 */
export class SignerAuthenticationError extends Error {
    public readonly code: string | undefined;

    constructor(message: string, code?: string) {
        super(message);
        this.name = "SignerAuthenticationError";
        this.code = code;
    }
}

export class SignerStatusError extends Error {
    public readonly code: string | undefined;

    constructor(message: string, code?: string) {
        super(message);
        this.name = "SignerStatusError";
        this.code = code;
    }
}

export class KeyExportError extends Error {
    public readonly code: string | undefined;

    constructor(message: string, code?: string) {
        super(message);
        this.name = "KeyExportError";
        this.code = code;
    }
}

/**
 * Thrown when the signer frame was reloaded between starting and completing onboarding, so the
 * in-memory onboarding state (and the OTP issued for it) is gone. A fresh OTP has already been
 * requested when this is thrown; the caller should prompt the user to enter the new code.
 */
export class OnboardingSessionExpiredError extends Error {
    constructor(message = "The signer session expired before the code could be verified. A new code has been sent.") {
        super(message);
        this.name = "OnboardingSessionExpiredError";
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
    channel?: "sms" | "whatsapp";
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

export type DerivedServerSigner = {
    derivedKeyBytes: Uint8Array;
    derivedAddress: string;
};

export type ApiSourcedServerSignerConfig = {
    type: "server";
    address: string;
};

export function isApiSourcedServerSignerConfig(config: { type: string }): config is ApiSourcedServerSignerConfig {
    return config.type === "server" && !("secret" in config);
}

export type QuorumLocator = `quorum:${string}`;

// Crossmint assigns quorum ids as version-8 UUIDs (the API spec's locator pattern).
const QUORUM_LOCATOR_PATTERN = /^quorum:[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isQuorumLocator(locator: string): locator is QuorumLocator {
    return QUORUM_LOCATOR_PATTERN.test(locator);
}

export type QuorumMemberType = "email" | "phone" | "external-wallet" | "server" | "passkey";

type WithoutStatus<T> = T extends unknown ? Omit<T, "status" | "scopes"> : never;

/** A quorum member as the API returns it: the member's own signer fields, without a status. */
export type QuorumMember = WithoutStatus<Extract<Signer, { type: QuorumMemberType }>>;

/** A quorum as the wallets API returns it: Crossmint assigns `locator` when the quorum is added. */
export type QuorumSigner = {
    type: "quorum";
    locator: QuorumLocator;
    threshold: number;
    members: QuorumMember[];
};

export function isQuorumSigner(entry: { type: string }): entry is QuorumSigner {
    return entry.type === "quorum";
}

/** Throws `QuorumSignerNotSupportedError` for a quorum, as the SDK cannot sign as one yet. */
export function throwIfQuorumSigner(entry: { type: string }): void {
    if (isQuorumSigner(entry)) {
        throw quorumSignerNotSupported([entry.locator]);
    }
}

export type RecoverySignerConfigForChain<C extends Chain> =
    | SignerConfigForChain<C>
    | ApiSourcedServerSignerConfig
    | QuorumSigner;

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
    /** `message` is the hex WebAuthn challenge; `credentialId` is the passkey's credential id when it is known. */
    onSignWithPasskey?: (message: string, credentialId?: string) => Promise<PasskeySignResult>;
};

/**
 * Creates passkeys and signs with them where the browser WebAuthn API is not available (e.g. React Native).
 * Passed as the `passkeyProvider` wallet option, it is used for every passkey signer that has no
 * `onCreatePasskey` / `onSignWithPasskey` of its own.
 */
export type PasskeyProvider = {
    createPasskey: (name: string) => Promise<{ id: string; publicKey: { x: string; y: string } }>;
    /** `message` is the hex WebAuthn challenge; `credentialId` is the passkey to sign with, when it is known. */
    signWithPasskey: (message: string, credentialId?: string) => Promise<PasskeySignResult>;
};

////////////////////////////////////////////////////////////
// Internal signer config
////////////////////////////////////////////////////////////
type BaseInternalSignerConfig = {
    locator: SignerLocator;
    address: string;
    crossmint: Crossmint;
    clientTEEConnection?: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
    resetSignerFrame?: () => Promise<void>;
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
    locator: ServerSignerLocator;
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
    name?: string;
};

export type SignerConfigForChain<C extends Chain> = C extends SolanaChain
    ? EmailSignerConfig | PhoneSignerConfig | PasskeySignerConfig | BaseSignerConfig<C> | DeviceSignerConfig
    : C extends StellarChain
      ? EmailSignerConfig | PhoneSignerConfig | PasskeySignerConfig | BaseSignerConfig<C> | DeviceSignerConfig
      : EmailSignerConfig | PhoneSignerConfig | PasskeySignerConfig | BaseSignerConfig<C> | DeviceSignerConfig;

// api-key and device are never quorum members; Solana also takes no passkey members.
export type QuorumMemberConfig<C extends Chain> = C extends SolanaChain
    ? Exclude<SignerConfigForChain<C>, ApiKeySignerConfig | DeviceSignerConfig | PasskeySignerConfig>
    : Exclude<SignerConfigForChain<C>, ApiKeySignerConfig | DeviceSignerConfig>;

/** A quorum to create or add: `threshold` of its `members` must sign. */
export type QuorumSignerConfig<C extends Chain> = {
    type: "quorum";
    threshold: number;
    members: Array<QuorumMemberConfig<C>>;
};

////////////////////////////////////////////////////////////
// Signer locator types
////////////////////////////////////////////////////////////
export type EmailSignerLocator = `email:${string}`;
export type PhoneSignerLocator = `phone:${string}`;
export type PasskeySignerLocator = `passkey:${string}`;
export type DeviceSignerLocator = `device:${string}`;
export type ExternalWalletSignerLocator = `external-wallet:${string}`;
export type ApiKeySignerLocator = "api-key" | `api-key:${string}`;
export type ServerSignerLocator = `server:${string}`;

export type SignerLocator =
    | EmailSignerLocator
    | PhoneSignerLocator
    | PasskeySignerLocator
    | DeviceSignerLocator
    | ExternalWalletSignerLocator
    | ApiKeySignerLocator
    | ServerSignerLocator
    | QuorumLocator;

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

export interface SignerAdapter<T extends keyof SignResultMap = keyof SignResultMap> {
    type: T;
    status?: SignerStatus;
    locator(): SignerLocator;
    address?(): string;
    signMessage(message: string): Promise<SignResultMap[T]>;
    signTransaction(transaction: string): Promise<SignResultMap[T]>;
}

export interface ExportableSignerAdapter extends SignerAdapter {
    _exportPrivateKey: (
        exportTEEConnection: ExportSignerTEEConnection,
        onExport?: () => void | Promise<void>
    ) => Promise<void>;
}

export function isExportableSignerAdapter(signer: SignerAdapter): signer is ExportableSignerAdapter {
    return (signer as ExportableSignerAdapter)._exportPrivateKey !== undefined;
}

export type ExportSignerTEEConnection = HandshakeParent<
    typeof exportSignerOutboundEvents,
    typeof exportSignerInboundEvents
>;
