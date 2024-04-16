import { getAddress } from "@ethersproject/address";
import { verifyTypedData } from "@ethersproject/wallet";

import { getDidAddress } from "../../services/utils";
import { VerifiableCredential } from "../../types/verifiableCredential";

export class VerifiableCredentialSignatureService {
    async verify(vc: VerifiableCredential) {
        const issuerAddress = getDidAddress(vc.issuer.id);

        if (vc.proof == undefined) {
            throw new Error("No proof associated with credential");
        }

        const { domain, types } = vc.proof.eip712;
        const proofValue = vc.proof.proofValue;

        const recoveredAddress = verifyTypedData(domain, types, vc, proofValue);

        return getAddress(issuerAddress) === getAddress(recoveredAddress);
    }
}
