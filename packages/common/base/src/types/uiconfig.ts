export interface UiConfigColors {
    textPrimary?: string;
    textSecondary?: string;
    accent?: string;
    background?: string;
    backgroundSecondary?: string;
    backgroundTertiary?: string;
    border?: string;
    danger?: string;
    textLink?: string;
}

export interface UIConfig {
    colors?: UiConfigColors;
    fontSizeBase?: string;
    spacingUnit?: string;
    borderRadius?: string;
    fontWeightPrimary?: string;
    fontWeightSecondary?: string;
    fonts?: UiConfigFonts;
    hideCardForm?: boolean;
}

export type UiConfigFonts = (CssFontSource | CustomFontSource)[];

export interface CssFontSource {
    cssSrc: string;
    family: string;
}

export interface CustomFontSource {
    family: string;
    // This will be guarded and only Crossmint domain will be allowed
    src: string;
    display?: string;
    style?: "normal" | "italic" | "oblique";
    weight?: string;
}
