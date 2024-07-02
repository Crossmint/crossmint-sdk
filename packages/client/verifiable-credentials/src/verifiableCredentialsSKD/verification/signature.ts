import { getAddress } from "@ethersproject/address";
import { verifyTypedData } from "@ethersproject/wallet";

import { VerifiableCredential } from "../types/verifiableCredential";

export class VerifiableCredentialSignatureService {
    async verify(vc: VerifiableCredential) {
        const issuerId = vc.issuer.id;
        const issuerDidParts = issuerId.split(":");
        if (issuerDidParts.length < 2) {
            throw new Error("Issuer DID should be in the format did:{chain}:{address}");
        }
        const issuerAddress = issuerDidParts[2];

        if (vc.proof == undefined) {
            throw new Error("No proof associated with credential");
        }
        const { domain, types } = vc.proof.eip712;
        const proofValue = vc.proof.proofValue;

        const recoveredAddress = verifyTypedData(domain, types, vc, proofValue);
        return getAddress(issuerAddress) === getAddress(recoveredAddress);
    }
}
