// Export utilities and types first
export type {
    DeviceSignerData,
    DeviceSignerResult,
    DeviceSignerStorage,
} from "./utils";

export {
    getStorage,
    generateDeviceSigner,
    storeDeviceSigner,
    getDeviceSigner,
    hasDeviceSigner,
} from "./utils";

// Export classes last to ensure dependencies are resolved
export { DeviceSigner } from "./device-signer";
export type { DeviceSigner as DeviceSignerType } from "./device-signer";
export { SolanaDeviceSigner } from "./solana-device-signer";
export { StellarDeviceSigner } from "./stellar-device-signer";
