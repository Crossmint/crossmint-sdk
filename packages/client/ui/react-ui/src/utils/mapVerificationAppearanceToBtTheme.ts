import type { VerificationAppearance } from "@crossmint/client-sdk-base";

/**
 * Darken a hex color by a given factor (0–1).
 * E.g. darkenHex("#4CAF50", 0.1) darkens by 10%.
 */
function darkenHex(hex: string, factor: number): string {
    const cleaned = hex.replace("#", "");
    const num = Number.parseInt(cleaned, 16);
    const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - factor)));
    const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - factor)));
    const b = Math.max(0, Math.round((num & 0xff) * (1 - factor)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

type BtTheme = Record<string, unknown>;

function setIfDefined(target: BtTheme, path: string, value: string | undefined) {
    if (value === undefined) {
        return;
    }
    const keys = path.split(".");
    let current = target;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
            current[key] = {};
        }
        current = current[key] as BtTheme;
    }
    current[keys[keys.length - 1]] = value;
}

export function mapVerificationAppearanceToBtTheme(appearance?: VerificationAppearance): object | undefined {
    if (!appearance) {
        return undefined;
    }

    const { variables, rules } = appearance;
    if (!variables && !rules) {
        return undefined;
    }

    const theme: BtTheme = {};
    const colors = variables?.colors;

    // --- variables -> BT theme ---

    // accent
    setIfDefined(theme, "colors.primary", colors?.accent);
    setIfDefined(theme, "colors.background.button.primary", colors?.accent);
    if (colors?.accent) {
        setIfDefined(theme, "colors.background.button.primaryHover", darkenHex(colors.accent, 0.1));
    }
    setIfDefined(theme, "colors.border.focus", colors?.accent);
    setIfDefined(theme, "colors.border.selected", colors?.accent);
    setIfDefined(theme, "colors.spinner.indicator", colors?.accent);
    setIfDefined(theme, "colors.radio.borderSelected", colors?.accent);
    setIfDefined(theme, "colors.radio.backgroundSelected", colors?.accent);

    // textPrimary
    setIfDefined(theme, "colors.text.primary", colors?.textPrimary);
    setIfDefined(theme, "colors.background.button.primaryText", colors?.textPrimary);

    // textSecondary
    setIfDefined(theme, "colors.text.secondary", colors?.textSecondary);
    setIfDefined(theme, "colors.text.placeholder", colors?.textSecondary);

    // backgroundPrimary
    setIfDefined(theme, "colors.background.surface", colors?.backgroundPrimary);
    setIfDefined(theme, "colors.background.card", colors?.backgroundPrimary);

    // backgroundSecondary
    setIfDefined(theme, "colors.background.input", colors?.backgroundSecondary);
    setIfDefined(theme, "colors.background.button.secondary", colors?.backgroundSecondary);
    if (colors?.backgroundSecondary) {
        setIfDefined(theme, "colors.background.button.secondaryHover", darkenHex(colors.backgroundSecondary, 0.1));
    }

    // border
    setIfDefined(theme, "colors.border.default", colors?.border);
    setIfDefined(theme, "colors.border.modal", colors?.border);
    setIfDefined(theme, "colors.radio.border", colors?.border);

    // danger
    setIfDefined(theme, "colors.error", colors?.danger);
    setIfDefined(theme, "colors.text.error", colors?.danger);
    setIfDefined(theme, "colors.border.error", colors?.danger);
    setIfDefined(theme, "colors.icon.error", colors?.danger);
    setIfDefined(theme, "colors.background.errorIcon", colors?.danger);

    // success
    setIfDefined(theme, "colors.success", colors?.success);
    setIfDefined(theme, "colors.icon.success", colors?.success);
    setIfDefined(theme, "colors.background.successIcon", colors?.success);

    // fontFamily
    setIfDefined(theme, "typography.fontFamily", variables?.fontFamily);

    // fontSizeUnit — apply uniformly to all fontSize slots
    if (variables?.fontSizeUnit) {
        const unit = variables.fontSizeUnit;
        setIfDefined(theme, "typography.fontSize.title", unit);
        setIfDefined(theme, "typography.fontSize.body", unit);
        setIfDefined(theme, "typography.fontSize.small", unit);
        setIfDefined(theme, "typography.fontSize.error", unit);
        setIfDefined(theme, "typography.fontSize.input", unit);
        setIfDefined(theme, "typography.fontSize.passkey", unit);
    }

    // spacingUnit — apply uniformly to all spacing slots
    if (variables?.spacingUnit) {
        const unit = variables.spacingUnit;
        setIfDefined(theme, "spacing.modal", unit);
        setIfDefined(theme, "spacing.section", unit);
        setIfDefined(theme, "spacing.input", unit);
        setIfDefined(theme, "spacing.buttonGap", unit);
        setIfDefined(theme, "spacing.optionGap", unit);
    }

    // borderRadius
    if (variables?.borderRadius) {
        const r = variables.borderRadius;
        setIfDefined(theme, "borders.radius.modal", r);
        setIfDefined(theme, "borders.radius.input", r);
        setIfDefined(theme, "borders.radius.button", r);
        setIfDefined(theme, "borders.radius.option", r);
    }

    // --- rules -> BT theme (override variables) ---

    // Overlay
    setIfDefined(theme, "colors.background.overlay", rules?.Overlay?.colors?.background);

    // Modal
    setIfDefined(theme, "borders.radius.modal", rules?.Modal?.borderRadius);
    setIfDefined(theme, "colors.border.modal", rules?.Modal?.colors?.border);

    // Input
    setIfDefined(theme, "borders.radius.input", rules?.Input?.borderRadius);
    setIfDefined(theme, "colors.background.input", rules?.Input?.colors?.background);
    setIfDefined(theme, "colors.border.default", rules?.Input?.colors?.border);

    // PrimaryButton
    setIfDefined(theme, "borders.radius.button", rules?.PrimaryButton?.borderRadius);
    setIfDefined(theme, "colors.background.button.primaryText", rules?.PrimaryButton?.colors?.text);
    setIfDefined(theme, "colors.background.button.primary", rules?.PrimaryButton?.colors?.background);
    setIfDefined(theme, "colors.background.button.primaryHover", rules?.PrimaryButton?.colors?.backgroundHover);

    // SecondaryButton
    setIfDefined(theme, "colors.background.button.secondaryText", rules?.SecondaryButton?.colors?.text);
    setIfDefined(theme, "colors.background.button.secondary", rules?.SecondaryButton?.colors?.background);
    setIfDefined(theme, "colors.background.button.secondaryHover", rules?.SecondaryButton?.colors?.backgroundHover);

    // CloseButton
    setIfDefined(theme, "colors.closeButton.background", rules?.CloseButton?.colors?.background);
    setIfDefined(theme, "colors.closeButton.backgroundHover", rules?.CloseButton?.colors?.backgroundHover);

    // Radio
    setIfDefined(theme, "colors.radio.border", rules?.Radio?.colors?.border);
    setIfDefined(theme, "colors.radio.borderSelected", rules?.Radio?.colors?.borderSelected);
    setIfDefined(theme, "colors.radio.backgroundSelected", rules?.Radio?.colors?.backgroundSelected);
    setIfDefined(theme, "colors.radio.dot", rules?.Radio?.colors?.dot);

    return theme;
}
