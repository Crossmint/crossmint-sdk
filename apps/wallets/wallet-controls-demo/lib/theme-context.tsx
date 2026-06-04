"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { themes, type ThemeConfig } from "./themes";

interface ThemeContextValue {
    theme: ThemeConfig;
    setThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [themeId, setThemeId] = useState("corporate");
    const theme = themes[themeId] ?? themes.corporate;

    return <ThemeContext.Provider value={{ theme, setThemeId }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (ctx == null) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return ctx;
}
