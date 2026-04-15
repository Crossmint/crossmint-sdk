import type { VerificationAppearance, VerificationAppearanceVariables } from "@crossmint/client-sdk-base";
import Color from "color";

type VerificationColors = NonNullable<VerificationAppearanceVariables["colors"]>;

function safeColor(cssColor: string): Color | null {
    try {
        return Color(cssColor);
    } catch {
        return null;
    }
}

function darken(cssColor: string, ratio: number): string {
    return safeColor(cssColor)?.darken(ratio).hex() ?? cssColor;
}


/**
 * Best-effort inference: fill in missing color tokens from the ones provided
 * so that even a single token (e.g. backgroundPrimary) produces a coherent
 * palette rather than clashing with BT's unrelated defaults.
 */
function resolveColors(explicit: VerificationColors): VerificationColors {
    const resolved = { ...explicit };

    const bgRaw = resolved.backgroundPrimary;
    const bg = bgRaw ? safeColor(bgRaw) : null;
    const isLight = bg?.isLight() ?? true;

    if (bg && bgRaw) {
        const bgHsl = bg.hsl();
        if (!resolved.textPrimary) {
            resolved.textPrimary = isLight
                ? bgHsl.lightness(10).hex()
                : bgHsl.lightness(90).hex();
        }
        if (!resolved.textSecondary) {
            resolved.textSecondary = isLight
                ? bgHsl.lightness(35).hex()
                : bgHsl.lightness(65).hex();
        }
        if (!resolved.backgroundSecondary) {
            const l = bgHsl.lightness();
            resolved.backgroundSecondary = isLight
                ? bgHsl.lightness(Math.max(0, l - 4)).hex()
                : bgHsl.lightness(Math.min(100, l + 6)).hex();
        }
        if (!resolved.border) {
            const l = bgHsl.lightness();
            resolved.border = isLight
                ? bgHsl.lightness(Math.max(0, l - 15)).hex()
                : bgHsl.lightness(Math.min(100, l + 15)).hex();
        }
    }

    // textPrimary -> textSecondary (muted variant)
    if (!resolved.textSecondary && resolved.textPrimary) {
        const tp = safeColor(resolved.textPrimary);
        if (tp) {
            resolved.textSecondary = tp.alpha(0.6).hexa();
        }
    }

    return resolved;
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
    const colors = variables?.colors ? resolveColors(variables.colors) : undefined;

    // --- variables -> BT theme ---

    // accent
    setIfDefined(theme, "colors.primary", colors?.accent);
    setIfDefined(theme, "colors.background.button.primary", colors?.accent);
    if (colors?.accent) {
        setIfDefined(theme, "colors.background.button.primaryHover", darken(colors.accent, 0.1));
    }
    setIfDefined(theme, "colors.border.focus", colors?.accent);
    setIfDefined(theme, "colors.border.selected", colors?.accent);
    setIfDefined(theme, "colors.spinner.indicator", colors?.accent);
    setIfDefined(theme, "colors.radio.borderSelected", colors?.accent);
    setIfDefined(theme, "colors.radio.backgroundSelected", colors?.accent);

    // textPrimary
    setIfDefined(theme, "colors.text.primary", colors?.textPrimary);
    // BT nests button text colors under colors.background.button (not colors.text)
    setIfDefined(theme, "colors.background.button.primaryText", colors?.textPrimary);
    setIfDefined(theme, "colors.background.button.secondaryText", colors?.textPrimary);

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
        const bgSecondary = safeColor(colors.backgroundSecondary);
        const hoverColor = bgSecondary?.isLight()
            ? darken(colors.backgroundSecondary, 0.1)
            : bgSecondary?.lighten(0.2).hex() ?? colors.backgroundSecondary;
        setIfDefined(theme, "colors.background.button.secondaryHover", hoverColor);
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
