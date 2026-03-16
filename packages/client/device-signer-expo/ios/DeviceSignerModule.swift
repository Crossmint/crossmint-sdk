import CryptoKit
import CrossmintDeviceSigner
import ExpoModulesCore

/// Expo native module that exposes device signer key storage to React Native.
///
/// On physical iOS devices the module delegates to ``SecureEnclaveKeyStorage`` so all
/// key material lives in the Secure Enclave. On simulators (where `SecureEnclave.isAvailable`
/// is `false`) it falls back to ``KeychainDeviceSignerKeyStorage``.
///
/// The module is registered as `"CrossmintDeviceSigner"` and consumed on the JS side by
/// `NativeDeviceSignerKeyStorage` from `@crossmint/expo-device-signer`.
public class DeviceSignerModule: Module {

    // MARK: - Module definition

    public func definition() -> ModuleDefinition {
        Name("CrossmintDeviceSigner")

        // Returns true — the module always has a storage backend available (hardware
        // on real devices, software fallback on simulators).
        AsyncFunction("isAvailable") { () -> Bool in
            true
        }

        // Generates a new P-256 key and persists it.
        // `biometricPolicy` is baked into the Keychain access control at generation time;
        // subsequent operations do not require it.
        AsyncFunction("generateKey") { (address: String?, biometricPolicy: String) async throws -> String in
            let policy = biometricPolicyFrom(biometricPolicy)
            return try await self.storage(policy: policy).generateKey(address: address)
        }

        // Renames the pending Keychain entry to a wallet-address entry.
        AsyncFunction("mapAddressToKey") { (address: String, publicKeyBase64: String) async throws in
            try await self.defaultStorage().mapAddressToKey(address: address, publicKeyBase64: publicKeyBase64)
        }

        // Returns the stored public key for a wallet address, or nil.
        AsyncFunction("getKey") { (address: String) async -> String? in
            await self.defaultStorage().getKey(address: address)
        }

        // Signs a base64-encoded message; returns { r, s } hex strings.
        AsyncFunction("signMessage") { (address: String, message: String) async throws -> [String: String] in
            let sig = try await self.defaultStorage().signMessage(address: address, message: message)
            return ["r": sig.r, "s": sig.s]
        }

        // Deletes the key for a wallet address.
        AsyncFunction("deleteKey") { (address: String) async throws in
            try await self.defaultStorage().deleteKey(address: address)
        }

        // Deletes a pending key that was never promoted to a wallet-address key.
        AsyncFunction("deletePendingKey") { (publicKeyBase64: String) async throws in
            try await self.defaultStorage().deletePendingKey(publicKeyBase64: publicKeyBase64)
        }
    }

    // MARK: - Private helpers

    /// Creates a storage instance with the specified biometric policy (used at key-generation time).
    private func storage(policy: BiometricPolicy) -> any DeviceSignerKeyStorage {
        if SecureEnclave.isAvailable {
            return SecureEnclaveKeyStorage(biometricPolicy: policy)
        } else {
            return KeychainDeviceSignerKeyStorage(biometricPolicy: policy)
        }
    }

    /// Returns the default storage (`.none` policy) for operations that do not involve
    /// key generation — the policy is already baked into the Keychain item.
    private func defaultStorage() -> any DeviceSignerKeyStorage {
        storage(policy: .none)
    }
}

/// Converts the JS biometric policy string to the Swift enum.
/// Unrecognised values default to `.none`.
private func biometricPolicyFrom(_ string: String) -> BiometricPolicy {
    switch string.lowercased() {
    case "always": return .always
    default:       return .none
    }
}
