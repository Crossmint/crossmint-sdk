import { isValid, parseISO } from "date-fns";

import { VerifiableCredential } from "../types/verifiableCredential";
import { NFTService } from "./services/nftStatus";
import { VerifiableCredentialSignatureService } from "./services/signature";

export async function verifyCredential(
    credential: VerifiableCredential,
    environment: string = "staging"
): Promise<{ validVC: boolean; error: string | undefined }> {
    let error;
    if (credential.expirationDate != null) {
        if (typeof credential.expirationDate !== "string") {
            throw new Error("expirationDate must be a ISO string");
        }

        const parsedExpirationDate = parseISO(credential.expirationDate);
        if (!isValid(parsedExpirationDate)) {
            throw new Error(`Invalid expiration date: ${credential.expirationDate}`);
        }

        const todayDate = new Date();
        if (parsedExpirationDate < todayDate) {
            error = "Credential expired at " + credential.expirationDate;
            return { validVC: false, error };
        }
    }

    const validProof = await new VerifiableCredentialSignatureService().verify(credential);
    if (!validProof) {
        error = "Invalid proof";
        return { validVC: false, error };
    }

    const nftRevoked = await new NFTService(environment).isBurnt(credential.nft);
    if (nftRevoked) {
        error = "Credential has been revoked";
        return { validVC: false, error };
    }

    const validVC = error == null;
    return { validVC, error };
}
