/**
 * Attestation validation system for secure communication with iframe-based services.
 */

/**
 * Represents an attestation object received from a service
 * Must contain a publicKey field for encryption operations
 */
export interface Attestation {
    [key: string]: any;
    publicKey?: string;
}

/**
 * Interface defining the attestation validation contract
 * Implementers must provide functionality to validate attestations
 * and access the attestation public key for secure communication
 */
export interface AttestationValidationService {
    /**
     * Requests and validates an attestation from a service
     * @returns Promise that resolves to true if attestation is valid
     */
    validateAttestation(): Promise<boolean>;

    /**
     * Returns the current validation state
     */
    isAttestationValid(): boolean;

    /**
     * Verifies attestation has been validated before proceeding with operations
     * @throws Error if attestation has not been validated
     */
    ensureAttestationValidated(): void;

    /**
     * Clears the attestation state
     * Should be called during initialization and disposal
     */
    resetAttestationState(): void;

    /**
     * Retrieves the public key from the validated attestation
     * @returns The attestation public key or null if not validated
     */
    getAttestationPublicKey(): string | null;
}

/**
 * Definition for the attestation request function
 * This is a callback that the AttestationValidationService uses to request attestation data
 */
export type AttestationRequestFn = () => Promise<Attestation>;

/**
 * Implementation of the attestation validation service
 * Validates attestations and manages validation state
 */
export class AttestationValidationServiceImpl implements AttestationValidationService {
    private attestationValidated = false;
    private attestationPublicKey: string | null = null;
    private requestAttestationFn: AttestationRequestFn;

    /**
     * Creates a new AttestationValidationService
     * @param requestAttestationFn Function to request attestation data
     */
    constructor(requestAttestationFn: AttestationRequestFn) {
        this.requestAttestationFn = requestAttestationFn;
    }

    /**
     * Implements the attestation validation flow
     * Requests attestation data and validates it
     */
    public async validateAttestation(): Promise<boolean> {
        try {
            const attestationData = await this.requestAttestationFn();

            if (attestationData.publicKey) {
                this.attestationPublicKey = attestationData.publicKey;
            }

            this.attestationValidated = this.validateAttestationData(attestationData);

            if (!this.attestationValidated) {
                this.attestationPublicKey = null;
            }

            return this.attestationValidated;
        } catch (error) {
            console.error("Failed to validate attestation", error);
            this.attestationValidated = false;
            this.attestationPublicKey = null;
            throw error;
        }
    }

    public isAttestationValid(): boolean {
        return this.attestationValidated;
    }

    public ensureAttestationValidated(): void {
        if (!this.attestationValidated) {
            throw new Error("Attestation not validated. Call validateAttestation() first");
        }
    }

    public resetAttestationState(): void {
        this.attestationValidated = false;
        this.attestationPublicKey = null;
    }

    public getAttestationPublicKey(): string | null {
        if (!this.attestationValidated) {
            return null;
        }
        return this.attestationPublicKey;
    }

    /**
     * Validates the attestation data content
     * @param attestation The attestation object to validate
     * @returns True if the attestation data is valid
     */
    private validateAttestationData(attestation: Attestation): boolean {
        // TODO: Implement actual attestation validation logic

        if (!attestation || Object.keys(attestation).length === 0) {
            return false;
        }

        if (!attestation.publicKey) {
            console.warn("Attestation missing publicKey");
            return false;
        }

        return true;
    }
}

// For backward compatibility with existing code
export type AttestationValidator = AttestationValidationService;
