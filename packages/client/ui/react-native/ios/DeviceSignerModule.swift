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
            } catch let error as DeviceSignerError {
                // Surface the SDK error code as the exception name so JS can branch on it
                // (e.g. re-register the device signer on DEVICE_SIGNER_SIGNING_FAILED or
                // DEVICE_SIGNER_KEY_NOT_FOUND). The description carries the underlying reason;
                // Expo already prefixes "Calling the 'signMessage' function has failed", so we
                // do not add our own redundant prefix.
                throw Exception(name: error.code, description: error.message)
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

    // Declared `static` so the `@Sendable` `AsyncFunction` closures above don't
    // capture `self`. `DeviceSignerModule` is a `Module` subclass and is not
    // `Sendable`, so capturing it in a `@Sendable` closure is an error under Swift 6
    // strict concurrency (the closures became `@Sendable` in newer `ExpoModulesCore`).
    // Backend selection reads only compile-time (`targetEnvironment`) and global
    // (`SecureEnclave.isAvailable`) state, so no per-instance context is needed —
    // behavior is identical to the previous instance method.
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
