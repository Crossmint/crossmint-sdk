import { isValidAddress } from "./isValidAddress";

const addressDisplayCache: Record<string, string> = {};

export function validateAndFormatAddress(addressString: string): string {
    const isValid = isValidAddress(addressString);
    if (!isValid) {
        return addressString;
    }
    if (addressDisplayCache[addressString] != null) {
        return addressDisplayCache[addressString];
    }
    const formattedAddressString = `${addressString.slice(0, 6)}...${addressString.slice(-4)}`;
    addressDisplayCache[addressString] = formattedAddressString;
    return formattedAddressString;
}
