/**
 * Attestation validation system for secure communication with iframe-based services.
 * This provides a framework for validating attestations before performing sensitive operations.
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
export interface AttestationValidator {
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
 * Base implementation of attestation validation
 * Provides common validation logic and state management
 * Concrete implementations need only implement the requestAttestation method
 */
export abstract class BaseAttestationValidator implements AttestationValidator {
    protected attestationValidated = false;
    protected attestationPublicKey: string | null = null;

    /**
     * Template method that implements the attestation validation flow
     * Requests attestation data from derived classes and validates it
     */
    public async validateAttestation(): Promise<boolean> {
        try {
            const attestationData = await this.requestAttestation();

            if (attestationData.publicKey) {
                this.attestationPublicKey = attestationData.publicKey;
            }

            this.attestationValidated =
                this.validateAttestationData(attestationData);

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
            throw new Error(
                "Attestation not validated. Call validateAttestation() first"
            );
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
    protected validateAttestationData(attestation: Attestation): boolean {
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

    /**
     * Abstract method to request attestation from the specific service
     * Each concrete implementation must provide its own request mechanism
     * @returns Promise resolving to attestation data
     */
    protected abstract requestAttestation(): Promise<Attestation>;
}
