export type VerificationAppearance = {
    variables?: VerificationAppearanceVariables;
    rules?: VerificationAppearanceRules;
};

export type VerificationAppearanceVariables = {
    fontFamily?: string;
    fontSizeUnit?: string;
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
            backgroundHover?: string;
        };
    };
    SecondaryButton?: {
        colors?: {
            text?: string;
            background?: string;
            backgroundHover?: string;
        };
    };
    CloseButton?: {
        colors?: {
            background?: string;
            backgroundHover?: string;
        };
    };
    Radio?: {
        colors?: {
            border?: string;
            borderSelected?: string;
            backgroundSelected?: string;
            dot?: string;
        };
    };
};
