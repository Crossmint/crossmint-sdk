export type VerificationAppearance = {
    variables?: VerificationAppearanceVariables;
    rules?: VerificationAppearanceRules;
};

export type VerificationAppearanceVariables = {
    fontFamily?: string;
    /**
     * Base body font size, e.g. `"14px"`; the other text sizes scale from it. Unlike
     * `EmbeddedCheckoutV3AppearanceVariables.fontSizeUnit`, this is a size, not a multiplier.
     */
    fontSizeUnit?: string;
    /** Base spacing, e.g. `"16px"`. Same caveat as `fontSizeUnit`. */
    spacingUnit?: string;
    borderRadius?: string;
    colors?: {
        accent?: string;
        textPrimary?: string;
        textSecondary?: string;
        backgroundPrimary?: string;
        backgroundSecondary?: string;
        border?: string;
        danger?: string;
        success?: string;
    };
};

export type VerificationAppearanceRules = {
    Overlay?: {
        colors?: {
            background?: string;
        };
    };
    Modal?: {
        borderRadius?: string;
        colors?: {
            border?: string;
        };
    };
    Input?: {
        borderRadius?: string;
        colors?: {
            background?: string;
            border?: string;
        };
    };
    PrimaryButton?: {
        borderRadius?: string;
        colors?: {
            text?: string;
            background?: string;
        };
        hover?: {
            colors?: {
                background?: string;
            };
        };
        disabled?: {
            colors?: {
                background?: string;
            };
        };
    };
    SecondaryButton?: {
        colors?: {
            text?: string;
            background?: string;
        };
        hover?: {
            colors?: {
                background?: string;
            };
        };
    };
    CloseButton?: {
        colors?: {
            background?: string;
        };
        hover?: {
            colors?: {
                background?: string;
            };
        };
    };
    Radio?: {
        colors?: {
            border?: string;
        };
        selected?: {
            colors?: {
                border?: string;
                background?: string;
                dot?: string;
            };
        };
    };
};
