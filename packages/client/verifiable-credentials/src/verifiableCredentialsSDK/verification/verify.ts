import { isValid, parseISO } from "date-fns";

import { NFTService } from "../onchainServices/nft";
import type { VerifiableCredential } from "../types/verifiableCredential";
import { VerifiableCredentialSignatureService } from "./signature";

/**
 *  Verify a Verifiable Credential
 *
 * This function checks the validity of a given Verifiable Credential (VC) by performing several checks:
 * 1. Ensures the `validUntil` date is a valid ISO string and not expired.
 * 2. Verifies the cryptographic proof attached to the credential.
 * 3. Checks if the associated NFT has been revoked (burned).
 *
 * @param credential the credential object to verify
 * @returns {validVC: boolean, error: string | undefined}
 * - `error`: A string with the error message if the credential is invalid, or `undefined` if the credential is valid.
 * - `validVC`: A boolean indicating if the credential is valid.
 *
 * @throws Will throw an error if `validUntil` is present and is not a valid ISO string or if the date is invalid.
 */
export async function verifyCredential(
    credential: VerifiableCredential
): Promise<{ validVC: boolean; error: string | undefined }> {
    let error;

    // Check if the credential has a valid expiration date
    if (credential.validUntil != null) {
        if (typeof credential.validUntil !== "string") {
            throw new Error("expirationDate must be a ISO string");
        }

        const parsedExpirationDate = parseISO(credential.validUntil);
        if (!isValid(parsedExpirationDate)) {
            throw new Error(`Invalid expiration date: ${credential.validUntil}`);
        }

        const todayDate = new Date();
        if (parsedExpirationDate < todayDate) {
            error = "Credential expired at " + credential.validUntil;
            return { validVC: false, error };
        }
    }

    // Verify the cryptographic proof
    const validProof = await new VerifiableCredentialSignatureService().verify(credential);
    if (!validProof) {
        error = "Invalid proof";
        return { validVC: false, error };
    }

    // Check if the associated NFT is revoked (burned)
    const nftRevoked = await new NFTService(credential.nft.chain).isBurnt(credential.nft);
    if (nftRevoked) {
        error = "Credential has been revoked";
        return { validVC: false, error };
    }

    // Determine if the credential is valid
    const validVC = error == null;
    return { validVC, error };
}
