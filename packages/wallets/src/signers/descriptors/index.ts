import type { Chain } from "../../chains/chains";
import { UnknownSignerTypeError } from "../../utils/errors";
import { apiKeySignerDescriptor } from "./api-key";
import { deviceSignerDescriptor } from "./device";
import { emailSignerDescriptor } from "./email";
import { externalWalletSignerDescriptor } from "./external-wallet";
import { passkeySignerDescriptor } from "./passkey";
import { phoneSignerDescriptor } from "./phone";
import { serverSignerDescriptor } from "./server";
import { whatsappSignerDescriptor } from "./whatsapp";
import type { SignerDescriptor } from "./types";

export type { SignerDescriptor, SignerDescriptorContext } from "./types";

export function getSignerDescriptor<C extends Chain>(type: SignerDescriptor["type"]): SignerDescriptor<C> {
    switch (type) {
        case "email":
            return emailSignerDescriptor as SignerDescriptor<C>;
        case "phone":
            return phoneSignerDescriptor as SignerDescriptor<C>;
        case "whatsapp":
            return whatsappSignerDescriptor as SignerDescriptor<C>;
        case "passkey":
            return passkeySignerDescriptor as SignerDescriptor<C>;
        case "device":
            return deviceSignerDescriptor as SignerDescriptor<C>;
        case "api-key":
            return apiKeySignerDescriptor as SignerDescriptor<C>;
        case "server":
            return serverSignerDescriptor as SignerDescriptor<C>;
        case "external-wallet":
            return externalWalletSignerDescriptor as SignerDescriptor<C>;
        default:
            throw new UnknownSignerTypeError(`Unknown signer type: ${type}`);
    }
}
