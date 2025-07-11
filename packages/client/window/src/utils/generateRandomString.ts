export const generateRandomString = (length = 13): string => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    // Map each byte to a single base-36 digit (0–9, a–z)
    return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
};
