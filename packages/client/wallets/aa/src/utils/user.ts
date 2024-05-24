import { UserIdentifier, UserIdentifierParams } from "@/types/Config";
import { isEmpty } from "@/utils/helpers";
import EmailValidator from "email-validator";
import { parsePhoneNumber } from "libphonenumber-js";

export function parseUserIdentifier(reqParams: UserIdentifierParams, acceptPhoneWithoutPlus = false): UserIdentifier {
    const { userId, email } = reqParams;
    const phoneNumber = getPhoneNumber(reqParams.phoneNumber, acceptPhoneWithoutPlus);

    assertUserIdentifyingParams(userId, email, phoneNumber);

    if (!isEmpty(userId)) {
        return { type: "whiteLabel", userId };
    }

    if (!isEmpty(phoneNumber)) {
        return { type: "phoneNumber", phoneNumber };
    }

    if (!isEmpty(email)) {
        if (!EmailValidator.validate(email)) {
            throw new Error(`Invalid email(${email}) address provided`);
        }

        return { type: "email", email };
    }

    throw new Error(`Missing required parameter.`);
}

export function getIdString(identifier: UserIdentifier): string {
    switch (identifier.type) {
        case "whiteLabel":
            return identifier.userId;
        case "email":
            return identifier.email;
        case "phoneNumber":
            return identifier.phoneNumber;
        default:
            throw new Error("Invalid UserIdentifier type.");
    }
}

function getPhoneNumber(input?: string, acceptPhoneWithoutPlus = false) {
    if (isEmpty(input)) {
        return;
    }

    const startsWithPlus = input.startsWith("+");
    if (!startsWithPlus && !acceptPhoneWithoutPlus) {
        throw new Error(
            `Invalid phone number provided. Please provide a phone number starting with a '+', and include the country code`
        );
    }

    if (!startsWithPlus) {
        input = `+${input.trimStart()}`;
    }

    const phoneNumber = parsePhoneNumber(input);
    if (!phoneNumber.isValid()) {
        console.log(`Invalid phone number reported (${input}).`);
        throw new Error(`Invalid phone number provided. Please be sure to include the country code.`);
    }

    return phoneNumber.number.toString();
}

function assertUserIdentifyingParams(userId?: string, email?: string, phoneNumber?: string) {
    const paramCount = [userId, email, phoneNumber].filter((entry) => !isEmpty(entry)).length;
    if (paramCount > 1) {
        throw new Error(`Only one of the parameters 'userId', 'email', or 'phoneNumber' can be provided`);
    }
    if (paramCount === 0) {
        throw new Error(`Missing required parameter 'userId', 'email', or 'phoneNumber'`);
    }
}
