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
 * Parse a CSS length (e.g. "16px", "1.2rem") into its numeric value and unit,
 * then return a new length scaled by the given ratio.
 */
function scaleCssLength(base: string, ratio: number): string {
    const match = base.match(/^([0-9]*\.?[0-9]+)\s*(.+)$/);
    if (!match) {
        return base;
    }
    const value = Number.parseFloat(match[1]) * ratio;
    const rounded = Math.round(value * 100) / 100;
    return `${rounded}${match[2]}`;
}

// BT default ratios — derived from their defaultTheme so we preserve
// the typographic / spacing hierarchy when the user sets a base unit.
const FONT_SIZE_RATIOS = {
    title: 24 / 14,
    body: 1,
    small: 12 / 14,
    error: 13 / 14,
    input: 18 / 14,
    passkey: 16 / 14,
} as const;

const SPACING_RATIOS = {
    modal: 32 / 16,
    section: 1,
    input: 8 / 16,
    buttonGap: 8 / 16,
    optionGap: 12 / 16,
} as const;

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
            resolved.textPrimary = isLight ? bgHsl.lightness(10).hex() : bgHsl.lightness(90).hex();
        }
        if (!resolved.textSecondary) {
            resolved.textSecondary = isLight ? bgHsl.lightness(35).hex() : bgHsl.lightness(65).hex();
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

    // fontSizeUnit — treated as the body base; other slots are scaled proportionally
    if (variables?.fontSizeUnit) {
        const base = variables.fontSizeUnit;
        for (const [slot, ratio] of Object.entries(FONT_SIZE_RATIOS)) {
            setIfDefined(theme, `typography.fontSize.${slot}`, scaleCssLength(base, ratio));
        }
    }

    // spacingUnit — treated as the section base; other slots are scaled proportionally
    if (variables?.spacingUnit) {
        const base = variables.spacingUnit;
        for (const [slot, ratio] of Object.entries(SPACING_RATIOS)) {
            setIfDefined(theme, `spacing.${slot}`, scaleCssLength(base, ratio));
        }
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
