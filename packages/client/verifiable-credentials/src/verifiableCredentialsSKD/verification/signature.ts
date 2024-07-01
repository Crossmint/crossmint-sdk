import { verifyTypedData } from "@ethersproject/wallet";
import { EIP712VC } from "@krebitdao/eip712-vc";

import { VerifiableCredential } from "../types/verifiableCredential";

export class VerifiableCredentialSignatureService {
    vcSigner;
    constructor(signer = EIP712VC) {
        this.vcSigner = signer;
    }

    async verify(vc: VerifiableCredential) {
        let issuerId = vc.issuer.id;
        const issuerDidParts = issuerId.split(":");
        if (issuerDidParts.length < 2) {
            throw new Error("Issuer DID should be in the format did:{chain}:{address}");
        }
        issuerId = issuerDidParts[2];

        if (vc.proof == undefined) {
            throw new Error("No proof associated with credential");
        }
        const vcDomain = new this.vcSigner(vc.proof.eip712.domain);
        const types = vc.proof.eip712.types;
        const proofValue = vc.proof.proofValue;
        delete vc.proof;

        return await vcDomain.verifyW3CCredential(issuerId, vc, types, proofValue, async (data, proofValue: string) => {
            const messageTypes = data.types as any;
            delete messageTypes.EIP712Domain; // data.types contains EIP712Domain, which is not part of the message
            delete messageTypes.CredentialSchema; // not using credentialSchema
            return verifyTypedData(vcDomain.getDomainTypedData(), messageTypes, data.message, proofValue);
        });
    }
}
