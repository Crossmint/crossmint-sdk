import { twind, cssom, tx as tx$, injectGlobal as injectGlobal$, keyframes as keyframes$, virtual } from "@twind/core";
import defineConfig from "./twind.config";

// @ts-expect-error: sheet type is not correct https://twind.style/library-mode#recommended-pattern
export const tw = /* #__PURE__ */ twind(
    defineConfig,
    // If SSR/build time, use virtual sheet to avoid "document is not defined" errors
    typeof document === "undefined" ? virtual() : cssom("style[data-crossmint-sdk]")
);

export const tx = /* #__PURE__ */ tx$.bind(tw);
export const injectGlobal = /* #__PURE__ */ injectGlobal$.bind(tw);
export const keyframes = /* #__PURE__ */ keyframes$.bind(tw);
