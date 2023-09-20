import { Wallet, verifyTypedData } from "@ethersproject/wallet";
import { EIP712VC } from "@krebitdao/eip712-vc";

import { VerifiableCredential } from "../../types/verifiableCredential";

export class VerifiableCredentialSignatureService {
    async verify(vc: VerifiableCredential) {
        let issuerId = vc.issuer.id;
        issuerId = issuerId.replace("did:", "");

        if (vc.proof == undefined) {
            throw new Error("No proof associated with credential");
        }
        const vcDomain = new EIP712VC(vc.proof.eip712.domain);
        const types = vc.proof.eip712.types;
        const proofValue = vc.proof.proofValue;
        delete vc.proof;

        return await vcDomain.verifyW3CCredential(issuerId, vc, types, proofValue, async (data, proofValue: string) => {
            const messageTypes = data.types as any;
            delete messageTypes.EIP712Domain; // data.types contains EIP712Domain, which is not part of the message
            return verifyTypedData(vcDomain.getDomainTypedData(), messageTypes, data.message, proofValue);
        });
    }
}
