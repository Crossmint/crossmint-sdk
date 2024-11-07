export const CROSSMINT_LOGO_DEFAULT_COLORS = {
    light: {
        icon: {
            type: "gradient",
            from: "#5edd4d",
            to: "#05ce6c",
        },
        text: "#222",
    },
    dark: {
        icon: {
            type: "gradient",
            from: "#5edd4d",
            to: "#05ce6c",
        },
        text: "#fff",
    },
} as const;

export const CROSSMINT_LOGO_DEFAULTS = {
    colors: CROSSMINT_LOGO_DEFAULT_COLORS.light,
    displayType: "icon-and-text",
} as const;

export const CROSSMINT_LOGO_VIEWBOXES = {
    "icon-only": "0 0 86 86",
    "icon-and-text": "0 0 459.2 86",
} as const;
