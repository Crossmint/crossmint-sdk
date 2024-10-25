import type React from "react";
import twindConfig from "@/twind.config";
import { install } from "@twind/core";
import { useEffect } from "react";

export function TwindProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Initialize twind with custom configuration
        // This sets up the CSS-in-JS styling solution for the entire application
        install(twindConfig);
    }, []);

    return <>{children}</>;
}
