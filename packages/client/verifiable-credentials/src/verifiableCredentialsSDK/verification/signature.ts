import { getAddress } from "@ethersproject/address";
import { verifyTypedData } from "@ethersproject/wallet";

import type { VerifiableCredential } from "../types/verifiableCredential";

export class VerifiableCredentialSignatureService {
    async verify(vc: VerifiableCredential) {
        if (vc.proof == undefined) {
            throw new Error("No proof associated with credential");
        }

        const issuerId = vc.issuer.id;
        const issuerDidParts = issuerId.split(":");
        if (issuerDidParts.length < 2) {
            throw new Error("Issuer DID should be in the format did:{chain}:{address}");
        }
        let issuerAddress = issuerDidParts[2];

        try {
            issuerAddress = getAddress(issuerAddress);
        } catch (e: any) {
            throw new Error("Malformed issuer address");
        }

        const { domain, types } = vc.proof.eip712;
        const proofValue = vc.proof.proofValue;

        const recoveredAddress = verifyTypedData(domain, types, vc, proofValue);
        return issuerAddress === getAddress(recoveredAddress);
    }
}
