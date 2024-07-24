export function isEmpty(str: string | undefined | null): str is undefined | null {
    return !str || str.length === 0 || str.trim().length === 0;
}

export function containsInteger(str: string): boolean {
    return /^-?\d+$/.test(str);
}

export function makeFormattedEnglishList(arr: Array<string>): string {
    if (arr.length === 0) {
        return "";
    }

    if (arr.length === 1) {
        return arr[0];
    }
    const firsts = arr.slice(0, arr.length - 1);
    const last = arr[arr.length - 1];
    return firsts.join(", ") + " and " + last;
}

export function capitalizeFirstLetterOfEachWord(s: string): string {
    if (isEmpty(s)) {
        return "";
    }

    return s
        .split(" ")
        .map((word) => (word ? word[0].toUpperCase() + word.substring(1) : ""))
        .join(" ");
}

export function removeAllWhitespaces(s: string): string {
    return s.replace(/\s/g, "");
}

export function normalizeBase58String(base58String: string): number {
    if (isEmpty(base58String)) {
        return 0;
    }

    // Takes a number between 0..1 and a character.
    // Normalizes the character into a number from 0..1
    // Adds them up and returns a number between 0..1
    const base58Reduction = function (carry: number, newChar: string) {
        const lowestCharcodeForBase58 = "0".charCodeAt(0);
        const highestCharcodeForBase58 = "z".charCodeAt(0);
        const base58Range = highestCharcodeForBase58 - lowestCharcodeForBase58;

        const normalizedNewChar = (newChar.charCodeAt(0) - lowestCharcodeForBase58) / base58Range;

        const sum = carry + normalizedNewChar;
        return sum % 1; // Between 0 and 1
    };

    return base58String.split("").reduce(base58Reduction, 0);
}

export function trimIfDefined(str: string | undefined, maxLength = 100): string | undefined {
    if (isEmpty(str)) {
        return undefined;
    }

    return str ? str.substring(0, maxLength) : undefined;
}

export function sanitizeStringToValidHTTPHeaderValue(str: string): string {
    // Replace line breaks (CRLF) with a space
    const stringWithSpaces = str.replace(/(\r\n|\n|\r)/g, " ");

    // Remove control characters (0-31), DEL (127), and non-ASCII characters (128+)
    return stringWithSpaces.replace(/[\x00-\x1F\x7F-\uFFFF]/g, "");
}

export function isStringifiedJson(str: string) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

export function safeJSONParse<T = any>(object?: string | null, errorMessage?: string): T | undefined {
    if (isEmpty(object)) {
        return undefined;
    }

    try {
        return JSON.parse(object);
    } catch (e) {
        console.error(`safeJSONParse failed: ${errorMessage ?? ""}`, e);
        return undefined;
    }
}

export function equalsIgnoreCase(a?: string, b?: string): boolean {
    return a?.toLowerCase() === b?.toLowerCase();
}
