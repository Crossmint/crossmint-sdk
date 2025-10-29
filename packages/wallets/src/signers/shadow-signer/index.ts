// Export utilities and types first
export type {
    ShadowSignerData,
    ShadowSignerResult,
    ShadowSignerStorage,
} from "./utils";

export {
    getStorage,
    generateShadowSigner,
    storeShadowSigner,
    getShadowSigner,
    hasShadowSigner,
} from "./utils";

// Export classes last to ensure dependencies are resolved
export { ShadowSigner } from "./shadow-signer";
export type { ShadowSigner as ShadowSignerType } from "./shadow-signer";
export { SolanaShadowSigner } from "./solana-shadow-signer";
export { StellarShadowSigner } from "./stellar-shadow-signer";
