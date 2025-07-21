import { defineConfig } from "@twind/core";
import presetTailwind from "@twind/preset-tailwind";

export default defineConfig({
    presets: [presetTailwind({ disablePreflight: true })],
    theme: {
        extend: {
            colors: {
                // Crossmint colors (cm- prefix)
                "cm-text-primary": "#00150D",
                "cm-text-secondary": "#67797F",
                "cm-background-primary": "#FFFFFF",
                "cm-muted-primary": "#F0F2F4",
                "cm-hover": "#E9ECF0",
                "cm-border": "#D9D9D9",
                "cm-link": "#1A74E9",
                "cm-accent": "#04AA6D",
            },
            keyframes: {
                "caret-blink": {
                    "0%,70%,100%": { opacity: "1" },
                    "20%,50%": { opacity: "0" },
                },
                "fade-in": {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                "fade-out": {
                    from: { opacity: "1" },
                    to: { opacity: "0" },
                },
                "slide-in-from-top": {
                    "0%": { transform: "translateY(-100%)" },
                    "100%": { transform: "translateY(0)" },
                },
                "slide-out-to-top": {
                    "0%": { transform: "translateY(0)" },
                    "100%": { transform: "translateY(-100%)" },
                },
                "slide-in-from-bottom": {
                    "0%": { transform: "translateY(100%)" },
                    "100%": { transform: "translateY(0)" },
                },
                "slide-out-to-bottom": {
                    "0%": { transform: "translateY(0)" },
                    "100%": { transform: "translateY(100%)" },
                },
                "slide-in-from-left": {
                    "0%": { transform: "translateX(-100%)" },
                    "100%": { transform: "translateX(0)" },
                },
                "slide-out-to-left": {
                    "0%": { transform: "translateX(0)" },
                    "100%": { transform: "translateX(-100%)" },
                },
                "slide-in-from-right": {
                    "0%": { transform: "translateX(100%)" },
                    "100%": { transform: "translateX(0)" },
                },
                "slide-out-to-right": {
                    "0%": { transform: "translateX(0)" },
                    "100%": { transform: "translateX(100%)" },
                },
                "zoom-in-95": {
                    "0%": { opacity: "0", transform: "scale(0.95) translate(-50%, -50%)" },
                    "100%": { opacity: "1", transform: "scale(1) translate(-50%, -50%)" },
                },
                "zoom-out-95": {
                    "0%": { opacity: "1", transform: "scale(1) translate(-50%, -50%)" },
                    "100%": { opacity: "0", transform: "scale(0.95) translate(-50%, -50%)" },
                },
            },
            animation: {
                "caret-blink": "caret-blink 1.25s ease-out infinite",
                "fade-in": "fade-in 300ms cubic-bezier(0.16, 1, 0.3, 1)",
                "fade-out": "fade-out 300ms cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-in-from-top": "slide-in-from-top 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-out-to-top": "slide-out-to-top 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-in-from-bottom": "slide-in-from-bottom 450ms cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-out-to-bottom": "slide-out-to-bottom 300ms cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-in-from-left": "slide-in-from-left 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-out-to-left": "slide-out-to-left 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-in-from-right": "slide-in-from-right 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-out-to-right": "slide-out-to-right 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                "zoom-in-95": "zoom-in-95 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                "zoom-out-95": "zoom-out-95 150ms cubic-bezier(0.16, 1, 0.3, 1)",
            },
            durations: {
                "300": "300ms",
                "500": "500ms",
            },
        },
    },
    rules: [
        [
            "focus-ring-custom",
            {
                "&:focus": {
                    "box-shadow": "0 0 0 3px var(--focus-ring-color)",
                },
            },
        ],
    ],
});
