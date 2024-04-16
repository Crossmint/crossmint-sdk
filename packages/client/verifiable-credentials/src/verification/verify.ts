import { verifyMessage } from "@ethersproject/wallet";
import { isValid, parseISO } from "date-fns";

import { getCredentialFromId } from "../presentation/getCredential";
import { getNftFromLocator } from "../presentation/getNftCredential";
import { getDidAddress, isEncryptedVerifiableCredential, parseSignedLocator } from "../services/utils";
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

export async function validatePass(signedLocator: string, environment: string) {
    const locatorData = parseSignedLocator(signedLocator);

    const { nft, collection } = await getNftFromLocator(locatorData.locator, environment);

    const credentialId = nft.metadata.credentialRetrievalId;
    if (credentialId == null) {
        throw new Error("The given nft has no credential associated");
    }

    const credential = await getCredentialFromId(credentialId, environment);
    if (credential == null) {
        throw new Error("Cannot retrive the credential");
    }
    if (isEncryptedVerifiableCredential(credential)) {
        throw new Error("The credential is encrypted");
    }

    const address = getDidAddress(credential.issuer.id);
    const validLocator = verifyMessage(locatorData.payload, locatorData.signature) === address;

    if (!validLocator) {
        throw new Error("Invalid locator signature");
    }

    const validCredential = await verifyCredential(credential);
    if (!validCredential.validVC) {
        throw new Error(`Invalid credential: ${validCredential.error}`);
    }

    return {
        nft,
        collection,
        credential,
    };
}
