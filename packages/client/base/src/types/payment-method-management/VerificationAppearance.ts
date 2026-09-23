export type VerificationAppearance = {
    variables?: VerificationAppearanceVariables;
    rules?: VerificationAppearanceRules;
};

export type VerificationAppearanceVariables = {
    fontFamily?: string;
    /**
     * Not applied by `OrderIntentVerification`: only `colors` (and the button / input colors under
     * `rules`) reach the verification modal. Not the multiplier unit of
     * `EmbeddedCheckoutV3AppearanceVariables.fontSizeUnit`, so do not share one object between the two.
     */
    fontSizeUnit?: string;
    /** Not applied by `OrderIntentVerification`; see `fontSizeUnit`. */
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
