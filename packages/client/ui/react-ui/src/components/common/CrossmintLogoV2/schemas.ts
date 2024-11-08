import { z } from "zod";
import { CROSSMINT_LOGO_DEFAULTS } from "./consts";

const iconGradientColorSchema = z.object({
    type: z.literal("gradient"),
    from: z.string(),
    to: z.string(),
});

const iconSolidColorSchema = z.object({
    type: z.literal("solid"),
    color: z.string(),
});
const iconColorSchema = z.discriminatedUnion("type", [iconGradientColorSchema, iconSolidColorSchema]);

export const crossmintLogoColorsSchema = z.object({
    icon: iconColorSchema.optional().default(CROSSMINT_LOGO_DEFAULTS.colors.icon),
    text: z.string().optional().default(CROSSMINT_LOGO_DEFAULTS.colors.text),
});

export const crossmintLogoDisplayTypeSchema = z
    .enum(["icon-only", "icon-and-text"])
    .default(CROSSMINT_LOGO_DEFAULTS.displayType);

export const crossmintLogoColorsAndDisplayTypeRawSchema = z.object({
    colors: crossmintLogoColorsSchema.optional().default(CROSSMINT_LOGO_DEFAULTS.colors),
    displayType: crossmintLogoDisplayTypeSchema.optional().default(CROSSMINT_LOGO_DEFAULTS.displayType),
});

export const crossmintLogoColorsAndDisplayTypeSchema = crossmintLogoColorsAndDisplayTypeRawSchema
    .optional()
    .default(CROSSMINT_LOGO_DEFAULTS);

export type CrossmintLogoColorsAndDisplayType = z.infer<typeof crossmintLogoColorsAndDisplayTypeSchema>;
