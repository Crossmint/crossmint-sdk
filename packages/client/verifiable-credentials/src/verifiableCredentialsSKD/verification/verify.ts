import { isValid, parseISO } from "date-fns";

import { NFTService } from "../onchainServices/nft";
import { VerifiableCredential } from "../types/verifiableCredential";
import { VerifiableCredentialSignatureService } from "./signature";

export async function verifyCredential(
    credential: VerifiableCredential
): Promise<{ validVC: boolean; error: string | undefined }> {
    let error;
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

    const validProof = await new VerifiableCredentialSignatureService().verify(credential);
    if (!validProof) {
        error = "Invalid proof";
        return { validVC: false, error };
    }

    const nftRevoked = await new NFTService(credential.nft.chain).isBurnt(credential.nft);
    if (nftRevoked) {
        error = "Credential has been revoked";
        return { validVC: false, error };
    }

    const validVC = error == null;
    return { validVC, error };
}
