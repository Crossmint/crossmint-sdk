import CryptoKit
import CrossmintDeviceSigner
import ExpoModulesCore
import Security

/// Expo native module that exposes device signer key storage to React Native.
///
/// On physical iOS devices the module delegates to ``SecureEnclaveKeyStorage`` so all
/// key material lives in the Secure Enclave. On simulators it always uses
/// ``KeychainKeyStorage`` (Secure Enclave is not available on simulators).
///
/// The module is registered as `"CrossmintDeviceSigner"` and consumed on the JS side by
/// `NativeDeviceSignerKeyStorage` from `@crossmint/client-sdk-react-native-ui`.
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
        AsyncFunction("generateKey") { (address: String?) async throws -> String in
            do {
                return try await DeviceSignerModule.defaultStorage().generateKey(address: address)
            } catch {
                throw Exception(
                    name: "GenerateKeyFailed",
                    description: "generateKey failed: \(error)"
                )
            }
        }

        // Renames the pending Keychain entry to a wallet-address entry.
        AsyncFunction("mapAddressToKey") { (address: String, publicKeyBase64: String) async throws in
            do {
                try await DeviceSignerModule.defaultStorage().mapAddressToKey(address: address, publicKeyBase64: publicKeyBase64)
            } catch {
                throw Exception(name: "MapAddressToKeyFailed", description: "mapAddressToKey failed: \(error)")
            }
        }

        // Returns the stored public key for a wallet address, or nil.
        AsyncFunction("getKey") { (address: String) async -> String? in
            await DeviceSignerModule.defaultStorage().getKey(address: address)
        }

        // Returns true if the private key for the given public key is present on this device.
        AsyncFunction("hasKey") { (publicKeyBase64: String) -> Bool in
            DeviceSignerModule.defaultStorage().hasKey(publicKeyBase64: publicKeyBase64)
        }

        // Signs a base64-encoded message; returns { r, s } hex strings.
        AsyncFunction("signMessage") { (address: String, message: String) async throws -> [String: String] in
            do {
                let sig = try await DeviceSignerModule.defaultStorage().signMessage(address: address, message: message)
                return ["r": sig.r, "s": sig.s]
            } catch {
                throw Exception(name: "SignMessageFailed", description: "signMessage failed: \(error)")
            }
        }

        // Deletes the key for a wallet address.
        AsyncFunction("deleteKey") { (address: String) async throws in
            try await DeviceSignerModule.defaultStorage().deleteKey(address: address)
        }

        // Deletes a pending key that was never promoted to a wallet-address key.
        AsyncFunction("deletePendingKey") { (publicKeyBase64: String) async throws in
            try await DeviceSignerModule.defaultStorage().deletePendingKey(publicKeyBase64: publicKeyBase64)
        }
    }

    // MARK: - Private helpers

    // Static so the `@Sendable` AsyncFunction closures above don't capture `self`
    // (a non-Sendable `Module` subclass), which is an error under Swift 6 strict
    // concurrency. The backend selection uses only compile-time and global state,
    // so no instance context is required.
    private static func defaultStorage() -> any DeviceSignerKeyStorage {
        #if targetEnvironment(simulator)
        return KeychainKeyStorage()
        #else
        if SecureEnclave.isAvailable {
            return SecureEnclaveKeyStorage()
        } else {
            return KeychainKeyStorage()
        }
        #endif
    }
}
