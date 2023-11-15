import { parseISO } from "date-fns";

import { VerifiableCredential } from "../types/verifiableCredential";
import { NFTStatusService } from "./services/nftStatus";
import { VerifiableCredentialSignatureService } from "./services/signature";

export async function verifyCredential(
    credential: VerifiableCredential,
    environment: string = "test"
): Promise<{ validVC: boolean; error: string | undefined }> {
    // TODO check for missing fields

    let error;
    if (credential.expirationDate != null) {
        const parsedExpirationDate = parseISO(credential.expirationDate);
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

    const nftRevoked = await new NFTStatusService(environment).isBurnt(credential.nft);
    if (nftRevoked) {
        error = "Credential has been revoked";
        return { validVC: false, error };
    }

    const validVC = error == null;
    return { validVC, error };
}
