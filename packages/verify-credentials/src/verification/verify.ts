import { Wallet, verifyMessage } from "@ethersproject/wallet";
import { EIP712VC } from "@krebitdao/eip712-vc";
import { VerifiableCredential } from "../types/verifiableCredential.js";
import { VerifiableCredentialSignatureService } from "./signatureService.js";
import { parseISO } from "date-fns";
import { NFTstatusService } from "./nftStatus.js";

export async function verifyCredential(
    credential: VerifiableCredential
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

    const validProof = await new VerifiableCredentialSignatureService().verify(
        credential
    );
    if (!validProof) {
        error = "Invalid proof";
        return { validVC: false, error };
    }

    const nftRevoked = await new NFTstatusService().isBurned(credential.nft);
    if (nftRevoked) {
        error = "Credential has been revoked";
        return { validVC: false, error };
    }

    const validVC = error == null;
    return { validVC, error };
}
