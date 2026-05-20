import type { Approval } from "@/wallets/types";
import type { BaseSignResult, DeviceSignResult, PasskeySignResult, SignerLocator } from "@/signers/types";
import { parseSignerLocator } from "./signer-locator";
import { InvalidSignatureForApprovalError } from "./errors";
import { isHex, size, parseSignature } from "viem";

const ERC_6492_MAGIC_SUFFIX = "6492649264926492649264926492649264926492649264926492649264926492";
const P256_ORDER = BigInt("0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");

interface SignatureValidator<TApproval extends Approval = Approval> {
    validate(approval: TApproval): void;
}

type EcdsaApproval = Approval & {
    signature: BaseSignResult["signature"];
};

type P256Approval = Approval & {
    signature: DeviceSignResult["signature"];
};

type PasskeyApproval = P256Approval & {
    metadata: PasskeySignResult["metadata"];
};

function isValidP256Component(value: string): boolean {
    try {
        const n = BigInt(value);
        return n > 0n && n < P256_ORDER;
    } catch {
        return false;
    }
}

const ecdsaValidator: SignatureValidator<EcdsaApproval> = {
    validate(approval): void {
        const { signature, signer } = approval;

        if (!isHex(signature)) {
            throw new InvalidSignatureForApprovalError(
                `Expected ECDSA hex signature for signer "${signer}", received: ${typeof signature}`
            );
        }

        if (signature.endsWith(ERC_6492_MAGIC_SUFFIX)) {
            throw new InvalidSignatureForApprovalError(
                `ERC-6492 wrapped signatures are not supported for signer "${signer}"`
            );
        }

        const byteLength = size(signature);
        if (byteLength !== 64 && byteLength !== 65) {
            throw new InvalidSignatureForApprovalError(
                `Expected 64 or 65-byte ECDSA signature for signer "${signer}", received: ${byteLength} bytes`
            );
        }

        if (byteLength === 65) {
            try {
                parseSignature(signature);
            } catch {
                throw new InvalidSignatureForApprovalError(
                    `Signature for signer "${signer}" is not a valid ECDSA signature`
                );
            }
        }
    },
};

const p256Validator: SignatureValidator<P256Approval> = {
    validate(approval): void {
        const { signature, signer } = approval;
        const { r, s } = signature;

        if (!isValidP256Component(r) || !isValidP256Component(s)) {
            throw new InvalidSignatureForApprovalError(
                `Expected P256 signature { r, s } with positive integer values for signer "${signer}", ` +
                    `received: ${JSON.stringify(signature)}`
            );
        }
    },
};

const passkeyValidator: SignatureValidator<PasskeyApproval> = {
    validate(approval): void {
        p256Validator.validate(approval);

        if (approval.metadata == null) {
            throw new InvalidSignatureForApprovalError(
                `Expected passkey metadata for signer "${approval.signer}", received: none`
            );
        }
    },
};

const validatorRegistry = new Map<string, SignatureValidator>([
    ["external-wallet", ecdsaValidator],
    ["server", ecdsaValidator],
    ["email", ecdsaValidator],
    ["phone", ecdsaValidator],
    ["passkey", passkeyValidator],
    ["device", p256Validator],
]);

/**
 * Register a custom validator for a new signer type.
 * Existing validators can be extended without modifying this module.
 */
export function registerSignatureValidator(signerType: string, validator: SignatureValidator): void {
    validatorRegistry.set(signerType, validator);
}

/**
 * Validates that the externally-provided approval signature matches the
 * expected format for the given signer type.
 *
 * Call this in the `options.approval` branch of `approveTransactionInternal`
 * and `approveSignatureInternal` **before** submitting to the API.
 *
 * @throws {InvalidSignatureForApprovalError} when the signature is malformed,
 *   ERC-6492-wrapped, or otherwise incompatible with the signer type.
 */
export function assertApprovalSignatureFormat(approval: Approval): void {
    const { type: signerType } = parseSignerLocator(approval.signer as SignerLocator);

    if (signerType === "api-key") {
        return;
    }

    const validator = validatorRegistry.get(signerType);
    if (validator == null) {
        console.warn(
            `[assertApprovalSignatureFormat] No validator for signer type "${signerType}" — skipping validation`
        );
        return;
    }

    validator.validate(approval);
}
