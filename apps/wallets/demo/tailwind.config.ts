import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        colors: {
            background: "hsl(var(--color-background) / <alpha-value>)",
            foreground: "hsl(var(--color-foreground) / <alpha-value>)",
            card: "hsl(var(--color-card) / <alpha-value>)",
            "card-foreground": "hsl(var(--color-card-foreground) / <alpha-value>)",
            popover: "hsl(var(--color-popover) / <alpha-value>)",
            "popover-foreground": "hsl(var(--color-popover-foreground) / <alpha-value>)",
            primary: "hsl(var(--color-primary) / <alpha-value>)",
            "primary-foreground": "hsl(var(--color-primary-foreground) / <alpha-value>)",
            secondary: "hsl(var(--color-secondary) / <alpha-value>)",
            "secondary-foreground": "hsl(var(--color-secondary-foreground) / <alpha-value>)",
            muted: "hsl(var(--color-muted) / <alpha-value>)",
            "muted-foreground": "hsl(var(--color-muted-foreground) / <alpha-value>)",
            accent: "hsl(var(--color-accent) / <alpha-value>)",
            "accent-foreground": "hsl(var(--color-accent-foreground) / <alpha-value>)",
            destructive: "hsl(var(--color-destructive) / <alpha-value>)",
            "destructive-foreground": "hsl(var(--color-destructive-foreground) / <alpha-value>)",
            border: "hsl(var(--color-border) / <alpha-value>)",
            input: "hsl(var(--color-input) / <alpha-value>)",
            ring: "hsl(var(--color-ring) / <alpha-value>)",
            "chart-1": "hsl(var(--color-chart-1) / <alpha-value>)",
            skeleton: "hsl(var(--color-skeleton) / <alpha-value>)",
        },
        fontFamily: {
            body: ["var(--font-inter)", ...fontFamily.sans],
        },
        boxShadow: {
            light: "var(--shadow-light)",
            heavy: "var(--shadow-heavy)",
            dropdown: "var(--shadow-dropdown)",
            primary: "0 1px 2px 0 #602C1B",
        },
        extend: {
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [],
};
export default config;
