import type { Config } from "tailwindcss";

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
            "chart-2": "hsl(var(--color-chart-2) / <alpha-value>)",
            "chart-3": "hsl(var(--color-chart-3) / <alpha-value>)",
            "chart-4": "hsl(var(--color-chart-4) / <alpha-value>)",
            "chart-5": "hsl(var(--color-chart-5) / <alpha-value>)",
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
