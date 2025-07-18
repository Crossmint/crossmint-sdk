import { twind, cssom, virtual } from "@twind/core";
import defineConfig from "./twind.config";

// 1. Create layer declaration first
if (typeof document !== "undefined") {
    let layerStyle = document.querySelector("style[data-crossmint-layers]") as HTMLStyleElement;
    if (!layerStyle) {
        layerStyle = document.createElement("style");
        layerStyle.setAttribute("data-crossmint-layers", "");
        layerStyle.textContent = `@layer base, client, crossmint;`;
        document.head.insertBefore(layerStyle, document.head.firstChild);
    }
}

// 2. Create isolated stylesheet only to be used for the Crossmint SDK styles
let sheet;
if (typeof document === "undefined") {
    sheet = virtual();
} else {
    let styleElement = document.querySelector("style[data-crossmint-sdk]") as HTMLStyleElement;
    if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.setAttribute("data-crossmint-sdk", "");
        document.head.appendChild(styleElement);
    }
    sheet = cssom(styleElement);
}

// 3. Create scoped config to ensure all classes are prefixed with cm-
const scopedConfig = {
    ...defineConfig,
    hash: (className: string) => `cm-${className}`, // All classes become cm-text-sm, cm-bg-white, etc.
};

// @ts-expect-error: sheet type mismatch
export const tw = twind(scopedConfig, sheet);
