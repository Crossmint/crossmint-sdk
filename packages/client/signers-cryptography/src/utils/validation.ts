export function validateRadixData(data: number[], radix: number): void {
    if (data.some((d) => d >= radix)) {
        throw new Error("Data contains values greater than the radix");
    }
}

export function validateEncoding(encoding: string): void {
    const validEncodings = ["base64", "base58", "hex"];
    if (!validEncodings.includes(encoding)) {
        throw new Error(`Unsupported encoding: ${encoding}`);
    }
}
