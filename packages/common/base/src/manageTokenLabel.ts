export const tokenLabelConfig: Record<string, number> = { maxLength: 24 };

export function validateAndFormatTokenLabel(labelString: string): string {
    const isValidLabel = labelString.trim().length <= tokenLabelConfig.maxLength;
    if (!isValidLabel) {
        throw new Error(`Label too long: ${labelString}`);
    }
    return `[${labelString.trim().toUpperCase()}]`;
}

export function manageTokenLabel(labelString: string): string {
    return validateAndFormatTokenLabel(labelString);
}
